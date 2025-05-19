# MysteryEscrowBot

A Telegram bot for managing Solana-based escrow of username deals.

## Features

- Pay with Solana (`/payme` command)
- Auto-confirmation & payout (80/20 fee split)
- Redis-based deal tracking
- Basic dispute handling

## Setup

1. Clone this repo.
2. Install dependencies: `npm install`
3. Rename `.env.example` to `.env` and fill in values.
4. Run the bot: `node bot.js`

## Commands

- `/payme <TxHash> @SellerHandle` — Initiate payment.
- `/confirm` — Confirm receipt and release funds.
- `/dispute` — Open a dispute with the admin.

## License

MIT