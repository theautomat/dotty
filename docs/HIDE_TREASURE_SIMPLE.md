# Simple Hide Treasure Testing

Test hiding treasure tokens in your browser with minimal setup.

## What You Need

1. **Solana validator running** - Already started! (`npm run solana:validator`)
2. **Vite dev server running** - Already started! (`npm run vite`)
3. **Phantom wallet** - Installed in Chrome, set to Localhost network

## Quick Setup

### Step 1: Deploy Program

```bash
npm run solana:setup
```

This deploys the Solana program and initializes the vault.

### Step 2: Create Test Token

The program needs SPL tokens (not native SOL). Create a simple test token:

```bash
cd solana
npx ts-node<<EOF
import * as anchor from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import { createMint } from '@solana/spl-token';

(async () => {
  const connection = new anchor.web3.Connection('http://localhost:8899');
  const payer = Keypair.generate();

  const sig = await connection.requestAirdrop(payer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig);

  const mint = await createMint(connection, payer, payer.publicKey, null, 6);

  console.log('\n✅ Test Token Created!');
  console.log('Mint Address:', mint.toString());
  console.log('\nCopy this address and paste it in hide-treasure.tsx (line 18)\n');
})();
EOF
```

### Step 3: Update Code

Edit `hide-treasure.tsx` line 18:
```typescript
const TEST_TOKEN_MINT = 'YOUR_MINT_ADDRESS_HERE';
```

### Step 4: Get Test Tokens

```bash
cd solana
npx ts-node<<EOF
import * as anchor from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';

(async () => {
  const connection = new anchor.web3.Connection('http://localhost:8899');
  const payer = Keypair.generate();

  const sig = await connection.requestAirdrop(payer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig);

  const mint = new PublicKey('YOUR_MINT_ADDRESS');
  const yourWallet = new PublicKey('YOUR_PHANTOM_ADDRESS');

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection, payer, mint, yourWallet
  );

  await mintTo(connection, payer, mint, tokenAccount.address, payer, 10_000_000_000);

  console.log('\n✅ Minted 10,000 tokens to your wallet!\n');
})();
EOF
```

## Test It

1. Open: http://localhost:5173/hide-treasure.html
2. Click "Connect Wallet"
3. You should see your 10,000 token balance
4. Enter amount (100+) and click "Hide Treasure"
5. Approve transaction in Phantom
6. See success!

## That's It!

You're now hiding treasure on the blockchain. The tokens are transferred from your wallet to the vault and a treasure record is created.

Check the transaction on Solana Explorer: https://explorer.solana.com/?cluster=custom&customUrl=http://localhost:8899
