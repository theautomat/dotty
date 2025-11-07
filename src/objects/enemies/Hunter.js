/**
 * Hunter.js - Implementation of Hunter enemy type
 * Minimal implementation with basic structure only
 */
import Enemy from './Enemy.js';
import * as THREE from 'three';
import GeometryFactory from '../shapes/GeometryFactory';
import soundManager from '../../managers/SoundManager';
import explosionManager from '../../managers/ExplosionManager.js';

class Hunter extends Enemy {
    constructor(scene, position, params = {}) {
        // Call parent constructor
        super(scene, position, 'hunter', params);
        
        // Store the original size for explosion effect
        this.originalSize = this.params.size;
        
        // Create unique ID for this hunter instance
        this.id = `hunter_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        
        // Play spawn sound effect
        soundManager.playHunterSpawn(this.id);
    }
    
    /**
     * Create the Hunter mesh - implemented but empty
     */
    createEnemy() {
        // Minimal implementation
        this.mesh = GeometryFactory.createEnemyMesh('hunter', {
            size: this.params.size,
            color: this.params.color
        });
        
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            //this.mesh.userData.enemyInstance = this;
            // No longer adding to scene - EnemyManager will handle that
            // this.scene.add(this.mesh);
        }
    }
    
    /**
     * Update method - implements simple kamikaze behavior
     * @param {number} deltaTime 
     * @param {THREE.Vector3} playerPosition 
     * @returns {boolean} Whether the Hunter is still active
     */
    update(deltaTime, playerPosition) {
        if (!this.mesh) return false;
        
        // Simple kamikaze - charge directly at player
        this.kamikazeTowardPlayer(playerPosition);
        
        // Apply velocity to position
        this.mesh.position.add(this.velocity);
        
        // Update position property for collision detection
        this.position = this.mesh.position.clone();
        
        return true; // Hunter remains active
    }
    
    /**
     * Kamikaze movement - directly toward player at high speed
     * @param {THREE.Vector3} playerPosition 
     */
    kamikazeTowardPlayer(playerPosition) {
        if (!playerPosition || !this.mesh) return;
        
        // Calculate direction to player
        const direction = new THREE.Vector3().subVectors(
            playerPosition,
            this.mesh.position
        ).normalize();
        
        // Set insanely high speed for kamikaze charge (15x normal speed)
        const chargeSpeed = this.params.speed * 15.0;
        
        // If starting from very low velocity, this is the initial charge
        if (this.velocity.length() < 0.1 && !this.hasStartedCharge) {
            // Play the hunter trash talk sound when starting charge
            soundManager.playHunterNearby(this.id);
            this.hasStartedCharge = true;
        }
        
        // Set velocity to charge directly at player
        this.velocity.copy(direction).multiplyScalar(chargeSpeed);
        
        // Make hunter face the player
        this.mesh.lookAt(playerPosition);
    }
    
    /**
     * Handle collision with player bullets
     * @param {GameObject} otherObject - The object that collided with this enemy
     */
    handleCollision(otherObject) {
        // Log Hunter-specific collision details
        console.log(`[HUNTER HIT] Hunter ${this.id} destroyed by bullet:`, {
            position: this.mesh ? this.mesh.position.clone() : this.position,
            velocity: this.velocity ? this.velocity.clone() : null,
            originalSize: this.originalSize,
            color: this.getColor(),
            bulletType: otherObject.type || 'unknown',
            bulletPosition: otherObject.position ? otherObject.position.clone() : null
        });
        
        // Only handle bullet collisions
        soundManager.playHunterExplosion();
        
        // Call parent's createExplosion with custom options for Hunter explosion
        this.createExplosion({
            // Make explosion bigger than the default (using originalSize instead of params.size)
            size: this.originalSize / 100,
            
            // Custom options for Hunter-specific explosion effect
            fragmentCount: 20, // More fragments for dramatic effect
            explosionSpeed: 1.0, // Faster explosion for Hunter
            lifespan: 1.2 // Slightly longer lifespan
        });
        
        this.destroy();
        return true;
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        super.destroy();
    }
}

export default Hunter;