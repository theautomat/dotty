# Helius Webhook Setup Guide

This guide will help you test the basic Helius webhook integration for tracking treasure deposits.

## What This Does

When someone hides treasure (calls `hide_treasure` on your Solana program), Helius will:
1. Detect the new TreasureRecord account creation
2. Call your server's webhook endpoint
3. Your server logs the event to the console

This is a **proof-of-concept** to test if Helius works for our use case.

---

## Step 1: Start Your Server

```bash
npm run server:prod
```

The server should be running on port 3000 (or your configured PORT).

---

## Step 2: Expose Localhost with ngrok

Since Helius needs to call your server from the internet, you need a public URL.

### Install ngrok (if not already installed):

**macOS (Homebrew):**
```bash
brew install ngrok
```

**Or download from:** https://ngrok.com/download

### Run ngrok:

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:3000
```

**Copy that HTTPS URL** (e.g., `https://abc123.ngrok.io`) - you'll need it for Helius.

---

## Step 3: Configure Helius

### A. Create Helius Account

1. Go to https://helius.dev
2. Sign up (free tier is fine)
3. Create an API key

### B. Create a Webhook

1. In Helius dashboard, go to **Webhooks**
2. Click **"Create Webhook"**
3. Configure:

   **Webhook URL:**
   ```
   https://YOUR_NGROK_URL.ngrok.io/api/webhooks/helius
   ```
   (Replace YOUR_NGROK_URL with your actual ngrok URL)

   **Webhook Type:** Select **"Enhanced"** (recommended)

   **Account Addresses:** Add your Solana program ID
   ```
   YOUR_PROGRAM_ID_HERE
   ```
   (Find this in your Solana deployment - it's the program public key)

   **Transaction Types:** Select:
   - ✅ **Account Create** (triggers when TreasureRecord is created)

   **Network:** Select **devnet** or **mainnet** (match your deployment)

4. Click **"Create"**

---

## Step 4: Test the Webhook

### Option A: Hide Treasure from Test Script

```bash
cd solana
anchor test
```

This will run the test suite which includes hiding treasure.

### Option B: Use the Hide Treasure HTML Page

1. Open `http://localhost:3000/hide-treasure-test.html` in your browser
2. Connect Phantom wallet
3. Hide treasure
4. Watch your server logs

### Expected Result:

In your server console, you should see:

```
🎉 ===== HELIUS WEBHOOK RECEIVED =====
Timestamp: 2025-11-09T...
Payload: {
  "type": "ACCOUNT_CREATE",
  "account": {
    "publicKey": "...",
    "lamports": 1000000,
    "data": "...",
    "owner": "YOUR_PROGRAM_ID"
  },
  ...
}
=====================================
```

---

## Step 5: Verify the Data

Once you receive a webhook, check the logged payload for:

- **account.publicKey** - The TreasureRecord PDA address
- **account.data** - Base64-encoded account data (contains player, amount, tier, etc.)
- **account.owner** - Should be your program ID

You can decode the account data to extract treasure details:
- Player wallet (bytes 8-40)
- Amount deposited (bytes 40-48)
- Tier (byte 57)
- Claimed status (byte 56)

---

## Troubleshooting

### Webhook Not Received?

**Check:**
1. Is ngrok still running? (URLs expire when ngrok restarts)
2. Is your server running on port 3000?
3. Did you use the correct ngrok HTTPS URL in Helius?
4. Is the program ID correct in Helius webhook config?
5. Did you select "Account Create" event type?

### Server Errors?

**Check:**
- Server logs for errors
- Test the endpoint manually:
  ```bash
  curl -X POST http://localhost:3000/api/webhooks/helius \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'
  ```
  Should return: `{"received":true,"timestamp":...}`

### ngrok URL Changed?

ngrok free tier generates new URLs on each restart. You'll need to:
1. Update the Helius webhook URL
2. Or upgrade to ngrok paid for static URLs
3. Or deploy to production (Heroku, Vercel, etc.) for permanent URL

---

## Next Steps After Testing

Once you confirm Helius webhooks work:

1. **Parse the webhook data** - Extract treasure details from the payload
2. **Store in Firebase** - Save to database for fast queries
3. **Build UI** - Display treasures on `/treasures` page
4. **Add real-time updates** - Use webhooks to update UI live

---

## Cost & Limits

**Helius Free Tier:**
- 100,000 credits/month
- 1 credit per webhook call
- Should be plenty for testing and early launch

**ngrok Free Tier:**
- New URL on each restart
- 40 connections/minute limit
- Good for development, not production

**Production:** Deploy your server to Heroku/Vercel/Railway for a permanent webhook URL.

---

## Questions?

- **Helius Docs:** https://docs.helius.dev/webhooks/webhooks-summary
- **ngrok Docs:** https://ngrok.com/docs
- **Solana Program:** Check `solana/programs/game/src/lib.rs` for TreasureRecord structure
