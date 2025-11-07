/**
 * Asteroid.ts - Logical representation of asteroids for the Asteroids game
 * Uses AsteroidManager (which extends BaseInstanceManager) for visualization
 */
import * as THREE from 'three';
import GameObject from './GameObject';
import GameTheme from '../game/GameTheme';
import GameConfig from '../game/GameConfig';
import { isOutsideWorldBoundary } from '../utils/WorldUtils';
import soundManager from '../managers/SoundManager';
import gameStats from '../game/GameStats';
import enemyManager from '../managers/EnemyManager';

// Define size range for asteroids
const SIZE_RANGE = { min: 4.0, max: 24.0 };

interface AsteroidParams {
  manager?: any; // AsteroidManager when converted
  position?: THREE.Vector3;
  size?: number;
  wrapDistance?: number;
  levelConfig?: any;
  id?: string;
  explosionManager?: any;
  oreManager?: any;
  powerUpManager?: any;
  color?: THREE.Color;
  isFragment?: boolean;
  parentVelocity?: THREE.Vector3;
}

class Asteroid extends GameObject {
  manager: any;
  id: string;
  explosionManager: any;
  oreManager: any;
  powerUpManager: any;
  wrapDistance: number;
  levelConfig: any;
  isFragment: boolean;
  parentVelocity: THREE.Vector3 | null;
  size: number;
  color: THREE.Color;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  angularVelocity: THREE.Vector3;
  scale: THREE.Vector3;
  instanceId: number | null;
  type: string;

  /**
   * Constructor for the logical Asteroid object.
   *
   * @param params - Configuration parameters.
   */
  constructor(params: AsteroidParams = {}) {
    super(null); // Call GameObject constructor (scene is null as manager handles visuals)

    this.manager = params.manager;
    this.id = params.id || `asteroid_${Math.random().toString(16).slice(2)}`;
    this.explosionManager = params.explosionManager;
    this.oreManager = params.oreManager;
    this.powerUpManager = params.powerUpManager;
    this.wrapDistance = params.wrapDistance || GameConfig.world.wrapDistance;
    this.levelConfig = params.levelConfig;
    this.isFragment = params.isFragment || false;
    this.parentVelocity = params.parentVelocity || null;

    // Set size - either from params or randomly generated
    this.size = params.size !== undefined ? params.size :
        SIZE_RANGE.min + Math.random() * (SIZE_RANGE.max - SIZE_RANGE.min);

    // Store the asteroid's color - either from params or directly from GameTheme
    this.color = params.color || new THREE.Color(GameTheme.asteroids.defaultColor);

    // Basic physics state
    this.position = params.position || this.calculateSpawnPosition();

    this.velocity = new THREE.Vector3();
    this.rotation = new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    this.angularVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 1.6,
      (Math.random() - 0.5) * 1.6,
      (Math.random() - 0.5) * 1.6
    );

    // Scale is based on size - this is key for sizing the asteroid
    this.scale = new THREE.Vector3(this.size, this.size, this.size);

    // Calculate initial velocity
    this.calculateInitialVelocity();

    // instanceId will be set by the manager when added to the instance manager
    this.instanceId = null;

