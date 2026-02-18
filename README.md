# LUNAVEX Token Tracker

**Personal transaction tracker for LUNAVEX (LXV).** Saves all entries to a database so you never have to re-enter.

---

## Deploy to Railway

### 1. Push token-tracker to GitHub

Make sure the `token-tracker` folder is in your repo. You can either:

- **Option A:** Push the whole repo (main site + token-tracker)
- **Option B:** Create a separate repo with just the `token-tracker` folder contents

### 2. Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. **New Project** → **Deploy from GitHub repo**
3. Select your repo

**If token-tracker is inside your main repo:**

4. After the service is created: **Settings** → **Root Directory** → enter `token-tracker`

### 3. Add PostgreSQL Database

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Click on your **app service** → **Variables** → **Connect** the PostgreSQL database (Railway will add `DATABASE_URL` automatically)

### 4. Deploy

Railway will build and deploy. Your tracker will be live at a URL like:

`https://your-app.up.railway.app`

---

## Local Development

### 1. Install Dependencies

```bash
cd token-tracker
npm install
```

### 2. Set Up Database

**Option A – Free hosted Postgres (Neon/Supabase)**

1. Create a free DB at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com)
2. Copy the connection string
3. Create `.env`:
   ```
   DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
   ```

**Option B – Local Postgres**

```bash
# If you have Postgres installed
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lunavex_tracker"
```

### 3. Push Schema & Run

```bash
npx prisma db push
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

---

## Features

- Add transactions: **Liquidity Add**, **Liquidity Remove**, **Buy**, **Sell**
- **Import history** – Paste JSON array to bulk-load from DexScreener/screenshot
- **Sync from chain** – Auto-fetch new Swap/Mint/Burn events from BSCScan (requires `BSCSCAN_API_KEY`)
- Auto-calculates: **Total Supply**, **Total Liquidity Added**, **Tokens in Pool**, **USDT in Pool**
- Live token price and pool stats from DexScreener
- Estimated pool value (USD)
- Delete transactions
- All data saved in PostgreSQL

### Chain sync (optional)

To enable **Sync from chain**, add `ETHERSCAN_API_KEY` in Railway Variables. Get a key at [etherscan.io/apidashboard](https://etherscan.io/apidashboard) (Etherscan API V2, works for BSC). `BSCSCAN_API_KEY` is also supported for backwards compatibility.

---

## Transaction Logic

| Type             | Tokens in Pool | USDT in Pool |
|------------------|----------------|--------------|
| Liquidity Add    | +              | +            |
| Liquidity Remove | −              | −            |
| Buy              | −              | +            |
| Sell             | +              | −            |

---

*For personal use only. Keep your Railway project private.*
