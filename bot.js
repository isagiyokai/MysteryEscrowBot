require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const Redis = require("ioredis");
const { verifySolanaPayment } = require("./utils/solana");

const bot = new TelegramBot(process.env.TG_TOKEN, { polling: true });
const redis = new Redis(process.env.REDIS_URL);

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

// Register Seller
bot.onText(/\/seller (\w+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = match[1];
  await redis.hset(`escrow:${username}`, "seller", chatId);
  bot.sendMessage(chatId, `✅ Registered as seller for '${username}'.`);
});

// Register Buyer
bot.onText(/\/buyer (\w+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = match[1];
  await redis.hset(`escrow:${username}`, "buyer", chatId);
  bot.sendMessage(chatId, `✅ Registered as buyer for '${username}'.`);
});

// Set Agreed Price
bot.onText(/\/agreedprice (\d+(\.\d+)?)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const amount = parseFloat(match[1]);

  const keys = await redis.keys("escrow:*");
  for (const key of keys) {
    const sellerId = await redis.hget(key, "seller");
    if (parseInt(sellerId) === chatId) {
      await redis.hset(key, "price", amount);
      return bot.sendMessage(chatId, `💰 Agreed price set to ${amount} SOL.`);
    }
  }

  bot.sendMessage(chatId, "❌ No active selling session found.");
});

// Confirm Username Validity
bot.onText(/\/validityconfirmed/, async (msg) => {
  const chatId = msg.chat.id;

  const keys = await redis.keys("escrow:*");
  for (const key of keys) {
    const buyerId = await redis.hget(key, "buyer");
    if (parseInt(buyerId) === chatId) {
      const username = key.split(":")[1];
      const sellerId = await redis.hget(key, "seller");
      const price = await redis.hget(key, "price");

      await redis.hset(key, "validity_confirmed", "true");
      return bot.sendMessage(
        chatId,
        `✅ Username '${username}' confirmed. Please proceed with payment using /payme <txHash> @${username}`
      );
    }
  }

  bot.sendMessage(chatId, "❌ No active buying session found.");
});

// Payment Verification
bot.onText(/\/payme (.+) @(\w+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const txHash = match[1];
  const username = match[2];
  const key = `escrow:${username}`;

  try {
    const [buyerId, validity, price] = await Promise.all([
      redis.hget(key, "buyer"),
      redis.hget(key, "validity_confirmed"),
      redis.hget(key, "price"),
    ]);

    if (parseInt(buyerId) !== chatId) {
      return bot.sendMessage(
        chatId,
        "❌ You are not registered as the buyer for this transaction."
      );
    }

    if (validity !== "true") {
      return bot.sendMessage(
        chatId,
        "❌ Please confirm the username validity before paying."
      );
    }

    await bot.sendMessage(chatId, "⏳ Verifying your Solana transaction...");
    const amount = await verifySolanaPayment(txHash, process.env.ADMIN_WALLET);

    if (!amount || amount < parseFloat(price)) {
      return bot.sendMessage(chatId, "❌ Invalid or insufficient transaction.");
    }

    const sellerId = await redis.hget(key, "seller");
    const sellerShare = (0.8 * amount).toFixed(4);

    await redis.hset(key, "txHash", txHash);
    await redis.hset(key, "paid", amount);

    await bot.sendMessage(
      chatId,
      `✅ Payment of ${amount} SOL confirmed.

Ask @${username}'s seller to transfer the username. Once done, use /confirm to finalize.`
    );
  } catch (error) {
    console.error("/payme error:", error);
    bot.sendMessage(
      chatId,
      "❌ An error occurred while verifying your payment."
    );
  }
});

// Final Confirmation
bot.onText(/\/confirm/, async (msg) => {
  const chatId = msg.chat.id;

  const keys = await redis.keys("escrow:*");
  for (const key of keys) {
    const buyerId = await redis.hget(key, "buyer");
    if (parseInt(buyerId) === chatId) {
      const [sellerId, paid] = await Promise.all([
        redis.hget(key, "seller"),
        redis.hget(key, "paid"),
      ]);

      await bot.sendMessage(
        chatId,
        `🔓 Username transfer confirmed. Releasing ${(
          0.8 * parseFloat(paid)
        ).toFixed(4)} SOL to seller.`
      );

      // TODO: Add payout code here
      return;
    }
  }

  bot.sendMessage(chatId, "❌ No matching deal found to confirm.");
});

// Dispute
bot.onText(/\/dispute/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "⚠️ Dispute logged. Please describe your issue.");
});
