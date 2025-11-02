import * as THREE from 'three';
import BaseInstanceManager from './BaseInstanceManager.js';
import Bullet from '../objects/Bullet.js';
import GameTheme from '../game/GameTheme.js';
import GameConfig from '../game/GameConfig.js'; // Import GameConfig for global settings
import BulletConfig from '../objects/BulletConfig.js'; // Import BulletConfig for bullet-specific settings
import soundManager from './SoundManager.js';
import GameStats from '../game/GameStats.js';
import gameStateMachine from '../game/GameStateMachine.js';

// Maximum number of bullets to support
const MAX_BULLETS = 50;

// Reusable objects are defined in BaseInstanceManager

/**
 * BulletManager.js - Manages bullet instances using THREE.InstancedMesh for efficiency.
 * Extends BaseInstanceManager for common instanced rendering functionality
 */
class BulletManager extends BaseInstanceManager {
    /**
     * Creates a BulletManager to handle bullet rendering and lifecycle
     * @param {THREE.Scene} scene - The THREE.js scene
     */
    constructor(scene = null) {
        // Initialize base instance manager with scene, max instances, and manager name
        super(scene, MAX_BULLETS, 'BulletManager');
    }
    
    /**
     * Sets up geometry and material for bullet manager.
     * This is called by BaseInstanceManager's init() method.
     * @protected
     * @override
     */
    _setupGeometryAndMaterial() {
        // Get bullet size from config
        const bulletSize = BulletConfig.size || 0.5;
        
        // Create a shared geometry for all bullets (small box looks better than sphere)
        this.geometry = new THREE.BoxGeometry(bulletSize, bulletSize, bulletSize);
        
        // Use BulletConfig color with GameTheme as fallback
        const bulletColor = BulletConfig.color || GameTheme.bullets?.color || 0xFFFF00;
        
        // Create material for all bullets
        this.material = new THREE.MeshBasicMaterial({
            color: bulletColor,
            wireframe: false, // Opaque bullets
            depthTest: false, // Disable depth testing so bullets always render on top
            depthWrite: false // Don't write to depth buffer
        });
    }
    
    /**
     * Override _initializeMesh to add additional settings after initialization
     * @protected
     * @override
     */
    _initializeMesh() {
        // Call parent method to create the basic instanced mesh
        super._initializeMesh();
        
        if (this.instancedMesh) {
            // Disable frustum culling for debugging
            this.instancedMesh.frustumCulled = false;
            
            // Set very high render order to ensure bullets are always visible on top
            this.instancedMesh.renderOrder = 999;
        }
    }
    
    /**
     * Verify the BulletManager is properly set up
     */
    checkSetup() {
        if (!this.instancedMesh) {
            console.error('[BULLET_MANAGER] CRITICAL ERROR: instancedMesh is null!');
            return;
        }
        
        // Setup check completed - mesh is present
    }
    
    // Test bullet function removed

    /**
     * Add a light to make bullets glow
     */
    addBulletLight() {
        // Add a very bright point light that follows bullets
        this.bulletLight = new THREE.PointLight(0xffff00, 15, 100);
        this.bulletLight.position.set(0, 0, 0);
        this.scene.add(this.bulletLight);
        
        // Bullet light added
    }
    
    /**
     * Creates a new bullet and adds it to the manager
     * @param {THREE.Vector3} position - Starting position
     * @param {THREE.Vector3} direction - Direction vector (normalized)
     * @param {THREE.Vector3} velocity - Ship's velocity at the time of firing (for momentum inheritance)
     * @returns {Bullet} The created bullet
     */
    createBullet(position, direction, velocity) {
        // Create a new Bullet instance with ship velocity for proper momentum inheritance
        const bullet = new Bullet(this, {
            position: position.clone(),
            direction: direction.clone().normalize(),
            velocity: velocity ? velocity.clone() : null // Pass ship velocity for momentum inheritance
        });
        
        // If successful, bullet will have a valid instanceId
        if (bullet.instanceId === null) {
            console.warn("Failed to create bullet - manager might be full");
            return null;
        }
        
        return bullet;
    }
    
    /**
     * Shoot a bullet from the camera position and direction
     * @param {Object} options - Options for shooting
     * @param {THREE.Camera} options.camera - Camera to use for position and direction
     * @param {THREE.Vector3} options.velocity - Player's current velocity for momentum inheritance
     * @param {Object} options.hud - HUD object for updating UI
     * @param {Object} options.gameStateMachine - Game state machine to check game state
     * @returns {Bullet|null} The created bullet or null if creation failed
     */
    shootBulletFromCamera({
        camera, 
        velocity = new THREE.Vector3(0, 0, 0), 
        hud,
        gameStateMachine
    }) {

        // Shooting bullet from camera
        // Don't fire if controls should be locked based on game state
        if (gameStateMachine.shouldLockControls()) return null;

        // DOTTY: Disable shooting for top-down exploration game
        return null;

        // // Ensure the player has bullets available through HUD
        // if (!hud.canShoot()) {
        //     // Play empty sound - uses phaser fail sound for now
        //     soundManager.playPhaserFail();
        //     // Flash the HUD bullets indicator to indicate empty
        //     hud.flashBulletsIndicator();
        //     return null;
        // }
        //
        // // Use up one charge
        // hud.useCharge();
        
        // Calculate a position directly in front of the camera
        const bulletStartPosition = camera.position.clone();
        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        
        // Import BulletConfig for spawn offset
        const spawnOffset = BulletConfig.spawnOffset || 1.5;
        
        // Move the bullet origin in front of the camera
        bulletStartPosition.addScaledVector(cameraDirection, spawnOffset);
        
        // Create the bullet using our internal createBullet method
        const bullet = this.createBullet(
            bulletStartPosition,
            cameraDirection,
            velocity
        );
        
        // Ensure bullet was created successfully
        if (!bullet) {
            // Failed to create bullet
            return null;
        }
        
        // Bullet created at position (no console output)
        
        // Track shot fired in stats
        GameStats.shotFired();
        
        // Play bullet firing sound
        soundManager.playBulletFire();
        
        return bullet;
    }
    
