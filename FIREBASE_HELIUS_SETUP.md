# Firebase & Helius Local Testing Setup Guide

This guide will help you set up and test the Firebase Admin SDK and Helius webhook integration locally.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Firebase Setup](#firebase-setup)
4. [Helius Setup](#helius-setup)
5. [Local Testing with Firebase Emulator](#local-testing-with-firebase-emulator)
6. [Testing the Webhook](#testing-the-webhook)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Architecture

```
┌─────────────┐
│   Player    │
│   Wallet    │
└──────┬──────┘
       │
       │ 1. Deposit Transaction
       ▼
┌─────────────┐
│   Solana    │
│  Blockchain │
└──────┬──────┘
       │
       │ 2. Transaction Detected
       ▼
┌─────────────┐
│   Helius    │
│  Webhook    │
└──────┬──────┘
       │
       │ 3. POST /api/webhooks/helius
       ▼
┌─────────────┐
│ Your Server │
│  (Express)  │
└──────┬──────┘
       │
       │ 4. Store Transaction
       ▼
┌─────────────┐
│  Firebase   │
│  Firestore  │
└─────────────┘
```

### What Gets Stored

When a treasure deposit transaction occurs:
- Transaction signature
- Wallet address
- Deposit amount
- Token type (SOL, USDC, BONK, etc.)
- Timestamp
- Status (active, claimed, expired)
- Monster type (determined by amount)
- Transaction metadata

---

## Prerequisites

### Required Accounts
1. **Firebase Account** - https://console.firebase.google.com/
2. **Helius Account** - https://www.helius.dev/

### Required Software
```bash
# Node.js (v20.19.0 or higher)
node --version

# Firebase CLI
npm install -g firebase-tools

# Verify installation
firebase --version
```

---

## Firebase Setup

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name (e.g., "dotty-game")
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Select "Start in production mode"
4. Choose a location (e.g., us-central1)
5. Click "Enable"

### 3. Get Firebase Configuration

#### For Client-Side (Web App)

1. Go to Project Settings (gear icon) > General
2. Scroll to "Your apps" section
3. Click "Web" (</> icon)
4. Register your app
5. Copy the configuration values to your `.env`:

```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

#### For Server-Side (Firebase Admin)

**Option 1: Service Account Key (Recommended for Local Dev)**

1. Go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `firebase-service-account.json` in your project root
4. Add to `.env`:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

**Option 2: Environment Variables (Production)**

Extract from the service account JSON file:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key here\n-----END PRIVATE KEY-----\n"
```

### 4. Configure Security Rules

The project includes Firestore rules in `firestore.rules`:

```javascript
// Anyone can read treasure deposits and game stats
// Only server (via Firebase Admin SDK) can write treasure deposits
```

To deploy rules:
```bash
firebase deploy --only firestore:rules
```

---

## Helius Setup

### 1. Create Helius Account

1. Go to https://www.helius.dev/
2. Sign up for a free account
3. Verify your email

### 2. Create Webhook

1. Go to Helius Dashboard > Webhooks
2. Click "Create Webhook"
3. Configure:
   - **Webhook URL**: `https://your-domain.com/api/webhooks/helius`
     - For local testing: Use ngrok (see below)
   - **Transaction Type**: Select "Enhanced" or "Raw"
   - **Account Addresses**: Add your Solana program ID
   - **Auth Header**: Set a secure random string
4. Save the webhook

### 3. Add Auth Header to Environment

Generate a secure random string and add to `.env`:

```bash
# Generate a secure random string:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env:
HELIUS_WEBHOOK_AUTH_HEADER=your_generated_random_string
```

### 4. Local Testing with ngrok (Optional)

To test webhooks locally, expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run server

# In another terminal, expose port 3000
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update your Helius webhook URL to: https://abc123.ngrok.io/api/webhooks/helius
```

---

## Local Testing with Firebase Emulator

### 1. Install Firebase Emulator

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init

# Select:
# - Firestore
# - Emulators

# Install emulators
firebase init emulators
```

The project includes `firebase.json` with emulator configuration:
- Firestore: `localhost:8080`
- UI: `http://localhost:4000`

### 2. Start Firebase Emulator

```bash
firebase emulators:start
```

You should see:
```
✔  Firestore Emulator UI running at http://localhost:4000
✔  All emulators ready!
```

### 3. Configure Server to Use Emulator

Add to `.env`:
```bash
FIRESTORE_EMULATOR_HOST=localhost:8080
```

### 4. Start Your Server

```bash
npm run server
```

You should see:
```
🔧 Using Firebase Emulator at localhost:8080
✅ Firebase Admin initialized (Project: your-project)
Server running at http://localhost:3000/
```

---

## Testing the Webhook

### 1. Manual Test with Test Script

The project includes `test-helius-webhook.js` for simulating Helius webhooks:

```bash
# Basic test with defaults (2.5 SOL)
node test-helius-webhook.js

# Custom amount and token
node test-helius-webhook.js --amount 10 --token BONK

# Custom wallet address
node test-helius-webhook.js --wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

# See all options
node test-helius-webhook.js --help
```

### 2. Manual Test with curl

```bash
# Set your auth header
export AUTH_HEADER="your_auth_header_here"

# Send test webhook
curl -X POST http://localhost:3000/api/webhooks/helius \
  -H "Content-Type: application/json" \
  -H "Authorization: $AUTH_HEADER" \
  -d '[{
    "signature": "TestSignature123456789",
    "type": "TRANSFER",
    "timestamp": 1699999999,
    "nativeTransfers": [{
      "fromUserAccount": "TestWallet123",
      "toUserAccount": "TreasureVault456",
      "amount": 2500000000
    }]
  }]'
```

### 3. Verify in Firebase Emulator

1. Open http://localhost:4000
2. Click "Firestore"
3. You should see the `treasure-deposits` collection
4. Click on a document to see the stored treasure data

### 4. Query Treasures via API

```bash
# Get all active treasures
curl http://localhost:3000/api/treasures

# Get treasures by wallet
curl http://localhost:3000/api/treasures/wallet/YOUR_WALLET_ADDRESS

# Get specific treasure by signature
curl http://localhost:3000/api/treasures/TestSignature123456789

# Update treasure status
curl -X PATCH http://localhost:3000/api/treasures/TestSignature123456789 \
  -H "Content-Type: application/json" \
  -d '{"status": "claimed", "claimedBy": "ClaimerWallet123"}'
```

### 5. Test Webhook Health

```bash
curl http://localhost:3000/api/webhooks/helius/health
```

Expected response:
```json
{
  "success": true,
  "service": "Helius Webhook Handler",
  "status": "online",
  "timestamp": "2025-11-09T...",
  "firebaseReady": true
}
```

---

## Production Deployment

### 1. Deploy to Firebase

```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Cloud Functions (if using)
firebase deploy --only functions
```

### 2. Set Environment Variables

For hosting providers like Heroku, Vercel, or Railway:

```bash
# Set all required environment variables
# Use FIREBASE_* env vars instead of service account file

# Example for Heroku:
heroku config:set FIREBASE_PROJECT_ID=your-project-id
heroku config:set FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@...
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
heroku config:set HELIUS_WEBHOOK_AUTH_HEADER=your_random_string
```

### 3. Update Helius Webhook URL

1. Go to Helius Dashboard > Webhooks
2. Update webhook URL to your production URL:
   - `https://your-domain.com/api/webhooks/helius`

### 4. Test Production Webhook

Monitor your server logs for incoming webhooks:
```bash
# View logs (Heroku example)
heroku logs --tail

# Look for:
# 📥 Received Helius webhook
# ✅ Processed treasure deposit: <signature>
```

---

## API Endpoints

### Webhook Endpoint
```
POST /api/webhooks/helius
Headers:
  - Authorization: <your-auth-header>
  - Content-Type: application/json
```

### Treasure Endpoints
```
GET  /api/treasures                    - Get all active treasures
GET  /api/treasures/:signature         - Get treasure by signature
GET  /api/treasures/wallet/:address    - Get treasures by wallet
PATCH /api/treasures/:signature        - Update treasure status
GET  /api/webhooks/helius/health       - Webhook health check
```

---

## Troubleshooting

### Firebase Admin Not Initializing

**Error**: `Firebase Admin not configured`

**Solution**:
1. Check that `.env` has Firebase credentials
2. Verify service account JSON path is correct
3. Check environment variables are loaded:
   ```bash
   node -e "require('dotenv').config(); console.log(process.env.FIREBASE_PROJECT_ID)"
   ```

### Webhook Authorization Fails

**Error**: `Unauthorized - invalid authorization header`

**Solution**:
1. Check `HELIUS_WEBHOOK_AUTH_HEADER` in `.env`
2. Verify it matches the auth header in Helius webhook config
3. Test with curl to isolate the issue

### Firestore Emulator Not Connecting

**Error**: Connection refused to `localhost:8080`

**Solution**:
1. Ensure Firebase emulator is running: `firebase emulators:start`
2. Check `FIRESTORE_EMULATOR_HOST=localhost:8080` in `.env`
3. Verify port 8080 is not in use: `lsof -i :8080`

### Transactions Not Saving

**Error**: `Firebase Admin not initialized`

**Solution**:
1. Check server logs for Firebase initialization
2. Verify Firestore is enabled in Firebase Console
3. Check Firestore rules allow writes from Admin SDK

### Helius Webhook Not Triggering

**Solution**:
1. Verify webhook is active in Helius dashboard
2. Check webhook URL is accessible (use ngrok for local testing)
3. Verify Solana program ID matches your game program
4. Test with the included `test-helius-webhook.js` script

---

## Additional Resources

- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
- [Helius Webhooks Documentation](https://docs.helius.dev/webhooks-and-websockets/webhooks)
- [Helius API Reference](https://docs.helius.dev/api-reference)
- [Solana Cookbook](https://solanacookbook.com/)

---

## Quick Start Checklist

- [ ] Create Firebase project
- [ ] Enable Firestore
- [ ] Download service account key
- [ ] Create Helius account
- [ ] Create Helius webhook
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in Firebase credentials
- [ ] Fill in Helius auth header
- [ ] Install dependencies: `npm install`
- [ ] Start Firebase emulator: `firebase emulators:start`
- [ ] Start server: `npm run server`
- [ ] Test webhook: `node test-helius-webhook.js`
- [ ] Verify in Firebase UI: `http://localhost:4000`

---

**Need help?** Check the troubleshooting section or open an issue in the repository.
