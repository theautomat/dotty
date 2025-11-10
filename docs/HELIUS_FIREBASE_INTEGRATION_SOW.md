# Helius + Firebase Integration - Scope of Work

## Project Overview

Integrate Helius webhooks with Firebase Firestore to automatically capture and store treasure hiding transactions from the Solana game program. This will enable the treasure gallery UI to display treasure deposits from players.

**Status**: The treasure hiding feature is working. We now need to connect the transaction flow from Solana → Helius → Firebase → UI.

---

## Architecture Overview

```
Player Wallet
    ↓
HideTreasure.tsx (Frontend Component)
    ↓
Solana Blockchain (Game Program)
    ↓
Helius Webhook (Transaction Monitor)
    ↓
Express Server (server.js) → helius-webhook-handler.ts
    ↓
treasure-service.ts
    ↓
Firebase Firestore
    ↓
TreasureGalleryPage.tsx (Display UI)
```

---

## Current State Assessment

### ✅ Working Components

1. **Solana Program** (`solana/programs/game/src/lib.rs`)
   - Program ID: `7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh`
   - `hide_treasure` instruction working correctly
   - Creates `TreasureRecord` PDA with player, amount, timestamp, claimed status
   - Successfully tested with treasure hiding transactions

2. **Frontend Component** (`src/components/solana/HideTreasure.tsx`)
   - React component for hiding treasure
   - Integrates with Phantom wallet
   - Successfully executes treasure hiding transactions

3. **Express Server** (`server.js`)
   - Webhook endpoint: `POST /api/webhooks/helius`
   - Health check: `GET /api/webhooks/helius/health`
   - Firebase Admin SDK initialization
   - Helius authentication verification

4. **Webhook Handler** (`helius-webhook-handler.ts`)
   - Functions: `verifyHeliusAuth`, `parseHeliusTransaction`, `handleHeliusWebhook`
   - **NEEDS UPDATE**: Currently parses generic SOL/SPL transfers
   - **MUST UPDATE**: Parse `hideTreasure` instruction data and account structure

5. **Treasure Service** (`treasure-service.ts`)
   - Complete Firebase CRUD operations
   - `saveTreasureDeposit()` - Saves treasure to Firestore
   - `getTreasureDeposit()` - Gets treasure by signature
   - `getActiveTreasures()` - Gets all active treasures
   - `getTreasuresByWallet()` - Gets treasures by wallet address
   - `updateTreasureStatus()` - Updates claim status

6. **Firebase Admin Config** (`firebase-admin-config.ts`)
   - Supports service account key file
   - Supports environment variables
   - Supports Firebase emulator for local testing
   - Ready to use

7. **Documentation**
   - `FIREBASE_HELIUS_SETUP.md` - Comprehensive setup guide
   - `HELIUS_SETUP.md` - Basic webhook setup
   - `test-helius-webhook.js` - Testing utility

8. **UI Components**
   - `TreasureGalleryPage.tsx` - Gallery display (currently uses mock data)
   - `TreasureDepositPage.tsx` - Deposit page example (needs to be renamed to HideTreasurePage)

### ⚠️ Needs Implementation

1. **Update `helius-webhook-handler.ts`** to parse `hideTreasure` transactions
2. **Configure Helius webhook** to monitor program ID
3. **Update `TreasureGalleryPage.tsx`** to fetch from Firebase instead of mock data
4. **Remove all "deposit" terminology** and replace with "hide treasure" terminology
5. **Remove all tier and monster references** from code and UI
6. **Set up Firebase credentials** for AI developer environment
7. **Deploy server** with webhook endpoint
8. **Test end-to-end flow** from transaction to UI display

---

## Technical Requirements

### 1. Solana Program Details

**Program ID**: `7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh`

**Instruction**: `hide_treasure`
- **Name**: `hideTreasure` (camelCase in IDL)
- **Arguments**:
  - `amount: u64` - Token amount in smallest units (6 decimals)
  - `treasureId: i64` - Unique identifier (timestamp)

**Accounts** (in order):
1. `player` - Signer wallet (mut)
2. `playerTokenAccount` - Player's SPL token account (mut)
3. `vaultTokenAccount` - Vault's SPL token account (mut)
4. `vault` - Vault PDA (mut) - Seeds: `["vault"]`
5. `treasureRecord` - Treasure record PDA (mut) - Seeds: `["treasure", player_pubkey, treasure_id]`
6. `tokenProgram` - SPL Token program
7. `systemProgram` - System program

