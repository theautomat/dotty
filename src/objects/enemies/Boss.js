/**
 * Boss.js - Base class for boss enemies
 * 
 * Provides foundation for boss-type enemies with:
 * - Health system based on configuration
 * - Phase transitions
 * - Ore/reward dropping
 * - Hit reactions
 * 
 * Extends the Enemy class to integrate with existing enemy systems
 */
import Enemy from './Enemy.js';
import soundManager from '../../managers/SoundManager';
import ENEMY_TYPES from './EnemyTypes.js';
import EnemyWeapon from './EnemyWeapon.js';
import { Collectible } from '../collectibles/index.js';
import * as THREE from 'three';
import GameConfig from '../../game/GameConfig'; // Import GameConfig for global settings

class Boss extends Enemy {
    constructor(scene, position = new THREE.Vector3(), params = {}) {
        // Call parent constructor with enemy type
        const bossType = params.type || 'sphereBoss';
        super(scene, position, bossType, params);
        
        // Store camera reference if provided
        this.playerCamera = params.playerCamera || null;
        
        // Boss config is now fully integrated in Enemy configuration
        // All fields needed (oreType, phaseTransitions, etc.) are already in this.params
        // from the Enemy constructor
        
        // Additional boss state variables
        this.maxHealth = this.health;
        this.phase = 1;
        this.isHit = false;
        this.hitTime = 0;
        
        // Callback functions
        this.shootCallback = null;
        this.explodeCallback = null;
        this.destroyCallback = null;
        
        // Flag to track if this is the first update (for initial positioning)
        this.needsInitialPositioning = true;
        
        // Initialize phase-specific parameters
        this.updatePhaseParams();
        
        // Boss-specific properties
        this.originalHealth = this.health;
        this.phaseThresholds = this.params.phaseTransitions || [0.75, 0.5, 0.25]; // Default phases at 75%, 50%, 25% health
        this.onExplodeCallback = null;
        this.onShootCallback = null;
        this.camera = params.playerCamera; // Store reference to player camera if provided
        this.playerPosition = new THREE.Vector3(0, 0, 0);
        
        // Ore dropping
        this.oreDropsPerHit = this.params.oreDropsPerHit || 0;
        this.oreDropsOnDeath = this.params.oreDropsOnDeath || 10;
        this.oreType = this.params.oreType || 'platinum';
        
        // Phase change animation props
        this.isPhaseChanging = false;
        this.phaseChangeStartTime = 0;
        this.phaseChangeDuration = 1000; // 1 second
        this.originalScale = this.params.size;
        this.originalColor = this.params.color;
        this.phaseChangeColor = 0xff0000; // Red during phase change
    }
    
    /**
     * Get current phase parameters
     * @returns {Object} Current phase parameters
     */
    getCurrentPhaseParams() {
        if (this.params.phases && this.params.phases[this.phase]) {
            // Create a merged object with base params overridden by phase-specific ones
            return { ...this.params, ...this.params.phases[this.phase] };
        }
        return this.params;
    }
    
    /**
     * Update parameters based on current phase
     */
    updatePhaseParams() {
        const phaseParams = this.getCurrentPhaseParams();
        
        // Update relevant properties from phase parameters
        this.params.speed = phaseParams.speed;
        this.params.shootInterval = phaseParams.shootInterval;
        this.params.projectileCount = phaseParams.projectileCount || 1;
        this.params.behavior = phaseParams.behavior || 'attack';
    }
    
