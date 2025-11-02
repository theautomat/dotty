/**
 * EnemyWeapon.js - Base class for enemy projectiles and weapons
 */
import GameObject from '../GameObject.js';
import * as THREE from 'three';
import soundManager from '../../managers/SoundManager.js';
import GameConfig from '../../game/GameConfig.js'; // Import GameConfig for global settings
import { isOutsideWorldBoundary } from '../../utils/WorldUtils.js'; // Import for boundary checking
import GeometryFactory from '../shapes/GeometryFactory.js'; // Import GeometryFactory for projectile geometry

class EnemyWeapon extends GameObject {
    constructor(scene, position, direction, params = {}) {
        super(scene);
        
        // Store position
        this.position = position.clone();
        
        // Default parameters with overrides from params
        this.params = {
            type: params.type || 'basic',
            size: params.size || 1.0,
            speed: params.speed || 0.5,
            color: params.color || 0xff0000,
            lifetime: params.lifetime || 5000, // 5 seconds
            damage: params.damage || 1,
            spin: params.spin || false, // Whether the projectile should spin visually
            collisionRadiusMultiplier: params.collisionRadiusMultiplier || 1.0, // New parameter for larger hitboxes
            enemyManager: params.enemyManager || null // Store reference to enemyManager for explosions
        };
        
        // State
        this.age = 0;
        
        // Debug the direction parameter
        console.log('EnemyWeapon direction:', {
            directionProvided: !!direction,
            directionType: direction ? typeof direction : 'undefined',
            isVector3: direction instanceof THREE.Vector3,
            hasClone: direction && typeof direction.clone === 'function',
            dirValue: direction ? JSON.stringify(direction) : 'null'
        });
        
        // Set velocity based on direction and speed - with careful checks
        if (!direction || !(direction instanceof THREE.Vector3)) {
            console.warn('EnemyWeapon created with invalid direction, using default forward vector');
            this.velocity = new THREE.Vector3(0, 0, -1).multiplyScalar(this.params.speed);
        } else {
            this.velocity = direction.clone().normalize().multiplyScalar(this.params.speed);
        }
        this.type = 'enemyProjectile'; // For collision detection
        
        // Create mesh
        this.createProjectile();
        
        // Play sound based on weapon type
        if (this.params.type === 'silent') {
            // No sound for silent weapons
        } else if (this.params.type === 'heatSeekingMine') {
            // Special sound for heat seeking mines
            soundManager.playHeatSeekingMineRadio();
        } else {
            // Default to UFO laser sound for other projectiles
            soundManager.playUFOLaser();
        }
    }
    
    /**
     * Create the projectile mesh
     */
    createProjectile() {
        // Use GeometryFactory to create appropriate geometry based on weapon type
        if (this.params.type === 'heatSeekingMine') {
            // Create heat-seeking mine using GeometryFactory
            this.mesh = GeometryFactory.createHeatSeekingMineMesh({
                size: this.params.size,
                color: this.params.color
            });
        } else {
            // For standard projectiles, use simple wireframe tetrahedron
            const geometry = new THREE.TetrahedronGeometry(this.params.size, 0);
            
            // Create wireframe material
            const material = new THREE.MeshBasicMaterial({
                color: this.params.color,
                wireframe: true // Always use wireframe for better performance and retro feel
            });
            
            // Create mesh
            this.mesh = new THREE.Mesh(geometry, material);
        }
        
        // Set position
        this.mesh.position.copy(this.position);
        
        // Reference to this instance for collision detection
        this.mesh.userData.projectileInstance = this;
        
        // Log creation of heat-seeking mines
        if (this.params.type === 'heatSeekingMine') {
            console.log(`Created heat-seeking mine with size: ${this.params.size}, collision radius: ${this.params.size * (this.params.collisionRadiusMultiplier || 1)}`);
        }
    }
    