    // Set object type for collision detection
    this.type = 'asteroid';
  }

  /**
   * Calculates a safe random spawn position inside the world boundary.
   */
  calculateSpawnPosition(): THREE.Vector3 {
    // Get config from levelConfig
    const config = this.levelConfig?.asteroidConfig || this.levelConfig || {};

    // Use half world size from GameConfig
    const halfWorldSize = GameConfig.world.size / 2;

    // Create uniform random points on a sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    // Calculate direction vector
    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    ).normalize();

    // Position should be just inside the world boundary
    // Use 95% of halfWorldSize to ensure we're inside the boundary
    const spawnDistance = halfWorldSize * 0.95;

    // Apply distance to direction vector
    dir.multiplyScalar(spawnDistance);

    return dir;
  }

  /**
   * Calculates initial velocity based on config, ensuring it points inward if near boundary.
   */
  calculateInitialVelocity(): void {
    // Special case for fragments with parent velocity
    if (this.isFragment && this.parentVelocity) {
      // Create a completely random direction
      const randomDir = new THREE.Vector3(
        Math.random() * 2 - 1,  // -1 to 1
        Math.random() * 2 - 1,  // -1 to 1
        Math.random() * 2 - 1   // -1 to 1
      ).normalize();

      // Start with this random direction
      this.velocity.copy(randomDir);

      // Get the speed of the parent (magnitude of velocity)
      const parentSpeed = this.parentVelocity.length();

      // Slow down to 20-30% of the parent's speed
      const speedReduction = 0.2 + Math.random() * 0.1;

      // Apply the reduced speed to our random direction
      this.velocity.multiplyScalar(parentSpeed * speedReduction);

      // Now slightly blend with parent direction (only 10-20% influence)
      const parentInfluence = 0.1 + Math.random() * 0.1;
      const parentDir = this.parentVelocity.clone().normalize();

      // Lerp between our random direction and the parent's direction
      const blendedDir = new THREE.Vector3();
      blendedDir.copy(this.velocity).normalize();
      blendedDir.lerp(parentDir, parentInfluence);
      blendedDir.normalize();

      // Apply the blended direction with our speed
      const speed = this.velocity.length();
      this.velocity.copy(blendedDir).multiplyScalar(speed);

      return; // Exit early, we've set the velocity directly
    }

    // Regular asteroid velocity calculation (unchanged)
    // Get config from levelConfig
    const config = this.levelConfig?.asteroidConfig || this.levelConfig || {};

    // Get speed range with fallback
    const speedRange = config.speedRange || { min: 0.1, max: 0.2 };
    const speedFactor = speedRange.min + Math.random() * (speedRange.max - speedRange.min);

    // Since we're spawning asteroids inside but near the boundary,
    // always direct them somewhat toward the center
    if (!isNaN(this.position.x) && !isNaN(this.position.y) && !isNaN(this.position.z)) {
      // Direction toward origin (center of world)
      const directionToOrigin = this.position.clone().negate().normalize();

      // Add some randomness while ensuring we still point inward
      const randomFactor = 0.3; // 30% randomness, 70% toward center

      // Create a slight random deviation
      const randomDirection = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      // Blend mostly toward center with a bit of randomness
      this.velocity.copy(directionToOrigin);
      this.velocity.lerp(randomDirection, randomFactor);
      this.velocity.normalize();
    } else {
      // Fallback to random direction if position is invalid
      this.velocity.set(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
    }

    // Apply speed factor
    this.velocity.multiplyScalar(speedFactor);
  }

  // --- Getters (mostly direct property access now) ---
  getVelocity(): THREE.Vector3 { return this.velocity.clone(); }
  setVelocity(velocity: THREE.Vector3): void { this.velocity.copy(velocity); }
  getPosition(): THREE.Vector3 { return this.position.clone(); }
  getLevelConfig(): any { return this.levelConfig; }
  getMesh(): null {
    console.warn("getMesh() called on logical Asteroid. Returning null. Use manager to access visuals.");
    return null; // No direct mesh anymore
  }

  /**
   * Updates the asteroid's position, rotation, and checks for wrapping.
   * @param deltaTime - Time since last frame.
   * @param logWrapping - Whether to log wrapping events for debugging.
   * @returns Whether the position or rotation changed
   */
  update(deltaTime: number, logWrapping: boolean = false): boolean {
    if (this.instanceId === null) return false; // Already removed

    // Update position and rotation
    this.position.addScaledVector(this.velocity, deltaTime);
    this.rotation.x += this.angularVelocity.x * deltaTime;
    this.rotation.y += this.angularVelocity.y * deltaTime;
    this.rotation.z += this.angularVelocity.z * deltaTime;

    // No wrapping - asteroids should just continue on their path until they're
    // removed by AsteroidManager when they exceed the world boundary

    // Position or rotation has changed, so return true
    return true;
  }

  /**
   * Helper method to check if a vector has any NaN components
   * @param vector - The vector to check
   * @returns True if the vector has any NaN components
   */
  hasInvalidVector(vector: THREE.Vector3): boolean {
    return isNaN(vector.x) || isNaN(vector.y) || isNaN(vector.z);
  }

  /**
   * Handles collision with other game objects
   * @param otherObject - The object that collided with this asteroid
   */
  handleCollision(otherObject: any): void {
    if (this.instanceId === null) return; // Already destroyed/removed

    // Example: Collision with a bullet
    if (otherObject.type === 'bullet') {
      // Create explosion effect before destroying the asteroid
      if (this.explosionManager) {
        const currentPosition = this.position.clone();

        // Calculate debris size - make particles visible but still small
        const debrisSize = this.size * 0.08; // Slightly larger (was 0.05)

        // Create explosion debris using the asteroid's own color
        const explosion = this.explosionManager.createExplosion(
          currentPosition,
          debrisSize, // Small debris size for visible particles
          {
            fragmentCount: 30 + Math.floor(this.size * 4), // More particles for larger asteroids
            explosionSpeed: 1.5 + (this.size * 0.1), // Much faster particle speed
            fragmentColor: this.color, // Use asteroid's own color
            lifespan: 0.8, // Short lifespan for arcade feel
            type: 'asteroid_explosion'
          }
        );
      }

      // Spawn smaller asteroid fragments
      this.spawnFragments();

      // Note: Now the destroy() method will play the explosion sound

      // Destroy the asteroid
      this.destroy();

      // Tell the bullet it hit something (if it has a 'destroy' method)
      if (typeof otherObject.destroy === 'function') {
        otherObject.destroy();
      }
    }
    // Add other collision types (e.g., player ship)
  }

  /**
   * Handles asteroid destruction - only handles internal cleanup
   * Note: Manager is responsible for removing the asteroid from its tracking array
   */
  destroy(): void {
    // Play the asteroid explosion sound
    soundManager.playAsteroidExplosion();

    // Track the asteroid destruction in gameStats
    gameStats.asteroidDestroyed();

    // Check if an enemy should spawn based on asteroid destruction count
    if (enemyManager) {
      // Get the current asteroid destroy count from gameStats
      const asteroidDestroyCount = gameStats.getAsteroidDestroyCount();
      enemyManager.checkEnemySpawning(asteroidDestroyCount);
    }

    // Spawn ore based on asteroid size
    this.spawnOreOnDestroy(this.position.clone());

    // Try to spawn a power-up when the asteroid is destroyed
    this.trySpawnPowerUp(this.position.clone());

    // Call GameObject's destroy method to clean up mesh resources
    super.destroy();
  }

  /**
   * Spawns ore when the asteroid is destroyed, based on probability and size.
   * @param position - Position where the asteroid was destroyed.
   */
  spawnOreOnDestroy(position: THREE.Vector3): void {
    // Skip if no oreManager is available
    if (!this.oreManager) return;

    // IMPORTANT FIX: Create a fresh Vector3 with explicit values to avoid any reference issues
    const orePosition = new THREE.Vector3(
      parseFloat(position.x.toString()),
      parseFloat(position.y.toString()),
      parseFloat(position.z.toString())
    );

    // Let the oreManager handle the logic - using our fresh position object
    // Pass the levelConfig directly without modification
    const spawnedOre = this.oreManager.trySpawnOre(orePosition, this.levelConfig);

    // Play the ore reveal sound if an ore was spawned
    if (spawnedOre && spawnedOre.type) {
      // Call the specific sound function based on ore type
      switch (spawnedOre.type) {
        case 'iron':
          soundManager.playIronOreRevealed();
          break;
        case 'copper':
          soundManager.playCopperOreRevealed();
          break;
        case 'silver':
          soundManager.playSilverOreRevealed();
          break;
        case 'gold':
          soundManager.playGoldOreRevealed();
          break;
        case 'platinum':
          soundManager.playPlatinumOreRevealed();
          break;
        default:
          console.warn(`Unknown ore type: ${spawnedOre.type} for reveal sound`);
      }
    }
  }

  /**
   * Spawns smaller asteroid fragments when this asteroid is destroyed
   */
  spawnFragments(): void {
    // Skip fragment spawning if there's no manager reference
    if (!this.manager) return;

    // If this is already a fragment, don't spawn more fragments
    if (this.isFragment) return;

    // Random number of fragments to spawn (between 2 and 5)
    const fragmentCount = 2 + Math.floor(Math.random() * 4);

    // Calculate new fragment size based on original asteroid size
    const newSize = this.size / fragmentCount;

    // Only spawn fragments if the resulting size is meaningful
    if (newSize < 2.0) {
      // Too small to fragment further, just create the explosion visual effect
      return;
    }

    // Clone the current position for fragments
    const position = this.position.clone();

    // Spawn fragments
    for (let i = 0; i < fragmentCount; i++) {
      // Add a small random offset to position so fragments don't spawn at exactly the same point
      const offsetPosition = position.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        )
      );

      // Create a new fragment asteroid with slightly randomized size
      // Size variation range: 80%-120% of calculated new size
      const sizeVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      const fragmentSize = newSize * sizeVariation;

      // Create the fragment asteroid - velocity will be calculated internally
      this.manager.createAsteroid({
        position: offsetPosition,
        size: fragmentSize,
        isFragment: true, // Flag this as a fragment
        levelConfig: this.levelConfig,
        explosionManager: this.explosionManager,
        oreManager: this.oreManager,
        powerUpManager: this.powerUpManager, // Pass power-up manager to fragments
        color: this.color,
        parentVelocity: this.velocity.clone() // Pass parent velocity for inheritance
      });
    }
  }

  /**
   * Tries to spawn a power-up when the asteroid is destroyed.
   * Delegates to PowerUpManager to handle the logic.
   * @param position - Position where the asteroid was destroyed.
   */
  trySpawnPowerUp(position: THREE.Vector3): void {
    // Skip if no powerUpManager is available
    if (!this.powerUpManager) return;

    // Create a fresh Vector3 with explicit values to avoid any reference issues
    const powerUpPosition = new THREE.Vector3(
      parseFloat(position.x.toString()),
      parseFloat(position.y.toString()),
      parseFloat(position.z.toString())
    );

    // Let the powerUpManager handle the logic - using our fresh position object
    this.powerUpManager.trySpawnPowerUp(powerUpPosition, this.levelConfig);
  }
}

export default Asteroid;
