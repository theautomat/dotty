# Dotty Game Development Tasks

## 🚀 ACTIVE: React + TypeScript Migration

This is a major architectural refactoring to modernize the codebase with React and TypeScript.

### Phase 1: Initial Setup & Configuration ✅ COMPLETED
- [x] Install React dependencies
  - [x] Add `react` and `react-dom` to package.json (React 19)
  - [x] Add `@types/react` and `@types/react-dom`
  - [x] Add `@types/three` for Three.js types
  - [x] Add `@types/node` for Node.js types
- [x] Install TypeScript
  - [x] Add `typescript` as dev dependency (v5.9.3)
  - [x] Add `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin`
- [x] Update Vite configuration
  - [x] Install `@vitejs/plugin-react`
  - [x] Update `vite.config.js` → `vite.config.mts` (ESM TypeScript)
  - [x] Configure React plugin
  - [x] Configure TypeScript settings in Vite
- [x] Create TypeScript configuration
  - [x] Create `tsconfig.json` with appropriate compiler options
  - [x] Create `tsconfig.node.json` for Node.js scripts
  - [x] Configure paths, module resolution, JSX settings
- [x] **TESTED**: Build successful, server runs, game loads correctly

**Notes:**
- Using React 19 (bleeding edge!) with `--legacy-peer-deps` flag
- Vite config renamed to `.mts` to handle ESM modules while keeping server as CommonJS
- All dependencies installed and build passes successfully

### Phase 2: Dependency Cleanup ✅ COMPLETED
- [x] Remove Preact
  - [x] Remove all CDN imports of Preact (`https://esm.sh/htm/preact/standalone`)
  - [x] Stubbed out Preact components for now
- [x] Update Solana wallet dependencies
  - [x] Verify `@solana/wallet-adapter-react` is installed (already in package.json)
  - [x] Verify `@solana/wallet-adapter-react-ui` is installed (already in package.json)
  - [x] `@solana/wallet-adapter-wallets` confirmed installed
  - [x] These are now USABLE since we have React!
- [x] **TESTED**: Build successful, game loads and runs without Preact

**Notes:**
- Replaced `main.js` leaderboard (540+ lines of Preact) with simple stub
- Replaced `EntryScreen.js` with bypass stub - game starts immediately
- Stubbed `GameOverOverlay.js`, `ControlsBar.js`
- Bundle size reduced: 1.26MB → 1.18MB
- Game runs without errors, entry screen bypassed for testing
- Components marked for React migration in Phase 9

### Phase 3: Create Type Definitions ✅ COMPLETED
- [x] Create global type definitions
  - [x] Create `src/types/global.d.ts` for window extensions
  - [x] Define types for `window.THREE`, `window.game`, etc.
  - [x] Create `src/types/solana.d.ts` for Solana Phantom types
- [x] Create game-specific type definitions
  - [x] Create `src/types/game.ts` for game state types
  - [x] Create `src/types/objects.ts` for game object types
  - [x] Create `src/types/managers.ts` for manager interfaces
  - [x] Create `src/types/firebase.ts` for Firebase data structures
  - [x] Create `src/types/index.ts` to export all types
- [x] **TESTED**: TypeScript compilation successful, build works

**Notes:**
- Created comprehensive type system covering all game aspects
- Enums for GameState, EnemyType, PowerUpType, CollectibleType, SoundType
- Interfaces for game objects, managers, Firebase data, Solana wallet
- Global window extensions for THREE, game instance, Socket.IO, Phantom
- All types are now available for import throughout the codebase

### Phase 4: Convert Core Infrastructure (No React Yet) ✅ COMPLETED
- [x] Convert utility files to TypeScript
  - [x] `src/utils/WorldUtils.js` → `WorldUtils.ts`
  - [ ] `src/utils/wallet-connection.js` → (will be replaced with React wallet adapter in Phase 10)
- [x] Convert configuration files to TypeScript
  - [x] `src/game/GameConfig.js` → `GameConfig.ts`
  - [x] `src/game/GameTheme.js` → `GameTheme.ts`
  - [x] `src/game/LevelConfig.js` → `LevelConfig.ts` (simplified to 2 levels)
  - [ ] `src/objects/BulletConfig.js` → `BulletConfig.ts` (deferred to Phase 5)
  - [ ] `src/objects/collectibles/CollectibleConfig.js` → `CollectibleConfig.ts` (deferred to Phase 5)
  - [ ] `src/objects/enemies/EnemyConfig.js` → `EnemyConfig.ts` (deferred to Phase 5)
  - [ ] `src/objects/powers/PowerUpConfig.js` → `PowerUpConfig.ts` (deferred to Phase 5)
