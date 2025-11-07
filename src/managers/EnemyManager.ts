/**
 * EnemyManager.ts - Manages all enemies and their projectiles
 *
 * Responsible for:
 * - Spawning enemies based on game events
 * - Updating enemy positions and behavior
 * - Managing enemy projectiles
 * - Handling enemy collision logic
 */

import * as THREE from 'three';
import UFO from '../objects/enemies/UFO';
import EnemyWeapon from '../objects/enemies/EnemyWeapon';
import EnemyConfig from '../objects/enemies/EnemyConfig';
import soundManager from './SoundManager';
import LevelConfig from '../game/LevelConfig';
import gameStateMachine, { GAME_STATES } from '../game/GameStateMachine';
import PowerUpConfig from '../objects/powers/PowerUpConfig';
import GameConfig from '../game/GameConfig'; // Used for world boundary size
import gameStats from '../game/GameStats';

interface InitOptions {
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  explosionManager?: any;
  collectibleManager?: any;
  powerUpManager?: any;
  gameStateMachine?: typeof gameStateMachine;
}

interface ProjectileConfig {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed?: number;
  damage?: number;
  color?: number;
  size?: number;
  spin?: boolean;
  enemyType?: string;
  type?: string;
  targetPosition?: THREE.Vector3;
  gravityFactor?: number;
  orbitTangentialFactor?: number;
  spiralFactor?: number;
  collisionRadiusMultiplier?: number;
}

class EnemyManager {
  // Arrays of active enemies and projectiles
  enemies: any[];
  enemyProjectiles: any[];

  // References
  private scene: THREE.Scene | null;
  private camera: THREE.Camera | null;
  private explosionManager: any | null;
  private collectibleManager: any | null;
  private powerUpManager: any | null;
  private gameStateMachine: typeof gameStateMachine | null;

  // Initialization state
  private initialized: boolean;

  /**
   * Create a new EnemyManager
   */
  constructor() {
    // Array of all active enemies
    this.enemies = [];

    // Array of all active enemy projectiles
    this.enemyProjectiles = [];

    // Reference to the scene (set during init)
    this.scene = null;

    // Reference to the camera (set during init)
    this.camera = null;

    // Reference to other managers (set during init)
    this.explosionManager = null;
    this.collectibleManager = null;
    this.powerUpManager = null;
    this.gameStateMachine = null;

    // Game state now managed by gameStateMachine

    // Track initialization state
    this.initialized = false;
  }

  /**
   * Initialize the enemy manager
   * @param options - Initialization options
   */
  init(options: InitOptions = {}): this {
    // Store references from options
    this.scene = options.scene || null;
    this.camera = options.camera || null;
    this.explosionManager = options.explosionManager || null;
    this.collectibleManager = options.collectibleManager || null;
    this.powerUpManager = options.powerUpManager || null;
    this.gameStateMachine = options.gameStateMachine || null;

    if (!this.scene) {
      return this;
    }

    this.initialized = true;

    return this;
  }

  /**
   * Check if an enemy should spawn based on asteroid destruction count
   * Called when asteroids are destroyed to potentially spawn enemies
   */
  checkEnemySpawning(): void {
    // Get the asteroid destruction count from gameStats
    const asteroidDestroyCount = gameStats.asteroidsDestroyed || 0;
    const currentLevel = LevelConfig.getCurrentLevel();

    // Skip if no enemy config or no asteroidSpawnModulo defined
    if (!currentLevel.enemyConfig || !currentLevel.enemyConfig.asteroidSpawnModulo) {
      return;
    }

    const spawnModulo = currentLevel.enemyConfig.asteroidSpawnModulo;
    // Check if we should spawn based on the modulo
    if (asteroidDestroyCount % spawnModulo === 0) {
      this.spawnEnemy(currentLevel.enemyConfig);
    }
  }

