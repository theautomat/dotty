# Helius + Firebase Integration - Implementation Summary

This document describes the completed implementation of the Helius webhook integration with Firebase Firestore for the treasure hiding system.

## What Was Implemented

### 1. Updated Data Schema

**Collection Name**: `treasureDeposits` (camelCase)

**Document Structure**:
```typescript
{
  // Transaction identifiers
  txSignature: string,
  walletAddress: string,

  // Treasure details
  amount: number,
  tokenType: string,

  // Status tracking
  status: 'active' | 'claimed' | 'expired',

  // Timestamps
  hiddenAt: string,         // When treasure was hidden
  createdAt: string,        // When saved to Firebase
  updatedAt: string,        // Last update
  claimedAt?: string,       // When claimed (optional)
  claimedBy?: string,       // Who claimed it (optional)

  // Blockchain metadata
  metadata: {
    blockTime: number | null,
    slot: number | null,
    fee: number | null,
    programId: string | null,
    treasureRecordPda: string,
  }
}
```

**Changes from Original**:
- ✅ Removed `monsterType` field
- ✅ Removed `depositedBy` field (using `walletAddress` instead)
- ✅ Changed `depositDate` to `hiddenAt`
- ✅ Changed `claimDate` to `claimedAt`
- ✅ Removed `coordinates` field
- ✅ Removed `tier` field
- ✅ Added `treasureRecordPda` to metadata

### 2. Updated Backend Services

#### treasure-service.ts
- ✅ Updated interfaces to match new schema
- ✅ Removed `_determineMonsterType()` function
- ✅ Changed collection name to `treasureDeposits` (camelCase)
- ✅ Updated all field names (`hiddenAt`, `claimedAt`, etc.)
- ✅ Updated log messages to use "hidden treasure" terminology

#### helius-webhook-handler.ts
- ✅ Implemented proper parsing for `hideTreasure` transactions
- ✅ Extracts token transfer information (wallet, amount, token mint)
- ✅ Identifies transactions involving program ID `7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh`
- ✅ Attempts to extract TreasureRecord PDA from account data
- ✅ Updated authentication documentation with Helius auth header details
- ✅ Added detailed logging for debugging

### 3. Updated Frontend

#### TreasureGalleryPage.tsx
- ✅ Removed mock data dependency
- ✅ Added Firebase client SDK integration
- ✅ Implemented real-time data fetching from Firestore
- ✅ Added loading and error states
- ✅ Updated UI to display real treasure data
- ✅ Removed all monster/tier references
- ✅ Updated search to filter by wallet address only
- ✅ Changed field names to match new schema (`hiddenAt`, etc.)
- ✅ Added blockchain info display (slot, transaction link to Solscan)

#### src/config/firebase.ts
- ✅ Created new Firebase client initialization
- ✅ Added support for Firebase emulator
- ✅ Proper error handling

### 4. Firebase Configuration

#### firebase.json
- ✅ Emulator configuration for Firestore (port 8080)
- ✅ UI enabled on port 4000

#### firestore.rules
- ✅ Updated collection name to `treasureDeposits`
- ✅ Public read access for treasure data
- ✅ Write access only via Admin SDK

#### firestore.indexes.json
- ✅ Updated collection name to `treasureDeposits`
- ✅ Updated field names to use `hiddenAt`
- ✅ Composite indexes for efficient queries:
  - `status` + `hiddenAt`
  - `walletAddress` + `hiddenAt`
  - `status` + `tokenType` + `hiddenAt`

### 5. NPM Scripts

Added new scripts to `package.json`:
```json
{
  "server:dev": "NODE_ENV=development tsx watch server.js",
  "firebase:emulator": "firebase emulators:start --only firestore",
  "test:webhook": "node test-helius-webhook.js"
}
```

### 6. Environment Configuration

Updated `.env.example` with:
- ✅ Firebase client-side emulator configuration
- ✅ Firebase server-side emulator configuration
- ✅ Helius webhook authentication header
- ✅ Detailed comments explaining each variable

## How to Test

### Local Development with Firebase Emulator

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Start Firebase Emulator**:
   ```bash
   npm run firebase:emulator
   ```
   This starts Firestore emulator on `localhost:8080` with UI on `localhost:4000`

3. **Configure Environment for Emulator**:
   Create a `.env` file and add:
   ```bash
   # Server-side emulator
   FIRESTORE_EMULATOR_HOST=localhost:8080

   # Client-side emulator
   VITE_USE_FIREBASE_EMULATOR=true
   VITE_FIRESTORE_EMULATOR_HOST=localhost
   VITE_FIRESTORE_EMULATOR_PORT=8080
   ```

4. **Start the Server**:
   ```bash
   npm run server:dev
   ```

5. **Start the Frontend**:
   ```bash
   npm run vite
   ```

6. **Test the Integration**:
   - Visit Treasure Gallery page at `http://localhost:5173/treasure-gallery`
   - Initially, it will show "No treasures hidden yet"
   - Use the webhook test script to simulate a treasure transaction
   - Refresh the page to see the new treasure

### Testing Helius Webhooks Locally

1. **Install ngrok** (for webhook testing):
   ```bash
   # Download from https://ngrok.com/download
   # Or via npm:
   npm install -g ngrok
   ```

2. **Start ngrok tunnel**:
   ```bash
   ngrok http 3000
   ```
   Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