- [ ] Convert game state management to TypeScript (deferred to next session)
  - [ ] `src/game/GameState.js` → `GameState.ts`
  - [ ] `src/game/GameStateMachine.js` → `GameStateMachine.ts`
  - [ ] `src/game/GameStats.js` → `GameStats.ts`
  - [ ] `src/game/Timer.js` → `Timer.ts`
- [x] **TESTED**: Build successful, game compiles correctly

**Notes:**
- Converted 4 core files to TypeScript with proper type definitions
- Simplified LevelConfig from 5 levels to 2 levels (removed unused levels 3-5)
- Updated all imports throughout codebase (removed `.js` extensions)
- Bundle size stable: ~1.18MB
- Remaining config files (Bullet, Collectible, Enemy, PowerUp) will be done with Phase 5 game objects

### Phase 5: Convert Game Objects to TypeScript (IN PROGRESS)
- [x] Convert base classes
  - [x] `src/objects/GameObject.js` → `GameObject.ts` ✅
  - [ ] `src/objects/shapes/GeometryFactory.js` → `GeometryFactory.ts`
- [ ] Remaining: 74 JavaScript files to convert
- [ ] Convert player and world objects
  - [ ] `src/objects/WorldBoundary.js` → `WorldBoundary.ts`
  - [ ] `src/objects/Bullet.js` → `Bullet.ts`
  - [ ] `src/objects/Asteroid.js` → `Asteroid.ts`
  - [ ] `src/objects/FlyByAsteroid.js` → `FlyByAsteroid.ts`
  - [ ] `src/objects/ExplosionFragment.js` → `ExplosionFragment.ts`
- [ ] Convert collectibles
  - [ ] `src/objects/collectibles/Collectible.js` → `Collectible.ts`
  - [ ] `src/objects/collectibles/CollectibleTypes.js` → `CollectibleTypes.ts`
  - [ ] `src/objects/collectibles/index.js` → `index.ts`
- [ ] Convert enemies
  - [ ] `src/objects/enemies/Enemy.js` → `Enemy.ts`
  - [ ] `src/objects/enemies/EnemyWeapon.js` → `EnemyWeapon.ts`
  - [ ] `src/objects/enemies/Boss.js` → `Boss.ts`
  - [ ] `src/objects/enemies/SphereBoss.js` → `SphereBoss.ts`
  - [ ] `src/objects/enemies/Hunter.js` → `Hunter.ts`
  - [ ] `src/objects/enemies/Patroller.js` → `Patroller.ts`
  - [ ] `src/objects/enemies/Tetra.js` → `Tetra.ts`
  - [ ] `src/objects/enemies/UFO.js` → `UFO.ts`
  - [ ] `src/objects/enemies/HeatSeekingMine.js` → `HeatSeekingMine.ts`
  - [ ] `src/objects/enemies/EnemyTypes.js` → `EnemyTypes.ts`
  - [ ] `src/objects/enemies/index.js` → `index.ts`
- [ ] Convert power-ups
  - [ ] `src/objects/powers/PowerUp.js` → `PowerUp.ts`

### Phase 6: Convert Managers to TypeScript
- [ ] Convert manager base class
  - [ ] `src/managers/BaseInstanceManager.js` → `BaseInstanceManager.ts`
- [ ] Convert game managers
  - [ ] `src/managers/AsteroidManager.js` → `AsteroidManager.ts`
  - [ ] `src/managers/BulletManager.js` → `BulletManager.ts`
  - [ ] `src/managers/CollectibleManager.js` → `CollectibleManager.ts`
  - [ ] `src/managers/CollisionManager.js` → `CollisionManager.ts`
  - [ ] `src/managers/EnemyManager.js` → `EnemyManager.ts`
  - [ ] `src/managers/ExplosionManager.js` → `ExplosionManager.ts`
  - [ ] `src/managers/LevelManager.js` → `LevelManager.ts`
  - [ ] `src/managers/PowerUpManager.js` → `PowerUpManager.ts`
  - [ ] `src/managers/SoundManager.js` → `SoundManager.ts`
  - [ ] `src/managers/GameSessionManager.js` → `GameSessionManager.ts`
  - [ ] `src/managers/EntryScreenManager.js` → `EntryScreenManager.ts`

### Phase 7: Convert Core Game Files to TypeScript
- [ ] Convert game core
  - [ ] `src/game/Controls.js` → `Controls.ts`
  - [ ] `src/game/StartScreen.js` → `StartScreen.ts`
  - [ ] `src/game/Game.js` → `Game.ts` (main game controller)
  - [ ] `src/game/index.js` → `index.ts`
- [ ] Convert effects
  - [ ] `src/effects/ASCIIEffect.js` → `ASCIIEffect.ts`