    /**
     * Update projectile position and behavior
     * @param {number} deltaTime - Time since last update in ms
     */
    update(deltaTime = 16) {
        if (!this.mesh) return;
        
        // Increase age
        this.age += deltaTime;
        
        // Speed multiplier for faster movement
        const speedMultiplier = 5.0; // Make projectiles move much faster
        
        // Move projectile along its velocity vector with increased speed
        this.mesh.position.addScaledVector(this.velocity, speedMultiplier);
        
        // Rotate projectile for visual effect
        if (this.params.spin) {
            // Enhanced spinning animation for UFO projectiles (faster and more dramatic)
            this.mesh.rotation.x += 0.2;
            this.mesh.rotation.y += 0.3;
            this.mesh.rotation.z += 0.15;
        } else {
            // Default rotation for other projectiles - slight rotation for visual interest
            this.mesh.rotation.x += 0.05;
            this.mesh.rotation.y += 0.08;
        }
    }
    
    /**
     * Check if the projectile has exceeded its lifetime
     * @returns {boolean} True if the projectile should self-destruct
     */
    hasExpired() {
        return this.age > this.params.lifetime;
    }
    
    /**
     * Check if the projectile has gone beyond the world boundary
     * @returns {boolean} True if the projectile is out of bounds
     */
    isOutOfBounds() {
        // Use the utility function from WorldUtils
        if (!this.mesh) return true;
        
        // Check against world boundary with a larger buffer (-50) to allow projectiles to travel further
        // Negative buffer means the boundary check happens further out than the actual boundary
        return isOutsideWorldBoundary(this.mesh.position, -50);
    }
    
    /**
     * Check if projectile collides with the player
     * @param {THREE.Vector3} playerPosition - Current player position
     * @param {number} collisionRadius - Radius to check for collision
     * @returns {boolean} Whether a collision occurred
     */
    checkPlayerCollision(playerPosition, collisionRadius = 2) {
        if (!this.mesh || !playerPosition) return false;
        
        // Apply the collision radius multiplier for larger hitboxes (like mines)
        const effectiveRadius = collisionRadius + (this.params.size * this.params.collisionRadiusMultiplier);
        
        const distance = this.mesh.position.distanceTo(playerPosition);
        
        // Log collision checks for heat seeking mines
        if (this.params.type === 'heatSeekingMine' && distance < effectiveRadius * 3) {
            console.log(`Heat seeking mine collision check: Distance ${distance.toFixed(1)}, Effective radius: ${effectiveRadius.toFixed(1)}`);
        }
        
        return distance < effectiveRadius;
    }
    
    /**
     * Get damage amount for this projectile
     * @returns {number} Damage amount
     */
    getDamage() {
        return this.params.damage;
    }
    
    /**
     * Destroy the projectile and clean up resources
     */
    destroy() {
        // If this is a heat seeking mine, create a special explosion
        if (this.params.type === 'heatSeekingMine' && this.mesh) {
            this.createExplosion();
        }
        
        // Call parent destroy for common cleanup
        super.destroy();
    }
    
    /**
     * Create an explosion effect for the weapon
     */
    createExplosion() {
        if (!this.mesh) return;
        
        // Get the explosion manager from enemy manager if available
        const explosionManager = this.params.enemyManager?.explosionManager;
        
        if (explosionManager) {
            const position = this.mesh.position.clone();
            const color = this.params.color || 0xff0000;
            
            // Create a larger, more dramatic explosion for mines
            explosionManager.createExplosion(
                position, 
                this.params.size * 0.5, // Larger particles for dramatic effect
                {
                    fragmentCount: 80, // More fragments for a bigger explosion
                    fragmentColor: color,
                    explosionSpeed: 3.0, // Faster explosion
                    lifespan: 1.5 // Slightly longer lifespan
                }
            );
            
            // Play explosion sound based on weapon type
            if (this.params.type === 'heatSeekingMine') {
                soundManager.playHunterExplosion();
            }
        }
    }
}

export default EnemyWeapon;