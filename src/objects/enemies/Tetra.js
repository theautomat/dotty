/**
 * Tetra.js - Implementation of Tetra enemy type
 * A glossy black tetrahedron with a red sphere "mind" visible inside,
 * inspired by HAL 9000 from 2001: A Space Odyssey.
 * Enhanced behavior: Drops heat-seeking mines that track the player.
 */
import Enemy from './Enemy.js';
import GeometryFactory from '../shapes/GeometryFactory';
import soundManager from '../../managers/SoundManager';
import { isOutsideWorldBoundary } from '../../utils/WorldUtils';
import * as THREE from 'three';

class Tetra extends Enemy {
    constructor(scene, position, params = {}) {
        // Call parent constructor with type 'tetra'
        super(scene, position, 'tetra', params);
        
        // Tetra-specific properties
        this.innerSphere = null;
        this.pulsePhase = Math.random() * Math.PI * 2; // Random starting phase for pulsing
        
        // Change behavior to 'follow' instead of 'orbit'
        this.params.behavior = 'follow';
        
        // Set default shoot interval to 1 second if not specified
        this.params.shootInterval = params.shootInterval || 1000;
        
        // Initialize lastShotTime to ensure first shot happens after a short delay
        this.lastShotTime = performance.now() - (this.params.shootInterval * 0.5);
        console.log(`Tetra [ID: ${this.id}] created - First shot in: ${this.params.shootInterval * 0.5}ms`);
        
        // Direct reference to explosion manager (should be set by enemy manager when creating)
        this.explosionManager = params.explosionManager || null;
        
        // Log initial spawn position
        console.log(`Tetra [ID: ${this.id}] SPAWN POSITION:`, {
            x: position.x.toFixed(1),
            y: position.y.toFixed(1),
            z: position.z.toFixed(1),
            distanceFromOrigin: position.length().toFixed(1)
        });
        
        // Add position logging tracker
        this.lastPositionLogTime = 0;
        this.positionLogInterval = 250; // Log position every 250ms
    }
    
    /**
     * Create the enemy mesh - Override from Enemy base class
     */
    createEnemy() {
        // Create tetra mesh using GeometryFactory
        const tetraGroup = GeometryFactory.createTetraMesh({
            size: this.params.size, // Pass correct size
            color: this.params.color || 0xFF0000
        });
        
        // Set position
        tetraGroup.position.copy(this.position);
        
        // No longer adding to scene - EnemyManager will handle that
        // this.scene.add(tetraGroup);
        
        // Set as mesh and keep reference to innerSphere
        this.mesh = tetraGroup;
        this.innerSphere = tetraGroup.userData.innerSphere;
    }
    
    /**
     * Execute behavior based on type
     * @param {number} deltaTime - Time since last update
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    executeBehavior(deltaTime, playerPosition) {
        // Only use simple follow behavior, ignoring any other behavior settings
        this.simpleFollow(playerPosition);
    }
    
    /**
     * Simple follow behavior - move directly toward the player at a constant speed
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    simpleFollow(playerPosition) {
        if (!playerPosition || !this.mesh) return;
        
        // Direction vector to player
        const direction = new THREE.Vector3().subVectors(
            playerPosition,
            this.mesh.position
        ).normalize();
        
        // Set velocity toward player, scaled by speed
        this.velocity.copy(direction).multiplyScalar(this.params.speed);
        
        // Rotate to face the direction of movement
        if (this.velocity.length() > 0) {
            // Create a quaternion for the rotation
            const lookAt = new THREE.Vector3().addVectors(
                this.mesh.position,
                this.velocity.clone().normalize()
            );
            this.mesh.lookAt(lookAt);
        }
    }
    
    /**
     * Override update to add throttled position logging
     */
    update(deltaTime, playerPosition) {
        if (!this.mesh) return false;
        
        // Throttled position logging
        const now = performance.now();
        if (now - this.lastPositionLogTime > this.positionLogInterval) {
            this.lastPositionLogTime = now;
            if (playerPosition) {
                const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
                console.log(`Tetra [ID: ${this.id}] POSITION:`, {
                    x: this.mesh.position.x.toFixed(1),
                    y: this.mesh.position.y.toFixed(1),
                    z: this.mesh.position.z.toFixed(1),
                    distanceToPlayer: distanceToPlayer.toFixed(1)
                });
            }
        }
        
        // Pulse the inner red sphere
        this.updatePulsingEffect();
        
        // Call parent update method
        return super.update(deltaTime, playerPosition);
    }
    