  /**
   * Spawn a new enemy
   * @param enemyConfig - Configuration for the enemy to spawn
   */
  spawnEnemy(enemyConfig: any): any | null {
    if (!this.initialized || !this.scene || !this.camera) {
      console.log(`[ENEMY_MANAGER] Not initialized or missing required references`);
      return null;
    }

    // Get allowed enemy types from the config or default to empty array
    const allowedTypes = enemyConfig?.types || [];


    // Get a random enemy type from the available types
    const enemyType = EnemyConfig.getRandomEnemyType(allowedTypes);

    if (!enemyType) {
      console.log(`[ENEMY_MANAGER] No valid enemy types found`);
      return null;
    }


    // Spawn from the edge of the world boundary
    const playerPos = this.camera.position.clone();

    // Calculate a position on the world boundary
    // First create a random direction unit vector (spherical coordinates)
    const theta = Math.random() * Math.PI * 2; // Random horizontal angle
    const phi = Math.acos(2 * Math.random() - 1); // Random vertical angle for even distribution

    // Convert to cartesian coordinates (unit vector)
    const dirX = Math.sin(phi) * Math.cos(theta);
    const dirY = Math.sin(phi) * Math.sin(theta);
    const dirZ = Math.cos(phi);

    // Create direction vector
    const direction = new THREE.Vector3(dirX, dirY, dirZ).normalize();

    // Spawn hunters and UFOs closer for faster engagement
    // Hunter spawns in player's view at 70% of the world size
    // UFOs spawn at 50% of the world size
    // Other enemies stay at 90% of the world size
    let spawnDistancePercent = 0.9;

    if (enemyType.type === 'ufo') {
      spawnDistancePercent = 0.5;
    } else if (enemyType.type === 'hunter') {
      spawnDistancePercent = 0.7;

      // For hunters, spawn in player's view (in front of the camera)
      // Get camera forward direction
      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyQuaternion(this.camera.quaternion);

      // Use camera direction instead of random direction for hunters
      direction.copy(cameraDirection);
    } else if (enemyType.type === 'tetra') {
      // Spawn Tetras at 80% of the world size (20% inside the boundary)
      spawnDistancePercent = 0.8;
      console.log(`[ENEMY_MANAGER] Spawning Tetra at 80% of world size (20% inside boundary)`);
    }

    // Calculate spawn distance (percentage of world size for all enemy types)
    const worldHalfSize = GameConfig.world.size / 2;
    let spawnDistance;

    // For all enemy types, use percentage of world half-size
    spawnDistance = worldHalfSize * spawnDistancePercent;
    // Ensure minimum spawn distance
    spawnDistance = Math.max(spawnDistance, 100);

    // Log the actual spawn equation for Tetra
    if (enemyType.type === 'tetra') {
      console.log(`[ENEMY_MANAGER] Tetra spawn equation:`, {
        equation: "spawnPosition = normalizedDirection * (worldHalfSize * 0.8)",
        worldSize: GameConfig.world.size,
        worldHalfSize,
        spawnDistancePercent: 0.8,
        actualSpawnDistance: spawnDistance
      });
    }

    // Calculate spawn position
    let spawnPosition: THREE.Vector3;
    if (enemyType.type === 'tetra') {
      // For Tetras, spawn relative to world origin (not player position)
      // This places them at a fixed percentage inside the world boundary
      spawnPosition = new THREE.Vector3(
        direction.x * spawnDistance,
        direction.y * spawnDistance,
        direction.z * spawnDistance
      );
      console.log(`[ENEMY_MANAGER] Tetra spawn position:`, {
        x: spawnPosition.x.toFixed(1),
        y: spawnPosition.y.toFixed(1),
        z: spawnPosition.z.toFixed(1),
        distanceFromOrigin: spawnPosition.length().toFixed(1)
      });
    } else {
      // For other enemies, spawn relative to player
      spawnPosition = new THREE.Vector3(
        playerPos.x + direction.x * spawnDistance,
        playerPos.y + direction.y * spawnDistance,
        playerPos.z + direction.z * spawnDistance
      );
    }

    // Common params for all enemy types
    const commonParams = {
      playerCamera: this.camera,
      enemyManager: this, // Pass enemyManager reference
      explosionManager: this.explosionManager, // Pass explosionManager for explosion effects
      collectibleManager: this.collectibleManager, // Pass collectibleManager for collectible drops
      ...enemyType
    };

    // Create the enemy based on type
    let enemy: any = null;

    switch (enemyType.type) {
      case 'ufo':
        enemy = new UFO(this.scene, spawnPosition, commonParams);
        break;

      default:
        console.warn(`[ENEMY_MANAGER] Unknown enemy type: ${enemyType.type}`);
        return null;
    }

    // Add the enemy to our tracking array
    // No need for callbacks - each enemy will use the direct enemyManager reference
    if (enemy) {
      // Add the enemy mesh to the scene
      if (enemy.mesh) {
        this.scene.add(enemy.mesh);
      }

      // Add the enemy to our tracking array
      this.enemies.push(enemy);

      return enemy;
    }

    return null;
  }

