# Next Session - TypeScript Conversion Roadmap

## What We've Accomplished So Far ✅

### Phase 1-4 Complete:
- React 19 + TypeScript installed and configured
- Preact completely removed
- Complete type system created (5 type files)
- Core infrastructure converted:
  - `WorldUtils.ts`
  - `GameConfig.ts`
  - `GameTheme.ts`
  - `LevelConfig.ts` (simplified to 2 levels)
  - `GameObject.ts` (abstract base class)
  - `GameState.ts`
  - `GameStateMachine.ts`

**Files Converted: 12 TypeScript** | **Files Remaining: 74 JavaScript**
**Build Status:** ✅ Passing | **Bundle: 1.18MB**

---

## Continue With Option A: Critical Path to Running Game

### Immediate Next Steps (in this exact order):

#### 1. GameStats.ts & Timer.ts (2 files)
```bash
# Dependencies: firebase-service, CollectibleConfig, EnemyConfig
# Convert these two to get stat tracking working
```

#### 2. Controls.ts (1 file)
```bash
# Dependencies: GameState, GameStateMachine (already done!)
# Critical for player input
```

#### 3. Core Managers (priority order - ~8 files)
Convert only the managers that Game.js directly uses:
- `src/managers/SoundManager.js` → `.ts`
- `src/managers/PowerUpManager.js` → `.ts`
- `src/managers/LevelManager.js` → `.ts`
- `src/managers/CollisionManager.js` → `.ts`
- `src/managers/AsteroidManager.js` → `.ts`
- `src/managers/BulletManager.js` → `.ts`
- `src/managers/CollectibleManager.js` → `.ts`
- `src/managers/EnemyManager.js` → `.ts`

#### 4. Config Files Managers Need (~4 files)
- `src/objects/BulletConfig.js` → `.ts`
- `src/objects/collectibles/CollectibleConfig.js` → `.ts`
- `src/objects/enemies/EnemyConfig.js` → `.ts`
- `src/objects/powers/PowerUpConfig.js` → `.ts`

#### 5. Game Objects Managers Use (~6 files)
- `src/objects/Bullet.js` → `.ts`
- `src/objects/Asteroid.js` → `.ts`
- `src/objects/collectibles/Collectible.js` → `.ts`
- `src/objects/enemies/Enemy.js` → `.ts`
- `src/objects/powers/PowerUp.js` → `.ts`
- `src/objects/WorldBoundary.js` → `.ts`

#### 6. Game.js Finally! (1 file)
```bash
# After all dependencies are converted, convert the main game controller
src/game/Game.js → Game.ts
```

#### 7. Test Everything
```bash
npm run build
npm run server:prod
# Open http://localhost:3000 and verify game runs
```

---

## Notes for Next Session

### Key Commands:
```bash
# Count remaining JS files
find src -name "*.js" -type f | wc -l

# Update imports after converting a file
find src -name "*.js" -type f -exec sed -i '' 's/FileName\.js/FileName/g' {} \;

# Build test
npm run build

# Type check
npx tsc --noEmit
```

### Remember:
- **Zustand idea**: User wants to migrate to Zustand for state management (note for Phase 9)
- **Test after each major conversion** - don't go too far without building
- **Option A strategy**: Critical path first, get game running, then clean up the rest

### Estimated Remaining Work:
- **Session 2**: GameStats, Timer, Controls, Core Managers (~12 files)
- **Session 3**: Game.js and remaining dependencies (~15 files)
- **Session 4**: HUD components (~13 files)
- **Session 5**: Phase 9 - Convert to React components
- **Session 6**: Phase 10 - Solana Wallet Adapter
- **Session 7**: Cleanup, testing, optimization

---

## Quick Win Strategy

If you want to see progress fast in next session:

1. Convert GameStats & Timer (easy, mostly data)
2. Convert Controls (small file, critical)
3. Convert BulletConfig, CollectibleConfig, EnemyConfig, PowerUpConfig (pure data, quick wins)
4. These 6 files will unblock a lot of the managers

---

## Current File Structure Status

```
src/
├── types/              ✅ 100% TypeScript
├── utils/              ✅ 100% TypeScript (1 file)
├── game/               🔄  58% TypeScript (7/12 files)
│   ├── ✅ GameConfig.ts
│   ├── ✅ GameTheme.ts
│   ├── ✅ LevelConfig.ts
│   ├── ✅ GameState.ts
│   ├── ✅ GameStateMachine.ts
│   ├── ❌ GameStats.js (NEXT)
│   ├── ❌ Timer.js (NEXT)
│   ├── ❌ Controls.js (NEXT)
│   ├── ❌ Game.js (FINAL BOSS)
│   └── ❌ Others...
├── objects/            🔄  3% TypeScript (1/30 files)
│   └── ✅ GameObject.ts
├── managers/           ❌ 0% TypeScript (0/14 files)
├── components/         ❌ Stubbed (8 files - awaiting React)
└── scripts/            ❌ 0% TypeScript (0/5 files)
```

**Start next session by running:**
```bash
cd /Users/beau/Projects/dotty
cat NEXT_SESSION.md
npm run build  # Verify everything still works
```
