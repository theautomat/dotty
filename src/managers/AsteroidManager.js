/**
 * AsteroidManager.js - Manages asteroid rendering using THREE.InstancedMesh
 * Extends BaseInstanceManager for common instanced rendering functionality
 */
import * as THREE from 'three';
import BaseInstanceManager from './BaseInstanceManager.js';
import GeometryFactory from '../objects/shapes/GeometryFactory.js';
import Asteroid from '../objects/Asteroid.js';
import GameTheme from '../game/GameTheme.js';
import GameConfig from '../game/GameConfig.js'; // Import GameConfig for global settings
import { isOutsideWorldBoundary } from '../utils/WorldUtils.js'; // Import boundary check for proper spawning
import soundManager from './SoundManager.js';
import gameStateMachine, { GAME_STATES } from '../game/GameStateMachine.js';
import gameStats from '../game/GameStats.js'; // Use camelCase for the singleton
import LevelConfig from '../game/LevelConfig.js';

// Maximum number of asteroids to support
const MAX_ASTEROIDS = 500;

// Reusable objects are now defined in BaseInstanceManager

class AsteroidManager extends BaseInstanceManager {
    constructor(scene = null, explosionManager = null, oreManager = null, powerUpManager = null) {
        // Initialize base instance manager with scene, max instances, and manager name
        super(scene, MAX_ASTEROIDS, 'AsteroidManager');
        
        this.explosionManager = explosionManager;
        this.oreManager = oreManager;
        this.powerUpManager = powerUpManager; // Store reference to powerUpManager
    }

    /**
     * Sets up geometry and material for asteroid manager.
     * This is called by BaseInstanceManager's init() method.
     * @protected
     * @override
     */
    _setupGeometryAndMaterial() {
        // Use a single geometry for all asteroids - we'll use scaling for different sizes
        this.geometry = GeometryFactory.getStandardAsteroidGeometry(); // Single standard geometry
        
        // Create material for all asteroids
        this.material = new THREE.MeshBasicMaterial({
            color: GameTheme.asteroids.defaultColor, 
            wireframe: true,
            //transparent: true,
            //depthTest: true,
            //depthWrite: true,
            //side: THREE.DoubleSide
        });
        
        // For compatibility with Game.js debug code, provide instancedMeshes property
        // that points to the same mesh for all sizes
        this.instancedMeshes = {
            small: this.instancedMesh,
            medium: this.instancedMesh,
            large: this.instancedMesh
        };
        
    }
    
    /**
     * Spawns asteroids for the current level based on config
     * @param {Object} asteroidConfig - Configuration for asteroid spawning
     */
    spawnInitialAsteroids(asteroidConfig) {
        if (!asteroidConfig || typeof asteroidConfig.count !== 'number') {
            return;
        }
            
        const totalCount = asteroidConfig.count;
        
        // Get the full level config from LevelConfig
        const levelConfig = LevelConfig.getCurrentLevel();
        if (!levelConfig) {
            return;
        }
        
        // Spawn asteroids - size is now determined inside the Asteroid class
        for (let i = 0; i < totalCount; i++) {
            // Create the asteroid - size will be randomly generated in the constructor
            this.createAsteroid({
                levelConfig: levelConfig,
                explosionManager: this.explosionManager,
                oreManager: this.oreManager,
                powerUpManager: this.powerUpManager
            });
        }
    }
    
    /**
     * Generates a spawn position that's inside the visible world boundary but near the edge
     * @param {number} minDistance - Minimum distance from origin (unused in new implementation)
     * @param {number} maxDistance - Maximum distance from origin (unused in new implementation)
     * @returns {THREE.Vector3} A position vector inside but near the world boundary
     */
    _generateOffScreenSpawnPosition(minDistance, maxDistance) {
        // Generate a random direction vector (uniform distribution on a sphere)
        const theta = Math.random() * Math.PI * 2; // Random angle around the equator (0-2π)
        const phi = Math.acos(2 * Math.random() - 1); // Random angle from top to bottom (0-π)
        
        const dir = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.sin(phi) * Math.sin(theta),
            Math.cos(phi)
        ).normalize();
        
        // Use a percentage of the world size to position asteroids INSIDE the boundary
        // but still close to the edge
        const halfWorldSize = GameConfig.world.size / 2;
        const spawnDistance = halfWorldSize * 0.95; // 95% of the way to the boundary
        
