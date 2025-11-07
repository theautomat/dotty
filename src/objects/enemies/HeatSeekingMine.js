/**
 * HeatSeekingMine.js - Slow-moving, heat-seeking mine weapon fired by Tetra enemies
 * Follows the player at a slow pace and explodes when it gets close enough
 */
import EnemyWeapon from './EnemyWeapon.js';
import GeometryFactory from '../shapes/GeometryFactory';
import GameObject from '../GameObject';
import * as THREE from 'three';
import soundManager from '../../managers/SoundManager';
import GameConfig from '../../game/GameConfig'; // Import GameConfig for global settings

class HeatSeekingMine extends EnemyWeapon {
    constructor(scene, position, direction, playerPosition, params = {}) {
        // Set default parameters for the heat-seeking mine
        const mineParams = {
            speed: params.speed || 0.2, // Slightly slower for orbiting behavior
            damage: params.damage || 1,
            color: params.color || 0xff1100, // Bright red
            size: params.size || 1.2, // Larger than normal projectiles
            lifetime: params.lifetime || 25000, // Longer lifetime (25 seconds)
            turnRate: params.turnRate || 0.008, // Lower turn rate for smoother orbiting
            explosionRadius: params.explosionRadius || 15, // Radius for explosion damage
            wrapDistance: params.wrapDistance || GameConfig.world.wrapDistance,
            // Gravitational orbit parameters
            gravityFactor: params.gravityFactor || 0.3, // Strength of "gravity" pull
            orbitTangentialFactor: params.orbitTangentialFactor || 0.8, // Strength of tangential movement
            spiralFactor: params.spiralFactor || 0.04, // How quickly the orbit radius shrinks
            minOrbitRadius: params.minOrbitRadius || 40, // Minimum radius before direct approach
            trackingDelay: params.trackingDelay || 1000, // 1 second before tracking
            fuse: params.fuse || 3000, // 3 seconds before explosions
        };
        
        super(scene, position, direction, mineParams);
        
        // Additional tracking properties
        this.targetPosition = playerPosition ? playerPosition.clone() : null;
        this.turnRate = this.params.turnRate;
        this.updateInterval = 100; // More frequent updates for smoother orbit
        this.lastUpdateTime = 0;
        this.startupDelay = 500; // Reduced delay before tracking begins
        this.rotationSpeed = {
            x: (Math.random() - 0.5) * 0.04,
            y: (Math.random() - 0.5) * 0.04,
            z: (Math.random() - 0.5) * 0.04
        };
        this.explosionRadius = this.params.explosionRadius;
        this.pulsePhase = Math.random() * Math.PI * 2; // For pulsing effect
        
        // Additional orbit parameters
        this.orbitAngle = Math.random() * Math.PI * 2; // Random starting angle
        this.orbitDirection = Math.random() > 0.5 ? 1 : -1; // Random orbit direction
        this.orbitHeight = (Math.random() - 0.5) * 30; // Random height variation
        this.initialDistance = 0; // Will be set on first update
        this.currentOrbitRadius = 0; // Will track current orbit radius
        this.orbitOffsetY = (Math.random() - 0.5) * 20; // Vertical offset from player
        
        // Set dynamic speed based on starting distance from player
        if (playerPosition && position) {
            const distToPlayer = position.distanceTo(playerPosition);
            // Speed varies based on distance - further mines move slightly faster
            this.params.speed *= (0.9 + (distToPlayer / 500) * 0.5);
        }
        
        // State
        this.age = 0;
        this.isTracking = false;
        this.trackingStartTime = 0;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.type = 'enemyProjectile'; // For collision detection
        this.isDetonating = false;
        this.detonationTime = 0;
        this.pulseTime = 0;
        
        // Reference to explosion manager (set via setExplosionManager)
        this.explosionManager = null;
        
        // Create mesh
        this.createMine();
        
        // Play heat seeking mine radio sound
        soundManager.playHeatSeekingMineRadio();
    }
    
    /**
     * Set explosion manager reference for creating explosions
     * @param {Object} manager - Reference to explosion manager
     */
    setExplosionManager(manager) {
        this.explosionManager = manager;
    }
    
