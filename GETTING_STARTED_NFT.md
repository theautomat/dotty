# Getting Started with NFT Features

This guide will help you get the NFT minting features up and running in Dotty.

## Quick Start (Without Smart Contract Deployment)

If you just want to test the wallet connection and backend integration:

1. **Install dependencies:**
```bash
npm install
```

2. **Start the development server:**
```bash
npm run vite
```

3. **Install Phantom Wallet:**
   - Visit https://phantom.com/
   - Install the browser extension
   - Create or import a wallet
   - Switch to Devnet in settings

4. **Test wallet connection:**
   - Open the game at http://localhost:5173
   - Click "Connect Wallet" in the top-right
   - Approve connection in Phantom
   - You should see your wallet address displayed

**Note:** Without a deployed smart contract, the backend will simulate NFT minting and log the transaction details.

## Full Setup (With Smart Contract Deployment)

To actually mint NFTs on Solana devnet:

### Step 1: Install Solana Tools

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### Step 2: Set Up Solana Wallet

```bash
# Create a new keypair
solana-keygen new

# Configure for devnet
solana config set --url https://api.devnet.solana.com

# Request airdrop (devnet SOL for testing)
solana airdrop 2

# Check balance
solana balance
```

### Step 3: Build and Deploy Smart Contract

```bash
# Navigate to solana directory
cd solana

# Build the program
anchor build

# Deploy to devnet
anchor deploy

# Copy the Program ID from the output
```

### Step 4: Update Configuration

Update your `.env` file with the deployed program ID:

```bash
SOLANA_NETWORK=devnet
SOLANA_WALLET_PATH=/Users/yourname/.config/solana/id.json
SOLANA_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID_HERE
```

Also update the Program ID in:
- `solana/programs/dotty-nft/src/lib.rs` (line 8: `declare_id!("...")`)
- `solana/Anchor.toml` (programs.devnet.dotty_nft)

### Step 5: Rebuild and Restart

```bash
# Rebuild the program with new ID
cd solana
anchor build
anchor deploy

# Go back to root and restart server
cd ..
npm run dev
```

### Step 6: Test NFT Minting

1. Open the game
2. Connect your Phantom wallet
3. Find and collect a treasure
4. Check your Phantom wallet for the new NFT!

## Troubleshooting

### "NFT service not ready"

Check server logs. Common issues:
- Wallet file not found at `SOLANA_WALLET_PATH`
- Wallet has 0 SOL (run `solana airdrop 2`)
- Wrong network configured

### Phantom not detected

- Make sure Phantom extension is installed
- Refresh the page
- Check browser console for errors

### Transaction fails

- Ensure you have enough devnet SOL
- Check that Program ID matches deployed program
- Verify you're on devnet in both Phantom and Solana CLI

### Airdrop fails

Devnet faucets can be rate-limited. Try:
```bash
# Wait a bit and try again
solana airdrop 1

# Or use the web faucet
# https://faucet.solana.com/
```

## Next Steps

Once you have the basic flow working:

1. **Add collectible integration** - Connect wallet UI to your game's treasure collection system
2. **Create NFT artwork** - Design images for each collectible type
3. **Host metadata** - Upload JSON metadata to IPFS or Arweave
4. **Add more collectibles** - Create new types with different rarities
5. **Implement cooldowns** - Add rate limiting to prevent spam
6. **Deploy to mainnet** - When ready for production

## Development Tips

- Keep devnet SOL in your wallet (check with `solana balance`)
- Use `anchor test` to run smart contract tests
- Monitor transactions at https://explorer.solana.com/?cluster=devnet
- Check server logs for NFT service status
- Use browser console to debug wallet connection issues

## Resources

- [Solana Docs](https://docs.solana.com/)
- [Anchor Book](https://book.anchor-lang.com/)
- [Phantom Docs](https://docs.phantom.com/)
- [Metaplex Docs](https://docs.metaplex.com/)
- [Solana Cookbook](https://solanacookbook.com/)

## Questions?

Check the [solana/README.md](solana/README.md) for detailed smart contract documentation.
