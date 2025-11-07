# Dotty Architecture & Tech Stack

## Overview
Dotty is a top-down 3D space exploration game where players discover hidden treasures and digital assets. This document provides a comprehensive analysis of all technologies used in the project.

---

## 🏗️ Core Architecture

### Application Type
- **Single Page Application (SPA)** with multiple entry points
- **Hybrid rendering approach**: Vanilla JS for game + Preact for UI components
- **Client-Server architecture** with real-time multiplayer capabilities

---

## 📦 Build Tools & Package Management

### Vite (v5.0.7)
**Purpose**: Build tool and development server

**Current Usage**:
- Development server on port 5173
- Production bundling with Rollup
- Multi-page setup (main game + leaderboard)
- Module transformation and optimization

**⚠️ Concerns**:
- **User identified as "terrible"**
- Relatively simple configuration in `vite.config.js`
- Only used for bundling, not leveraging advanced features
- Could be replaced with alternatives

**Alternatives to Consider**:
- **Webpack** - More established, extensive plugin ecosystem, better for complex builds
- **Rollup** - Simpler, more focused on library bundling
- **esbuild** - Extremely fast, minimal configuration
- **Parcel** - Zero-config alternative
- **Turbopack** - Next-generation bundler (experimental)

### pnpm (v10.6.4)
**Purpose**: Package manager

**Benefits**:
- Disk space efficiency with content-addressable storage
- Faster installation than npm/yarn
- Strict dependency resolution

---

## 🎨 Frontend Framework & UI

### Vanilla JavaScript (ES6+)
**Purpose**: Core game logic

**Current Usage**:
- Main game engine (`src/game/Game.js`)
- All game objects (asteroids, collectibles, enemies)
- Game state management
- Controls and input handling
- Manager classes for game systems

**Architecture**:
- Class-based OOP approach
- ES6 modules
- No framework overhead

### Preact (via CDN: esm.sh)
**Purpose**: UI components for non-game interfaces

**⚠️ Critical Issues**:
- **User explicitly doesn't like Preact**
- **Loaded from CDN** (`https://esm.sh/htm/preact/standalone`) - not in package.json
- **Only used in 2 places**:
  1. `main.js:313` - Leaderboard component
  2. `src/components/EntryScreen.js:7` - Entry screen overlay
- **Inconsistent**: Game uses vanilla JS, UI overlays use Preact
- **Affects Solana integration**: Leaderboard loads Preact, then uses it for rendering wallet connection states

**Why This Is Problematic**:
1. **No version control** - CDN version could change
2. **Network dependency** - Offline development issues
3. **Type safety** - No TypeScript support
4. **Mixed paradigms** - Confusing codebase with vanilla JS + Preact
5. **Bundle size** - Loaded at runtime instead of tree-shaken at build time
6. **Solana wallet UI** - Forces specific patterns

**Replacement Options**:
- **React** - Industry standard, vast ecosystem, better tooling
- **Vue 3** - Progressive framework, simpler learning curve
- **Svelte** - Compile-time framework, smallest bundle size
- **Solid.js** - Reactive primitives, excellent performance
- **Continue with Vanilla JS** - Refactor Preact components to vanilla JS classes
  - Entry screen could be pure DOM manipulation
  - Leaderboard is simple table rendering

---

## 🎮 Game Engine & Graphics

### Three.js (v0.159.0)
**Purpose**: 3D rendering engine

**Current Usage**:
- Scene graph management
- Camera system (top-down orthographic view)
- WebGL renderer
- 3D geometry creation
- Materials and lighting
- Object3D hierarchy

**Integration**:
- Loaded as ES module from npm
- Made globally available via `window.THREE` in `main.js:7`
- Custom geometry factory (`src/objects/shapes/GeometryFactory.js`)
- Custom ASCII effect renderer (`src/effects/ASCIIEffect.js`)

**Status**: ✅ Well-integrated and appropriate for the project

### postprocessing (v6.37.2)
**Purpose**: Post-processing effects for Three.js

**Status**: Installed but usage unclear from code review

---

## 🔥 Backend Services

### Express.js (v4.18.2)
**Purpose**: HTTP server and API

**Current Usage**:
- Static file serving
- API endpoints:
  - `/api/leaderboard` - Placeholder for leaderboard data
  - `/api/mint-nft` - NFT minting requests
  - `/api/nft-status` - Check NFT service status
- Route handling:
  - `/leaderboard` - Leaderboard page
  - `/games/:gameId` - Shareable game links
  - `/entry-screen` - Entry screen route

