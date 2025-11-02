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
- [ ] Update entry screen branding: "Mancer" → "Dotty"
- [ ] Remove spinning object from entry screen
- [ ] Remove or simplify entry screen complexity
- [ ] Consider removing Preact dependency from entry screen
- [ ] Create simple start screen for Dotty
- [ ] Remove arcade cabinet aesthetic if not needed

### Audio & Sound Updates
- [ ] Replace spaceship movement sounds with appropriate sounds for Dotty
- [ ] Remove or replace all spaceship/alien/asteroid sound effects
- [ ] Add simple movement sounds for walking/exploration
- [ ] Keep treasure collection sounds (may be reusable)
- [ ] Plan sound scheme for top-down exploration game

## 🎮 Game Foundation: Top-Down Mechanics

### Camera System
- [x] Implement top-down orthographic camera
- [x] Set up camera to follow player character
- [x] Camera locked to player position (X and Z)
- [ ] Implement zoom controls (mouse wheel)
- [ ] Define and enforce min/max zoom levels
- [ ] Test camera smoothing and follow behavior (if needed)

### Player Character (Dotty)
- [x] Create simple circular player character (green dot)
- [x] Implement WASD movement controls
- [x] Simplified movement system (direct, no momentum)
- [x] Camera follows player perfectly
- [x] Added grid ground plane for visual reference
- [x] Removed crosshair (not needed for top-down)
- [x] Modified Controls.js to move player instead of camera
- [ ] Move player dot code to /src/objects/Player.js or Dotty.js
- [ ] Replace green circle with actual Dotty sprite/character art

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

### Top-Down Game Foundation
- [x] Changed camera from PerspectiveCamera to OrthographicCamera
- [x] Positioned camera above world looking straight down
- [x] Created player character as green circle (Dotty)
- [x] Added grid ground plane for visual reference
- [x] Modified Controls.js to accept player object reference
- [x] Simplified movement to direct WASD (no momentum/acceleration)
- [x] Fixed camera to follow player position perfectly
- [x] Removed crosshair from UI (not needed for top-down)
- [x] Disabled asteroid/enemy spawning temporarily
- [x] Tested all four movement keys (W/A/S/D working properly)
