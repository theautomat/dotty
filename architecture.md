# Pirates Booty - Current Architecture

**Last Updated:** 2025-11-08
**Status:** Actively Developed

---

## What This Game Is

A top-down blockchain treasure hunting game where players:
- Bury memecoin treasure in secret plot locations
- Use $BOOTY tokens to move their ship around the map
- Mine $BOOTY when burying treasure
- Dig up treasure by traveling to plots
- Mint NFT multipliers to boost rewards

---

## Technology Stack (What Actually Exists)

### Frontend
- **Three.js** (v0.159.0) - 3D rendering for top-down map view
- **React** (v18.3.1) - UI components
- **TypeScript** - Type-safe code
- **shadcn/ui** - Component library (Button, Card, etc.)
- **Tailwind CSS** (v4.1.17) - Styling
- **Vite** (v7.2.2) - Build tool and dev server

### Blockchain
- **Solana** - devnet/mainnet
- **Anchor** (v0.30.1) - Smart contract framework
- **@solana/web3.js** (v1.95.2) - Solana SDK
- **@solana/spl-token** (v0.4.8) - Token operations
- **@solana/wallet-adapter** - Wallet integration
- **Metaplex** - NFT metadata standard

### Backend
- **Node.js** (18.x required, 20+ recommended)
- **Express** (v4.18.2) - HTTP server
- **Socket.IO** (v4.7.2) - Real-time multiplayer
- **Firebase** (v10.7.0) - Database

### Package Manager
- **pnpm** (v10.6.4)

---

## Project Structure

```
/Users/beau/Projects/dotty/
├── src/
│   ├── game/              # Three.js game logic
│   │   ├── Game.ts        # Main game controller
│   │   └── GameConfig.ts  # Global config
│   ├── objects/           # Game entities
│   │   ├── Map.ts         # 100x100 grid map
│   │   └── GridNavigator.ts  # WASD keyboard controls
│   ├── components/        # React UI components
│   │   ├── MetadataPanel.tsx  # Plot metadata display
│   │   └── ui/            # shadcn/ui components
│   ├── data/              # Mock data
│   │   └── mockPlotData.ts
│   └── lib/               # Utilities
│       └── utils.ts       # cn() helper
├── solana/                # Solana smart contracts
│   ├── programs/game/     # Game program (Rust + Anchor)
│   └── tests/             # Test suite
├── public/
│   └── assets/images/     # Map images, textures
├── main.ts                # Entry point (should be main.tsx)
├── server.js              # Express backend
└── index.html             # Main HTML
```

---

## Current Game Features

### Implemented ✅
- 100x100 grid map system
- WASD keyboard navigation
- Grid highlighting (follows player)
- Camera follows player with smooth panning
- Custom map background image support
- Collapsible metadata panel (right side)
- Zoom in/out (mouse wheel)
- React + Three.js integration

### Smart Contract ✅
- Deposit tokens (bury treasure)
- Claim deposits (dig treasure)
- Mint NFTs (collectibles + tier-based rewards)
- $BOOTY token (mine when burying, burn for travel)
- Tier system (1-4 based on deposit amount)

### Not Implemented Yet ❌
- Leaderboard
- Multiplayer (Socket.IO exists but not active)
- Plot ownership
- Actual treasure hunting gameplay
- NFT multipliers
- Production deployment

---

## Map System

