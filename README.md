# Dotty

A top-down exploration game where you play as Dotty, a little alien character exploring an alien landscape to discover hidden treasures and mint them as NFTs on Solana.

## Game Concept

- **Character**: Dotty, a circular character viewed from a top-down perspective
- **Movement**: WASD keys control movement through a 2D world
- **Camera**: Frustrum view from above with adjustable zoom levels (min/max constraints)
- **Treasures**: Hidden items that reveal themselves when Dotty gets close enough
- **Interaction**: Run into treasures to collect them and mint NFTs
- **NFT Integration**: Collect treasures and mint them as NFTs directly to your Phantom wallet
- **Wallet Integration**: Connect your Phantom Wallet to claim NFTs (https://phantom.com/)
- **Blockchain**: Built on Solana for fast, low-cost NFT minting
- **Backend**: Firebase for user data and Express server for NFT minting

## Current Status

This project is in active development with NFT integration underway:

**Implemented:**
- Top-down character movement with WASD controls
- Camera system with zoom functionality
- Treasure discovery and proximity detection system
- Phantom wallet connection UI
- Backend NFT minting service
- Solana smart contract (Anchor program) structure

**In Progress:**
- Smart contract deployment to Solana devnet
- Integration of wallet UI with game collectibles
- NFT metadata hosting and artwork

**Future Features:**
- Multiple collectible types with varying rarity
- On-chain collection tracking
- Leaderboards for collectors
- Enhanced anti-cheat and validation

## Setup and Installation

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Phantom Wallet browser extension (for NFT features)
- Solana CLI (for smart contract development)
- Rust and Anchor (for smart contract development)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/dotty.git
cd dotty
```

2. Install dependencies:

```bash
npm install
# or with yarn
yarn
```

3. Set up environment variables:

Create a `.env` file in the root directory:

```bash
# Solana Configuration
SOLANA_NETWORK=devnet
SOLANA_WALLET_PATH=~/.config/solana/id.json
SOLANA_PROGRAM_ID=Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS

# Firebase Configuration (if using)
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
# ... other Firebase config
```

### Solana Setup (for NFT minting)

To enable NFT minting features, you'll need to set up Solana:

1. **Install Solana CLI:**
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

2. **Create a Solana wallet (devnet):**
```bash
solana-keygen new
```

3. **Configure for devnet:**
```bash
solana config set --url https://api.devnet.solana.com
```

4. **Get devnet SOL (for testing):**
```bash
solana airdrop 2
```

5. **Build and deploy the smart contract:**
```bash
cd solana
anchor build
anchor deploy
```

Update the `SOLANA_PROGRAM_ID` in your `.env` file with the deployed program ID.

For detailed Solana program documentation, see [solana/README.md](solana/README.md)

### Running the Game

For development with Hot Module Replacement (HMR):

```bash
npm run vite
```

This launches Vite's dev server with instant hot reloading:
- Changes appear immediately in the browser without manual refresh
- Fast HMR updates as you edit files
- Access the game at [http://localhost:5173](http://localhost:5173)

For production build and serve:

```bash
npm run dev
```

This builds the project and serves it in production mode at [http://localhost:3000](http://localhost:3000).

To deploy to production:

```bash
npm run build
npm start
```

## Game Controls

- **W**: Move up
- **A**: Move left
- **S**: Move down
- **D**: Move right
- **Mouse Scroll**: Zoom in/out (within min/max limits)
- **E/Space**: Interact with treasures (planned)

## Deployment to Heroku

```bash
# Login to Heroku CLI
heroku login

# Create a new Heroku app
heroku create your-app-name

# Push to Heroku
git push heroku main

# Open the deployed app
heroku open
```

## Technology Stack

**Frontend:**
- Three.js for 3D rendering
- Vanilla JavaScript (ES6 modules)
- Phantom Wallet integration via window.solana API

**Backend:**
- Node.js with Express.js
- Socket.io for multiplayer features
- Firebase for user data and authentication

**Blockchain:**
- Solana blockchain (devnet/mainnet)
- Anchor framework for smart contracts
- Metaplex Token Metadata standard for NFTs
- @solana/web3.js for blockchain interactions

**Development:**
- Vite for fast development and HMR
- LiveReload for instant updates

## NFT Features

### How It Works

1. **Connect Wallet**: Click "Connect Wallet" in the top-right corner to connect your Phantom wallet
2. **Explore**: Move Dotty around the world to discover hidden treasures
3. **Collect**: Run into treasures to collect them
4. **Mint NFT**: When connected, collected treasures are automatically minted as NFTs to your wallet
5. **View**: Check your Phantom wallet to see your collected NFTs

### Collectible Types

- **Golden Asteroid Fragment** (Legendary) - Rare golden minerals
- **Crystal Energy Shard** (Epic) - Mysterious glowing crystals
- **Ancient Alien Artifact** (Rare) - Enigmatic alien technology

Each NFT includes:
- Unique artwork
- Rarity attributes
- Discovery timestamp
- Metaplex-standard metadata

### Security & Anti-Cheat

Current implementation uses backend-validated minting:
- Game backend validates all mint requests
- Rate limiting prevents spam
- Backend wallet pays gas fees (players mint for free)
- Future: Add session verification and on-chain tracking

## Project Structure

```
dotty/
├── src/
│   ├── components/      # Game UI components
│   │   └── WalletUI.js  # Wallet connection widget
│   ├── game/            # Core game logic
│   ├── objects/         # Game objects (Dotty, treasures, etc.)
│   ├── managers/        # Game managers (scene, input, etc.)
│   └── utils/
│       └── wallet-connection.js  # Phantom wallet integration
├── solana/              # Solana smart contracts
│   ├── programs/        # Anchor programs
│   ├── metadata/        # NFT metadata files
│   └── tests/           # Contract tests
├── server.js            # Express backend with NFT minting
├── nft-service.js       # NFT minting service
└── index.html           # Entry point
```

## License

MIT