    /**
     * Override parent update method with boss-specific behavior
     * @param {number} deltaTime - Time since last update in ms (not actually used)
     * @returns {boolean} Whether the boss is still active
     */
    update(deltaTime) {
        if (!this.mesh || !this.playerCamera) return false;
        
        // Use the camera reference to get player position
        const playerPosition = this.playerCamera.position;
        
        // Apply hit effect if recently hit
        this.applyHitEffect();
        
        // Call parent update method which handles movement and basic behavior
        super.update(deltaTime, playerPosition);
        
        // Add any boss-specific update code
        this.updateBossSpecific(playerPosition);
        
        // Periodically log boss state for debugging
        const now = Date.now();
        if (!this.lastLogTime || now - this.lastLogTime > 3000) { // Every 3 seconds
            console.log(`Boss state: Health ${this.getHealthPercent().toFixed(1)}% | Phase ${this.phase} | Position: ${this.mesh.position.x.toFixed(1)}, ${this.mesh.position.y.toFixed(1)}, ${this.mesh.position.z.toFixed(1)}`);
            this.lastLogTime = now;
        }
        
        return true;
    }
    
    /**
     * Update boss-specific behavior - to be implemented by child classes
     * @param {THREE.Vector3} playerPosition - The player's position
     * @param {THREE.Camera} playerCamera - Optional camera reference for better positioning
     */
    updateBossSpecific(playerPosition, playerCamera = null) {
        // Child classes should implement this
    }
    
    /**
     * Position the boss relative to the player (used during initialization)
     * @param {THREE.Vector3} playerPosition - Player's current position
     * @param {THREE.Camera} playerCamera - Player's camera for direction info
     */
    positionRelativeToPlayer(playerPosition, playerCamera) {
        if (!this.mesh) return;
        
        // Get player's forward direction 
        const playerDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(playerCamera.quaternion);
        
        // Use the spawn settings from config
        const distanceFromPlayer = this.params.spawnSettings?.distanceFromPlayer || 180;
        
        // Calculate spawn position
        const spawnPosition = playerPosition.clone().add(
            playerDirection.clone().multiplyScalar(distanceFromPlayer)
        );
        
        // Apply the calculated position
        this.mesh.position.copy(spawnPosition);
        console.log(`Boss positioned at distance ${distanceFromPlayer} from player at: ${spawnPosition.x.toFixed(1)}, ${spawnPosition.y.toFixed(1)}, ${spawnPosition.z.toFixed(1)}`);
    }
    
    /**
     * Override the executeBehavior method to implement boss-specific behaviors
     * @param {number} deltaTime
     * @param {THREE.Vector3} playerPosition
     */
    executeBehavior(deltaTime, playerPosition) {
        // Get current phase parameters which might change behavior
        const phaseParams = this.getCurrentPhaseParams();
        
        switch (phaseParams.behavior) {
            case 'keepDistance':
                this.keepDistanceFromPlayer(playerPosition);
                break;
            case 'orbit':
                this.orbitPlayer(playerPosition, phaseParams.orbitDistance, phaseParams.orbitSpeed);
                break;
            case 'orbitAndApproach':
                // Randomly decide whether to approach or orbit
                if (Math.random() < phaseParams.approachFrequency) {
                    this.approachPlayer(playerPosition, phaseParams.speed * 1.5);
                } else {
                    this.orbitPlayer(playerPosition, phaseParams.orbitDistance, phaseParams.orbitSpeed);
                }
                break;
            case 'aggressive':
                // More aggressive behavior - vary between charging and orbiting
                if (Math.random() < phaseParams.approachFrequency) {
                    this.chargeAtPlayer(playerPosition);
                } else {
                    this.orbitPlayer(playerPosition, phaseParams.orbitDistance, phaseParams.orbitSpeed);
                }
                break;
            case 'charge':
                this.chargeAtPlayer(playerPosition);
                break;
            default:
                // Call parent method for default behaviors
                super.executeBehavior(deltaTime, playerPosition);
                break;
        }
    }
    
