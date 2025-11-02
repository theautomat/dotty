# CollisionManager Integration Plan

This document outlines how to integrate the new CollisionManager into the Game class to refactor collision detection and handling.

## Overview

The CollisionManager centralizes all collision detection and handling, providing several benefits:
- Reduces complexity in Game.js
- Separates collision logic from object management
- Creates clearer responsibility boundaries
- Allows for easier testing and maintenance

## Integration Steps

### 1. Import and Initialize CollisionManager

In Game.js, import the CollisionManager singleton and initialize it:

```javascript
import collisionManager from '../objects/CollisionManager.js';

// In the init() method
collisionManager.init({
  asteroidManager: this.asteroidManager,
  bulletManager: this.bulletManager,
  oreManager: this.oreManager,
  explosionManager: this.explosionManager,
  hud: this.hud,
  camera: this.camera,
  gameManager: this.gameManager
});
```

### 2. Replace Collision Methods in Game Class

Remove or comment out these methods from Game.js:
- `checkCollisions()`
- `checkOreCollisions()`
- `checkShipAsteroidCollisions()`
- `handleShipCollision()`
- `handleAsteroidDestruction()`
- `playerDied()`

### 3. Update the `animate()` Method

Replace the collision detection calls in the animate method:

```javascript
// Old collision code
// this.checkCollisions();
// this.checkShipAsteroidCollisions();

// New approach
collisionManager.updateState(this.gameOver, this.isTransitioning);
collisionManager.checkCollisions({
  enemies: this.enemies,
  enemyProjectiles: this.enemyProjectiles,
  boss: this.boss
});

// After collisions are processed, update score from collision manager
this.score = collisionManager.getScore();
this.asteroidsDestroyed = collisionManager.getAsteroidsDestroyed();
```

### 4. Update Game State Transitions

Make sure the CollisionManager's state is updated when game state changes:

```javascript
// When transitioning states
this.isTransitioning = true;
collisionManager.updateState(this.gameOver, true);

// When transition completes
this.isTransitioning = false;
collisionManager.updateState(this.gameOver, false);
```

### 5. Reset CollisionManager on Game Reset

In the `resetGame()` or equivalent method:

```javascript
collisionManager.reset();
```

## Benefits of This Approach

1. **Cleaner Responsibility Boundaries:**
   - Game.js handles game flow and coordination
   - CollisionManager handles all collision detection and resolution
   - Individual managers (AsteroidManager, BulletManager, etc.) handle object lifecycle

2. **Better Encapsulation:**
   - Objects no longer need to know about other object types
   - Managers have full control over their objects' lifecycle

3. **Improved Maintainability:**
   - Collision logic is in one place
   - Easier to add new collision types
   - Easier to debug collision issues

4. **Reduced Game.js Size:**
   - Removing collision logic from Game.js significantly reduces its size
   - Makes Game.js easier to understand and maintain

## Testing the Integration

1. Test basic collisions (bullet-asteroid, player-asteroid)
2. Test ore collection
3. Test power-up collection
4. Test enemy interactions
5. Test boss interactions
6. Verify game state transitions work properly
7. Verify score and stats are updated correctly

## Future Enhancements

1. **Spatial Partitioning:** Add support for more efficient collision detection using spatial partitioning (quad trees, etc.)
2. **Physics Integration:** Support for more complex physics interactions
3. **Event System:** Implement a collision event system to allow other components to react to collisions