  /**
   * Create a projectile fired by an enemy
   * @param projectileConfig - Configuration for the projectile
   */
  createEnemyProjectile(projectileConfig: ProjectileConfig): any | null {
    if (!this.initialized || !this.scene) {
      console.error('[ENEMY_MANAGER] Cannot create projectile - manager not initialized');
      return null;
    }

    // Validate projectile config
    if (!projectileConfig || !projectileConfig.position || !projectileConfig.direction) {
      console.error('[ENEMY_MANAGER] Invalid projectile config:', projectileConfig);
      return null;
    }

    const { position, direction, speed, damage, color, size, spin, enemyType, type } = projectileConfig;

    try {
      let projectile: any;

      // Create EnemyWeapon projectile
      projectile = new EnemyWeapon(
        this.scene,
        position,
        direction,
        {
          speed: speed || 1.2,
          damage: damage || 10,
          color: color || 0xff0000,
          size: size || 2.0, // Larger size for better visibility
          lifetime: 5000,
          spin: !!spin,
          type: type || 'basic'
        }
      );

      // Add the projectile to the scene
      if (projectile && projectile.mesh) {
        this.scene.add(projectile.mesh);

        // Add to tracking array
        this.enemyProjectiles.push(projectile);

        return projectile;
      } else {
        console.error('[ENEMY_MANAGER] Failed to create projectile mesh');
        return null;
      }
    } catch (error) {
      console.error('[ENEMY_MANAGER] Error creating projectile:', error);
      return null;
    }
  }

  /**
   * Update all enemies in the manager
   * @param deltaTime - Time since last frame in milliseconds
   */
  update(deltaTime: number = 16): void {
    if (!this.initialized) return;

    this.updateEnemies(deltaTime);
    this.updateEnemyProjectiles(deltaTime);
  }