**TreasureRecord PDA Structure**:
```rust
pub struct TreasureRecord {
    pub player: Pubkey,      // 32 bytes - Player's wallet address
    pub amount: u64,         // 8 bytes - Amount hidden (in smallest units)
    pub timestamp: i64,      // 8 bytes - Treasure ID (timestamp when hidden)
    pub claimed: bool,       // 1 byte - Has treasure been claimed?
    pub tier: u8,           // 1 byte - Tier (ignore this field)
    pub bump: u8,           // 1 byte - PDA bump seed
}
```

**Note**: The `tier` field exists in the program but should be ignored. We're only tracking player address, amount, timestamp, and claimed status.

### 2. Helius Webhook Configuration

**Webhook Type**: Transaction webhook

**Program Address to Monitor**: `7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh`

**Transaction Types**: Account creation and instruction calls

**Webhook URL Format**:
- Local testing: `https://<ngrok-id>.ngrok.io/api/webhooks/helius`
- Production: `https://yourdomain.com/api/webhooks/helius`

**Authentication**:
- Helius sends authentication header with each webhook request
- Set `HELIUS_WEBHOOK_AUTH_HEADER` environment variable with the secret you configure in Helius dashboard
- Server verifies using `verifyHeliusAuth()` function
- **Research needed**: Verify exact header format Helius uses (likely `Authorization: Bearer <token>`)

### 3. Firebase Firestore Schema

**Collection**: `treasureDeposits` (camelCase)

**Document ID**: Transaction signature (for idempotency)

**Document Structure**:
```typescript
{
  // Transaction identifiers
  txSignature: string,           // Solana transaction signature
  walletAddress: string,          // Player wallet address who hid the treasure

  // Treasure details
  amount: number,                 // Amount in smallest units (100000000 = 100 tokens)
  tokenType: string,              // Token mint address

  // Status tracking
  status: 'active' | 'claimed' | 'expired',

  // Timestamps
  hiddenAt: string,               // ISO timestamp when treasure was hidden
  createdAt: string,              // ISO timestamp when saved to Firebase
  updatedAt: string,              // ISO timestamp of last update
  claimedAt?: string,             // ISO timestamp when claimed (optional)
  claimedBy?: string,             // Wallet who claimed (optional)

  // Blockchain metadata
  metadata: {
    blockTime: number | null,     // Block timestamp
    slot: number | null,          // Slot number
    fee: number | null,           // Transaction fee
    programId: string | null,     // Program ID
    treasureRecordPda: string,    // Address of TreasureRecord PDA
  }
}
```

**Important**: Remove all references to `monsterType`, `tier`, `coordinates`, and `depositedBy`. We only need wallet address, amount, token type, and status.

---

## Implementation Tasks

### Task 1: Update Webhook Parser 🔴 **CRITICAL**

**File**: `helius-webhook-handler.ts`

**Current State**: Parses generic SOL and SPL token transfers

**Required Changes**:

1. **Parse `hideTreasure` instruction data**:
   - Identify transactions that call `hide_treasure` on program `7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh`
   - Extract instruction arguments: `amount` and `treasureId`
   - Extract account addresses from transaction

2. **Decode TreasureRecord PDA data**:
   - Fetch the TreasureRecord account data from the transaction
   - Decode the account data to extract:
     - `player: Pubkey` (32 bytes, offset 8)
     - `amount: u64` (8 bytes, offset 40)
     - `timestamp: i64` (8 bytes, offset 48)
     - `claimed: bool` (1 byte, offset 56)
   - Note: First 8 bytes are Anchor discriminator
   - Ignore the `tier` field

3. **Update `parseHeliusTransaction()` function**:
```typescript
export function parseHeliusTransaction(heliusPayload: HeliusTransaction[]): TreasureDepositData | null {
  for (const transaction of heliusPayload) {
    // Check if transaction involves our game program
    const isGameProgram = transaction.accountData?.some(
      account => account.account === '7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh'
    );

    if (!isGameProgram) continue;

    // Look for hideTreasure instruction in transaction
    // Parse instruction data to extract amount and treasureId

    // Find the TreasureRecord account in accountData
    // Decode the account data to extract player, amount, timestamp, claimed

    // Return TreasureDepositData object with all parsed information
    return {
      signature: transaction.signature,
      walletAddress: playerPubkey,
      amount: amountFromAccount,
      tokenType: tokenMintAddress,
      metadata: {
        blockTime: transaction.timestamp,
        slot: transaction.slot,
        fee: transaction.fee,
        programId: '7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh',
        treasureRecordPda: treasureRecordAddress,
      }
    };
  }

  return null;
}
```

