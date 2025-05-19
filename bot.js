require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Redis = require('ioredis');
const { verifySolanaPayment } = require('./utils/solana');
const fs = require('fs');

const bot = new TelegramBot(process.env.TG_TOKEN, { polling: true });
const redis = new Redis(process.env.REDIS_URL);

bot.onText(/\/payme (.+) @(\w+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const txHash = match[1];
    const seller = match[2];

    bot.sendMessage(chatId, "⏳ Verifying your Solana transaction...");
    const amount = await verifySolanaPayment(txHash, process.env.ADMIN_WALLET);
    if (!amount) {
        return bot.sendMessage(chatId, "❌ Invalid or failed transaction.");
    }

    const sellerShare = (0.8 * amount).toFixed(4);
    redis.set(`deal:${chatId}`, JSON.stringify({ txHash, seller, amount }));
    bot.sendMessage(chatId, `✅ Payment of ${amount} SOL confirmed.

Now ask @${seller} to transfer the username.
Once done, use /confirm and send proof.`);
});

bot.onText(/\/confirm/, async (msg) => {
    const chatId = msg.chat.id;
    const deal = JSON.parse(await redis.get(`deal:${chatId}`));
    if (!deal) return bot.sendMessage(chatId, "❌ No active deal found.");

    bot.sendMessage(chatId, `🔓 Username transfer confirmed.
Sending ${0.8 * deal.amount} SOL to @${deal.seller}.`);
    // Add payout command to wallet interface
});

bot.onText(/\/dispute/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "⚠️ Dispute logged. Please describe your issue.
An admin will review it shortly.");
});