- [ ] Convert audio
  - [ ] `src/audio/SoundTypes.js` → `SoundTypes.ts`

### Phase 8: Convert HUD Components to TypeScript (Still vanilla)
Note: These will remain vanilla Three.js objects for now, just with TypeScript
- [ ] `src/objects/hud/HUD.js` → `HUD.ts`
- [ ] `src/objects/hud/BulletDisplay.js` → `BulletDisplay.ts`
- [ ] `src/objects/hud/CollectibleDisplay.js` → `CollectibleDisplay.ts`
- [ ] `src/objects/hud/DeathIndicator.js` → `DeathIndicator.ts`
- [ ] `src/objects/hud/GameCompletionDisplay.js` → `GameCompletionDisplay.ts`
- [ ] `src/objects/hud/GameOverStats.js` → `GameOverStats.ts`
- [ ] `src/objects/hud/LevelTransitionDisplay.js` → `LevelTransitionDisplay.ts`
- [ ] `src/objects/hud/MiningDisplay.js` → `MiningDisplay.ts`
- [ ] `src/objects/hud/PowerUpDisplay.js` → `PowerUpDisplay.ts`
- [ ] `src/objects/hud/ScreenFlash.js` → `ScreenFlash.ts`
- [ ] `src/objects/hud/ShieldEffect.js` → `ShieldEffect.ts`
- [ ] `src/objects/hud/TimerDisplay.js` → `TimerDisplay.ts`
- [ ] `src/objects/hud/index.js` → `index.ts`

### Phase 9: Convert React Components (From Preact/Vanilla to React)
- [ ] Create React app structure
  - [ ] Create `src/App.tsx` as main React component
  - [ ] Create `src/main.tsx` to replace `main.js`
  - [ ] Set up React root and rendering
- [ ] Convert Entry Screen to React
  - [ ] Create `src/components/EntryScreen.tsx`
  - [ ] Remove Preact imports, use React
  - [ ] Convert htm template literals to JSX
  - [ ] Add proper TypeScript types for props
  - [ ] Add proper event handler types
- [ ] Create Leaderboard React component
  - [ ] Create `src/components/Leaderboard.tsx`
  - [ ] Remove inline Preact code from `main.js`
  - [ ] Convert to proper React component with TypeScript
  - [ ] Add types for leaderboard data
  - [ ] Add loading and error states with proper types
- [ ] Convert Help Menu to React (optional)
  - [ ] Create `src/components/HelpMenu.tsx`
  - [ ] Convert `src/components/HelpMenu.js` to React component
  - [ ] Or keep as vanilla JS if it's working well
- [ ] Convert Controls Bar to React (optional)
  - [ ] Create `src/components/ControlsBar.tsx`
  - [ ] Convert `src/components/ControlsBar.js` to React
  - [ ] Or keep as vanilla JS if preferred
- [ ] Convert Game Over Overlay to React
  - [ ] Create `src/components/GameOverOverlay.tsx`
  - [ ] Convert `src/components/GameOverOverlay.js` to React
  - [ ] Add proper TypeScript types

### Phase 10: Implement Solana Wallet Adapter (React)
- [ ] Create wallet provider setup
  - [ ] Create `src/components/WalletProvider.tsx`
  - [ ] Set up `WalletAdapterNetwork` (devnet/mainnet)
  - [ ] Configure wallet list (Phantom, Solflare, etc.)
  - [ ] Wrap app with `ConnectionProvider` and `WalletProvider`
- [ ] Create wallet UI components
  - [ ] Create `src/components/WalletButton.tsx` using adapter UI
  - [ ] Replace custom `WalletUI.js` component
  - [ ] Add wallet modal for multi-wallet support
- [ ] Update wallet integration
  - [ ] Remove `src/utils/wallet-connection.js` (custom implementation)
  - [ ] Create `src/hooks/useWallet.ts` hook wrapper
  - [ ] Create `src/hooks/useSolana.ts` for Solana interactions
  - [ ] Update NFT minting to use wallet adapter
- [ ] Update leaderboard with wallet integration
  - [ ] Use wallet adapter in Leaderboard component
  - [ ] Show connected wallet instead of fingerprint
  - [ ] Optional: authenticate with wallet signature

### Phase 11: Convert Firebase & Backend Scripts
- [ ] Convert Firebase scripts to TypeScript
  - [ ] `src/scripts/firebase-config.js` → `firebase-config.ts`
  - [ ] `src/scripts/firebase-module.js` → `firebase-module.ts`
  - [ ] `src/scripts/firebase-service.js` → `firebase-service.ts`
  - [ ] Add proper types for Firestore documents
