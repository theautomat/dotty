# Pirates Booty

A blockchain-based treasure hunting game where players bury memecoin treasure and compete to dig it up. Built on Solana with Three.js.

## Game Concept

**Pirates Booty** is a top-down multiplayer treasure game where you:
- **Bury memecoins** as treasure in secret plot locations
- **Mint NFT multipliers** to boost your rewards
- **Use $BOOTY tokens** to move your ship around a large map
- **Mine $BOOTY** when you bury treasure
- **Dig up treasure** by traveling to plots (automatically claimed when you arrive)
- **Compete** with other pirates to find encrypted treasure locations (x,y coordinates)

## How It Works

1. **Bury Treasure**: Deposit memecoins into a plot location. This mines $BOOTY tokens for you.
2. **Travel the Map**: Use $BOOTY to move your ship to different plots on the map.
3. **Auto-Collect**: When you travel to a plot, you automatically dig up any treasure there (since you paid $BOOTY to travel).
4. **NFT Multipliers**: Mint special NFTs (ships, crew, tools) that multiply your rewards.
5. **Encrypted Locations**: Treasure locations are encrypted on-chain - only the coordinates (x,y) reveal what's there.

## Technology Stack

**Frontend:**
- Three.js for 3D rendering (top-down ship view)
- Vanilla JavaScript (ES6 modules)
- Phantom Wallet integration

**Blockchain:**
- Solana (devnet/mainnet)
- Anchor framework v0.30.1
- Metaplex Token Metadata for NFTs
- Custom $BOOTY token (SPL Token)

**Backend:**
- Node.js with Express
- NFT minting service
- Game state management

## Setup & Installation

### Prerequisites

- Node.js 18.x or higher
- Solana CLI v1.18+
- Rust and Anchor v0.30.1 (for smart contract development)
- Phantom Wallet (for playing)

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/yourusername/dotty.git
cd dotty
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your Solana config

# 3. Build Solana program
cd solana
anchor build
anchor test

# 4. Start development server
cd ..
npm run vite
```

Access the game at [http://localhost:5173](http://localhost:5173)

### Environment Variables

Create a `.env` file in the root:

```bash
# Solana Configuration
SOLANA_NETWORK=devnet
SOLANA_WALLET_PATH=./wallets/devnet-deployer.json
SOLANA_PROGRAM_ID=<your-deployed-program-id>
```

## Wallet Setup

This project uses **two types of wallets**:

### 1. Backend/Deployer Wallet (CLI Wallet)

This is a file-based keypair used to:
- Deploy the Solana program
- Mint NFTs from the backend (pays gas fees)

**Create the wallet:**
```bash
# Create wallets directory (gitignored)
mkdir -p wallets

# For local/devnet testing
solana-keygen new -o wallets/devnet-deployer.json

# For mainnet (use a SECURE location outside the project)
solana-keygen new -o ~/.config/solana/mainnet-deployer.json
```

**Where it's stored:**
- Local/devnet: `wallets/devnet-deployer.json` (gitignored)
- Mainnet: Store OUTSIDE the project in a secure location
- Set path in `.env`: `SOLANA_WALLET_PATH=./wallets/devnet-deployer.json`

**Fund the wallet:**
```bash
# Devnet (free test SOL)
solana airdrop 2

# Mainnet (send real SOL to your wallet address)
solana address  # Get your wallet address
# Send SOL from an exchange or another wallet
```

**🚨 SECURITY WARNING - Mainnet:**
- NEVER commit wallet JSON files to git (`.gitignore` blocks this)
- Use separate wallets for devnet and mainnet
- For mainnet, store wallet in secure environment variables or secrets manager (AWS Secrets, HashiCorp Vault)
- Consider using a hardware wallet for deployment
- Keep backups of your seed phrase in a secure location

### 2. Player Wallet (Browser Wallet)

Players use [Phantom](https://phantom.com/) browser extension.

**Setup for testing:**
1. Install Phantom browser extension
2. Create a new wallet (save your seed phrase!)
3. Switch networks:
   - **Local**: Settings → Change Network → Localhost
   - **Devnet**: Settings → Developer Settings → Testnet Mode ON → Change Network → Devnet
   - **Mainnet-beta**: Default network (live network with real SOL)

**Get test SOL for devnet:**
```bash
# Airdrop to your Phantom wallet address
solana airdrop 1 <YOUR_PHANTOM_ADDRESS> --url devnet
```

## Solana Program Setup

The game uses a unified Solana program that handles:
- NFT minting (collectibles, ships, crew)
- Token deposits (bury treasure)
- Reward claiming (dig up treasure)
- Tier-based rewards (based on treasure value)

### Install Solana Tools

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1
```

### Build & Deploy

```bash
cd solana

# Configure for devnet
solana config set --url https://api.devnet.solana.com

# Set Solana CLI to use your wallet
solana config set --keypair ../wallets/devnet-deployer.json

# Get devnet SOL
solana airdrop 2

# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Update program ID in .env and Anchor.toml with deployed ID
```

Build artifacts:
- `programs/game/target/deploy/game.so` - Compiled program
- `target/idl/game.json` - Program interface
- `target/types/game.ts` - TypeScript types

### Run Tests

```bash
cd solana

# Run all tests with local validator
anchor test

# Or test on devnet
anchor test --provider.cluster devnet --skip-local-validator
```

## $BOOTY Token Setup

