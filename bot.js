require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const Redis = require("ioredis");
const { verifySolanaPayment } = require("./utils/solana");
const app = express();
app.use(express.json());

const bot = new TelegramBot(process.env.TG_TOKEN, { webHook: { port: process.env.PORT || 3000 } });
const redis = new Redis(process.env.REDIS_URL);

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

const APP_URL = process.env.APP_URL;
bot.setWebHook(`${APP_URL}/bot${process.env.TG_TOKEN}`);

app.post(`/bot${process.env.TG_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

const funnyNames = [
  "CryptoCornelius", "TokenTommy", "GasFeeGary", "ChainChad", "WalletWanda",
  "DeFiDiana", "SolanaSally", "ETHElon", "LedgerLarry", "NonceNina"
];

function getRandomFunnyName() {
  return funnyNames[Math.floor(Math.random() * funnyNames.length)] + Math.floor(Math.random() * 1000);
}

async function assignFunnyName(userId) {
  const name = getRandomFunnyName();
  await redis.set(`user_name_${userId}`, name);
  return name;
}

async function getOrCreateUserName(userId) {
  const existing = await redis.get(`user_name_${userId}`);
  if (existing) return existing;
  return await assignFunnyName(userId);
}

async function isVIP(userId) {
  const txCount = await redis.get(`user_tx_count_${userId}`);
  return parseInt(txCount || 0) >= 5; // Define VIP threshold here
}

async function incrementTransactionCount(userId) {
  await redis.incr(`user_tx_count_${userId}`);
}

bot.onText(/\/payme/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  await getOrCreateUserName(userId);
  await incrementTransactionCount(userId);

  const isVipUser = await isVIP(userId);
  const feePercentage = isVipUser ? 0.005 : 0.01; // 0.5% for VIPs, 1% for others

  bot.sendMessage(chatId, `You're ${isVipUser ? 'a VIP 🎉' : 'not a VIP yet'} — fee is ${feePercentage * 100}%`);

  // Proceed with the rest of the payment flow
});

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const name = await getOrCreateUserName(userId);

  bot.sendMessage(chatId, `Welcome, ${name}! Type /payme to begin.`);
});
