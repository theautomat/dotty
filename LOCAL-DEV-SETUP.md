# Local Development Setup

## Overview

Local development requires running **6 separate services**. You have two options:

### Option 1: Automated (Recommended)
Run everything with a single command:
```bash
npm run dev:all YOUR_PHANTOM_WALLET_ADDRESS
```

This automatically:
- Starts Solana validator (if not running)
- Runs dev:local setup
- Starts Firebase emulator
- Starts Express server
- Starts Vite dev server
- Starts transaction monitor

Press Ctrl+C to stop all services.

### Option 2: Manual (6 Terminals)
If you need fine-grained control or want to see individual service logs, you can run each service separately. See below for details.

---

## Current Manual Setup (6 Terminals)

### Terminal 1: Solana Validator
**Must start FIRST** - Everything else depends on this

```bash
npm run solana:validator
```

**What it does:**
- Runs local Solana blockchain on `localhost:8899`
- Stores ledger data locally for testing
- Must be running before deploying programs

**Wait for:** "Waiting for fees to stabilize" message

---

### Terminal 2: Dev Local Script (One-time setup per session)
**Run SECOND** - After validator is ready

```bash
npm run dev:local YOUR_PHANTOM_WALLET_ADDRESS
```

**What it does:**
- Builds the Solana program
- Deploys program to local validator
- Creates test SPL token
- Funds your wallet with SOL and test tokens
- Initializes treasure vault
- Updates config files

**Example:**
```bash
npm run dev:local 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

**This only runs once per session** - not a persistent service

---

### Terminal 3: Firebase Emulator
**Start THIRD**

```bash
npm run firebase:emulator
```

**What it does:**
- Runs local Firestore database on `localhost:8080`
- Provides UI at `http://localhost:4000` to view data
- No cloud credentials needed

**Wait for:** "All emulators ready!" message

---

### Terminal 4: Express Server
**Start FOURTH** - Requires Firebase emulator to be running

```bash
FIRESTORE_EMULATOR_HOST=localhost:8080 npm run server:dev
```

**What it does:**
- Runs Express server on `localhost:3000`
- Provides webhook endpoint for transactions
- Connects to Firebase emulator
- Auto-restarts on file changes

**Wait for:** "Firebase Admin initialized for emulator" message

---

### Terminal 5: Vite Dev Server
**Start FIFTH**

```bash
npm run vite
```

**What it does:**
- Runs frontend dev server on `localhost:5173`
- Hot module reloading for React/frontend changes
- Serves the game UI

**Access at:** `http://localhost:5173`

---

### Terminal 6: Transaction Monitor
**Start LAST** - Only needed for testing webhooks

```bash
npm run dev:monitor
```

**What it does:**
- Watches local validator for hide_treasure transactions
- Forwards them to webhook endpoint in Helius format
- **Only for local dev** - In production, Helius does this

**Wait for:** "Monitoring for hide_treasure transactions..." message

---

## Quick Reference

**Order to start:**

1. `npm run solana:validator` (wait for ready)
2. `npm run dev:local YOUR_WALLET` (wait to complete)
3. `npm run firebase:emulator` (wait for ready)
4. `FIRESTORE_EMULATOR_HOST=localhost:8080 npm run server:dev`
5. `npm run vite`
6. `npm run dev:monitor` (optional - only for webhook testing)

---

## What Each Service Provides

| Service | Port | Purpose |
|---------|------|---------|
| Solana Validator | 8899 | Local blockchain |
| Firebase Emulator | 8080 | Firestore database |
| Firebase UI | 4000 | View database contents |
| Express Server | 3000 | Webhook handler & API |
| Vite Dev Server | 5173 | Frontend UI |
| Transaction Monitor | N/A | Watches blockchain → forwards to webhook |

---

## Environment Variables Required

### For Express Server:
```bash
FIRESTORE_EMULATOR_HOST=localhost:8080
NODE_ENV=development
```

### For Transaction Monitor:
```bash
NODE_ENV=development
```

---

## Common Issues

### "Failed to connect to validator"
- Make sure Terminal 1 (validator) is running
- Wait for "Waiting for fees to stabilize" before running other commands

### "Firebase Admin not initialized"
- Make sure Firebase emulator (Terminal 3) is running
- Make sure you set `FIRESTORE_EMULATOR_HOST=localhost:8080` when starting server

### "Webhook endpoint not accessible"
- Make sure Express server (Terminal 4) is running
- Make sure Firebase emulator is running (server depends on it)

### "Transaction monitor not detecting transactions"
- Make sure validator is running
- Make sure you've run `dev:local` to deploy the program
- Make sure you're using the hide_treasure UI on `localhost:5173`

---

## Future: Simplified Devnet Setup

**Goal:** Reduce from 6 terminals to 2 terminals

When we move to devnet:

### What we WON'T need anymore:
- ❌ Solana Validator (use devnet)
- ❌ Transaction Monitor (Helius handles it)
- ❌ Firebase Emulator (use dev Firebase project)

### What we WILL still need:
- ✅ Vite Dev Server (frontend development)
- ✅ Express Server (webhook handler - deployed or local)

### Deployment scripts needed:
- `npm run deploy:devnet` - Deploy program to devnet
- `npm run deploy:server` - Deploy server to Railway/Heroku
- Configure Helius webhook to point to deployed server

---

## Automation Ideas (Short-term)

### Option 1: Single Script with tmux/screen
Create a script that opens all terminals automatically using tmux or iTerm2

### Option 2: Process Manager (PM2, Concurrently)
Run all services from one terminal with a process manager

### Option 3: Docker Compose
Containerize everything and run with `docker-compose up`

**Current blocker:** Each service needs to be started in specific order and some are one-time setup (dev:local)

---

## Notes for Developers

- **First time setup:** Run all 6 terminals
- **Daily development:** Usually just need terminals 1, 3, 4, 5 (skip monitor unless testing webhooks)
- **Frontend only changes:** Can sometimes just run terminal 5 (Vite) if blockchain stuff is stable
- **Blockchain changes:** Need to restart terminals 1 and 2 (validator + dev:local)
