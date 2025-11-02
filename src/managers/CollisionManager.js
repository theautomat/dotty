/**
 * CollisionManager.js - Centralized collision detection 
 * This class centralizes collision detection logic, but delegates handling to the appropriate managers
 */
import * as THREE from 'three';
import BulletConfig from '../objects/BulletConfig.js';
import GameConfig from '../game/GameConfig.js';
import soundManager from '../managers/SoundManager.js';

class CollisionManager {
    /**
     * Creates a CollisionManager to centralize collision detection
     */
    constructor() {
        // Initialize all references to null - they'll be set via init()
        this.asteroidManager = null;
        this.bulletManager = null;
        this.oreManager = null;
        this.explosionManager = null;
        this.enemyManager = null;
        this.camera = null;
        this.powerUpManager = null;
        this.levelManager = null;
        
        // Configuration
        this.SHIP_COLLISION_RADIUS = 5.0; // Default, can be updated in init
    }
    
    /**
     * Initialize with references
     * This is for convenience with the singleton pattern
     * @param {Object} params - Initialization parameters
     * @returns {CollisionManager} - The manager instance for chaining
     */
    init(params = {}) {
        // Update all manager references
        this.asteroidManager = params.asteroidManager || this.asteroidManager;
        this.bulletManager = params.bulletManager || this.bulletManager;
        this.oreManager = params.oreManager || this.oreManager;
        this.explosionManager = params.explosionManager || this.explosionManager;
        this.enemyManager = params.enemyManager || this.enemyManager; // Store enemyManager reference
        this.camera = params.camera || this.camera;
        this.powerUpManager = params.powerUpManager || this.powerUpManager;
        this.levelManager = params.levelManager || this.levelManager;
        
        // Update configuration if provided
        if (params.shipCollisionRadius) {
            this.SHIP_COLLISION_RADIUS = params.shipCollisionRadius;
        }
        
        return this;
    }
    
    /**
     * Main collision detection method to be called each frame
     * @param {Object} params - Optional parameters (primarily camera position)
     * @param {THREE.Camera} params.camera - Player camera/ship if not using the stored reference
     */
    checkCollisions(params = {}) {
        // Use provided camera or the stored reference
        const camera = params.camera || this.camera;
        
        // Skip checks if essential objects are missing
        if (!camera) return;
        
        // Get all game entities directly from their managers
        const bullets = this.bulletManager ? this.bulletManager.getAllBullets() : [];
        const asteroids = this.asteroidManager ? this.asteroidManager.getAllAsteroids() : [];
        const enemies = this.enemyManager ? this.enemyManager.enemies : [];
        const enemyProjectiles = this.enemyManager ? this.enemyManager.enemyProjectiles : [];
        
        // Check for ore collisions if oreManager exists
        if (this.oreManager) {
            this.checkOreCollisions(camera.position);
        }
        
        // Check player-asteroid collisions
        if (asteroids.length > 0) {
            this.checkPlayerAsteroidCollisions(camera.position, asteroids);
        }
        
        // Check bullet-asteroid collisions
        if (bullets.length > 0 && asteroids.length > 0) {
            this.checkBulletAsteroidCollisions(bullets, asteroids);
        }
        
        // Boss collisions - commented out for now until boss implementation is ready
        // if (boss && bullets.length > 0) {
        //     this.checkBulletBossCollisions(bullets, boss);
        // }
        
        // // Check player-boss collisions
        // if (boss) {
        //     this.checkPlayerBossCollisions(camera.position, boss);
        // }
        
        // Enemy collisions with bullets
        if (enemies.length > 0 && bullets.length > 0) {
            this.checkBulletEnemyCollisions(bullets, enemies);
        }
        
        // Check player-enemyProjectile collisions
        if (enemyProjectiles.length > 0) {
            this.checkPlayerEnemyProjectileCollisions(camera.position, enemyProjectiles);
        }
        
        // Check player-enemy collisions
        if (enemies.length > 0) {
            this.checkPlayerEnemyCollisions(camera.position, enemies);
        }
    }
    
    /**
     * Check for collisions between the player and nearby ores
     * Delegates handling to the oreManager
     * @param {THREE.Vector3} playerPosition - The position of the player
     */
    checkOreCollisions(playerPosition) {
        if (!this.oreManager || !playerPosition) return;
        
        // Simply delegate to oreManager's collectNearbyOre method
        this.oreManager.collectNearbyOre(playerPosition);
    }
    