    /**
     * Override to create custom mine mesh using GeometryFactory
     */
    createProjectile() {
        // Create simple wireframe sphere mesh using GeometryFactory
        this.mesh = GeometryFactory.createHeatSeekingMineMesh({
            size: this.params.size,
            color: this.params.color
        });
        
        // Set position
        this.mesh.position.copy(this.position);
        
        // Reference to this instance for collision detection
        this.mesh.userData.projectileInstance = this;
        
        console.log("Created heat-seeking mine with simplified wireframe sphere geometry");
    }
    
    /**
     * Create a custom mine mesh (legacy method - kept for backward compatibility)
     */
    createMine() {
        // Just call createProjectile - we no longer need separate implementation
        this.createProjectile();
    }
    
    /**
     * Update mine position and tracking behavior
     * @param {number} deltaTime - Time since last update
     * @param {THREE.Vector3} playerPosition - Current player position to track
     */
    update(deltaTime = 16, playerPosition = null) {
        if (!this.mesh) return false;
        
        // Increase age
        this.age += deltaTime;
        
        // Update target position if player position is provided
        if (playerPosition && this.age > this.startupDelay) {
            this.updateTargetTracking(playerPosition, deltaTime);
        }
        
        // Move mine along its current direction
        this.mesh.position.add(this.velocity);
        
        // Rotate mine for visual effect
        this.mesh.rotation.x += this.rotationSpeed.x;
        this.mesh.rotation.y += this.rotationSpeed.y;
        this.mesh.rotation.z += this.rotationSpeed.z;
        
        // Add pulsing effect
        this.updatePulsingEffect();
        
        // Check if we're close enough to explode
        if (playerPosition && this.shouldExplode(playerPosition)) {
            console.log("Mine reached player - exploding!");
            return false; // Returning false signals to Game.js to remove this
        }
        
        return true; // Keep updating
    }
    
    /**
     * Update target tracking with gravitational orbiting behavior
     */
    updateTargetTracking(playerPosition, deltaTime) {
        const now = performance.now();
        
        // Update target position 
        this.targetPosition = playerPosition.clone();
        
        // Calculate vector from mine to player
        const toPlayer = new THREE.Vector3().subVectors(
            playerPosition,
            this.mesh.position
        );
        
        // Current distance to player
        const distanceToPlayer = toPlayer.length();
        
        // Initialize initialDistance if this is the first update
        if (this.initialDistance === 0) {
            this.initialDistance = distanceToPlayer;
            this.currentOrbitRadius = distanceToPlayer;
        }
        
        // Only update direction periodically to reduce computation
        if (now - this.lastUpdateTime > this.updateInterval) {
            this.lastUpdateTime = now;
            
            // Update orbit angle - mines orbit faster when closer to the player
            const orbitSpeed = 0.01 + (0.03 * (1 - Math.min(distanceToPlayer / 200, 1)));
            this.orbitAngle += orbitSpeed * this.orbitDirection;
            
            // Calculate tangent vector perpendicular to the radial direction
            const tangent = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
            
            // Calculate new movement direction based on three components:
            // 1. Gravity: Pull toward the player (direct vector)
            // 2. Tangential: Circular movement around the player
            // 3. Spiral: Gradual decrease in orbit radius
            
            // Normalize player direction for the gravity component
            const gravityDirection = toPlayer.clone().normalize();
            
            // Calculate orbit radius reduction factor (spiral inward effect)
            // Smaller distances spiral in more quickly
            const spiralAmount = this.params.spiralFactor * (1 + (200 / Math.max(distanceToPlayer, 1)));
            
            // Final direction is a weighted sum of the three components
            const finalDirection = new THREE.Vector3();
            
            // If we're closer than the minimum orbit radius, go directly toward player
            if (distanceToPlayer < this.params.minOrbitRadius) {
                // Close enough - direct approach for final strike
                finalDirection.copy(gravityDirection);
            } else {
                // Still orbiting - apply tangential and gravity forces
                
                // Gravity component (pull toward player)
                finalDirection.addScaledVector(
                    gravityDirection, 
                    this.params.gravityFactor
                );
                
                // Tangential component (orbit around player)
                finalDirection.addScaledVector(
                    tangent, 
                    this.params.orbitTangentialFactor
                );
                
                // Spiral inward (reduces orbit radius)
                this.currentOrbitRadius = Math.max(
                    this.params.minOrbitRadius,
                    this.currentOrbitRadius - spiralAmount
                );
            }
            
            // Normalize the final direction
            finalDirection.normalize();
            
            // Set new velocity
            this.velocity.copy(finalDirection).multiplyScalar(this.params.speed);
            
            // Add some small vertical oscillation based on orbit angle
            this.velocity.y += Math.sin(this.orbitAngle * 0.5) * 0.015;
        }
    }
    