    /**
     * Maintain optimal distance from the player (Phase 1 behavior)
     * @param {THREE.Vector3} playerPosition - The player's position
     */
    keepDistanceFromPlayer(playerPosition) {
        if (!playerPosition || !this.mesh) return;
        
        // Get distance profile from config
        const distanceProfile = this.params.distanceProfile || {
            optimal: 150,
            margin: 30,
            maxApproach: 100,
            maxRetreat: 250
        };
        
        // Calculate current distance to player
        const playerToSelf = new THREE.Vector3().subVectors(this.mesh.position, playerPosition);
        const currentDistance = playerToSelf.length();
        
        // Calculate optimal range
        const minAcceptableDistance = distanceProfile.optimal - distanceProfile.margin;
        const maxAcceptableDistance = distanceProfile.optimal + distanceProfile.margin;
        
        // Determine if we need to adjust distance
        if (currentDistance < minAcceptableDistance) {
            // Too close - retreat from player
            this.velocity.copy(playerToSelf.normalize().multiplyScalar(this.params.speed));
        } else if (currentDistance > maxAcceptableDistance) {
            // Too far - approach player
            this.velocity.copy(playerToSelf.normalize().multiplyScalar(-this.params.speed));
        } else {
            // Within acceptable range - just maintain position with small adjustments
            // Random gentle movement for visual interest
            this.velocity.x += (Math.random() - 0.5) * 0.01;
            this.velocity.y += (Math.random() - 0.5) * 0.01;
            this.velocity.z += (Math.random() - 0.5) * 0.01;
            this.velocity.multiplyScalar(0.95); // Dampen movement
        }
    }
    
    /**
     * Orbit around the player at optimal distance
     * @param {THREE.Vector3} playerPosition - The player's position
     * @param {number} orbitDistance - Distance to maintain while orbiting
     * @param {number} orbitSpeed - Speed of rotation
     */
    orbitPlayer(playerPosition, orbitDistance, orbitSpeed) {
        if (!playerPosition || !this.mesh) return;
        
        // Use parameters from phase config or fall back to defaults
        const distance = orbitDistance || this.params.distanceProfile?.optimal || 150;
        const speed = orbitSpeed || 0.01;
        
        // Create orbit movement
        const orbitAxis = new THREE.Vector3(0, 1, 0); // Orbit around y-axis
        const playerToSelf = new THREE.Vector3().subVectors(this.mesh.position, playerPosition);
        
        // Create a rotation quaternion for a small angle
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(orbitAxis, speed);
        
        // Apply rotation to the direction vector
        playerToSelf.applyQuaternion(rotationQuaternion);
        
        // Set new position maintaining the orbit distance
        const newPosition = new THREE.Vector3().addVectors(playerPosition, playerToSelf.normalize().multiplyScalar(distance));
        this.velocity.subVectors(newPosition, this.mesh.position).multiplyScalar(0.1);
    }
    
    /**
     * Approach the player directly but stop at a safe distance
     * @param {THREE.Vector3} playerPosition - The player's position
     * @param {number} approachSpeed - Speed to approach with
     */
    approachPlayer(playerPosition, approachSpeed) {
        if (!playerPosition || !this.mesh) return;
        
        // Get the minimum approach distance from config
        const minDistance = this.params.distanceProfile?.maxApproach || 100;
        
        // Calculate current distance and direction to player
        const playerToSelf = new THREE.Vector3().subVectors(this.mesh.position, playerPosition);
        const currentDistance = playerToSelf.length();
        
        // Only approach if we're not too close
        if (currentDistance > minDistance) {
            const approachDir = playerToSelf.normalize().multiplyScalar(-1); // Invert to move toward player
            const speed = approachSpeed || this.params.speed || 0.3;
            this.velocity.copy(approachDir.multiplyScalar(speed));
        } else {
            // Too close - hold position
            this.velocity.multiplyScalar(0.5); // Dampen movement
        }
    }
    
    /**
     * Charge directly at the player
     * @param {THREE.Vector3} playerPosition - The player's position
     */
    chargeAtPlayer(playerPosition) {
        if (!playerPosition || !this.mesh) return;
        
        // Direction to player
        const direction = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).normalize();
        