3. **Configure Helius Webhook**:
   - Go to https://dev.helius.xyz/dashboard
   - Create new webhook
   - **Webhook Type**: Transaction
   - **Account Address**: `7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh`
   - **Webhook URL**: `https://abc123.ngrok.io/api/webhooks/helius`
   - **Auth Header**: Set a secret (e.g., `Bearer your-secret-key`)
   - Save the webhook

4. **Update Environment**:
   ```bash
   HELIUS_WEBHOOK_AUTH_HEADER=Bearer your-secret-key
   ```

5. **Hide Treasure on Blockchain**:
   - Use the HideTreasure.tsx component to hide treasure
   - Or run a test transaction via Solana program

6. **Monitor Webhook Receipt**:
   - Check server logs for "📥 Received Helius webhook"
   - Verify parsing logs show correct data
   - Confirm "✅ Hidden treasure saved" message
   - Check Firebase emulator UI at `localhost:4000` to see new document

### Testing with Production Firebase

1. **Create Firebase Project**:
   - Go to https://console.firebase.google.com
   - Create new project
   - Enable Firestore

2. **Get Firebase Credentials**:
   - Project Settings → General → Your apps
   - Copy Firebase SDK config
   - Add to `.env`:
     ```bash
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
     VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
     ```

3. **Get Service Account Key**:
   - Project Settings → Service Accounts
   - Generate new private key
   - Save as `firebase-service-account.json`
   - Add to `.env`:
     ```bash
     FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
     ```

4. **Deploy Firestore Rules and Indexes**:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

5. **Test End-to-End**:
   - Remove emulator config from `.env`
   - Restart server
   - Hide treasure on blockchain
   - Verify webhook saves to production Firestore
   - Check Treasure Gallery displays real data

## Helius Authentication Details

Based on research and Helius documentation:

**How It Works**:
1. When creating a webhook in Helius dashboard or via API, set an `authHeader` value
2. Helius sends this value in the `Authorization` header with each webhook request
3. Our server verifies the header matches `HELIUS_WEBHOOK_AUTH_HEADER` env var

**Example Setup**:
```bash
# In .env
HELIUS_WEBHOOK_AUTH_HEADER=Bearer my-secret-key-12345

# In Helius dashboard
# Set Auth Header: Bearer my-secret-key-12345
```

**Security Notes**:
- Use a strong, random string for the auth header
- Never commit the auth header to version control
- Rotate the secret periodically
- In development, you can skip auth by not setting the env var (logs warning)

## Architecture Flow

```
1. Player hides treasure via HideTreasure.tsx
   ↓
2. Transaction sent to Solana blockchain
   ↓
3. Program ID: 7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh
   ↓
4. Helius webhook monitors program transactions
   ↓
5. Webhook sends POST to /api/webhooks/helius
   ↓
6. Server verifies auth header
   ↓
7. parseHeliusTransaction() extracts treasure data
   ↓
8. treasureService.saveTreasureDeposit() saves to Firestore
   ↓
9. Document ID: transaction signature (for idempotency)
   ↓
10. TreasureGalleryPage.tsx fetches and displays treasures
```

## Troubleshooting

### Webhook Not Receiving Data
- ✅ Check Helius dashboard webhook status
- ✅ Verify ngrok tunnel is active
- ✅ Check server logs for incoming requests
- ✅ Verify auth header matches

### Data Not Appearing in Firebase
- ✅ Check server logs for parsing errors
- ✅ Verify Firebase credentials are correct
- ✅ Check Firestore rules allow writes via Admin SDK
- ✅ View Firebase emulator UI at localhost:4000

### Frontend Not Displaying Data
- ✅ Check browser console for errors
- ✅ Verify Firebase client config is correct
- ✅ Check if using emulator, env vars are set
- ✅ Confirm treasures exist in Firestore

### Parsing Errors
- ✅ Check transaction involves correct program ID
- ✅ Verify transaction includes token transfers
- ✅ Check Helius payload format in server logs
- ✅ Ensure transaction signature is present

## Next Steps

As outlined in the SOW, remaining tasks include:

1. **Deploy Server** - Deploy to Heroku, Google Cloud Run, or similar
2. **Configure Production Webhook** - Point to deployed server URL
3. **End-to-End Testing** - Test full flow from hiding to claiming
4. **Claim Flow Implementation** - Add treasure claiming functionality
5. **Real-time Updates** - Add Firebase onSnapshot for live updates
6. **Analytics** - Track treasure statistics and trends

## Files Modified

- ✅ `treasure-service.ts` - Updated schema and removed deprecated fields
- ✅ `helius-webhook-handler.ts` - Implemented proper transaction parsing
- ✅ `src/pages/TreasureGalleryPage.tsx` - Added Firebase integration
- ✅ `src/config/firebase.ts` - Created Firebase client config
- ✅ `firestore.rules` - Updated collection name and rules
- ✅ `firestore.indexes.json` - Updated indexes for new schema
- ✅ `package.json` - Added new NPM scripts
- ✅ `.env.example` - Updated with emulator config

## Resources

- **Helius Documentation**: https://docs.helius.dev/webhooks-and-websockets/webhooks
- **Firebase Documentation**: https://firebase.google.com/docs/firestore
- **Solana Program**: `solana/programs/game/src/lib.rs`
- **Program ID**: `7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh`

---

**Implementation Status**: ✅ Complete
**Last Updated**: 2025-11-10
