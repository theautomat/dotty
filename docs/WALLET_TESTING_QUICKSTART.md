# Wallet Testing - Quick Start

Clear, step-by-step guide for testing treasure hiding with your Phantom wallet.

## Prerequisites

1. **Phantom Wallet** installed in Chrome
2. **Solana CLI** and **Anchor** installed (see main README)

## Step-by-Step

### 1. Start Local Validator

```bash
npm run solana:validator
```

Leave this running in Terminal 1. This creates a local Solana blockchain.

### 2. Build & Deploy Program

In a new terminal:

```bash
npm run solana:setup
```

This will:
- **Build** the Solana program (Rust → executable)
- **Deploy** it to your local validator
- **Initialize** the treasure vault
- Give you a Program ID

**When to run this again:**
- First time setup (required)
- After changing Rust code in `solana/programs/game/`
- After resetting your local validator

### 3. Start Vite Dev Server

```bash
npm run vite
```

### 4. Configure Phantom Wallet

1. Open Phantom extension
2. **Settings → Change Network → Localhost**
3. Copy your wallet address (click the address at the top to copy)

### 5. Get Test SOL

Your Phantom wallet needs SOL for transaction fees:

**Option A - Using CLI (Recommended):**
```bash
solana airdrop 5 YOUR_PHANTOM_ADDRESS --url http://localhost:8899
```

Replace `YOUR_PHANTOM_ADDRESS` with your actual address from step 4.

**Option B - Check Balance:**
```bash
solana balance YOUR_PHANTOM_ADDRESS --url http://localhost:8899
```

You should see SOL appear in your Phantom wallet immediately (refresh if needed).

### 6. Create & Mint Test Tokens

The program requires SPL tokens (not native SOL). Create a test token:

**Create the token mint:**
```bash
cd solana
npx ts-node -e "
const anchor = require('@coral-xyz/anchor');
const { Keypair } = require('@solana/web3.js');
const { createMint } = require('@solana/spl-token');

(async () => {
  const connection = new anchor.web3.Connection('http://localhost:8899');
  const payer = Keypair.generate();

  const sig = await connection.requestAirdrop(payer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig);

  const mint = await createMint(connection, payer, payer.publicKey, null, 6);

  console.log('✅ Token Mint Created:', mint.toString());
  console.log('Copy this address for next steps!');
})();
"
```

**Copy the mint address** that gets printed.

**Mint tokens to your wallet:**
```bash
npx ts-node -e "
const anchor = require('@coral-xyz/anchor');
const { Keypair, PublicKey } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');

(async () => {
  const connection = new anchor.web3.Connection('http://localhost:8899');
  const payer = Keypair.generate();

  const sig = await connection.requestAirdrop(payer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig);

  const mint = new PublicKey('YOUR_MINT_ADDRESS');  // PASTE MINT ADDRESS HERE
  const wallet = new PublicKey('YOUR_PHANTOM_ADDRESS');  // PASTE PHANTOM ADDRESS HERE

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection, payer, mint, wallet
  );

  await mintTo(connection, payer, mint, tokenAccount.address, payer, 10_000_000_000);

  console.log('✅ Minted 10,000 tokens to your wallet!');
})();
"
```

Replace:
- `YOUR_MINT_ADDRESS` with the mint from previous step
- `YOUR_PHANTOM_ADDRESS` with your Phantom wallet address

### 7. Update Frontend Code

Edit `hide-treasure.tsx` (line 18):
```typescript
const TEST_TOKEN_MINT = 'YOUR_MINT_ADDRESS';  // Paste your mint address here
```

### 8. Test in Browser

1. Open http://localhost:5173/hide-treasure.html
2. Click "Connect Wallet"
3. Approve in Phantom
4. You should see your 10,000 token balance
5. Enter amount (minimum 100)
6. Click "Hide Treasure"
7. Approve transaction in Phantom
8. Success!

### 9. View Your Transaction

After hiding treasure, you can view the transaction in several ways:

**Option A - Solana Explorer (Recommended):**
1. Copy the transaction signature from the success message
2. Open: https://explorer.solana.com/?cluster=custom&customUrl=http://localhost:8899
3. Paste the signature in the search box

**Option B - Browser Console:**
1. Open browser DevTools (F12)
2. Check the Console tab for transaction logs
3. Look for the transaction signature

**Option C - Command Line:**
```bash
# Using the transaction signature from the browser
solana confirm YOUR_TRANSACTION_SIGNATURE --url http://localhost:8899

# View recent transactions for your wallet
solana transaction-history YOUR_PHANTOM_ADDRESS --url http://localhost:8899
```

**Note:** The local validator logs are very verbose. Using the browser console or Solana Explorer is much easier than trying to read the validator logs directly.

## Troubleshooting

**"Connection refused"**
- Make sure validator is running: `npm run solana:validator`

**"Insufficient funds"**
- Airdrop more SOL: `solana airdrop 2 YOUR_ADDRESS --url http://localhost:8899`

**"Program not found"**
- Run: `npm run solana:setup`

**Phantom shows 0 SOL**
- Make sure Phantom is on "Localhost" network
- Airdrop SOL (see above)

**Can't see token balance**
- Make sure you updated TEST_TOKEN_MINT in hide-treasure.tsx
- Make sure you minted tokens to your Phantom address

## What Gets Rebuilt?

**`npm run solana:setup` rebuilds:**
- ✅ Rust program (compiles to .so binary)
- ✅ IDL (JSON interface)
- ✅ TypeScript types

**You DON'T need to rebuild when:**
- Changing frontend code (React/TypeScript)
- Changing hide-treasure.tsx
- Just testing wallet connections

## Environment Variables

**You DON'T need Solana env vars in .env** for local testing. The program ID is hardcoded in the component.

Env vars mentioned in README are for:
- Devnet deployment
- Mainnet deployment
- Backend NFT minting

For local testing with Phantom wallet, you don't need them.