    /**
     * Create a pulsing effect for the inner sphere and rotation for the tetrahedron
     */
    updatePulsingEffect() {
        if (!this.innerSphere) return;
        
        // Pulse the size and intensity of the sphere
        const time = performance.now() / 1000; // Time in seconds
        const pulseScale = 0.9 + 0.2 * Math.sin(time * 2 + this.pulsePhase);
        
        // Scale the sphere
        this.innerSphere.scale.set(pulseScale, pulseScale, pulseScale);
        
        // Update the material's emissive intensity
        if (this.innerSphere.material) {
            const emissiveIntensity = 0.3 + 0.2 * Math.sin(time * 2 + this.pulsePhase);
            this.innerSphere.material.emissiveIntensity = emissiveIntensity;
        }
        
        // Add a subtle rotation to the entire mesh to make it more menacing
        // We add this in addition to the direction-based rotation
        if (this.mesh) {
            // Slow subtle rotation around various axes for an unsettling effect
            this.mesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), 0.005); // Y-axis
            this.mesh.rotateOnAxis(new THREE.Vector3(1, 0, 0), 0.001); // X-axis
        }
    }
    
    /**
     * Override checkBoundaries to use the world boundary utility with a fixed buffer
     */
    checkBoundaries() {
        if (!this.mesh) return;
        
        // Use a consistent buffer of 200 units for all Tetras, regardless of behavior
        // This allows them to travel a bit outside the world boundary before being destroyed
        if (isOutsideWorldBoundary(this.mesh.position, 200)) {
            // If outside boundary plus buffer, destroy this enemy
            this.destroy();
        }
    }
    
    /**
     * Override destroy to handle Tetra-specific cleanup and play sound effects
     */
    destroy() {
        // Play destruction sound
        soundManager.playHunterExplosion();
        
        // Create explosion effect using direct reference to explosionManager
        if (this.mesh && this.explosionManager) {
            const position = this.mesh.position.clone();
            const color = this.params.color || 0xff0000; // Default red
            
            this.explosionManager.createExplosion(
                position,
                this.params.size * 0.4, // Larger particles for dramatic effect
                {
                    fragmentCount: 60, // More fragments for a bigger explosion
                    fragmentColor: color,
                    explosionSpeed: 2.5, // Faster explosion
                    lifespan: 1.2 // Slightly longer lifespan
                }
            );
        }
        
        // Clear innerSphere reference before destruction
        this.innerSphere = null;
        
        // Call parent destroy for common cleanup
        super.destroy();
    }
    
    /**
     * Override updateWeapon from parent class to use our custom decideWhetherToShoot method
     * @param {number} deltaTime - Time since last update
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    updateWeapon(deltaTime, playerPosition) {
        console.log(`Tetra [ID: ${this.id}] - updateWeapon called - will check firing logic`);
        
        // Use our custom method instead of parent's default logic
        this.decideWhetherToShoot(deltaTime, playerPosition);
    }
    
    /**
     * Decide whether to shoot based on timing only (not distance)
     * @param {number} deltaTime - Time since last update
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    decideWhetherToShoot(deltaTime, playerPosition) {
        if (!playerPosition || !this.mesh) {
            console.log(`Tetra [ID: ${this.id}] - Can't shoot: player position or mesh missing`);
            return;
        }

        // Check if it's time to shoot
        const now = performance.now();
        const timeSinceLastShot = now - this.lastShotTime;
        const readyToShoot = timeSinceLastShot > this.params.shootInterval;
        
        // Log every time the decision is made
        console.log(`Tetra [ID: ${this.id}] - Shoot decision:`, {
            timeSinceLastShot: Math.floor(timeSinceLastShot),
            shootInterval: this.params.shootInterval,
            readyToShoot: readyToShoot,
            lastShotTime: new Date(this.lastShotTime).toISOString().substr(11, 12),
            currentTime: new Date(now).toISOString().substr(11, 12),
            enemyManager: !!this.enemyManager
        });
        
        // Force a shot if we're way overdue (failsafe)
        if (timeSinceLastShot > this.params.shootInterval * 3) {
            console.log(`Tetra [ID: ${this.id}] - FORCING shot after long delay!`);
            this.shoot(playerPosition);
            this.lastShotTime = now;
            return;
        }
        
        // Shoot purely based on time, not distance
        if (readyToShoot) {
            console.log(`Tetra [ID: ${this.id}] - FIRING! Time-based shot`);
            this.shoot(playerPosition);
            this.lastShotTime = now;
        }
    }
    
    /**
     * Fire a heat-seeking mine at the player
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    shoot(playerPosition) {
        if (!this.mesh || !playerPosition || !this.enemyManager) return;
        
        // Play mine dropping sound
        soundManager.playTetraDropMine(this.id);
        
        // Calculate initial direction toward player
        const direction = new THREE.Vector3()
            .subVectors(playerPosition, this.mesh.position)
            .normalize();
        
        // Add some randomness to initial direction
        direction.x += (Math.random() - 0.5) * 0.3;
        direction.y += (Math.random() - 0.5) * 0.3;
        direction.z += (Math.random() - 0.5) * 0.3;
        direction.normalize();
        
        // Create offset position to start mine further away (25 units) from Tetra
        const startPosition = this.mesh.position.clone().add(
            direction.clone().multiplyScalar(25)
        );
        
        // Varied speed calculation
        const speed = 0.8 + Math.random() * 0.4;
        
        // Heat seeking parameters 
        const gravityFactor = 0.25 + Math.random() * 0.15;
        const orbitTangentialFactor = 0.65 + Math.random() * 0.25;
        const spiralFactor = 0.02 + Math.random() * 0.04;
        
        console.log(`Tetra [ID: ${this.id}] MINE DETAILS:`, {
            position: `x:${startPosition.x.toFixed(1)}, y:${startPosition.y.toFixed(1)}, z:${startPosition.z.toFixed(1)}`,
            direction: `x:${direction.x.toFixed(2)}, y:${direction.y.toFixed(2)}, z:${direction.z.toFixed(2)}`,
            speed: speed.toFixed(2),
            gravityFactor: gravityFactor.toFixed(2),
            orbitTangentialFactor: orbitTangentialFactor.toFixed(2),
            spiralFactor: spiralFactor.toFixed(3),
            damage: 15,
            spawnDistance: 25
        });
        
        // Create the projectile configuration for the enemy manager
        // EnemyProjectile will use GeometryFactory.createHeatSeekingMineMesh for visualization
        const projectileConfig = {
            position: startPosition,
            direction: direction,
            speed: speed,
            damage: 15,
            color: new THREE.Color(
                0.95 + Math.random() * 0.05, // Red channel (0.95-1.0)
                0.1 + Math.random() * 0.1,   // Green channel (0.1-0.2)
                0.05 + Math.random() * 0.05  // Blue channel (0.05-0.1)
            ).getHex(),
            size: 15.0, // Increased size from 3.0 to 15.0 (5x larger)
            type: 'heatSeekingMine',
            enemyType: 'tetra',
            enemyManager: this.enemyManager, // Pass enemyManager reference for explosion effects
            // Additional heat-seeking mine specific properties
            targetPosition: playerPosition,
            gravityFactor: gravityFactor,
            orbitTangentialFactor: orbitTangentialFactor,
            spiralFactor: spiralFactor,
            // Custom collision radius - 5x the visual size
            collisionRadiusMultiplier: 5.0
        };
        
        // Let the enemy manager create and track the projectile
        this.enemyManager.createEnemyProjectile(projectileConfig);
    }
}

export default Tetra;