**Parsing Resources**:
- Use `@solana/web3.js` for parsing transaction data
- Use `@coral-xyz/anchor` for deserializing account data
- Reference: `solana/target/idl/game.json` for instruction and account structure
- The IDL shows the exact instruction format and account order

**Testing**:
- Use `test-helius-webhook.js` to simulate webhooks
- Verify all fields are correctly parsed

### Task 2: Research Helius Authentication 🟡

**Research needed**: Determine exact authentication mechanism used by Helius webhooks

**Questions to answer**:
- What header does Helius send? (Likely `Authorization` or `X-Webhook-Auth`)
- What format? (Likely `Bearer <token>` or just the token value)
- Where in Helius dashboard do you set this?

**Action**: Document findings and update `verifyHeliusAuth()` function if needed.

### Task 3: Configure Helius Webhook 🟡

**Steps**:

1. **Create Helius Account** (if not already done)
   - Go to https://helius.dev
   - Sign up and get API key

2. **Create Webhook**:
   - Navigate to Webhooks dashboard
   - Create new webhook
   - Select "Transaction" webhook type
   - Configure:
     - **Account Address**: `7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh`
     - **Transaction Types**: All (or specifically Account Creation + Instruction)
     - **Webhook URL**: Your server endpoint
     - **Auth Header**: Set secret value, save to `HELIUS_WEBHOOK_AUTH_HEADER` env var

3. **Test with ngrok** (for local testing):
```bash
# Terminal 1: Start server
npm run server

# Terminal 2: Start ngrok
ngrok http 3001

# Use ngrok URL for webhook configuration
```

4. **Verify webhook receives data**:
   - Perform a test treasure hiding transaction
   - Check server logs for webhook receipt
   - Verify data is correctly parsed and saved to Firebase

### Task 4: Update Treasure Gallery UI 🟡

**File**: `src/pages/TreasureGalleryPage.tsx`

**Current State**: Uses `mockTreasureData.ts` for display

**Required Changes**:

1. **Remove mock data dependency**:
```typescript
// Remove: import { getTreasureStats, mockTreasureData } from '../data/mockTreasureData';
```

2. **Add Firebase client SDK**:
```typescript
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase'; // Firebase client config
```

3. **Replace data fetching**:
```typescript
// Replace mock data with Firebase query
const [treasures, setTreasures] = useState<TreasureDeposit[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchTreasures() {
    try {
      const treasuresRef = collection(db, 'treasureDeposits');
      const q = query(
        treasuresRef,
        where('status', '==', 'active'),
        orderBy('hiddenAt', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TreasureDeposit[];

      setTreasures(data);
    } catch (error) {
      console.error('Error fetching treasures:', error);
    } finally {
      setLoading(false);
    }
  }

  fetchTreasures();
}, []);
```

4. **Update UI to display**:
   - Wallet address
   - Token type
   - Amount
   - Hidden timestamp
   - Claimed status

5. **Update filters**:
   - Status filter (active/claimed/expired)
   - Token type filter

**Remove**:
- Search by wallet address
- Monster type references
- Tier references
- Coordinates

### Task 5: Remove "Deposit" Terminology and Monster/Tier References 🔴

**Files to update**:

1. **Rename/Update Pages**:
   - Rename `TreasureDepositPage.tsx` to `HideTreasurePage.tsx` (or update its purpose)
   - Update all references from "deposit" to "hide treasure"

2. **Remove from `treasure-service.ts`**:
   - Remove `monsterType` field from interface
   - Remove `_determineMonsterType()` function
   - Update `TreasureDepositData` interface to remove tier
   - Update `TreasureDeposit` interface to remove monster and tier fields
   - Change `depositDate` to `hiddenAt`
   - Change `depositedBy` to just use `walletAddress`

3. **Remove from UI components**:
   - Remove any monster type displays
   - Remove tier displays
   - Remove coordinate references
   - Update text from "deposit" to "hide treasure" or "hidden treasure"

4. **Update mock data** (if still used anywhere):
   - Remove `mockTreasureData.ts` or update to new schema