    /**
     * Check for collisions between player and asteroids
     * @param {THREE.Vector3} playerPosition - The position of the player
     * @param {Array} asteroids - The asteroids to check against
     */
    checkPlayerAsteroidCollisions(playerPosition, asteroids) {
        if (!playerPosition || !asteroids || !asteroids.length) return;
        
        for (const asteroid of asteroids) {
            if (!asteroid || !asteroid.position) continue;
            
            const distance = playerPosition.distanceTo(asteroid.position);
            const asteroidSize = asteroid.size || 
                (asteroid.sizeCategory === 'large' ? 10.0 : 
                 asteroid.sizeCategory === 'medium' ? 6.0 : 2.5);
            
            // Calculate collision threshold
            const collisionThreshold = (asteroidSize / 2) + this.SHIP_COLLISION_RADIUS;
            
            // If collision detected, delegate to the appropriate manager
            if (distance < collisionThreshold) {
                // Check if player has a shield
                const hasShield = this.powerUpManager?.hasActiveShield?.() || false;
                
                if (hasShield) {
                    // Play shield hit sound
                    soundManager.playShieldHit();
                    console.log('CollisionManager: Shield active - prevented asteroid damage');
                } else {
                    // Inform asteroid manager of collision with player
                    if (this.asteroidManager && typeof this.asteroidManager.handleCollisionWith === 'function') {
                        this.asteroidManager.handleCollisionWith('player', asteroid, playerPosition);
                    }
                    
                    // Also directly call handleShipCollision to ensure proper game over handling
                    this.handleShipCollision();
                }
                
                break; // Only handle one collision per frame
            }
        }
    }
    
    /**
     * Check for collisions between bullets and asteroids
     * @param {Array} bullets - The bullets to check
     * @param {Array} asteroids - The asteroids to check
     */
    checkBulletAsteroidCollisions(bullets, asteroids) {
        if (!bullets || !bullets.length || !asteroids || !asteroids.length) return;
        
        // Iterate through all bullets
        for (let b = 0; b < bullets.length; b++) {
            const bullet = bullets[b];
            if (!bullet || !bullet.position) continue;
            
            let hitSomething = false;
            
            // Check against all asteroids
            for (let a = 0; a < asteroids.length; a++) {
                const asteroid = asteroids[a];
                if (!asteroid || !asteroid.position) continue;
                
                // Skip further checks if this bullet already hit something
                if (hitSomething) break;
                
                // Calculate collision
                const distance = bullet.position.distanceTo(asteroid.position);
                const bulletRadius = bullet.radius || BulletConfig.collisionRadius || 6.0;
                const asteroidSize = asteroid.size || 
                    (asteroid.sizeCategory === 'large' ? 10.0 : 
                     asteroid.sizeCategory === 'medium' ? 6.0 : 2.5);
                
                const collisionThreshold = bulletRadius + asteroidSize * 0.9;
                
                // If collision detected
                if (distance < collisionThreshold) {
                    // Let the appropriate managers handle the collision
                    
                    // Inform asteroid manager of collision with bullet
                    if (this.asteroidManager && typeof this.asteroidManager.handleCollisionWith === 'function') {
                        this.asteroidManager.handleCollisionWith('bullet', asteroid, bullet);
                    }
                    
                    // Inform bullet manager of collision with asteroid
                    if (this.bulletManager && typeof this.bulletManager.handleCollisionWith === 'function') {
                        this.bulletManager.handleCollisionWith('asteroid', bullet, asteroid);
                    }
                    
                    hitSomething = true;
                }
            }
        }
    }
    
    /**
     * Check for collisions between bullets and the boss - COMMENTED OUT
     * Will be implemented when boss functionality is ready
     */
    /*
    checkBulletBossCollisions(bullets, boss) {
        // Implementation commented out until bosses are implemented
    }
    */
    
    /**
     * Check for collisions between the player and boss - COMMENTED OUT
     * Will be implemented when boss functionality is ready
     */
    /*
    checkPlayerBossCollisions(playerPosition, boss) {
        // Implementation commented out until bosses are implemented
    }
    */
    