**Environment Handling**:
- **Development**: Serves from root + assets, LiveReload enabled
- **Production**: Serves from `dist/` (Vite build output)

**Status**: ✅ Appropriate for project needs

### Socket.IO (v4.7.2)
**Purpose**: WebRTC signaling server for multiplayer

**Current Usage**:
- Real-time peer connection signaling
- Room management
- Offer/answer/ICE candidate exchange
- Peer discovery and disconnection handling

**Integration**:
- Runs on same HTTP server as Express (port 3000)
- Client uses `socket.io-client` v4.7.2
- WebRTC implementation in:
  - `server.js:216-303` - Server-side signaling
  - `webrtc-signaling.js` - Signaling module
  - `src/scripts/webrtc-client.js` - Client-side WebRTC

**Status**: ✅ Standard approach for WebRTC signaling

---

## 💾 Database & Storage

### Firebase (v10.7.0)
**Purpose**: Cloud database and analytics

**Current Usage**:
- **Firestore**: Player game records and leaderboard
  - Collection: `games`
  - Fields: `playerId`, `score`, `created` timestamp
  - Queries: Top 100 scores with date filtering
- **Analytics**: Usage tracking (imported but usage unclear)

**Integration Files**:
- `src/scripts/firebase-config.js` - Configuration
- `src/scripts/firebase-module.js` - Initialization
- `src/scripts/firebase-service.js` - Service wrapper

**Architecture**:
- Client-side Firebase SDK
- Direct Firestore queries from browser
- No backend validation of game scores

**⚠️ Security Concerns**:
- **No server-side validation** - Scores submitted directly from client
- **Vulnerable to cheating** - Anyone can POST any score
- **Firebase rules** - Need to verify security rules

**Improvements Needed**:
- Server-side score validation
- Rate limiting
- Anti-cheat mechanisms
- Session verification

---

## 🔐 Authentication & Identity

### FingerprintJS Pro (v3.8.1)
**Purpose**: Anonymous player identification

**Current Usage**:
- Player identification without accounts
- Used as `playerId` in Firebase
- Implemented in `src/scripts/fingerprint.js`

**Limitations**:
- Browser fingerprinting can be bypassed
- Privacy concerns
- Not suitable for real authentication
- Users can create multiple "identities"

**Better Alternatives**:
- **Web3 wallet-based auth** - Use Solana wallet as identity
- **Traditional auth** - Email/password with Firebase Auth
- **OAuth** - Google, Twitter, etc.

---

## ⛓️ Blockchain & NFTs

### Solana Ecosystem

#### Core Libraries
- **@solana/web3.js** (v1.95.2) - Solana JavaScript SDK
- **@solana/spl-token** (v0.4.8) - Token program interaction
- **@coral-xyz/anchor** (v0.30.1) - Solana smart contract framework (Rust)
- **@solana/wallet-adapter-base** (v0.9.23) - Wallet adapter foundation
- **@solana/wallet-adapter-react** (v0.15.35) - React wallet adapter
- **@solana/wallet-adapter-react-ui** (v0.9.35) - React wallet UI components
- **@solana/wallet-adapter-wallets** (v0.19.32) - Multi-wallet support
- **bs58** (v6.0.0) - Base58 encoding for Solana addresses

**⚠️ Major Architecture Issue**:

#### Wallet Adapter Libraries Are React-Based BUT NOT USED
The project has React-based Solana wallet adapters installed (`@solana/wallet-adapter-react*`) but:
1. **No React in the project** - Only Preact loaded from CDN
2. **Custom wallet implementation** - Manual Phantom integration in `src/utils/wallet-connection.js`
3. **Unused dependencies** - React wallet adapters are dead weight

**Current Implementation**:
```javascript
// src/utils/wallet-connection.js
// Manual Phantom wallet integration
export class WalletConnection {
  async connect() {
    const resp = await window.solana.connect();
    this.publicKey = resp.publicKey.toString();
  }
}
```

**Why This Is Wrong**:
- **Vendor lock-in** - Only works with Phantom
- **No multi-wallet support** - Can't use Solflare, Ledger, etc.
- **Missing features** - No auto-reconnect, no transaction signing helpers
- **Wasted dependencies** - 5+ wallet packages not being used

**How Preact Dictates Solana Integration**:
Since Preact is used for UI (leaderboard, entry screen), and wallet state needs to be reactive:
1. Wallet adapters require React context
2. Project doesn't use React properly
3. Forced to build custom wallet solution
4. Loses ecosystem benefits

#### Solana Smart Contract
- **Location**: `solana/programs/dotty-nft/`
- **Language**: Rust
- **Framework**: Anchor
- **Purpose**: Mint collectible NFTs to player wallets

