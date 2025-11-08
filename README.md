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

## Project Structure

```
dotty/
├── src/
│   ├── game/           # ThreeJS game logic
│   ├── objects/        # Ships, treasures, etc.
│   ├── managers/       # Scene, input, state
│   └── components/     # UI components (wallet, HUD)
├── solana/
│   ├── programs/game/  # Unified Solana program
│   │   ├── src/lib.rs  # Smart contract
│   │   └── Cargo.toml
│   ├── tests/          # Anchor tests
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
- Solana program (NFT minting + token deposits)
- Comprehensive test suite
- Metadata structure (theme-agnostic)
- Basic Three.js game engine
- Phantom wallet integration

**🚧 In Progress:**
- $BOOTY token implementation
- Map/plot system
- Ship movement mechanics
- Treasure encryption system

**📋 Planned:**
- Multiplayer (Socket.io)
- Leaderboards
- NFT multiplier mechanics
- Mainnet deployment

## Resources

- [Solana Docs](https://docs.solana.com/)
- [Anchor Book](https://www.anchor-lang.com/)
- [Metaplex Docs](https://docs.metaplex.com/)
- [Three.js Docs](https://threejs.org/docs/)

## License

MIT