  /**
   * Update all enemies
   * @param deltaTime - Time since last frame in milliseconds
   */
  updateEnemies(deltaTime: number = 16): void {
    if (!this.camera) return;

    // Update all enemies in the array
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Just update the enemy position/state - behavior determined by Enemy class
      enemy.update(deltaTime, this.camera.position);
    }
  }

  /**
   * Update all enemy projectiles
   * @param deltaTime - Time since last frame in milliseconds
   */
  updateEnemyProjectiles(deltaTime: number = 16): void {
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.enemyProjectiles[i];

      // Make sure projectile exists
      if (!projectile) {
        this.enemyProjectiles.splice(i, 1);
        continue;
      }

      // Update projectile position
      projectile.update(deltaTime);

      // Check if projectile has expired
      if (projectile.hasExpired && typeof projectile.hasExpired === 'function') {
        if (projectile.hasExpired()) {
          // First remove from tracking array
          this.removeProjectile(projectile, i);

          // Then destroy the projectile
          if (projectile && typeof projectile.destroy === 'function') {
            projectile.destroy();
          }
          continue;
        }
      }

      // Check if projectile is out of bounds
      if (projectile.isOutOfBounds && typeof projectile.isOutOfBounds === 'function') {
        if (projectile.isOutOfBounds()) {
          // First remove from tracking array
          this.removeProjectile(projectile, i);

          // Then destroy the projectile
          if (projectile && typeof projectile.destroy === 'function') {
            projectile.destroy();
          }
          continue;
        }
      }
    }
  }

  /**
   * Check for collisions between enemy projectiles and the player
   * @param playerPosition - Current player position
   * @param playerRadius - Player collision radius
   * @param gameStateMachine - The game state machine
   * @returns Collision data if collision occurred, null otherwise
   */
  checkProjectilePlayerCollisions(playerPosition: THREE.Vector3, playerRadius: number, gameStateMachine: typeof gameStateMachine): any | null {
    // Skip collision checks if game is over or during transition
    if (gameStateMachine.isInState(GAME_STATES.GAME_OVER) ||
      gameStateMachine.isInState(GAME_STATES.TRANSITIONING)) return null;

    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.enemyProjectiles[i];

      // Check for collision with player
      if (projectile.checkPlayerCollision &&
        projectile.checkPlayerCollision(playerPosition, playerRadius)) {

        // Return collision data
        const collisionData = {
          projectile,
          index: i,
        };

        return collisionData;
      }
    }

    return null;
  }

  /**
   * Handle projectile collision with player's shield
   * @param projectile - The projectile that collided
   * @param index - Index of projectile in the array
   */
  handleShieldCollision(projectile: any, index: number): void {
    // Create small explosion effect at the collision point with shield colors
    const shieldConfig = this.powerUpManager?.getPowerUpConfig ?
      this.powerUpManager.getPowerUpConfig('shield') : null;

    const shieldColor = shieldConfig ? shieldConfig.color : 0x0066FF;
    const particleColor = shieldConfig && shieldConfig.particleColor ?
      shieldConfig.particleColor : 0x00ddff;

    // Use explosionManager to create shield hit explosion
    if (this.explosionManager && projectile.mesh) {
      this.explosionManager.createExplosion(
        projectile.mesh.position.clone(),
        15, // Fewer particles for shield hit
        0.2, // Slower for shield effect
        0.8, // Shorter duration
        particleColor
      );
    }

    // First remove from tracking array
    this.removeProjectile(projectile, index);

    // Then destroy the projectile
    if (projectile && typeof projectile.destroy === 'function') {
      projectile.destroy();
    }
  }

  /**
   * Remove an enemy projectile
   * @param projectile - The projectile to remove
   * @param index - Index of projectile in the array (if known)
   */
  removeProjectile(projectile: any, index?: number): void {
    // Note: Projectile destruction should be handled before calling this method
    // The manager's job is just to remove it from the tracking array

    // Remove from our array if index is provided
    if (index !== undefined && index >= 0 && index < this.enemyProjectiles.length) {
      this.enemyProjectiles.splice(index, 1);
    } else {
      // Otherwise find it in the array
      const idx = this.enemyProjectiles.indexOf(projectile);
      if (idx !== -1) {
        this.enemyProjectiles.splice(idx, 1);
      }
    }
  }

  /**
   * Clear all enemies
   */
  clearAllEnemies(): void {
    if (!this.scene) return;

    // Stop all enemy sounds and remove them
    for (const enemy of this.enemies) {
      // Remove from scene first
      if (enemy.mesh) {
        this.scene.remove(enemy.mesh);
      }

      // Destroy the enemy
      if (typeof enemy.destroy === 'function') {
        enemy.destroy();
      }
    }

    // Clear the array
    this.enemies = [];
  }

  /**
   * Clear all enemy projectiles
   */
  clearAllProjectiles(): void {
    if (!this.scene) return;

    // Remove all projectiles from scene
    for (const projectile of this.enemyProjectiles) {
      // Remove from scene first
      if (projectile.mesh) {
        this.scene.remove(projectile.mesh);
      }

      if (typeof projectile.destroy === 'function') {
        projectile.destroy();
      }
    }

    // Clear the array
    this.enemyProjectiles = [];
  }

  /**
   * Clear all enemies and projectiles
   */
  clearAll(): void {
    this.clearAllEnemies();
    this.clearAllProjectiles();
  }

  /**
   * Get count of active enemies
   * @returns Count of active enemies
   */
  getEnemyCount(): number {
    return this.enemies.length;
  }

  /**
   * Get count of active projectiles
   * @returns Count of active projectiles
   */
  getProjectileCount(): number {
    return this.enemyProjectiles.length;
  }

  /**
   * Handle collision between an enemy and another object
   * @param objectType - Type of object that collided with the enemy
   * @param enemy - The enemy that was involved in the collision
   * @param otherObject - The object that collided with the enemy
   */
  handleCollisionWith(objectType: string, enemy: any, otherObject: any): void {
    if (!enemy) {
      console.warn("[ENEMY_MANAGER] handleCollisionWith called with null enemy");
      return;
    }

    switch (objectType) {
      case 'bullet':
        // Let the enemy handle the collision (which will call destroy internally)
        if (typeof enemy.handleCollision === 'function') {
          enemy.handleCollision(otherObject);
        }

        // Remove the enemy from the manager
        this.removeEnemy(enemy);
        break;

      case 'player':
        // Handle player-enemy collision if needed
        break;

      default:
        console.warn(`[ENEMY_MANAGER] Unhandled collision type: ${objectType}`);
        break;
    }
  }

  /**
   * Remove an enemy from the manager
   * @param enemy - The enemy to remove
   */
  removeEnemy(enemy: any): void {
    if (!enemy || !this.scene) return;

    // First remove from scene if it has a mesh
    if (enemy.mesh) {
      this.scene.remove(enemy.mesh);
    }

    // Remove from our array
    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }
  }
}

// Create and export a singleton instance
const enemyManager = new EnemyManager();
export default enemyManager;