**Architecture**:
- Backend-signed minting (game server authorizes)
- Metaplex Token Metadata standard
- Deployed to devnet

**Files**:
- `solana/programs/dotty-nft/src/lib.rs` - Smart contract code
- `solana/Anchor.toml` - Anchor configuration
- `solana/metadata/examples/*.json` - NFT metadata templates

**Status**: ✅ Proper architecture for game NFTs

#### NFT Service
- **Implementation**: `nft-service.js`
- **Endpoints**:
  - `POST /api/mint-nft` - Mint NFT for player
  - `GET /api/nft-status` - Check service status

**Issues**:
- No rate limiting
- No session verification
- Vulnerable to abuse

---

## 🎵 Audio

### Web Audio API
**Purpose**: Game sound effects and music

**Implementation**:
- Custom `SoundManager` singleton (`src/managers/SoundManager.js`)
- Sound assets in `public/sounds/`
- Volume control in help menu

**Status**: ✅ Native browser API, no dependencies needed

---

## 🔧 Development Tools

### nodemon (v3.0.1)
**Purpose**: Auto-restart server on file changes

**Usage**:
- `npm run server` - Development mode with auto-restart
- Watches server files

### livereload (v0.9.3) + connect-livereload (v0.6.1)
**Purpose**: Browser auto-refresh on file changes

**Integration**:
- Enabled in development mode
- Watches entire project directory
- Injects reload script into HTML

**Issues**:
- Watches too broadly (node_modules, etc.)
- Conflicts with Vite's HMR
- Duplicated functionality

### concurrently (v9.1.2)
**Purpose**: Run multiple npm scripts in parallel

**Status**: Installed but not actively used in package.json scripts

---

## 📁 Project Structure

```
dotty/
├── src/
│   ├── game/               # Core game engine
│   │   ├── Game.js        # Main game controller
│   │   ├── GameState.js   # State management
│   │   └── ...
│   ├── objects/           # Game entities
│   │   ├── collectibles/  # Treasure items
│   │   ├── enemies/       # Enemy types
│   │   └── hud/          # UI overlays
│   ├── managers/          # System managers
│   ├── components/        # UI components (Preact)
│   ├── utils/            # Utilities
│   └── scripts/          # Standalone scripts
├── solana/               # Solana smart contracts
│   ├── programs/         # Anchor programs
│   └── metadata/         # NFT metadata
├── public/               # Static assets
├── dist/                 # Vite build output
├── server.js             # Express server
├── main.js               # Client entry point
├── index.html            # Main game page
├── leaderboard.html      # Leaderboard page
└── vite.config.js        # Vite configuration
```

---

## 🚨 Critical Issues & Recommendations

### 1. Preact Integration
**Problem**:
- Loaded from CDN, no version control
- Only used for 2 components
- Prevents proper use of Solana wallet adapters

**Solutions**:
1. **Replace with React**
   - Add React to package.json
   - Use Solana wallet adapter properly
   - Full ecosystem support

2. **Replace with vanilla JS**
   - Remove Preact entirely
   - Rewrite EntryScreen and Leaderboard as vanilla classes
   - Keep custom Phantom integration (or add Solana adapters)

3. **Commit to Preact properly**
   - Add to package.json
   - Build with Vite
   - Refactor more components to use it

### 2. Vite Concerns
**Problem**: User finds it "terrible"

**Alternatives**:
- **Webpack** - More control, better for complex setups
- **Rollup** - Simpler, more focused
- **esbuild** - Fastest build times
- **Just ES modules** - Modern browsers support them natively

**Questions to Consider**:
- What specific issues with Vite?
- Bundle size problems?
- Dev server issues?
- Build performance?

### 3. Solana Wallet Dependencies
**Problem**: React-based wallet adapters installed but not used

**Solutions**:
1. **Remove unused packages**:
   ```bash
   npm uninstall @solana/wallet-adapter-react \
                 @solana/wallet-adapter-react-ui \
                 @solana/wallet-adapter-base \
                 @solana/wallet-adapter-wallets
   ```
   Keep only: `@solana/web3.js`, `@solana/spl-token`, `@coral-xyz/anchor`, `bs58`

2. **Or switch to React/Preact properly** and use the adapters

### 4. Firebase Security
**Problem**: Client-side score submission, no validation

**Solutions**:
- Add Firebase callable functions for score submission
- Implement server-side validation
- Add rate limiting
- Session verification with JWT

### 5. Mixed Architecture
**Problem**: Vanilla JS + Preact creates inconsistency