### Task 6: Firebase Setup for AI Developer 🟡

**Challenge**: AI developer working on different machine may not have your Firebase credentials.

**Options**:

**Option A: Use Firebase Emulator (Recommended for Development)**
```bash
# Install Firebase tools
npm install -g firebase-tools

# Initialize emulator
firebase init emulators

# Start emulator
firebase emulators:start --only firestore

# Set environment variable
export FIRESTORE_EMULATOR_HOST=localhost:8080
```

**Benefits**:
- No credentials needed
- Works offline
- Fast development
- Data is isolated

**Option B: Create Separate Firebase Project**
- Create a new Firebase project specifically for AI development
- Generate service account key for that project
- Share only that service account key
- Keep production credentials separate

**Option C: Share Service Account (Less Recommended)**
- Share the service account JSON file securely
- AI developer sets `FIREBASE_SERVICE_ACCOUNT_PATH` environment variable

**Recommendation**: Use Firebase Emulator for all development and testing. Only use real Firebase for final production deployment.

**Production Setup**:

1. **Create Firebase project**:
   - Go to https://console.firebase.google.com
   - Create new project
   - Enable Firestore

2. **Generate service account key**:
   - Project Settings → Service Accounts
   - Generate new private key
   - Save JSON file securely

3. **Configure server environment variables**:
```bash
# Option 1: Service account key file
export FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json

# Option 2: Individual environment variables
export FIREBASE_PROJECT_ID=your-project-id
export FIREBASE_CLIENT_EMAIL=your-client-email@project.iam.gserviceaccount.com
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Security Rules**:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /treasureDeposits/{docId} {
      // Allow read for authenticated users
      allow read: if request.auth != null;

      // Only server (via Admin SDK) can write
      allow write: if false;
    }
  }
}
```

### Task 7: Server Deployment 🟡

**Deployment Requirements**:
- Node.js environment
- Environment variables configured
- Public HTTPS endpoint for webhook
- Persistent storage not required (stateless)

**Simple Deployment Options**:
1. **Heroku** - Free tier available
2. **Google Cloud Run** - Pay per use
3. **DigitalOcean App Platform** - Simple setup
4. **Fly.io** - Good for Node.js apps

**Environment Variables to Set**:
- `HELIUS_WEBHOOK_AUTH_HEADER`
- `FIREBASE_SERVICE_ACCOUNT_PATH` or Firebase env vars
- `PORT` (usually 3001 or provided by platform)

**Note**: Specific deployment instructions depend on chosen platform. All major platforms have good Node.js documentation.

### Task 8: End-to-End Testing 🔴 **CRITICAL**

**Test Cases**:

1. **Basic Flow**:
   - [ ] Hide treasure with 100 tokens
   - [ ] Hide treasure with 1000 tokens
   - [ ] Hide treasure with 10000 tokens
   - [ ] Verify webhook receives transaction
   - [ ] Verify data saved to Firebase with correct schema
   - [ ] Verify data displays in TreasureGalleryPage
   - [ ] Verify all fields (wallet, amount, token type, timestamp)

2. **Edge Cases**:
   - [ ] Test duplicate webhook (same transaction twice) - should be idempotent
   - [ ] Test invalid transaction (non-game program) - should be ignored
   - [ ] Test webhook authentication failure - should reject

3. **UI Testing**:
   - [ ] Test status filter (active/claimed)
   - [ ] Test token type filter
   - [ ] Test loading states
   - [ ] Verify no monster/tier references in UI
   - [ ] Verify all text uses "hide treasure" terminology

4. **Error Handling**:
   - [ ] Test network failures
   - [ ] Test Firebase write failures
   - [ ] Test malformed webhook data
   - [ ] Verify error logging

**Monitoring**:
- Check server logs for webhook receipts
- Monitor Firebase console for new documents
- Monitor Helius dashboard for webhook status

---

## Configuration Files

### Environment Variables

**Server (.env)**:
```bash
# Helius
HELIUS_WEBHOOK_AUTH_HEADER=your-secret-auth-header

# Firebase (Option 1: Service Account Path)
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json

# Firebase (Option 2: Individual Variables)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Emulator (for local testing - RECOMMENDED)
FIRESTORE_EMULATOR_HOST=localhost:8080

# Server
PORT=3001
NODE_ENV=development
```