    /**
     * Update all bullets
     * @param {number} deltaTime - Time since last frame
     * @param {number} wrapDistance - Distance at which objects wrap around. If not provided, uses GameConfig value.
     */
    update(deltaTime, wrapDistance = GameConfig.world.wrapDistance) {
        if (deltaTime <= 0) return;
        
        // First handle lifetime expiration
        this._baseUpdateLifeCycle(deltaTime);
        
        // Flag to track if any matrices need updates
        let needsMatrixUpdate = false;
        
        // Update all active bullets
        for (let i = this.activeCount - 1; i >= 0; i--) {
            const bullet = this.data[i];
            if (bullet) {
                // Update bullet logic and check if it's still active
                const isActive = bullet.update(deltaTime, wrapDistance);
                
                // Remove if no longer active
                if (!isActive) {
                    this.removeInstanceByIndex(i);
                    needsMatrixUpdate = true;
                    continue;
                }
                
                // Bullet is still active and its transform changed, so update its matrix
                this._reusableQuaternion.setFromEuler(bullet.rotation);
                this._reusableMatrix.compose(
                    bullet.position,
                    this._reusableQuaternion,
                    bullet.scale
                );
                
                // Update the instance matrix
                this.instancedMesh.setMatrixAt(bullet.instanceId, this._reusableMatrix);
                needsMatrixUpdate = true;
            }
        }
        
        // Only update the instance matrix once per frame if needed
        if (needsMatrixUpdate) {
            this.instancedMesh.instanceMatrix.needsUpdate = true;
        }
        
        // Update the bullet light position to follow the camera or first bullet if available
        if (this.bulletLight) {
            if (this.activeCount > 0 && this.data[0]) {
                // Position the light near the first bullet for better glow effect
                this.bulletLight.position.copy(this.data[0].position);
            }
        }
    }
    
    /**
     * Get all active bullets
     * @returns {Array<Bullet>} Array of all active bullets
     */
    getAllBullets() {
        return this.data.filter(item => item !== null && item.instanceId !== null);
    }
    
    /**
     * Gets the total number of active bullets
     * @returns {number} Count of active bullets
     */
    getTotalActiveBullets() {
        return this.activeCount;
    }
    
    /**
     * Alias for the active count
     */
    get count() {
        return this.activeCount;
    }
    
    /**
     * Alias for removeInstanceByIndex to match existing code
     * @param {Bullet} bullet - The bullet to remove
     */
    removeBullet(bullet) {
        if (!bullet || bullet.instanceId === null) {
            return false;
        }
        
        // Use BaseInstanceManager's removal method
        return this.removeInstanceByIndex(bullet.instanceId);
    }
    
    /**
     * Clear all bullets
     */
    clearAllBullets() {
        // console.log('[BULLET_MANAGER] Clearing all bullets');
        this.clearAll();
    }
    
    /**
     * Handle bullet collisions with different object types
     * @param {string} objectType - The type of object the bullet collided with ('asteroid', 'enemy', 'boss', etc.)
     * @param {Bullet} bullet - The bullet that was involved in the collision
     * @param {Object} otherObject - The object that collided with the bullet
     */
    handleCollisionWith(objectType, bullet, otherObject) {
        if (!bullet) return;
        
        // Most bullet collisions just result in the bullet being destroyed
        // The specific effect on the other object is handled by that object's manager
        if (typeof bullet.destroy === 'function') {
            bullet.destroy();
        } else {
            // Fall back to removing the bullet if it doesn't have a destroy method
            this.removeBullet(bullet);
        }
    }
    
    /**
     * Collects state data for all active bullets, used for networking
     * @returns {Array} An array of state data for active bullets
     */
    getAllBulletDataForState() {
        // Create simplified bullet data for state
        const bulletData = [];
        for (let i = 0; i < this.activeCount; i++) {
            const bullet = this.data[i];
            if (bullet) {
                bulletData.push({
                    id: bullet.id,
                    position: bullet.position.toArray(),
                    velocity: bullet.velocity.toArray()
                });
            }
        }
        return bulletData;
    }
}

// Create and export a singleton instance
const bulletManager = new BulletManager();
export default bulletManager;
