# Dotty Game Development Tasks

## 🔥 High Priority: Infrastructure & Security

### Environment & Security Setup
- [x] Create `.env` file with environment variable structure
- [x] Create `.env.example` template for deployment
- [x] Move Firebase config to environment variables
- [x] Move FingerprintJS API key to environment variables (or remove if not needed)
- [x] Update `.gitignore` to ensure `.env` is excluded
- [x] Test environment variable loading in both dev and prod

### Firebase Migration
- [x] Create new Firebase project for Dotty (Project ID: dotty-7f173)
- [x] Register web app in Firebase console
- [x] Update .env with new Dotty Firebase credentials
- [x] Test build with new Firebase configuration
- [ ] Set up Firestore database with new collection structure
- [ ] Plan new data schema for treasure collection tracking
- [ ] Migrate/adapt Firebase service layer for Dotty-specific data
- [ ] Test Firebase connection and data persistence

## 🧹 Core Cleanup: Remove Multiplayer & Unused Features

### Remove WebRTC/Multiplayer Infrastructure
- [ ] Remove Socket.IO server code from `server.js`
- [ ] Delete `webrtc-signaling.js` file
- [ ] Remove WebRTC client scripts from `src/scripts/` directory
- [ ] Remove `WebRTCDebugPanel` component
- [ ] Remove multiplayer-related routes (`/games/:gameId`)
- [ ] Clean up `window.ENABLE_MULTIPLAYER` flag in main.js
- [ ] Remove socket.io and socket.io-client from package.json dependencies

### Simplify Server & Build System
- [ ] Simplify `server.js` to focus on static file serving
- [ ] Remove unnecessary routes (keep leaderboard route)
- [ ] Consider replacing LiveReload with Vite's HMR
- [ ] Document simplified server architecture
- [ ] Test dev and prod server modes after cleanup

## 🎨 Branding & Asset Cleanup

### Update Branding (Mancer → Dotty)
- [ ] Update `index.html` title and meta tags
- [ ] Update Open Graph tags for social sharing
- [ ] Update leaderboard page branding
- [ ] Replace or remove Mancer-branded images
- [ ] Update any remaining references in HTML/CSS

### Clean Up Sound Assets
- [ ] Remove spaceship engine sounds
- [ ] Remove alien/UFO sounds
- [ ] Remove asteroid explosion sounds
- [ ] Remove enemy-specific sounds (hunter, tetra, etc.)
- [ ] Keep generic sounds that might be reusable (power-up, collection, etc.)
- [ ] Document remaining sound files and their purposes

### Simplify Entry Experience
- [ ] Remove or simplify entry screen complexity
- [ ] Consider removing Preact dependency from entry screen
- [ ] Create simple start screen for Dotty
- [ ] Remove arcade cabinet aesthetic if not needed

## 🎮 Game Foundation: Top-Down Mechanics

### Camera System
- [ ] Implement top-down orthographic camera
- [ ] Set up camera to follow player character
- [ ] Implement zoom controls (mouse wheel)
- [ ] Define and enforce min/max zoom levels
- [ ] Test camera smoothing and follow behavior

### Player Character (Dotty)
- [ ] Create simple circular player character
- [ ] Implement WASD movement controls
- [ ] Set up player physics (speed, acceleration)
- [ ] Add player position tracking
- [ ] Create player visual representation (start with simple circle)
- [ ] Test movement feel and responsiveness

### World & Boundaries
- [ ] Define 2D world boundaries
- [ ] Implement world size and coordinate system
- [ ] Add boundary visualization (optional)
- [ ] Prevent player from leaving world bounds
- [ ] Plan world chunking for larger worlds (future)

### Treasure System Foundation
- [ ] Design treasure data structure
- [ ] Implement treasure placement system
- [ ] Create proximity detection for treasure reveal
- [ ] Add treasure visibility toggle based on distance
- [ ] Create basic treasure visual (placeholder)
- [ ] Test reveal mechanics with different distances

### Interaction System
- [ ] Implement collision detection with treasures
- [ ] Create dialog/modal system for treasure collection
- [ ] Add "mine" or "collect" button functionality
- [ ] Implement inventory data structure
- [ ] Connect treasure collection to Firebase/inventory
- [ ] Test treasure collection flow

## 🔮 Future Features

### Wallet Integration
- [ ] Research Phantom Wallet SDK integration
- [ ] Plan authentication flow with Phantom
- [ ] Design wallet connection UI
- [ ] Implement wallet connection logic
- [ ] Test wallet detection and connection

### NFT/Crypto Assets
- [ ] Define digital asset types (NFTs, tokens, etc.)
- [ ] Design asset metadata structure
- [ ] Plan on-chain vs off-chain data storage
- [ ] Implement asset minting/claiming logic
- [ ] Create asset display in inventory

### Leaderboard Evolution
- [ ] Adapt leaderboard for treasure collection stats
- [ ] Update scoring system for Dotty mechanics
- [ ] Design leaderboard categories (treasures found, rare items, etc.)
- [ ] Implement player identification system
- [ ] Test leaderboard with new data schema

### Visual Polish
- [ ] Create alien character sprite for Dotty
- [ ] Design alien landscape visuals
- [ ] Add particle effects for treasure reveal
- [ ] Implement visual feedback for collection
- [ ] Add ambient effects (fog, lighting, etc.)

## ✅ Completed Tasks

### Project Setup
- [x] Created dotty project directory
- [x] Copied asteroids codebase as starting point
- [x] Created conversations folder for documentation
- [x] Updated README with Dotty game concept
- [x] Updated package.json with dotty details
- [x] Initialized new git repository
- [x] Created GitHub repository (https://github.com/theautomat/dotty)
- [x] Pushed initial commit to GitHub
- [x] Analyzed complete infrastructure stack
- [x] Documented build system, server setup, and external services
- [x] Created comprehensive tasks.md for project tracking

### Environment & Security Setup
- [x] Created `.env` file with environment variable structure
- [x] Created `.env.example` template for deployment
- [x] Moved Firebase config to use Vite environment variables (VITE_FIREBASE_*)
- [x] Moved FingerprintJS API key to environment variable (VITE_FINGERPRINT_API_KEY)
- [x] Verified `.gitignore` excludes `.env` files
- [x] Tested environment variable loading with production build
- [x] Added validation for required Firebase environment variables
- [x] Committed and pushed security improvements to GitHub

### Firebase Migration (Initial Setup)
- [x] Created new Firebase project "dotty" (Project ID: dotty-7f173)
- [x] Registered web app in Firebase console
- [x] Updated .env file with new Dotty Firebase credentials
- [x] Verified build works with new Firebase configuration