### Current Setup
- **Grid:** 100 × 100 = 10,000 squares
- **World size:** 1,000 Three.js units
- **Each square:** 10 units
- **Background:** Custom image at `/assets/images/pirate-game-map.png`
- **Grid lines:** White, 30% opacity
- **Highlight:** Yellow (#ffd700), 60% opacity

### How It Works
1. Background image loads onto a PlaneGeometry
2. Grid lines drawn as LineSegments (202 lines total)
3. GridNavigator handles WASD input
4. Yellow highlight shows current position
5. Camera follows highlighted square

---

## UI Component System

### shadcn/ui Setup
- **Components:** Button (more can be added)
- **Styling:** Tailwind CSS v4 with CSS variables
- **Theme:** Dark mode with slate base color
- **Path aliases:** `@/components`, `@/lib/utils`

### MetadataPanel Pattern
Right-aligned collapsible panel showing plot data:
- Plot number
- Owner
- Discovery date
- Resources (as tags)
- History timeline

This pattern can be reused for:
- Leaderboards
- Player profiles
- Inventory
- Settings

---

## Solana Smart Contract

### Location
`solana/programs/game/src/lib.rs`

### Instructions
1. `mint_nft` - Mint NFTs to players
2. `initialize_vault` - Set up deposit vault
3. `deposit_for_nft` - Bury treasure
4. `claim_deposit` - Dig treasure
5. `whitelist_token` - Admin whitelists tokens
6. `initialize_booty_mint` - Create $BOOTY token
7. `mine_booty` - Mint BOOTY to players
8. `burn_booty_for_travel` - Burn BOOTY for movement

### State
- **DepositVault** - Global stats (total deposits/claims)
- **DepositRecord** - Per-player deposit (amount, tier, timestamp, claimed)
- **BootyState** - BOOTY token stats (total mined/burned)
- **TokenWhitelist** - Allowed deposit tokens

---

## What's Missing (For Later)

### Smart Contract Gaps
- PlayerStats PDA (per-player totals)
- Plot tracking (which plot, who buried what)
- Plot visit tracking (for Explorer leaderboard)

### Frontend Gaps
- Leaderboard components
- Player profile pages
- Wallet connection UI
- Transaction confirmation UI
- NFT display

### Backend Gaps
- Data indexer (monitor blockchain)
- Leaderboard cache/API
- Real-time updates

---

## Development Workflow

### Run Locally
```bash
# Install dependencies
npm install

# Start dev server (frontend only)
npm run vite

# Build for production
npm run build

# Start production server
npm start
```

### Solana Development
```bash
cd solana

# Build program
anchor build

# Test
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

---

## Key Design Decisions

### Why Hybrid Architecture?
- **Three.js** for game rendering (WebGL performance)
- **React** for UI overlays (developer experience)
- **Separate concerns** - game loop independent of UI

### Why 100×100 Grid?
- 10,000 plots feels right for a treasure hunting game
- Not too sparse, not too crowded
- Grid coordinates (0-99, 0-99) are intuitive

### Why Tailwind CSS v4?
- Latest version (ahead of most projects)
- Native CSS integration
- Better performance
- Modern features

### Why shadcn/ui?
- Not a framework - you own the code
- Built on Radix UI primitives
- Perfect for blockchain UIs (wallets, transactions)
- Copy/paste components, customize freely

---

## Common Tasks

### Add a New Map Image
1. Create 10,000×10,000 px PNG image (or smaller)
2. Save to `public/assets/images/your-map.png`
3. Update `src/game/GameConfig.ts`:
   ```typescript
   backgroundImage: '/assets/images/your-map.png'
   ```

### Add a New UI Component
1. Install shadcn component:
   ```bash
   npx shadcn@latest add card
   ```
2. Use in your React components:
   ```tsx
   import { Card } from '@/components/ui/card';
   ```

### Change Grid Size
Edit `src/game/GameConfig.ts`:
```typescript
map: {
  gridSize: 100,  // Change to 50, 200, etc.
  worldSize: 1000, // Adjust if needed
}
```

---

## Known Issues

### Minor
- `main.ts` should be `main.tsx` (can't use JSX syntax currently)
- MetadataPanel fixed width on mobile (should be responsive)
- No TypeScript path mapping in tsconfig.json yet

### Not Issues (By Design)
- Map background is 10,000×10,000 but Three.js world is 1,000 units - this is normal
- Grid shows 100×100 but that's 10,000 squares total - correct
- npm audit shows vulnerabilities - all in Solana dependencies, ignore for now

---

## Future Architecture

When the game grows, we might need:
- Backend indexer (monitor Solana transactions)
- Firebase caching (faster leaderboard queries)
- WebSocket updates (real-time leaderboard)
- PlayerStats PDA (on-chain per-player totals)

But **not yet**. Start simple, add complexity only when needed.

---

## Questions?

See:
- [README.md](./README.md) - Project overview and setup
- [docs/LEADERBOARD.md](./docs/LEADERBOARD.md) - Leaderboard planning
- [Solana README](./solana/README.md) - Smart contract docs
