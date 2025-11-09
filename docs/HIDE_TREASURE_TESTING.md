# Hide Treasure Browser Testing Guide

This guide shows you how to test the "Hide Treasure" functionality in your browser using the React component.

## What You'll Be Able To Do

- Connect your Phantom wallet
- Hide treasure (deposit tokens) into the vault
- See real blockchain transactions on your local Solana validator
- View treasure tiers based on amount deposited

## Prerequisites

1. **Local Solana validator running** (already started!)
   ```bash
   # Should already be running from earlier
   # If not: npm run solana:validator
   ```

2. **Phantom wallet installed** in Chrome
   - Download from [phantom.app](https://phantom.app)
   - Switch to Localhost network:
     - Settings → Change Network → Localhost

3. **Vite dev server running** (already started!)
   ```bash
   # Should already be running
   # If not: npm run vite
   ```

## Setup Steps

### Step 1: Deploy the Solana Program

```bash
npm run solana:setup
```

This will:
- Build the Solana program
- Deploy it to your local validator
- Initialize the vault

### Step 2: Create a Test Token (REQUIRED)

You need a test token to hide as treasure. Run these commands:

```bash
cd solana
npx ts-node -e "
const anchor = require('@coral-xyz/anchor');
const { Keypair } = require('@solana/web3.js');
const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');

(async () => {
  const connection = new anchor.web3.Connection('http://localhost:8899');
  const payer = Keypair.generate();

  // Airdrop SOL to payer
  const sig = await connection.requestAirdrop(payer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig);

  // Create token mint
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    6 // decimals
  );

  console.log('✅ Test token created!');
  console.log('Token Mint Address:', mint.toString());
  console.log('');
  console.log('IMPORTANT: Copy this address and paste it in hide-treasure.tsx');
  console.log('Update the TEST_TOKEN_MINT variable');
})();
"
```

### Step 3: Update hide-treasure.tsx

Open `/Users/beau/Projects/dotty/hide-treasure.tsx` and update line 18:

```typescript
const TEST_TOKEN_MINT = 'PASTE_YOUR_TOKEN_MINT_HERE';
```

### Step 4: Mint Test Tokens to Your Wallet

Get your Phantom wallet address, then run:

```bash
cd solana
npx ts-node -e "
const anchor = require('@coral-xyz/anchor');
const { Keypair, PublicKey } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');

(async () => {
  const connection = new anchor.web3.Connection('http://localhost:8899');
  const payer = Keypair.generate();

  // Airdrop SOL
  const sig = await connection.requestAirdrop(payer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig);

  const mintAddress = new PublicKey('YOUR_TOKEN_MINT'); // From step 2
  const yourWallet = new PublicKey('YOUR_PHANTOM_ADDRESS');

  // Create token account
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintAddress,
    yourWallet
  );

  // Mint 10,000 tokens
  await mintTo(
    connection,
    payer,
    mintAddress,
    tokenAccount.address,
    payer,
    10_000_000_000 // 10,000 tokens with 6 decimals
  );

  console.log('✅ Minted 10,000 test tokens to your wallet!');
})();
"
```

## Testing in Browser

### Step 1: Open the Test Page

Navigate to: **http://localhost:5173/hide-treasure.html**

### Step 2: Connect Wallet

1. Click the "Connect Wallet" button
2. Approve the connection in Phantom
3. Make sure Phantom shows "Localhost" network

### Step 3: Verify Balance

You should see your test token balance displayed (should be 10,000 tokens)

### Step 4: Hide Treasure!

1. Enter an amount (minimum 100 tokens)
2. See the treasure tier update:
   - 🪙 Tier 1 - Common: 100-999 tokens
   - ⚔️ Tier 2 - Rare: 1,000-9,999 tokens
   - 👑 Tier 3 - Epic: 10,000-99,999 tokens
   - 💎 Tier 4 - Legendary: 100,000+ tokens
3. Click "Hide XXX Tokens"
4. Approve the transaction in Phantom
5. See success message with transaction signature!

## Verifying It Worked

### Option 1: Check Solana Explorer

1. Copy the transaction signature from the success alert
2. Visit: https://explorer.solana.com/?cluster=custom&customUrl=http://localhost:8899
3. Paste the transaction signature
4. See your treasure hiding transaction!

### Option 2: Check Validator Logs

```bash
tail -f test-validator.log
```

You should see transaction logs for your hide_treasure call.

### Option 3: Run Test Suite

```bash
npm run test:solana
```

The tests query the blockchain and show all treasure records.

## Troubleshooting

### "Failed to send transaction"

- Make sure the local validator is running
- Make sure Phantom is on Localhost network
- Make sure you have SOL in your wallet (for gas fees):
  ```bash
  solana airdrop 2 YOUR_PHANTOM_ADDRESS --url http://localhost:8899
  ```

### "Insufficient funds"

- You don't have enough test tokens
- Re-run the mint script from Step 4

### "Program not found"

- The Solana program isn't deployed
- Run: `npm run solana:setup`

### "Invalid token mint"

- You didn't update TEST_TOKEN_MINT in hide-treasure.tsx
- Make sure you copied the exact address from Step 2

## Next Steps

Once this works, you can:
- Test hiding different amounts to see different tiers
- Add more wallet addresses and test multiple users
- View all hidden treasures using the test suite
- Build a UI to display all hidden treasures

## Clean Up

When you're done testing:

```bash
# Stop validator
pkill solana-test-validator

# Clean ledger data
rm -rf test-ledger/
```

## Architecture Notes

The hide treasure flow:
1. User enters amount in browser
2. React component calls Anchor program
3. Program validates amount (min 100 tokens)
4. Tokens transferred from user → vault
5. TreasureRecord PDA created with:
   - Player address
   - Amount
   - Timestamp
   - Tier (calculated from amount)
   - Claimed status (false)
6. Transaction confirmed on blockchain
7. Browser shows success message

All of this happens on-chain, verifiable, and permanent (on your local validator for testing, eventually on devnet/mainnet).