        // Set high-speed velocity toward player
        this.velocity.copy(direction).multiplyScalar(this.params.speed * 2.0);
    }
    
    /**
     * Override shoot method to use callback system
     * @param {THREE.Vector3} targetPosition 
     */
    shoot(targetPosition) {
        // TEMPORARILY DISABLED SHOOTING
        console.log("Boss shoot function called, but shooting is temporarily disabled");
        return;
        
        // Original shooting code below
        if (!this.mesh || !targetPosition) return;
        
        // Get current phase parameters
        const phaseParams = this.getCurrentPhaseParams();
        const projectileCount = phaseParams.projectileCount || 1;
        
        for (let i = 0; i < projectileCount; i++) {
            // Calculate direction to player with some randomness
            // Higher phases have more accurate targeting
            const accuracy = 0.8 + (this.phase * 0.05); // 0.85-1.0 based on phase
            const randomFactor = 1 - accuracy;
            
            // Start from boss position with slight offset
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * this.params.size * 0.2,
                (Math.random() - 0.5) * this.params.size * 0.2,
                (Math.random() - 0.5) * this.params.size * 0.2
            );
            
            const startPosition = new THREE.Vector3().copy(this.mesh.position).add(offset);
            
            // Calculate direction to player with randomness based on accuracy
            const direction = new THREE.Vector3().subVectors(targetPosition, startPosition);
            
            // Add randomness to direction
            direction.x += (Math.random() - 0.5) * 2 * randomFactor * 10;
            direction.y += (Math.random() - 0.5) * 2 * randomFactor * 10;
            direction.z += (Math.random() - 0.5) * 2 * randomFactor * 10;
            
            direction.normalize();
            
            // Create the actual projectile
            const projectile = new EnemyWeapon(
                this.scene,
                startPosition,
                direction,
                {
                    speed: phaseParams.projectileSpeed || 1.2,
                    damage: phaseParams.projectileDamage || 10,
                    color: this.params.color,
                    size: 0.8, // Larger size for boss projectiles
                    lifetime: 5000, // Longer lifetime
                    wrapDistance: GameConfig.world.wrapDistance
                }
            );
            
            // If we have a callback, notify the game that we created a projectile
            if (this.shootCallback) {
                this.shootCallback(projectile);
            }
        }
        
        // Play shooting sound
        soundManager.playPhaserShot();
    }
    
    /**
     * Override takeDamage to handle phases and ore drops
     * @param {number} damage - Amount of damage to take
     * @param {THREE.Vector3} hitDirection - Direction of the hit
     * @returns {Object} Hit result including whether enemy was destroyed
     */
    takeDamage(damage, hitDirection) {
        const oldHealth = this.health;
        
        // Apply damage
        this.health -= damage;
        
        // Set hit state for visual effects
        // If this is a new hit (not already in hit state), record original position
        if (!this.isHit) {
            this.isHit = true;
            this.hitTime = Date.now();
        } else {
            // If we're already in a hit state, just update the time
            // but keep the original position
            this.hitTime = Date.now();
        }
        
        // Play hit sound
        if (this.params.hitSound) {
            console.log(`Playing boss hit sound: ${this.params.hitSound}`);
            soundManager.playBossSphereHit(); // Using specific boss hit sound method
        }
        
        // Drop platinum ores when hit
        this.dropOresOnHit(hitDirection);
        
        // Log boss hit status - useful for debugging
        const hitsTaken = this.maxHealth - this.health;
        const hitsLeft = this.health;
        console.log(`Boss hit! Health: ${this.getHealthPercent().toFixed(1)}% (${hitsTaken}/${this.maxHealth} hits, ${hitsLeft} remaining)`);
        
        // Check for phase transition
        if (oldHealth > 0) {
            this.checkPhaseTransition();
        }
        
        // Check if destroyed
        if (this.health <= 0 && oldHealth > 0) {
            console.log("Boss defeated!");
            if (this.destroyCallback) {
                this.destroyCallback();
            }
            this.destroy();
            return true;
        }
        
        return false;
    }
    
    /**
     * Apply hit effect when boss is damaged
     */
    applyHitEffect() {
        if (!this.isHit || !this.mesh) return;
        
        const hitDuration = Date.now() - this.hitTime;
        const shakeDuration = 300; // Shake for 300ms
        
        if (hitDuration > shakeDuration) {
            // Shake effect finished - reset
            this.isHit = false;
            
            // Restore original position
            if (this.originalPosition) {
                this.mesh.position.copy(this.originalPosition);
                this.originalPosition = null;
            }
            return;
        }
        
        // Apply shake effect - stronger at start, diminishes over time
        // Reduced intensity from 2.0 to 0.5 to prevent excessive movement
        const shakeIntensity = 0.5 * (1 - hitDuration / shakeDuration);
        
        // Store original position if not already stored
        if (!this.originalPosition) {
            // Store the original position from when the hit first occurred
            this.originalPosition = this.mesh.position.clone();
            console.log(`Boss hit! Stored original position: ${this.originalPosition.x.toFixed(1)}, ${this.originalPosition.y.toFixed(1)}, ${this.originalPosition.z.toFixed(1)}`);
        }
        
        // Apply random offset to position (shake effect) - modest jitter
        this.mesh.position.x = this.originalPosition.x + (Math.random() - 0.5) * shakeIntensity;
        this.mesh.position.y = this.originalPosition.y + (Math.random() - 0.5) * shakeIntensity;
        this.mesh.position.z = this.originalPosition.z + (Math.random() - 0.5) * shakeIntensity;
    }
    
    /**
     * Check if boss should transition to a new phase
     */
    checkPhaseTransition() {
        if (!this.params.phaseTransitions || this.params.phaseTransitions.length === 0) {
            return;
        }
        
        const healthPercent = (this.health / this.maxHealth) * 100;
        
        // Check each phase transition threshold
        for (let i = 0; i < this.params.phaseTransitions.length; i++) {
            const threshold = this.params.phaseTransitions[i];
            const phaseNum = i + 2; // Phase 2 starts at first threshold
            
            if (healthPercent <= threshold && this.phase < phaseNum) {
                // Calculate hits remaining in this new phase
                const nextThreshold = i < this.params.phaseTransitions.length - 1 ? 
                    this.params.phaseTransitions[i + 1] : 0;
                
                const hitsInPhase = Math.ceil((threshold - nextThreshold) / 100 * this.maxHealth);
                
                // Log phase transition info before making the change
                console.log(`=== BOSS PHASE TRANSITION ===`);
                console.log(`Transitioning from Phase ${this.phase} to Phase ${phaseNum}`);
                console.log(`Health: ${healthPercent.toFixed(1)}%`);
                console.log(`This phase requires ${hitsInPhase} hits`);
                
                this.transitionToPhase(phaseNum);
                break;
            }
        }
    }
    
    /**
     * Transition to a new phase
     * @param {number} newPhase - The phase number to transition to
     */
    transitionToPhase(newPhase) {
        this.phase = newPhase;
        
        // Update parameters for new phase
        this.updatePhaseParams();
        
        // Play phase transition sound
        if (this.params.phaseChangeSound) {
            soundManager.play(this.params.phaseChangeSound);
        }
        
        console.log(`${this.type} boss transitioned to phase ${newPhase}`);
    }
    
    /**
     * Set callback for when boss shoots
     * @param {Function} callback - Function to call, receives projectile config
     */
    setShootCallback(callback) {
        this.shootCallback = callback;
    }
    
    /**
     * Set callback for when boss creates an explosion
     * @param {Function} callback - Function to call, receives explosion object
     */
    setExplodeCallback(callback) {
        this.explodeCallback = callback;
    }
    
    /**
     * Set callback for when boss drops ores
     * @param {Function} callback - Function to call, receives ore object
     */
    setOreDropCallback(callback) {
        this.oreDropCallback = callback;
    }
    
    /**
     * Set callback for when boss is destroyed
     * @param {Function} callback - Function to call
     */
    setDestroyCallback(callback) {
        this.destroyCallback = callback;
    }
    
    /**
     * Get the boss's current phase
     * @returns {number} The current phase number
     */
    getPhase() {
        return this.phase;
    }
    
    /**
     * Get the boss's health percentage
     * @returns {number} Health percentage (0-100)
     */
    getHealthPercent() {
        return (this.health / this.maxHealth) * 100;
    }
    
    /**
     * Get the boss's position
     * @returns {THREE.Vector3} Current position
     */
    getPosition() {
        return this.mesh ? this.mesh.position.clone() : this.position.clone();
    }
    
    /**
     * Get the boss's size
     * @returns {number} Current size
     */
    getSize() {
        return this.params.size;
    }
    
    /**
     * Get the boss's color
     * @returns {number} Current color
     */
    getColor() {
        return this.params.color;
    }
    
    /**
     * Check if the boss is defeated
     * @returns {boolean} Whether the boss is defeated
     */
    isDefeated() {
        return this.health <= 0;
    }
    
    /**
     * Drop ores when the boss is hit
     * @param {THREE.Vector3} hitDirection - Direction of the hit
     */
    dropOresOnHit(hitDirection) {
        if (!this.mesh) return;
        
        // Get ore drop parameters from boss config
        const oresToDrop = this.params.oreDropsPerHit || 1;
        
        // Only drop ores if this param is defined and positive
        if (oresToDrop <= 0) return;
        
        // Use the boss's current position as the base ore position
        const bossPosition = this.mesh.position.clone();
        
        console.log(`Boss dropping ${oresToDrop} platinum ores on hit`);
        
        // Create multiple ores with some spread in the hit direction
        for (let i = 0; i < oresToDrop; i++) {
            // Create a spread direction based on the hit direction
            // If no hit direction provided, use a random direction away from boss
            const spreadDir = hitDirection ? 
                hitDirection.clone() : 
                new THREE.Vector3(
                    Math.random() - 0.5,
                    Math.random() - 0.5,
                    Math.random() - 0.5
                ).normalize();
            
            // Add randomness to the spread direction
            spreadDir.x += (Math.random() - 0.5) * 0.5;
            spreadDir.y += (Math.random() - 0.5) * 0.5;
            spreadDir.z += (Math.random() - 0.5) * 0.5;
            spreadDir.normalize();
            
            // Calculate offset distance - away from boss in spread direction
            const offsetDistance = this.params.size * 1.2 + Math.random() * 3;
            
            // Apply offset to create ore position
            const orePosition = bossPosition.clone().add(
                spreadDir.clone().multiplyScalar(offsetDistance)
            );
            
            // Create platinum ore directly at this position
            const ore = new Ore(this.scene, orePosition, {
                type: 'platinum', // Force platinum ore type
                wrapDistance: GameConfig.world.wrapDistance
            });
            
            // Add ore to game via the ore-specific callback
            if (this.oreDropCallback) {
                this.oreDropCallback(ore); // Pass the ore to be added to the game's ores array
            }
        }
    }

    dropOreOnDeath(position, amount = 10) {
        if (!position) return;
        
        for (let i = 0; i < amount; i++) {
            // Create random offset vector for ore spawn
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            );
            
            // Add the offset to the position
            const orePosition = position.clone().add(offset);
            
            // Create the ore with a random type based on boss difficulty/level
            const oreType = this.getRandomOreType();
            
            // Create the ore and add it to the returned array
            const ore = Ore.create(
                this.scene,
                orePosition,
                oreType,
                {
                    wrapDistance: GameConfig.world.wrapDistance
                }
            );
            
            if (this.oreDropCallback) {
                this.oreDropCallback(ore);
            }
        }
    }
}

export default Boss;