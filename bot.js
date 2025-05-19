require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const Redis = require("ioredis");
const { verifySolanaPayment } = require("./utils/solana");
const fs = require("fs");

// Initialize Telegram bot
const bot = new TelegramBot(process.env.TG_TOKEN, { polling: true });

// Connect to Redis (Upstash TLS)
const redis = new Redis(process.env.REDIS_URL, {
  tls: { rejectUnauthorized: false }
});

// Handle Redis connection errors
redis.on("error", (err) => {
  console.error("Redis error:", err);
});

// /payme command: verifies Solana transaction and stores deal
bot.onText(/\/payme (.+) @(\w+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const txHash = match[1];
  const seller = match[2];

  try {
    await bot.sendMessage(chatId, "⏳ Verifying your Solana transaction...");

    const amount = await verifySolanaPayment(txHash, process.env.ADMIN_WALLET);

    if (!amount) {
      return bot.sendMessage(chatId, "❌ Invalid or failed transaction.");
    }

    const sellerShare = (0.8 * amount).toFixed(4);

    // Store deal in Redis
    await redis.set(
      `deal:${chatId}`,
      JSON.stringify({ txHash, seller, amount })
    );

    await bot.sendMessage(
      chatId,
      `✅ Payment of ${amount} SOL confirmed.\n\nNow ask @${seller} to transfer the username.\nOnce done, use /confirm and send proof.`
    );
  } catch (error) {
    console.error("Error in /payme handler:", error);
    bot.sendMessage(
      chatId,
      "❌ An error occurred while processing your payment. Please try again later."
    );
  }
});

// /confirm command: confirms transfer and logs payout
bot.onText(/\/confirm/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const dealData = await redis.get(`deal:${chatId}`);

    if (!dealData) {
      return bot.sendMessage(chatId, "❌ No active deal found.");
    }

    const deal = JSON.parse(dealData);

    await bot.sendMessage(
      chatId,
      `🔓 Username transfer confirmed.\nSending ${(0.8 * deal.amount).toFixed(
        4
      )} SOL to @${deal.seller}.`
    );

    // TODO: Add actual payout logic here
  } catch (error) {
    console.error("Error in /confirm handler:", error);
    bot.sendMessage(
      chatId,
      "❌ An error occurred while confirming your deal. Please try again later."
    );
  }
});

// /dispute command: logs dispute
bot.onText(/\/dispute/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await bot.sendMessage(
      chatId,
      "⚠️ Dispute logged. Please describe your issue. We will help you shortly."
    );
  } catch (error) {
    console.error("Error in /dispute handler:", error);
  }
});
