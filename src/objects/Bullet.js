/**
 * Bullet.js - Handles bullet logical representation
 * Visual representation is handled by BulletManager using instanced rendering
 */
import GameObject from './GameObject.js';
import * as THREE from 'three';
import GameConfig from '../game/GameConfig.js'; // Import GameConfig for global settings
import BulletConfig from './BulletConfig.js'; // Import BulletConfig for bullet-specific settings
import { isOutsideWorldBoundary } from '../utils/WorldUtils.js'; // Import boundary check

class Bullet extends GameObject {
    /**
     * Constructor for the logical Bullet object.
     * 
     * @param {BulletManager} manager - The BulletManager instance
     * @param {object} params - Configuration parameters
     * @param {THREE.Vector3} params.position - Initial position
     * @param {THREE.Vector3} params.direction - Direction vector
     * @param {THREE.Vector3} params.velocity - Base velocity vector (usually from the ship)
     */
    constructor(manager, params) {
        super(null); // GameObject constructor with null scene (manager handles visuals)
        
        this.manager = manager;
        this.id = `bullet_${Math.random().toString(16).slice(2)}`;
        this.timeCreated = Date.now();
        
        // Set the type for collision detection
        this.type = 'bullet';
        
        // Position and physics properties
        this.position = params.position.clone();
        
        // Store direction for rotation
        this.direction = params.direction.clone().normalize();
        
        // Define bullet radius for collision detection - use the value from BulletConfig
        this.radius = BulletConfig.collisionRadius || 3.0;
        
        // Calculate bullet velocity by combining:
        // 1. The ship's velocity at the time of firing (inherited momentum)
        // 2. The bullet's own forward velocity based on direction
        this.velocity = new THREE.Vector3();
        
        // 1. Add the ship's velocity if provided (momentum inheritance)
        if (params.velocity) {
            this.velocity.copy(params.velocity);
        }
        
        // 2. Add the bullet's own directional velocity
        // Use the full speed from BulletConfig with no cap
        const bulletSpeed = BulletConfig.speed;
        const bulletDirectionalVelocity = this.direction.clone().multiplyScalar(bulletSpeed);
        this.velocity.add(bulletDirectionalVelocity);
        
        // Log disabled to reduce console clutter
        // console.log(`🚀 BULLET CREATED: Speed=${bulletSpeed}, Velocity=(${this.velocity.x.toFixed(1)}, ${this.velocity.y.toFixed(1)}, ${this.velocity.z.toFixed(1)})`);
        
        // Create a temporary mesh for backward compatibility
        // This will be a simple Object3D that has the position information but isn't rendered
        this.mesh = new THREE.Object3D();
        this.mesh.position.copy(this.position);
        
        // Set initial rotation to face the direction of travel
        this.setRotationFromDirection();
        
        // Bullet scale (use actual scale, not visual scale - will be adjusted per geometry)
        this.scale = new THREE.Vector3(1.0, 1.0, 1.0);
        
        // Bullet lifetime in seconds - get from config or use default
        this.lifeRemaining = BulletConfig.lifetime || 2.0;
        
        // Register with the manager
        this.instanceId = this.manager.addInstance(this);
    }
    
    /**
     * Calculate rotation to face the direction of travel
     */
    setRotationFromDirection() {
        // Create a rotation that aligns the bullet with its direction of travel
        // Start with default orientation
        this.rotation = new THREE.Euler();
        
        // If we have a valid direction
        if (this.direction && this.direction.lengthSq() > 0) {
            // Calculate rotation from default forward vector (0,0,-1) to our direction
            const targetQuaternion = new THREE.Quaternion();
            const defaultForward = new THREE.Vector3(0, 0, -1);
            
            // Find the rotation that aligns defaultForward with our direction
            const rotationAxis = new THREE.Vector3().crossVectors(defaultForward, this.direction).normalize();
            const angle = Math.acos(defaultForward.dot(this.direction));
            
            if (rotationAxis.lengthSq() > 0.001) {
                targetQuaternion.setFromAxisAngle(rotationAxis, angle);
                this.rotation.setFromQuaternion(targetQuaternion);
            }
        }
    }
    
    /**
     * Update bullet position and check if it should be removed
     * @param {number} deltaTime - Time since last frame in seconds
     * @returns {boolean} True if the bullet position changed
     */
    update(deltaTime) {
        if (this.instanceId === null) return false; // Already removed
        
        // Move bullet forward with full velocity vector
        // The velocity has the full BulletConfig.speed applied in the constructor
        this.position.addScaledVector(this.velocity, deltaTime);
        
        // Update mesh position for backward compatibility
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
        
        // PRIMARY CHECK: Check if exceeded world cubic boundaries
        // This is the most important check for performance
        if (isOutsideWorldBoundary(this.position)) {
            // Log disabled to reduce console clutter
            // console.log(`🔴 BULLET DESTROYED: Exceeded world boundaries | Position: (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)})`);
            
            // Remove the bullet from the manager
            if (this.manager && this.instanceId !== null) {
                this.manager.removeBullet(this);
            }
            return false;
        }
        
        // SECONDARY CHECK: Decrement lifetime and check if expired
        this.lifeRemaining -= deltaTime;
        if (this.lifeRemaining <= 0) {
            // Log disabled to reduce console clutter
            // console.log(`🔴 BULLET DESTROYED: Lifetime expired | Position: (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)})`);
            
            // Remove the bullet from the manager
            if (this.manager && this.instanceId !== null) {
                this.manager.removeBullet(this);
            }
            return false;
        }
        
        // Bullet position has changed, return true
        return true;
    }
    
    /**
     * Destroy the bullet when it hits something
     * This follows the pattern where destroy() is for game-logic destruction
     * (like being hit by something) while remove() is for cleanup
     */
    destroy() {
        // Implement any special effects here (like particle effects)
        
        // Remove the bullet from the manager
        if (this.manager && this.instanceId !== null) {
            this.manager.removeBullet(this);
        }
    }
    
    /**
     * Create a bullet model for display purposes (used for UI)
     * @param {boolean} isActive - Whether the charge slot is active or depleted
     * @param {boolean} isHUD - Whether this bullet is for HUD display
     * @returns {THREE.Mesh} - The bullet model
     */
    static createBulletModel(isActive = true, isHUD = false) {
        let size, material;
        
        if (isHUD) {
            // Use HUD-specific settings from BulletConfig
            // For HUD bullets, we want a perfect cube with all sides equal
            size = BulletConfig.hudBullet?.size || 3.0;
            
            // Create material with wireframe for HUD bullets
            material = new THREE.MeshBasicMaterial({
                color: BulletConfig.color || 0x00ff00,
                wireframe: BulletConfig.hudBullet?.wireframe || true,
                transparent: true,
                opacity: isActive ? (BulletConfig.hudBullet?.opacity || 0.8) : 0.1,
                // Ensure lines are visible on wireframe
                wireframeLinewidth: 1
            });
        } else {
            // Use regular bullet settings for non-HUD bullets
            // Use BulletConfig size but scaled down a bit for UI (or hardcoded 2.0 as fallback)
            size = BulletConfig.size ? BulletConfig.size * 0.8 : 2.0;
            
            // Create material for regular bullets
            material = new THREE.MeshBasicMaterial({
                color: BulletConfig.color || 0x00ff00, // Use bullet config color if available
                wireframe: false,
                transparent: true,
                opacity: isActive ? 0.9 : 0.0 // Almost fully opaque when active
            });
        }
        
        // Create geometry with appropriate size - perfect cube with equal dimensions
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        // Create and return the mesh
        return new THREE.Mesh(geometry, material);
    }
}

export default Bullet;