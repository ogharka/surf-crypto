# Surf Intelligence — Crypto Dashboard

A premium crypto price dashboard powered by the [Surf AI API](https://asksurf.ai).

## Features
- Live prices for BTC, ETH, SOL, BNB, XRP (+ add any token)
- 24h change, high, low, volume per token
- 1-hour candlestick chart (24 candles)
- Latest news feed per token
- Auto-refresh every 60 seconds
- Dark, premium UI

## Local development

Just open `index.html` in your browser — no build step needed.

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Framework preset: **Other** (static site)
4. Click Deploy

## API Key

The Surf API key is stored in `app.js`. To keep it private, move it to a Vercel environment variable:

1. In Vercel dashboard → Settings → Environment Variables → add `SURF_API_KEY`
2. Use a serverless function (`/api/proxy.js`) to forward requests server-side

## License
MIT