**Solutions**:
1. **Go full vanilla** - Best for game performance
2. **Go full React/Preact** - Better for UI components
3. **Separate concerns** - Web Components for UI, vanilla for game

---

## 📊 Technology Stack Summary

| Category | Technology | Version | Status |
|----------|-----------|---------|--------|
| **Build Tool** | Vite | 5.0.7 | ⚠️ User concerned |
| **Package Manager** | pnpm | 10.6.4 | ✅ Good |
| **Game Engine** | Three.js | 0.159.0 | ✅ Appropriate |
| **UI Framework** | Preact (CDN) | Unknown | ❌ Remove or fix |
| **Core Language** | Vanilla JS | ES6+ | ✅ Good |
| **Backend** | Express | 4.18.2 | ✅ Good |
| **Real-time** | Socket.IO | 4.7.2 | ✅ Good |
| **Database** | Firebase | 10.7.0 | ⚠️ Security issues |
| **Blockchain** | Solana | 1.95.2 | ✅ Good |
| **Smart Contracts** | Anchor | 0.30.1 | ✅ Good |
| **Wallet** | Custom Phantom | N/A | ⚠️ Limited |
| **Audio** | Web Audio API | Native | ✅ Good |
| **Identity** | FingerprintJS Pro | 3.8.1 | ⚠️ Weak |

**Legend**:
- ✅ Good - Well implemented
- ⚠️ Concerns - Needs attention
- ❌ Problem - Requires refactoring

---

## 🎯 Recommended Actions

### Immediate (High Priority)
1. **Decide on UI framework approach**
   - Remove Preact or commit to it properly
   - Update Solana integration accordingly

2. **Clean up Solana dependencies**
   - Remove unused React wallet adapters OR
   - Properly implement them with React

3. **Secure Firebase**
   - Add server-side validation
   - Implement rate limiting

### Short-term (Medium Priority)
4. **Evaluate Vite**
   - Document specific issues
   - Consider alternatives if needed

5. **Improve authentication**
   - Move to wallet-based auth OR
   - Add proper user accounts

### Long-term (Low Priority)
6. **Standardize architecture**
   - Consistent patterns across codebase
   - Documentation for patterns

7. **Development tooling**
   - Remove LiveReload (conflicts with Vite HMR)
   - Simplify dev setup

---

## 📝 Questions for Project Team

1. **Preact**: Remove completely or integrate properly?
2. **Vite**: What specific issues? Switch to Webpack/Rollup/esbuild?
3. **Solana wallets**: Multi-wallet support needed or Phantom-only is fine?
4. **Framework**: Move to React for better Solana ecosystem support?
5. **Build complexity**: Prefer simpler builds or more features?

---

## 🔄 Migration Paths

### Path 1: Full React (Best for Solana ecosystem)
```
1. Add React + ReactDOM to package.json
2. Replace Preact components with React
3. Integrate Solana wallet adapters properly
4. Multi-wallet support out of the box
5. Remove custom wallet implementation
```

### Path 2: Full Vanilla JS (Best for performance)
```
1. Remove Preact CDN imports
2. Rewrite EntryScreen as vanilla class
3. Rewrite Leaderboard as vanilla DOM manipulation
4. Keep custom Phantom integration
5. Remove ALL React-based Solana packages
6. Lighter bundle, full control
```

### Path 3: Web Components (Modern standard)
```
1. Use Web Components for UI (native browser support)
2. Custom elements for entry screen, leaderboard
3. Keep vanilla JS for game
4. No framework needed
5. Works with any build tool
```

---

## 📈 Performance Considerations

### Current Bundle Size (Production)
- Three.js: ~600kb
- Firebase SDK: ~300kb
- Solana SDKs: ~250kb
- Socket.IO client: ~100kb
- Preact (CDN): ~10kb runtime
- **Total**: ~1.3MB (uncompressed)

### Optimization Opportunities
1. **Tree shaking** - Only import needed Firebase features
2. **Code splitting** - Lazy load Solana SDK
3. **CDN for Three.js** - Reduce bundle size
4. **Remove unused deps** - Wallet adapters, postprocessing
5. **Compression** - Enable gzip/brotli

---

## 🏁 Conclusion

The project has a **solid foundation** with Three.js for 3D rendering, Express for backend, and Solana for blockchain features. However, there are **architectural inconsistencies** around UI framework choice (Preact loaded from CDN) that create problems with the Solana wallet integration.

**Key Decision Point**: Choose ONE approach for UI and stick with it throughout the project. This will simplify the Solana integration and improve maintainability.

**Recommended**: Remove Preact, go full vanilla JS for consistency, or switch to React for better Solana ecosystem support.
