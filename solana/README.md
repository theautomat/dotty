# Dotty NFT Solana Program

Complete guide for the Solana smart contract and NFT integration in the Dotty game.

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Current Status](#current-status)
- [Setup & Installation](#setup--installation)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Deployment](#deployment)
- [Frontend Integration](#frontend-integration)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

The game integrates with Solana through a **unified smart contract** (program):

**game** - A theme-agnostic, flexible program that supports:
- **NFT Minting** - Mint collectible NFTs for treasures found in-game
- **Token Deposit System** - Deposit tokens to earn premium NFT claims
- **Vault Management** - Admin functions for token whitelisting and configuration
- **Tiered Rewards** - Multi-tier system based on deposit amounts

**Technology Stack:**
- **Anchor Framework v0.30.1** - Modern Rust framework for Solana programs
- **Metaplex Token Metadata v4.1.2** - Industry standard for Solana NFTs
- **Unified Program Architecture** - Single contract with multiple instruction handlers
- **@solana/web3.js v1.95.2** - JavaScript client for Solana interactions

**New to Solana?** Check out the [Solana Cookbook](https://solanacookbook.com/) for guides and examples!

## Architecture

```
┌─────────────────┐
│   Game Client   │
│   (Browser)     │
└────────┬────────┘
         │ 1. Discovers collectible
         │ 2. Requests mint
         ▼
┌─────────────────┐
│  Express Server │
│  (NFT Service)  │
└────────┬────────┘
         │ 3. Validates claim
         │ 4. Calls program
         ▼
┌─────────────────┐       ┌──────────────┐
│ Solana Program  │◄──────┤   Metaplex   │
│     (game)      │       │   Metadata   │
└────────┬────────┘       └──────────────┘
         │ 5. Mints NFT
         ▼
┌─────────────────┐
│ Player's Wallet │
│  (Phantom)      │
└─────────────────┘

Optional Token Deposit Flow:
┌─────────────────┐
│   Game Client   │  1. Deposits tokens
└────────┬────────┘
         ▼
┌─────────────────┐
│ Solana Program  │  2. Records deposit
│     (game)      │  3. Calculates tier
└────────┬────────┘
         │ 4. Mints premium NFT
         ▼
┌─────────────────┐
│ Player's Wallet │
└─────────────────┘
```

## Current Status

### ✅ Implemented
- **Unified Solana program** (`game`) with multiple instruction handlers
  - `mint_nft`: Universal NFT minting for any collectible type
  - `initialize_vault`: Set up token deposit system
  - `deposit_for_nft`: Deposit tokens to earn premium NFT claims
  - `claim_deposit`: Claim deposit after token transfer
  - `whitelist_token`: Admin function to whitelist accepted tokens
  - `update_vault`: Admin function to update vault configuration
- **Comprehensive test suite** (TypeScript + Mocha + Chai)
- **Anchor v0.30.1** smart contract framework
- **Metaplex metadata** integration
- **Backend NFT service** foundation
- **Metadata JSON** examples for theme-agnostic collectibles
- **Tiered reward system** (4 tiers based on deposit amount)

### ⚠️ In Progress / Next Steps
- **Deploy to devnet** - Program ready but not deployed
- **Backend minting integration** - Need to use deployed IDL
- **Host metadata on IPFS/Arweave** - Currently placeholder URLs
- **Token whitelisting** - Add specific tokens (USDC, etc.) to whitelist
- **Web UI testing** - Test full flow through game interface

### 🔧 Technical Improvements Needed
- Rate limiting on backend
- Signature verification for deposits
- CI/CD for automated deployment
- Monitoring and analytics for on-chain activity

## Setup & Installation

### Prerequisites

1. **Install Rust**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

2. **Install Solana CLI** (v1.18+)
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

3. **Install Anchor** (v0.30.1)
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1
```

4. **Verify installations**
```bash
rustc --version    # Should be 1.75+
solana --version   # Should be 1.18+
anchor --version   # Should be 0.30.1
```

### Project Setup

1. **Install dependencies from root**
```bash
# From project root
npm install
# or
pnpm install
```

This installs all dependencies including Solana test dependencies (Mocha, Chai, etc.)

2. **Configure Solana for devnet**
```bash
solana config set --url https://api.devnet.solana.com
```

4. **Create/Load wallet**
```bash
# Create new wallet (save the seed phrase!)
solana-keygen new

# Or specify a custom path
solana-keygen new -o ~/.config/solana/dotty-deployer.json
```

5. **Get devnet SOL**
```bash
solana airdrop 2
# Or specify wallet
solana airdrop 2 $(solana address)
```

## Development Workflow

### Quick Start

```bash
# 1. Build the program
cd solana && anchor build

# 2. Run tests locally
anchor test

# 3. Deploy to devnet (see detailed guide below)
anchor deploy --provider.cluster devnet
```

This generates:
- Compiled program: `target/deploy/game.so`
- IDL file: `target/idl/game.json`
- TypeScript types: `target/types/game.ts`

### Local Testing

```bash
# Run all tests with local validator
cd solana && anchor test

# Or start validator separately and run tests
# Terminal 1:
solana-test-validator

# Terminal 2:
anchor test --skip-local-validator
```

Tests are located in `tests/game.ts` using TypeScript + Mocha + Chai.

### Program Instructions

The `game` program exposes these instructions:

1. **mint_nft** - Mint any type of NFT (collectibles, rewards, etc.)
2. **initialize_vault** - One-time setup for token deposit system
3. **deposit_for_nft** - Player deposits tokens to earn premium NFT claim
4. **claim_deposit** - Mark deposit as claimed
5. **whitelist_token** - Admin adds accepted token mints
6. **update_vault** - Admin updates vault configuration

## Testing

### Local Testing (Localnet)

```bash
# Terminal 1: Start local validator
solana-test-validator

# Terminal 2: Run tests (from root)
npm run test:solana:local

# Or from solana directory
cd solana && anchor test --skip-local-validator
```

### Devnet Testing

```bash
# Deploy to devnet first
cd solana && anchor deploy --provider.cluster devnet

# Run tests against devnet (from root)
npm run test:solana:devnet

# Or from solana directory
cd solana && anchor test --provider.cluster devnet
```

### Test Structure (To Be Implemented)

```typescript
// tests/dotty-nft.ts
describe("dotty-nft", () => {
  it("Mints a collectible NFT", async () => {
    // Test mint_collectible instruction
  });

  it("Validates metadata is created correctly", async () => {
    // Test Metaplex metadata
  });

  it("Prevents unauthorized minting", async () => {
    // Test access control
  });
});
```

## Deployment

### Complete Devnet Deployment Workflow

This guide walks you through deploying to devnet, testing the program, and integrating with your web UI.

#### Step 1: Pre-Deployment Checklist

```bash
# Verify installations
rustc --version   # Should be 1.75+
solana --version  # Should be 1.18+
anchor --version  # Should be 0.30.1

# Check your Solana configuration
solana config get
# Should show:
# RPC URL: https://api.devnet.solana.com
# WebSocket URL: wss://api.devnet.solana.com
# Keypair Path: ~/.config/solana/id.json

# If not on devnet, switch to it
solana config set --url https://api.devnet.solana.com

# Check wallet balance
solana balance
# If < 2 SOL, get airdrop
solana airdrop 2

# Note your wallet address for later
solana address
```

#### Step 2: Build and Test Locally

```bash
# Navigate to solana directory
cd solana

# Clean previous builds (optional but recommended)
anchor clean

# Build the program
anchor build

# Run tests locally to ensure everything works
anchor test

# ✅ All tests should pass before deploying
```

**Expected output:**
```
game
  NFT Minting
    mint_nft
      ✓ Successfully mints an NFT to a player (XXXXms)
  Deposit System
    initialize_vault
      ✓ Successfully initializes the deposit vault (XXXXms)
    deposit_for_nft
      ✓ Successfully deposits tokens and creates record (XXXXms)
    ...
```

#### Step 3: Initial Deployment

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# ⚠️ SAVE THE PROGRAM ID FROM THE OUTPUT!
# Example output:
# Program Id: 7vYN8KqmHZqvGHGvLjUjQ2vJZJhF8Pt1KqGm8kX9XYZ1
```

**Important**: The first deployment will fail or warn about program ID mismatch. This is expected!

#### Step 4: Update Program ID

Now update the program ID in your code to match the deployed address.

**File 1:** `programs/game/src/lib.rs`
```rust
declare_id!("YOUR_ACTUAL_PROGRAM_ID_HERE");
```

**File 2:** `Anchor.toml`
```toml
[programs.devnet]
game = "YOUR_ACTUAL_PROGRAM_ID_HERE"
```

**File 3:** `../.env` (project root)
```bash
SOLANA_PROGRAM_ID=YOUR_ACTUAL_PROGRAM_ID_HERE
```

#### Step 5: Rebuild and Redeploy

```bash
# Rebuild with updated program ID
anchor build

# Deploy again (this time it will upgrade the existing program)
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show YOUR_PROGRAM_ID

# Expected output shows program data account, upgrade authority, etc.
```

#### Step 6: Test on Devnet

```bash
# Run tests against devnet
anchor test --provider.cluster devnet --skip-local-validator

# ✅ All tests should pass
```

#### Step 7: Initialize the Vault (One-Time Setup)

If you're using the token deposit feature, initialize the vault:

```bash
# Option A: Use Anchor test to call initialize_vault
# (Modify tests/game.ts to include initialization call)

# Option B: Use Solana Playground or custom script
# Example using anchor CLI (create a script):
```

**Create `scripts/initialize-vault.ts`:**
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Game } from "../target/types/game";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Game as Program<Game>;

  const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  );

  const tx = await program.methods
    .initializeVault()
    .accounts({
      vault: vaultPda,
      authority: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Vault initialized!");
  console.log("Transaction:", tx);
  console.log("Vault PDA:", vaultPda.toString());
}

main();
```

**Run it:**
```bash
ts-node scripts/initialize-vault.ts
```

#### Step 8: Copy IDL for Backend Integration

```bash
# Copy the generated IDL to your backend
cp target/idl/game.json ../game-idl.json

# Verify the file was copied
ls -lh ../game-idl.json
```

#### Step 9: Update Backend to Use Deployed Program

Update your backend NFT service to use the real program:

**File: `nft-service.js` or `nft-service.ts`**
```javascript
const { Program, AnchorProvider, web3 } = require('@coral-xyz/anchor');
const idl = require('./game-idl.json');

// Load from environment
const PROGRAM_ID = new web3.PublicKey(process.env.SOLANA_PROGRAM_ID);
const DEVNET_URL = 'https://api.devnet.solana.com';

// Initialize connection
const connection = new web3.Connection(DEVNET_URL, 'confirmed');

// Load backend wallet (secure this!)
const wallet = loadWalletFromEnv(); // Implement this

const provider = new AnchorProvider(connection, wallet, {
  commitment: 'confirmed'
});

const program = new Program(idl, PROGRAM_ID, provider);

// Mint NFT function
async function mintNFT(playerWallet, metadata) {
  const mintKeypair = web3.Keypair.generate();
  const playerPublicKey = new web3.PublicKey(playerWallet);

  // ... (rest of minting logic)
}
```

#### Step 10: Test Through Web UI

Start your game and test the full flow:

**Terminal 1: Start backend**
```bash
npm start
# or
npm run dev
```

**Terminal 2: Start frontend (if separate)**
```bash
npm run vite
```

**Testing checklist:**

1. **Connect Wallet**
   - Open game in browser (http://localhost:5173 or configured port)
   - Click "Connect Wallet" button
   - Approve connection in Phantom wallet
   - ✅ Verify wallet address appears in UI

2. **Switch Phantom to Devnet**
   - Open Phantom wallet
   - Settings → Developer Settings → Testnet Mode: ON
   - Switch network to "Devnet"
   - If needed, airdrop devnet SOL to player wallet:
     ```bash
     solana airdrop 1 PLAYER_WALLET_ADDRESS --url devnet
     ```

3. **Test NFT Minting**
   - Play the game and find a collectible
   - Trigger mint action
   - Check browser console for transaction logs
   - Expected: Transaction signature in console
   - ✅ Verify NFT appears in Phantom wallet (may take 10-30 seconds)

4. **Verify On-Chain**
   - Copy transaction signature from console
   - Visit Solana Explorer: https://explorer.solana.com/?cluster=devnet
   - Paste transaction signature
   - ✅ Verify transaction succeeded
   - ✅ Verify NFT metadata is correct

5. **Test Token Deposit (Optional)**
   - If implementing deposit feature:
   - Player deposits tokens via UI
   - Check vault balance increased
   - Player claims deposit
   - ✅ Verify deposit record on-chain

#### Step 11: Monitor and Debug

```bash
# View program logs
solana logs YOUR_PROGRAM_ID --url devnet

# This will show real-time logs as transactions happen
# Keep this running in a terminal while testing

# View specific transaction
solana confirm -v TRANSACTION_SIGNATURE --url devnet

# Check program account info
solana program show YOUR_PROGRAM_ID --url devnet
```

#### Troubleshooting Deployment

**Issue: "Insufficient funds for deploy"**
```bash
# Get more SOL
solana airdrop 2
# You may need 2-5 SOL for deployment
```

**Issue: "Program ID mismatch"**
```bash
# You forgot to update the program ID in lib.rs or Anchor.toml
# Go back to Step 4 and update both files
```

**Issue: "Unable to get RPC response"**
```bash
# Devnet may be congested, try again or use a different RPC
solana config set --url https://rpc.ankr.com/solana_devnet
```

**Issue: "Airdrop limit reached"**
```bash
# Devnet airdrops are rate-limited
# Try again in 24 hours or use a devnet faucet:
# https://solfaucet.com
```

**Issue: "NFT not showing in wallet"**
- Refresh Phantom wallet
- Ensure wallet is on devnet
- Check transaction on Solana Explorer
- Check if metadata URI is accessible
- NFTs may take 10-30 seconds to appear

**Issue: "Transaction simulation failed"**
- Check program logs: `solana logs YOUR_PROGRAM_ID --url devnet`
- Common causes:
  - Incorrect account addresses
  - Missing signers
  - Account not initialized (run initialize_vault first)
  - Insufficient SOL for rent

### Mainnet Deployment

⚠️ **Only deploy to mainnet when thoroughly tested on devnet!**

```bash
# 1. Switch to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# 2. Fund wallet with real SOL (deployment costs ~2-5 SOL)
# Send SOL to: $(solana address)

# 3. Build and deploy
anchor build
anchor deploy --provider.cluster mainnet

# 4. Update program IDs everywhere
# - programs/game/src/lib.rs: declare_id!()
# - Anchor.toml: [programs.mainnet]
# - .env: SOLANA_PROGRAM_ID

# 5. Rebuild and upgrade
anchor build
anchor upgrade <PROGRAM_ID> --provider.cluster mainnet --program-id <PROGRAM_ID>

# 6. Initialize vault on mainnet
# Run initialization script on mainnet

# 7. Update backend .env to use mainnet RPC
SOLANA_NETWORK=mainnet
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Frontend Integration

### Current Implementation (Vanilla JS)

**Location**: `../src/utils/wallet-connection.js`, `../src/components/WalletUI.js`

Uses Phantom's `window.solana` API directly:
```javascript
await window.solana.connect()
```

### Recommended: Wallet Adapter (Multi-Wallet Support)

The project has wallet adapter libraries installed but not used. To support multiple wallets (Phantom, Solflare, Ledger, etc.), refactor to use:

**Libraries already installed**:
- `@solana/wallet-adapter-react` v0.15.35
- `@solana/wallet-adapter-react-ui` v0.9.35
- `@solana/wallet-adapter-wallets` v0.19.32
- `@solana/wallet-adapter-base` v0.9.23

**Implementation** (see `tasks.md` for full migration plan):
```typescript
// Wrap app with WalletProvider
import { WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';

const wallets = [new PhantomWalletAdapter()];

<WalletProvider wallets={wallets}>
  <WalletModalProvider>
    <App />
  </WalletModalProvider>
</WalletProvider>
```

### Backend Minting Flow

**Current** (simulated):
```javascript
// nft-service.js - Currently returns simulated response
async mintCollectible(playerWallet, collectibleType) {
  // TODO: Call actual Anchor program
  return { success: true, signature: 'SIMULATED_...' };
}
```

**After deployment** (actual minting):
```javascript
const { Program, AnchorProvider, web3 } = require('@coral-xyz/anchor');
const idl = require('./nft-idl.json');

// Initialize program
const program = new Program(idl, programId, provider);

// Call mint_collectible instruction
const tx = await program.methods
  .mintCollectible(metadata.name, metadata.symbol, metadata.uri)
  .accounts({
    player: playerPublicKey,
    payer: backendWallet.publicKey,
    mint: mintKeypair.publicKey,
    tokenAccount: tokenAccountAddress,
    metadata: metadataAddress,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenMetadataProgram: METAPLEX_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,
  })
  .signers([backendWallet, mintKeypair])
  .rpc();
```

## Security Considerations

### Current Security Posture

⚠️ **Backend-Controlled Minting**
- Backend wallet pays gas fees
- Backend authorizes all mints
- **Risk**: Backend compromise = unlimited minting

🔒 **Recommended Improvements**

1. **Rate Limiting** - Prevent spam minting
   ```javascript
   // Limit: 1 mint per collectible type per player per day
   const mintKey = `${playerWallet}:${collectibleType}:${today}`;
   if (await redis.exists(mintKey)) {
     throw new Error('Already minted today');
   }
   await redis.setex(mintKey, 86400, '1');
   ```

2. **Session Verification** - Validate game session
   ```rust
   #[account]
   pub struct PlayerSession {
       pub player: Pubkey,
       pub timestamp: i64,
       pub verified: bool,
   }
   ```

3. **On-Chain Tracking** - Prevent duplicate mints
   ```rust
   #[account]
   pub struct CollectibleRecord {
       pub player: Pubkey,
       pub collectible_type: String,
       pub mint: Pubkey,
       pub minted_at: i64,
   }
   ```

4. **Signature Verification** - Cryptographic proof
   ```javascript
   // Game client signs claim
   const message = `mint:${collectibleType}:${timestamp}`;
   const signature = await wallet.signMessage(message);

   // Backend verifies signature
   const verified = nacl.sign.detached.verify(
     Buffer.from(message),
     signature,
     playerPublicKey.toBuffer()
   );
   ```

### Wallet Security

- Backend wallet private key should be stored in secure environment variables or AWS Secrets Manager
- Use separate wallets for devnet and mainnet
- Implement wallet rotation strategy
- Monitor wallet balance and transaction patterns

## Troubleshooting

### Common Issues

**1. "Program ID mismatch"**
```
Error: Program ID mismatch after deploy
```
**Solution**: Update `declare_id!()` in `lib.rs` and rebuild:
```bash
anchor build
anchor deploy
```

**2. "Insufficient funds"**
```
Error: Account <WALLET> has insufficient funds
```
**Solution**: Airdrop more SOL (devnet) or fund wallet (mainnet):
```bash
solana airdrop 2
```

**3. "Anchor version mismatch"**
```
Error: Anchor CLI version mismatch
```
**Solution**: Install correct version:
```bash
avm install 0.30.1
avm use 0.30.1
```

**4. "Failed to parse IDL"**
```
Error: Failed to parse IDL
```
**Solution**: Rebuild program to regenerate IDL:
```bash
anchor build
```

**5. "Wallet not found"**
```
⚠️  Solana wallet not found
```
**Solution**: Create wallet or set correct path:
```bash
solana-keygen new
# Or set in .env: SOLANA_WALLET_PATH=/path/to/wallet.json
```

## Project Structure

```
solana/
├── Anchor.toml              # Anchor configuration
├── Cargo.toml               # Workspace config (auto-generated)
├── programs/
│   └── dotty-nft/
│       ├── Cargo.toml       # Program dependencies
│       ├── Xargo.toml       # Cross-compilation config
│       └── src/
│           └── lib.rs       # Main smart contract (120 lines)
├── metadata/
│   └── examples/            # NFT metadata examples
│       ├── golden-fragment.json
│       ├── crystal-shard.json
│       └── alien-artifact.json
├── tests/                   # Test suite
│   └── dotty-nft.ts         # Comprehensive Anchor tests
├── tsconfig.json            # TypeScript config for tests
├── .gitignore               # Ignores build artifacts
├── README.md                # This file
└── tasks.md                 # Development tasks

Note: Test dependencies are in root package.json (unified project structure)
```

## Program Functions

### `mint_collectible`

Mints a new collectible NFT to a player's wallet.

**Signature**:
```rust
pub fn mint_collectible(
    ctx: Context<MintCollectible>,
    metadata_title: String,
    metadata_symbol: String,
    metadata_uri: String,
) -> Result<()>
```

**Parameters**:
- `metadata_title` - NFT name (e.g., "Golden Asteroid Fragment")
- `metadata_symbol` - Token symbol (e.g., "DOTTY")
- `metadata_uri` - URL to JSON metadata file

**Accounts**:
- `player` - Player's wallet (receives NFT)
- `payer` - Backend wallet (pays gas, signs transaction)
- `mint` - New mint account (NFT mint address)
- `token_account` - Player's associated token account
- `metadata` - Metaplex metadata account
- `token_program` - SPL Token program
- `associated_token_program` - Associated Token program
- `token_metadata_program` - Metaplex metadata program
- `system_program` - System program
- `rent` - Rent sysvar

**Example Call** (TypeScript):
```typescript
await program.methods
  .mintCollectible(
    "Golden Asteroid Fragment",
    "DOTTY",
    "https://example.com/metadata/golden-fragment.json"
  )
  .accounts({
    player: playerPublicKey,
    payer: backendWallet.publicKey,
    mint: mintKeypair.publicKey,
    tokenAccount: tokenAccountAddress,
    metadata: metadataAddress,
    // ... other accounts
  })
  .signers([backendWallet, mintKeypair])
  .rpc();
```

## NFT Metadata Format

Metadata JSON follows Metaplex standard:

```json
{
  "name": "Golden Asteroid Fragment",
  "symbol": "DOTTY",
  "description": "A rare golden fragment discovered in space.",
  "image": "https://arweave.net/...",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Type",
      "value": "Asteroid Fragment"
    }
  ],
  "properties": {
    "files": [
      {
        "uri": "https://arweave.net/...",
        "type": "image/png"
      }
    ],
    "category": "image"
  }
}
```

**Hosting Options**:
- **IPFS** - Free, decentralized (ipfs.io, Pinata, NFT.Storage)
- **Arweave** - Permanent storage (recommended for mainnet)
- **AWS S3** - Centralized, easy (ok for devnet testing)

## Resources

### Official Documentation
- [Anchor Book](https://www.anchor-lang.com/) - Anchor framework guide
- [Solana Cookbook](https://solanacookbook.com/) - Code examples and guides
- [Metaplex Docs](https://docs.metaplex.com/) - NFT standards and tools
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/) - JavaScript SDK

### Tools
- [Solana Explorer](https://explorer.solana.com/) - View transactions (devnet/mainnet)
- [Solana Playground](https://beta.solpg.io/) - Online IDE for Solana
- [Phantom](https://phantom.com/) - Popular Solana wallet

### Community
- [Solana Discord](https://discord.gg/solana)
- [Anchor Discord](https://discord.gg/anchor)
- [Solana Stack Exchange](https://solana.stackexchange.com/)

## Next Steps

See [`tasks.md`](./tasks.md) for detailed implementation tasks.

**Priority Order**:
1. Set up test infrastructure (package.json, tsconfig.json)
2. Write comprehensive test suite
3. Deploy program to devnet
4. Integrate IDL with backend
5. Implement actual minting in backend
6. Host metadata on IPFS/Arweave
7. Add rate limiting and security features
8. Consider migrating to React wallet adapter

---

**Last Updated**: 2025-11-07
**Program Version**: 0.1.0
**Anchor Version**: 0.30.1
**Status**: Pre-deployment (testing phase)