The $BOOTY token is the in-game currency used for ship movement and earned by burying treasure. It's implemented as a **standard SPL token** integrated directly into the game program - no separate token program needed!

### How It Works

The game program includes three BOOTY-related instructions:
- `initialize_booty_mint` - Creates the standard SPL token (one-time setup)
- `mine_booty` - Mints BOOTY to players when they bury treasure
- `burn_booty_for_travel` - Burns BOOTY when players move their ships

### Token Features

- **Standard SPL Token**: Works with all Solana wallets and exchanges
- **Mining**: Players earn BOOTY when they bury treasure (deposit tokens)
- **Burning**: Players spend BOOTY to move their ships around the map
- **Supply Tracking**: Tracks total mined and total burned in game state
- **Configurable**: Optional max supply limit
- **Decimal Precision**: 9 decimals (standard for Solana tokens)
- **Single Program**: No separate token program needed - all logic in game program

### Build & Test

```bash
cd solana

# Build the game program (includes BOOTY functionality)
anchor build

# Run all tests
anchor test
```

### Initialize BOOTY Token

After deploying the game program, you need to initialize the BOOTY token mint (one-time):

```bash
# This creates the SPL token mint and sets up tracking
anchor run initialize-booty -- --decimals 9

# Or call via TypeScript
npx ts-node scripts/initialize-booty.ts
```

This creates:
- **BOOTY Mint**: A standard SPL token mint
- **BOOTY State PDA**: Tracks total mined/burned supply
- Game program is set as the mint authority

### Using BOOTY Token in Your Game

```typescript
import { Program } from "@coral-xyz/anchor";
import { Game } from "./target/types/game";

const gameProgram = anchor.workspace.Game as Program<Game>;

// Mine BOOTY tokens for a player (when they bury treasure)
await gameProgram.methods
  .mineBooty(new anchor.BN(1_000_000_000)) // 1 BOOTY (9 decimals)
  .accounts({
    player: playerPublicKey,
    bootyMint: bootyMintAddress,
    playerBootyAccount: playerBootyTokenAccount,
    bootyState: bootyStatePda,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([playerKeypair])
  .rpc();

// Burn BOOTY tokens (when player moves ship)
await gameProgram.methods
  .burnBootyForTravel(new anchor.BN(500_000_000)) // 0.5 BOOTY
  .accounts({
    player: playerPublicKey,
    bootyMint: bootyMintAddress,
    playerBootyAccount: playerBootyTokenAccount,
    bootyState: bootyStatePda,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([playerKeypair])
  .rpc();
```

### Benefits of This Architecture

✅ **Simpler**: One program instead of two
✅ **Standard**: Uses standard SPL tokens (works with all wallets)
✅ **Cheaper**: No CPI overhead between programs
✅ **Cleaner**: All game logic in one place
✅ **Better**: Follows Solana best practices

## Project Structure

```
dotty/
├── src/
│   ├── game/           # ThreeJS game logic
│   ├── objects/        # Ships, treasures, etc.
│   ├── managers/       # Scene, input, state
│   └── components/     # UI components (wallet, HUD)
├── solana/
│   ├── programs/
│   │   ├── game/       # Game program (NFT minting + deposits)
│   │   │   ├── src/lib.rs
│   │   │   └── Cargo.toml
│   │   └── booty/      # BOOTY token program
│   │       ├── src/lib.rs
│   │       └── Cargo.toml
│   ├── tests/
│   │   ├── game.ts     # Game program tests
│   │   └── booty.ts    # BOOTY token tests
│   ├── scripts/
│   │   ├── deploy-booty-devnet.sh
│   │   ├── deploy-booty-mainnet.sh
│   │   └── initialize-booty.ts
│   ├── metadata/       # NFT metadata (theme-specific)
│   └── Anchor.toml
├── server.js           # Express backend
├── nft-service.js      # NFT minting service
└── README.md           # This file
```

## Game Controls

- **WASD**: Move ship
- **Mouse Scroll**: Zoom in/out
- **Click**: Select plot / bury treasure
- **E**: Interact / dig

## Development

### Run Frontend

```bash
npm run vite        # Development with HMR
npm run build       # Production build
npm start           # Serve production build
```

### Run Backend

```bash
npm run dev         # Express server with nodemon
```

## NFT Types

**Free Collectibles** (found in-game):
- Octopus, Scallywag, Boat, Wench

**Premium NFTs** (earned via token deposits):
- Golden Chest (Tier 1: 100-999 tokens)
- Jewel Trove (Tier 2: 1,000-9,999 tokens)
- Ancient Map (Tier 3: 10,000-99,999 tokens)
- Legendary Booty (Tier 4: 100,000+ tokens)

## Current Status

**✅ Implemented:**
- Unified Solana game program (NFT minting + token deposits + BOOTY token)
- $BOOTY token integrated as standard SPL token
- Comprehensive test suite
- Metadata structure (theme-agnostic)
- Basic Three.js game engine
- Phantom wallet integration

**🚧 In Progress:**
- Map/plot system
- Ship movement mechanics
- Treasure encryption system
- Connecting treasure deposits to BOOTY mining rewards

**📋 Planned:**
- Multiplayer (Socket.io)
- Leaderboards
- NFT multiplier mechanics
- Production mainnet deployment

## Resources

- [Solana Docs](https://docs.solana.com/)
- [Anchor Book](https://www.anchor-lang.com/)
- [Metaplex Docs](https://docs.metaplex.com/)
- [Three.js Docs](https://threejs.org/docs/)

## License

MIT