    /**
     * Create pulsing visual effect
     */
    updatePulsingEffect() {
        // Pulse opacity and emissive intensity for visual effect
        const time = performance.now() / 1000;
        
        if (this.mesh && this.mesh.material) {
            // Faster, more menacing pulse when closer to player
            const pulseFrequency = this.targetPosition ? 
                2 + 2 * (1 - Math.min(this.mesh.position.distanceTo(this.targetPosition) / 200, 1)) : 
                2;
            
            // Pulse opacity with distance-based frequency
            const opacityPulse = 0.8 + 0.2 * Math.sin(time * pulseFrequency + this.pulsePhase);
            this.mesh.material.opacity = opacityPulse;
            
            // Pulse emissive intensity - also stronger when closer
            const emissivePulse = 0.6 + 0.4 * Math.sin(time * pulseFrequency + this.pulsePhase);
            this.mesh.material.emissiveIntensity = emissivePulse;
            
            // Pulse color slightly
            if (this.mesh.material.emissive) {
                // Adjust emissive color intensity based on pulse
                const emissiveColorPulse = 0.3 + 0.2 * Math.sin(time * pulseFrequency * 1.2 + this.pulsePhase);
                this.mesh.material.emissive.setRGB(emissiveColorPulse, emissiveColorPulse * 0.2, 0);
            }
            
            this.mesh.material.needsUpdate = true;
        }
        
        // Animate spikes (subtle pulsing in/out)
        if (this.mesh && this.mesh.userData.spikes) {
            const spikePulse = 0.95 + 0.15 * Math.sin(time * 3 + this.pulsePhase);
            
            this.mesh.userData.spikes.forEach((spike, index) => {
                // Each spike pulses slightly differently
                const individualPulse = spikePulse + 0.05 * Math.sin(time * 2.5 + index * 0.5);
                spike.scale.set(1, individualPulse, 1);
                
                // Also rotate spikes slightly for more dynamic appearance
                spike.rotation.y += 0.001 * (index % 2 === 0 ? 1 : -1);
            });
        }
    }
    
    /**
     * Check if mine should explode (when close to player)
     */
    shouldExplode(playerPosition) {
        if (!this.mesh || !playerPosition) return false;
        
        const distance = this.mesh.position.distanceTo(playerPosition);
        
        // If we have completed our orbit and are very close, explode
        if (distance < this.explosionRadius * 0.6) { // Slightly tighter explosion threshold
            console.log("Mine in detonation range - exploding!");
            this.explode(playerPosition);
            return true;
        }
        
        // If lifetime is almost up, explode regardless of position
        // This prevents mines from lingering forever if they can't reach the player
        if (this.age > this.params.lifetime * 0.95) {
            console.log("Mine lifetime expiring - self-destructing!");
            this.explode(playerPosition);
            return true;
        }
        
        return false;
    }
    
    /**
     * Trigger explosion and notify Game.js
     */
    explode(playerPosition) {
        // Only if we have the explosion class
        if (!this.mesh) return;
        
        // Check if player is within damage radius
        const willDamage = this.willDamagePlayer(playerPosition);
        
        // Create an explosion using the explosionManager if available
        if (this.explosionManager && this.mesh) {
            this.explosionManager.createExplosion(
                this.mesh.position.clone(),
                this.params.size * 2.5, // Larger particles for dramatic effect
                {
                    fragmentCount: 40, // More fragments
                    fragmentColor: this.params.color || 0xff0000,
                    explosionSpeed: 2.0, // Faster explosion
                    lifespan: 1.5 // Longer lifespan
                }
            );
            
            // Play explosion sound
            soundManager.playEnemyExplosion();
        }
        
        // Legacy explosion callback support
        if (this.onExplode) {
            // Pass the damage flag directly instead of creating an explosion
            this.onExplode(null, willDamage);
        }
    }
    
    /**
     * Check if mine will damage player with explosion
     */
    willDamagePlayer(playerPosition) {
        if (!this.mesh || !playerPosition) return false;
        
        const distance = this.mesh.position.distanceTo(playerPosition);
        return distance < this.explosionRadius;
    }
    
}

export default HeatSeekingMine;