    /**
     * Check for collisions between bullets and enemies
     * @param {Array} bullets - The bullets to check
     * @param {Array} enemies - The enemies to check
     */
    checkBulletEnemyCollisions(bullets, enemies) {
        if (!bullets || !bullets.length || !enemies || !enemies.length) {
            return;
        }
        
        // Iterate through all bullets
        for (let b = 0; b < bullets.length; b++) {
            const bullet = bullets[b];
            if (!bullet || !bullet.position) continue;
            
            let hitSomething = false;
            
            // Check against all enemies
            for (let e = 0; e < enemies.length; e++) {
                const enemy = enemies[e];
                if (!enemy || !enemy.position) continue;
                
                // Skip further checks if this bullet already hit something
                if (hitSomething) break;
                
                // Calculate collision
                const distance = bullet.position.distanceTo(enemy.position);
                const bulletRadius = bullet.radius || BulletConfig.collisionRadius || 6.0;
                const enemyRadius = enemy.collisionRadius || 10.0; // Default if not specified
                
                const collisionThreshold = bulletRadius + enemyRadius;
                
                // If collision detected
                if (distance < collisionThreshold) {
                    // Inform enemy manager of collision with bullet
                    if (this.enemyManager && typeof this.enemyManager.handleCollisionWith === 'function') {
                        this.enemyManager.handleCollisionWith('bullet', enemy, bullet);
                    }
                    
                    // Inform bullet manager of collision with enemy
                    if (this.bulletManager && typeof this.bulletManager.handleCollisionWith === 'function') {
                        this.bulletManager.handleCollisionWith('enemy', bullet, enemy);
                    }
                    
                    hitSomething = true;
                }
            }
        }
    }
    
    /**
     * Check for collisions between player and enemy projectiles
     * @param {THREE.Vector3} playerPosition - The position of the player
     * @param {Array} enemyProjectiles - The enemy projectiles to check
     */
    checkPlayerEnemyProjectileCollisions(playerPosition, enemyProjectiles) {
        if (!playerPosition || !enemyProjectiles || !enemyProjectiles.length) return;
        
        // Iterate through all projectiles
        for (let i = 0; i < enemyProjectiles.length; i++) {
            const projectile = enemyProjectiles[i];
            if (!projectile || !projectile.position) continue;
            
            // Calculate distance
            const distance = playerPosition.distanceTo(projectile.position);
            const projectileRadius = projectile.radius || 2.0;
            
            // Calculate collision threshold
            const collisionThreshold = projectileRadius + this.SHIP_COLLISION_RADIUS;
            
            // If collision detected
            if (distance < collisionThreshold) {
                // If the player has a shield, let the enemyManager handle the shield collision
                const hasShield = this.powerUpManager?.hasActiveShield?.() || false;
                
                if (hasShield) {
                    // Handle shield collision if enemy manager is available
                    if (this.enemyManager && typeof this.enemyManager.handleShieldCollision === 'function') {
                        this.enemyManager.handleShieldCollision(projectile, i);
                    }
                } else {
                    // No shield - handle player death 
                    this.handleShipCollision();
                    
                    // Also remove the projectile that hit the player
                    if (this.enemyManager && typeof this.enemyManager.removeProjectile === 'function') {
                        this.enemyManager.removeProjectile(projectile, i);
                    }
                }
                
                break; // Stop checking after first collision
            }
        }
    }
    
    /**
     * Check for collisions between player and enemies
     * @param {THREE.Vector3} playerPosition - The position of the player
     * @param {Array} enemies - The enemies to check against
     */
    checkPlayerEnemyCollisions(playerPosition, enemies) {
        if (!playerPosition || !enemies || !enemies.length) return;
        
        for (const enemy of enemies) {
            if (!enemy || !enemy.position) continue;
            
            const distance = playerPosition.distanceTo(enemy.position);
            const enemyRadius = enemy.params?.size || enemy.collisionRadius || 10.0;
            
            // Calculate collision threshold
            const collisionThreshold = enemyRadius + this.SHIP_COLLISION_RADIUS;
            
            // If collision detected
            if (distance < collisionThreshold) {
                // Log collision info for debugging
                console.log(`CollisionManager: Player-enemy collision detected! Distance: ${distance}, Threshold: ${collisionThreshold}`);
                console.log(`Enemy type: ${enemy.type || 'unknown'}, Enemy radius: ${enemyRadius}`);
                
                // If the player has a shield, just play shield sound
                const hasShield = this.powerUpManager?.hasActiveShield?.() || false;
                
                if (hasShield) {
                    // Play shield hit sound
                    soundManager.playShieldHit();
                    console.log('CollisionManager: Shield active - prevented damage');
                } else {
                    // No shield - handle player death
                    this.handleShipCollision();
                }
                
                break; // Stop checking after first collision
            }
        }
    }
    
    /**
     * Handle ship collision with any hazard
     * Delegates to LevelManager for actual death handling
     */
    handleShipCollision() {
        if (this.levelManager) {
            // Delegate to LevelManager's handleShipCollision method
            this.levelManager.handleShipCollision();
        } else {
            console.error('CollisionManager: Cannot handle ship collision - levelManager reference missing');
        }
    }
}

// Create and export a singleton instance
const collisionManager = new CollisionManager();
export default collisionManager;