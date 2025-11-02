/**
 * EnemyManager.js - Manages all enemies and their projectiles
 * 
 * Responsible for:
 * - Spawning enemies based on game events
 * - Updating enemy positions and behavior
 * - Managing enemy projectiles
 * - Handling enemy collision logic
 */

import * as THREE from 'three';
import UFO from '../objects/enemies/UFO.js';
import Hunter from '../objects/enemies/Hunter.js';
import Patroller from '../objects/enemies/Patroller.js';
import Tetra from '../objects/enemies/Tetra.js';
import SphereBoss from '../objects/enemies/SphereBoss.js';
import EnemyWeapon from '../objects/enemies/EnemyWeapon.js';
import HeatSeekingMine from '../objects/enemies/HeatSeekingMine.js';
import EnemyConfig from '../objects/enemies/EnemyConfig.js';
import soundManager from './SoundManager.js';
import LevelConfig from '../game/LevelConfig.js';
import gameStateMachine, { GAME_STATES } from '../game/GameStateMachine.js';
import PowerUpConfig from '../objects/powers/PowerUpConfig.js';
import GameConfig from '../game/GameConfig.js'; // Used for world boundary size
import gameStats from '../game/GameStats.js';

class EnemyManager {
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
        
        // Game state now managed by gameStateMachine
        
        // Track initialization state
        this.initialized = false;
    }
    
    /**
     * Initialize the enemy manager
     * @param {Object} options - Initialization options
     * @param {THREE.Scene} options.scene - The THREE.js scene
     * @param {THREE.Camera} options.camera - The player's camera
     * @param {Object} options.explosionManager - Reference to explosion manager
     * @param {Object} options.collectibleManager - Reference to collectible manager
     * @param {Object} options.powerUpManager - Reference to power-up manager
     */
    init(options = {}) {
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
    checkEnemySpawning() {
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
     * @param {Object} enemyConfig - Configuration for the enemy to spawn
     */
    spawnEnemy(enemyConfig) {
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
        let spawnPosition;
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
        let enemy = null;
        
                switch (enemyType.type) {
            case 'ufo':
                enemy = new UFO(this.scene, spawnPosition, commonParams);
                break;
                
            case 'hunter':
                enemy = new Hunter(this.scene, spawnPosition, commonParams);
                break;
                
            case 'patroller':
                enemy = new Patroller(this.scene, spawnPosition, commonParams);
                break;
                
            case 'tetra':
                console.log("Creating Tetra enemy");
                enemy = new Tetra(this.scene, spawnPosition, commonParams);
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
     * @param {Object} projectileConfig - Configuration for the projectile
     */
    createEnemyProjectile(projectileConfig) {
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
            let projectile;
            
            // Create the appropriate projectile based on type
            if (type === 'heatSeekingMine') {
                // Create HeatSeekingMine instance
                console.log("[ENEMY_MANAGER] Creating heat-seeking mine!");
                projectile = new HeatSeekingMine(
                    this.scene,
                    position,
                    direction,
                    projectileConfig.targetPosition, // Player position for tracking
                    {
                        speed: speed || 0.8,
                        damage: damage || 15,
                        color: color || 0xff1100,
                        size: size || 15.0, // Use the size from config (defaulting to 15.0)
                        type: 'heatSeekingMine', // Explicitly pass type
                        // Pass all heat-seeking specific parameters
                        gravityFactor: projectileConfig.gravityFactor,
                        orbitTangentialFactor: projectileConfig.orbitTangentialFactor,
                        spiralFactor: projectileConfig.spiralFactor,
                        // Pass collision radius multiplier if specified
                        collisionRadiusMultiplier: projectileConfig.collisionRadiusMultiplier || 5.0
                    }
                );
                
                // Set explosion manager reference for creating explosions
                if (projectile && this.explosionManager) {
                    projectile.setExplosionManager(this.explosionManager);
                }
            } else {
                // Create default EnemyWeapon for other types
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
                        spin: !!spin
                    }
                );
            }
            
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
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime = 16) {
        if (!this.initialized) return;
        
        this.updateEnemies(deltaTime);
        this.updateEnemyProjectiles(deltaTime);
    }
    
    /**
     * Update all enemies
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    updateEnemies(deltaTime = 16) {
        // Update all enemies in the array
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Just update the enemy position/state - behavior determined by Enemy class
            enemy.update(deltaTime, this.camera.position);
        }
    }
    
    /**
     * Update all enemy projectiles
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    updateEnemyProjectiles(deltaTime = 16) {
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
     * @param {THREE.Vector3} playerPosition - Current player position
     * @param {number} playerRadius - Player collision radius
     * @param {Object} gameStateMachine - The game state machine
     * @returns {Object|null} Collision data if collision occurred, null otherwise
     */
    checkProjectilePlayerCollisions(playerPosition, playerRadius, gameStateMachine) {
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
     * @param {Object} projectile - The projectile that collided
     * @param {number} index - Index of projectile in the array
     */
    handleShieldCollision(projectile, index) {
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
     * @param {Object} projectile - The projectile to remove
     * @param {number} index - Index of projectile in the array (if known)
     */
    removeProjectile(projectile, index) {
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
    clearAllEnemies() {
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
    clearAllProjectiles() {
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
    clearAll() {
        this.clearAllEnemies();
        this.clearAllProjectiles();
    }
    
    /**
     * Get count of active enemies
     * @returns {number} Count of active enemies
     */
    getEnemyCount() {
        return this.enemies.length;
    }
    
    /**
     * Get count of active projectiles
     * @returns {number} Count of active projectiles
     */
    getProjectileCount() {
        return this.enemyProjectiles.length;
    }
    
    /**
     * Handle collision between an enemy and another object
     * @param {string} objectType - Type of object that collided with the enemy
     * @param {Object} enemy - The enemy that was involved in the collision
     * @param {Object} otherObject - The object that collided with the enemy
     */
    handleCollisionWith(objectType, enemy, otherObject) {
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
     * @param {Object} enemy - The enemy to remove
     */
    removeEnemy(enemy) {
        if (!enemy) return;
        
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