        // Scale the direction vector by the distance
        return dir.multiplyScalar(spawnDistance);
    }
    
    /**
     * Creates a new asteroid and adds it to the manager
     * @param {Object} params - Parameters for the new asteroid
     * @returns {Asteroid} The created asteroid
     */
    createAsteroid(params) {
        // Create the asteroid without having it add itself to the manager
        const asteroid = new Asteroid({
            ...params,
            manager: this,  // Pass the manager for other functionality
            powerUpManager: this.powerUpManager // Pass the power-up manager
        });
        
        // Manager adds the asteroid to its instances
        asteroid.instanceId = this.addInstance(asteroid);
        
        return asteroid;
    }
    
    /**
     * Update all asteroids
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (deltaTime <= 0) return;
        
        // Flag to track if any matrices need updates
        let needsMatrixUpdate = false;
        
        // Update all active asteroids
        for (let i = 0; i < this.activeCount; i++) {
            const asteroid = this.data[i];
            if (asteroid) {
                // Update asteroid logic and check if its transform changed
                const transformChanged = asteroid.update(deltaTime);
                
                // If the transform has changed, update its matrix
                if (transformChanged) {
                    // Use reusable matrix and quaternion objects from the parent class
                    this._reusableQuaternion.setFromEuler(asteroid.rotation);
                    this._reusableMatrix.compose(
                        asteroid.position,
                        this._reusableQuaternion,
                        asteroid.scale
                    );
                    
                    // Update the instance matrix without marking for update yet
                    this.instancedMesh.setMatrixAt(asteroid.instanceId, this._reusableMatrix);
                    needsMatrixUpdate = true; // Flag that at least one matrix was updated
                }
                
                // Check if asteroid is outside the world boundary using WorldUtils
                if (isOutsideWorldBoundary(asteroid.position, 0)) {
                    // Create a new asteroid to replace this one
                    // No position needed - will spawn inside boundary with the updated logic
                    this.createAsteroid({
                        sizeCategory: asteroid.sizeCategory,
                        levelConfig: asteroid.levelConfig,
                        explosionManager: this.explosionManager,
                        oreManager: this.oreManager,
                        powerUpManager: this.powerUpManager
                    });
                    
                    // Remove asteroid when it leaves the world boundary
                    this.removeAsteroid(asteroid);
                    needsMatrixUpdate = true;
                    i--; // Adjust index since array size changed
                }
            }
        }
        
        // Only update the instance matrix once per frame if needed
        if (needsMatrixUpdate) {
            this.instancedMesh.instanceMatrix.needsUpdate = true;
        }
    }

    /**
     * Get all active asteroids
     * @returns {Array<Asteroid>} Array of all active asteroids
     */
    getAllAsteroids() {
        // Filter out nulls just to be safe
        return this.data.slice(0, this.activeCount).filter(a => a);
    }
    
    /**
     * Alias for getAllAsteroids()
     */
    getAsteroids() {
        return this.getAllAsteroids();
    }
    
    /**
     * Get asteroid by ID
     * @param {string} id - Unique ID of the asteroid
     * @returns {Asteroid|null} The found asteroid or null
     */
    getAsteroidById(id) {
        for (let i = 0; i < this.activeCount; i++) {
            const asteroid = this.data[i];
            if (asteroid && asteroid.id === id) {
                return asteroid;
            }
        }
        return null;
    }
    
    /**
     * Alias for removeInstanceByIndex to match existing code
     * @param {Asteroid} asteroid - The asteroid to remove
     * @param {boolean} suppressEffects - Whether to suppress effects
     */
    removeAsteroid(asteroid, suppressEffects = false) {
        if (!asteroid || asteroid.instanceId === null) {
            return false;
        }
        
        // Use BaseInstanceManager's removal method
        return this.removeInstanceByIndex(asteroid.instanceId);
    }
    
    /**
     * Gets the total number of active asteroids
     * @returns {number} Count of active asteroids
     */
    getTotalActiveAsteroids() {
        return this.activeCount;
    }
    
    /**
     * Alias for the active count
     */
    get count() {
        return this.activeCount;
    }
    
    /**
     * Clear all asteroids
     */
    clearAllAsteroids() {
        // console.log('[ASTEROID_MANAGER] Clearing all asteroids');
        this.clearAll();
    }
    
    /**
     * Handle asteroid collisions with different object types
     * @param {string} objectType - The type of object the asteroid collided with ('bullet', 'player', etc.)
     * @param {Asteroid} asteroid - The asteroid that was involved in the collision
     * @param {Object} otherObject - The object that collided with the asteroid
     */
    handleCollisionWith(objectType, asteroid, otherObject) {
        if (!asteroid) return;
        
        switch (objectType) {
            case 'bullet':
                // Let the asteroid handle bullet collisions with its existing method
                asteroid.handleCollision(otherObject);
                
                // After asteroid handles collision, the manager needs to remove it
                // Note: handleCollision calls destroy() but not removeAsteroid
                this.removeAsteroid(asteroid);
                break;
                
            case 'player':
                // Handle player-asteroid collision directly
                this.handlePlayerCollision(asteroid);
                break;
                
            default:
                break;
        }
    }
    
    /**
     * Handle player collision with asteroid
     * This method triggers game over state and plays appropriate sounds
     * @param {Asteroid} asteroid - The asteroid that collided with the player
     */
    handlePlayerCollision(asteroid) {
        // Instead of using window.game or local fallback, use the CollisionManager's handleShipCollision
        // This ensures proper delegation to LevelManager
        if (window.collisionManager && typeof window.collisionManager.handleShipCollision === 'function') {
            window.collisionManager.handleShipCollision();
            return;
        }
        
        // Fallback if collision manager not available - this should not happen in normal operation
        console.warn('[ASTEROID_MANAGER] CollisionManager not available, using fallback for player collision');
        soundManager.playShipExplosion();
        soundManager.playGameOver();
        
        // Transition to GAME_OVER state
        gameStateMachine.transitionTo(GAME_STATES.GAME_OVER, {
            reason: 'asteroid_collision',
            message: "Ship destroyed by asteroid!",
            stats: gameStats.getStats()
        });
    }
    
    /**
     * Collects state data for all active asteroids, used for networking or saving game state
     * @returns {Array} An array of state data for active asteroids
     */
    getAllAsteroidDataForState() {
        // Create simplified asteroid data for state
        const asteroidData = [];
        for (let i = 0; i < this.activeCount; i++) {
            const asteroid = this.data[i];
            if (asteroid) {
                asteroidData.push({
                    id: asteroid.id,
                    position: asteroid.position.toArray(),
                    sizeCategory: asteroid.sizeCategory,
                    size: asteroid.size
                });
            }
        }
        return asteroidData;
    }
}

// Create and export a singleton instance
const asteroidManager = new AsteroidManager();
export default asteroidManager;
