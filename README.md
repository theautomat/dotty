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
SOLANA_WALLET_PATH=~/.config/solana/id.json
SOLANA_PROGRAM_ID=<your-deployed-program-id>
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

# Create/load wallet
solana-keygen new

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

The $BOOTY token is the in-game currency used for ship movement and earned by burying treasure. It's implemented as a custom SPL token with mining (minting) and burning capabilities.

### Token Features

- **Mining**: Players earn BOOTY when they bury treasure (deposit tokens)
- **Burning**: Players spend BOOTY to move their ships around the map
- **Supply Tracking**: Tracks total mined and total burned tokens
- **Configurable**: Optional max supply limit
- **Decimal Precision**: 9 decimals (standard for Solana tokens)

### Build BOOTY Token Program

```bash
cd solana

# Build both programs (game + booty)
anchor build

# Build only booty program
anchor build --program-name booty
```

### Test BOOTY Token

```bash
cd solana

# Run all tests including BOOTY token tests
anchor test

# Run only BOOTY token tests
anchor test tests/booty.ts
```

### Deploy to Devnet

```bash
cd solana

# Option 1: Use the deployment script (recommended)
./scripts/deploy-booty-devnet.sh

# Option 2: Manual deployment
anchor deploy --provider.cluster devnet --program-name booty

# Initialize the token after deployment
npx ts-node scripts/initialize-booty.ts devnet
```

The deployment script will:
1. Configure Solana CLI for devnet
2. Check wallet balance (requests airdrop if needed)
3. Build the program
4. Deploy to devnet
5. Update Anchor.toml and lib.rs with the program ID
6. Rebuild and redeploy with correct ID

After deployment, you'll receive:
- **Program ID**: The deployed program address
- **Mint Address**: The BOOTY token mint (from initialization)
- **Config PDA**: The program configuration account

### Deploy to Mainnet

**⚠️ WARNING**: Mainnet deployment uses REAL SOL and deploys to production. Only proceed when you've thoroughly tested on devnet.

```bash
cd solana

# Use the mainnet deployment script
./scripts/deploy-booty-mainnet.sh

# Initialize the token
npx ts-node scripts/initialize-booty.ts mainnet
```

The mainnet script includes:
- Safety confirmations and warnings
- Pre-deployment checklist
- Balance verification (requires 5+ SOL)
- Verifiable build
- Deployment cost estimation
- Automatic keypair backup
- Post-deployment verification

**Mainnet Prerequisites:**
- Minimum 5 SOL in wallet
- Tested on devnet ✅
- All tests passing ✅
- Code audited ✅

### Token Program Structure

```
solana/programs/booty/
├── src/
│   └── lib.rs              # BOOTY token program
├── Cargo.toml
tests/
└── booty.ts                # Comprehensive tests
scripts/
├── deploy-booty-devnet.sh  # Devnet deployment
├── deploy-booty-mainnet.sh # Mainnet deployment
└── initialize-booty.ts     # Token initialization
```

### Using BOOTY Token in Your Game

After deployment and initialization, integrate the token into your game:

```typescript
import { Program } from "@coral-xyz/anchor";
import { Booty } from "./target/types/booty";

// Load the BOOTY program
const bootyProgram = anchor.workspace.Booty as Program<Booty>;

// Mine BOOTY tokens for a player (when they bury treasure)
await bootyProgram.methods
  .mineTokens(new anchor.BN(1_000_000_000)) // 1 BOOTY
  .accounts({
    mint: bootyMintAddress,
    config: bootyConfigPda,
    player: playerPublicKey,
    playerTokenAccount: playerTokenAccount,
    payer: payerPublicKey,
    // ... other accounts
  })
  .rpc();

// Burn BOOTY tokens (when player moves ship)
await bootyProgram.methods
  .burnTokens(new anchor.BN(500_000_000)) // 0.5 BOOTY
  .accounts({
    mint: bootyMintAddress,
    config: bootyConfigPda,
    player: playerPublicKey,
    playerTokenAccount: playerTokenAccount,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .signers([playerKeypair])
  .rpc();
```

### BOOTY Token Economics

**Earning BOOTY (Mining):**
- Bury 100-999 tokens → Mine X BOOTY
- Bury 1,000-9,999 tokens → Mine 2X BOOTY
- Bury 10,000-99,999 tokens → Mine 5X BOOTY
- Bury 100,000+ tokens → Mine 10X BOOTY

**Spending BOOTY (Burning):**
- Move 1 tile → 0.1 BOOTY
- Move 10 tiles → 1 BOOTY
- Teleport across map → 50 BOOTY

*Note: These economics can be adjusted in your game logic.*

### Managing BOOTY Token

```bash
# Check token configuration
anchor run get-booty-config

# Update mint authority (admin only)
anchor run update-booty-authority

# View token supply
anchor run get-booty-supply

# Update max supply (admin only)
anchor run update-booty-max-supply
```

### Troubleshooting

**Build errors:**
```bash
# Clean and rebuild
anchor clean
anchor build
```

**Test failures:**
```bash
# Run with verbose logging
anchor test -- --nocapture

# Test specific function
anchor test -- test_name
```

**Deployment issues:**
```bash
# Check Solana config
solana config get

# Verify wallet balance
solana balance

# Check program deployment
solana program show <PROGRAM_ID>
```

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
- Solana game program (NFT minting + token deposits)
- $BOOTY token program (mining/burning mechanics)
- Comprehensive test suite (game + token)
- Metadata structure (theme-agnostic)
- Basic Three.js game engine
- Phantom wallet integration
- Devnet deployment scripts
- Mainnet deployment scripts

**🚧 In Progress:**
- Map/plot system
- Ship movement mechanics
- Treasure encryption system
- Integration between game and BOOTY token

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