**Frontend (.env)**:
```bash
# Firebase Client Config
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### NPM Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "server": "tsx server.js",
    "server:dev": "tsx watch server.js",
    "firebase:emulator": "firebase emulators:start --only firestore",
    "test:webhook": "node test-helius-webhook.js"
  }
}
```

---

## Acceptance Criteria

### MVP Requirements

1. ✅ **Webhook Receives Transactions**:
   - Helius webhook successfully receives `hideTreasure` transactions
   - Server logs show transaction signature and parsed data
   - Webhook authentication works correctly (research needed to confirm exact mechanism)

2. ✅ **Data Correctly Parsed**:
   - Player wallet address extracted correctly
   - Amount parsed from TreasureRecord account
   - Token mint address identified
   - Timestamp captured
   - No tier or monster data included

3. ✅ **Data Saved to Firebase**:
   - Document created in `treasureDeposits` collection (camelCase)
   - Transaction signature used as document ID
   - All required fields present (wallet, amount, token, status, timestamps)
   - Metadata includes TreasureRecord PDA address

4. ✅ **UI Displays Real Data**:
   - TreasureGalleryPage fetches from Firebase
   - Treasures display: wallet address, token type, amount, hidden timestamp
   - Filters work correctly (status, token type)
   - Loading states handled properly
   - No monster or tier references

5. ✅ **Terminology Updated**:
   - All "deposit" terminology replaced with "hide treasure"
   - No monster type references in UI or code
   - No tier references in UI
   - TreasureDepositPage renamed or repurposed

6. ✅ **End-to-End Flow**:
   - Hide treasure on frontend → Transaction on Solana → Webhook triggered → Saved to Firebase → Displayed on UI
   - No manual intervention required
   - Works for multiple concurrent transactions

---

## Future Tasks

These are out of scope for this implementation but should be considered later:

- Real-time updates using Firebase onSnapshot
- Transaction confirmation status tracking
- Treasure claiming flow integrated with UI
- Analytics dashboard for treasure statistics
- Notification system for new treasures
- Map integration showing treasure locations
- Admin panel for managing treasures
- Treasure expiration logic

---

## Technical References

### Key Files

| File | Purpose | Status |
|------|---------|--------|
| `solana/programs/game/src/lib.rs` | Solana program with hideTreasure instruction | ✅ Working |
| `solana/target/idl/game.json` | Program interface definition | ✅ Generated |
| `src/components/solana/HideTreasure.tsx` | Frontend treasure hiding component | ✅ Working |
| `server.js` | Express server with webhook endpoints | ✅ Ready |
| `helius-webhook-handler.ts` | Webhook processing logic | 🔴 Needs Update |
| `treasure-service.ts` | Firebase CRUD operations | 🔴 Needs Update |
| `firebase-admin-config.ts` | Firebase Admin SDK setup | ✅ Ready |
| `src/pages/TreasureGalleryPage.tsx` | Treasure display UI | 🔴 Needs Update |
| `test-helius-webhook.js` | Webhook testing utility | ✅ Ready |

### External Documentation

- **Helius Webhooks**: https://docs.helius.dev/webhooks-and-websockets/webhooks
- **Firebase Admin SDK**: https://firebase.google.com/docs/admin/setup
- **Firebase Firestore**: https://firebase.google.com/docs/firestore
- **Solana Web3.js**: https://solana-labs.github.io/solana-web3.js/
- **Anchor Framework**: https://www.anchor-lang.com/docs

### PDA Derivation

**Vault PDA**:
```typescript
const [vaultPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('vault')],
  programId
);
```

**TreasureRecord PDA**:
```typescript
const [treasureRecordPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('treasure'),
    playerPublicKey.toBuffer(),
    Buffer.from(treasureId.toString()) // i64 as bytes
  ],
  programId
);
```

---

## Notes

- The Solana program is using **Anchor 0.28.0** (not 0.30.1) - ensure compatibility when parsing IDL
- Transaction signatures should be used as Firestore document IDs for idempotency
- The `treasureId` argument in `hide_treasure` is a timestamp (i64) used for PDA derivation
- Amount is stored in smallest units (6 decimals): 100 tokens = 100,000,000
- The program has a `tier` field but we're ignoring it in this implementation
- Use Firebase Emulator for development to avoid needing production credentials
- Keep the scope simple - just hide treasure and display treasures

---

**Document Version**: 2.0
**Status**: Ready for AI developer implementation
