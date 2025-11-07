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

The Dotty game integrates with Solana through **multiple smart contracts** (programs):

1. **dotty-nft** - Mint collectible NFTs for treasures found in-game
2. **treasure-deposit** - Deposit memecoins to receive random monster NFTs

**Technology Stack:**
- **Anchor Framework v0.30.1** - Modern Rust framework for Solana programs
- **Metaplex Token Metadata v4.1.2** - Industry standard for Solana NFTs
- **Multi-Program Workspace** - Scalable architecture for multiple contracts
- **React Wallet Adapter** - Multi-wallet support (Phantom, Solflare, etc.)
- **@solana/web3.js v1.95.2** - JavaScript client for Solana interactions

**New to Solana?** Start with [CONTRACTS-GUIDE.md](./CONTRACTS-GUIDE.md) for a beginner-friendly introduction!

**Multiple Programs?** See [MULTI-CONTRACT-SETUP.md](./MULTI-CONTRACT-SETUP.md) for the complete guide.

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
│  (dotty-nft)    │       │   Metadata   │
└────────┬────────┘       └──────────────┘
         │ 5. Mints NFT
         ▼
┌─────────────────┐
│ Player's Wallet │
│  (Phantom)      │
└─────────────────┘
```

## Current Status

### ✅ Implemented
- **Two Solana programs** in multi-program workspace
  - `dotty-nft`: NFT minting for collectibles
  - `treasure-deposit`: Memecoin deposit → monster NFT mechanic
- **Comprehensive test suites** for both programs (TypeScript + Mocha + Chai)
- **React wallet adapter** components (WalletProvider, WalletButton, TreasureDeposit)
- **Anchor v0.30.1** smart contract framework
- **Metaplex metadata** integration
- **Backend NFT service** foundation
- **Metadata JSON** examples for collectibles
- **Developer guides**: CONTRACTS-GUIDE.md (beginner intro) + MULTI-CONTRACT-SETUP.md

### ⚠️ In Progress / Next Steps
- **Deploy to devnet** - Programs ready but not deployed
- **Backend minting integration** - Need to use deployed IDL
- **Host metadata on IPFS/Arweave** - Currently placeholder URLs
- **CPI between programs** - treasure-deposit → dotty-nft minting
- **Token whitelisting** - Add PEPE, BONK, etc. to whitelist

### 🔧 Technical Improvements Needed
- React version fix (React 19.2.0 vs react-dom 16.14.0)
- Rate limiting on backend
- Signature verification for deposits
- CI/CD for automated deployment

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

### 1. Build the Program

```bash
cd solana
anchor build
```

This generates:
- Compiled program: `target/deploy/dotty_nft.so`
- IDL file: `target/idl/dotty_nft.json`
- TypeScript types: `target/types/dotty_nft.ts`

### 2. Run Tests

```bash
# From project root
npm run test:solana

# Or from solana directory
cd solana && anchor test
```

Tests are located in `tests/dotty-nft.ts` using TypeScript + Mocha + Chai.

### 3. Deploy to Devnet

```bash
# Deploy program
anchor deploy --provider.cluster devnet

# This outputs: Program Id: <YOUR_PROGRAM_ID>
```

**IMPORTANT**: After deployment, update these files:
1. `programs/dotty-nft/src/lib.rs` - Update `declare_id!("YOUR_PROGRAM_ID")`
2. `Anchor.toml` - Update program IDs under `[programs.devnet]`
3. Root `.env` - Update `SOLANA_PROGRAM_ID=YOUR_PROGRAM_ID`

### 4. Rebuild After ID Update

```bash
anchor build
anchor deploy --provider.cluster devnet
```

### 5. Integrate with Backend

Copy the generated IDL to your backend:
```bash
cp target/idl/dotty_nft.json ../nft-idl.json
```

Update `nft-service.js` to use the IDL for actual program calls.

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

### Devnet Deployment

```bash
# 1. Set cluster to devnet
solana config set --url https://api.devnet.solana.com

# 2. Ensure wallet has SOL
solana balance
# If needed: solana airdrop 2

# 3. Build and deploy
anchor build
anchor deploy --provider.cluster devnet

# 4. Verify deployment
solana program show <PROGRAM_ID>
```

### Mainnet Deployment

```bash
# 1. Switch to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# 2. Fund wallet with real SOL (deployment costs ~2-5 SOL)
# Send SOL to your wallet address

# 3. Deploy
anchor build
anchor deploy --provider.cluster mainnet

# 4. IMPORTANT: Update program IDs everywhere
# - src/lib.rs: declare_id!()
# - Anchor.toml: [programs.mainnet]
# - Backend .env: SOLANA_PROGRAM_ID

# 5. Rebuild and upgrade
anchor build
anchor upgrade <PROGRAM_ID> --provider.cluster mainnet --program-id <PROGRAM_ID>
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