- [ ] Convert other scripts
  - [ ] `src/scripts/fingerprint.js` → `fingerprint.ts`
  - [ ] `src/scripts/webrtc-client.js` → `webrtc-client.ts` (or remove if not needed)
  - [ ] `src/scripts/webrtc-test.js` → `webrtc-test.ts` (or remove if not needed)
- [ ] Update server files (if needed)
  - [ ] Consider converting `server.js` to `server.ts`
  - [ ] Add types for Express routes and middleware
  - [ ] Add types for NFT service

### Phase 12: Update HTML Entry Points
- [ ] Update `index.html`
  - [ ] Change script tag from `/main.js` to `/src/main.tsx`
  - [ ] Add root div for React app: `<div id="root"></div>`
  - [ ] Keep game container separate or integrate with React
  - [ ] Update meta tags if needed
- [ ] Update `leaderboard.html`
  - [ ] Point to new React app entry
  - [ ] Remove inline Preact loading code
  - [ ] Simplify structure
- [ ] Update or remove `entry-screen.html`
  - [ ] May no longer be needed if integrated into React app
  - [ ] Decide if it should be a separate page or part of main app

### Phase 13: Testing & Validation
- [ ] Test TypeScript compilation
  - [ ] Run `npm run type-check` and fix all type errors
  - [ ] Ensure no `any` types where possible
  - [ ] Add explicit return types to functions
- [ ] Test build process
  - [ ] Run `npm run build` successfully
  - [ ] Check bundle size compared to before
  - [ ] Verify sourcemaps are generated
- [ ] Test game functionality
  - [ ] Game loads and initializes correctly
  - [ ] Player movement works (WASD)
  - [ ] Collectibles spawn and can be collected
  - [ ] Enemies spawn and behave correctly (if enabled)
  - [ ] Scoring and stats work
  - [ ] Level progression works
- [ ] Test React components
  - [ ] Entry screen displays and functions
  - [ ] Leaderboard loads and displays data
  - [ ] Game over overlay shows correctly
  - [ ] Help menu works
- [ ] Test Solana integration
  - [ ] Wallet adapter UI appears
  - [ ] Can connect to Phantom wallet
  - [ ] Can connect to other wallets (Solflare, etc.)
  - [ ] NFT minting works with new adapter
  - [ ] Transaction signing works
- [ ] Test Firebase integration
  - [ ] Scores save to Firestore
  - [ ] Leaderboard fetches and displays correctly
  - [ ] Error handling works
- [ ] Browser compatibility testing
  - [ ] Test in Chrome
  - [ ] Test in Firefox
  - [ ] Test in Safari
  - [ ] Test on mobile devices

### Phase 14: Cleanup & Optimization
- [ ] Remove old files
  - [ ] Delete all `.js` files that have been converted to `.ts`/`.tsx`
  - [ ] Remove old `main.js` (replaced by `main.tsx`)
  - [ ] Remove `src/components/WalletUI.js` (replaced by wallet adapter)
  - [ ] Remove `src/utils/wallet-connection.js` (replaced by hooks)
- [ ] Update imports throughout codebase
  - [ ] Search for any remaining `.js` extensions in imports
  - [ ] Update to `.ts`/`.tsx` or remove extensions
- [ ] Code quality improvements
  - [ ] Add ESLint configuration for TypeScript
  - [ ] Run linter and fix issues
  - [ ] Add Prettier for code formatting
  - [ ] Consider adding `strict: true` to tsconfig.json
- [ ] Documentation updates
  - [ ] Update README.md with TypeScript/React info
  - [ ] Document new project structure
  - [ ] Add instructions for development with TypeScript
  - [ ] Update architecture.md with new tech stack
- [ ] Performance optimization
  - [ ] Check bundle size and optimize if needed
  - [ ] Implement code splitting for routes
  - [ ] Lazy load heavy components
  - [ ] Optimize Three.js imports

### Phase 15: Final Verification
- [ ] Code review
  - [ ] Review all TypeScript conversions for quality
  - [ ] Check for proper type safety
  - [ ] Verify no type errors or warnings
- [ ] Production build test
  - [ ] Build for production: `npm run build`
  - [ ] Test production build locally
  - [ ] Verify all features work in production mode
- [ ] Git commit and documentation
  - [ ] Commit all changes with clear message
  - [ ] Tag release as major version bump
  - [ ] Update CHANGELOG if you have one
  - [ ] Push to GitHub
- [ ] Deployment preparation
  - [ ] Update deployment scripts if needed
  - [ ] Test deployment to staging environment
  - [ ] Verify environment variables work in production

---

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
- [x] Update entry screen branding: "Mancer" → "Dotty"
- [x] Remove spinning object from entry screen
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
