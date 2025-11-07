/**
 * UFO.js - Implementation of UFO enemy type
 * A fast-moving scout ship that aggressively follows the player,
 * hovers at a distance, and fires charged energy orbs
 */
import Enemy from './Enemy.js';
import GeometryFactory from '../shapes/GeometryFactory';
import EnemyConfig from './EnemyConfig';
import EnemyWeapon from './EnemyWeapon.js';
import GameConfig from '../../game/GameConfig';
import soundManager from '../../managers/SoundManager';

class UFO extends Enemy {
    constructor(scene, position, params = {}) {
        // Call parent constructor with type 'ufo'
        super(scene, position, 'ufo', params);
        
        // Debug: Check if enemyManager was properly passed and set by parent class
        console.log('[UFO Constructor] Enemy manager reference:', {
            hasEnemyManager: !!this.enemyManager,
            wasProvidedInParams: !!params.enemyManager,
            // Add path info to help identify the correct instance
            managerPath: params.enemyManager ? 'From managers folder' : 'None'
        });
        
        // Initialize sound effect timer
        this.soundEffectInterval = 1500 + Math.random() * 1000; // 1.5-2.5 seconds between sounds
        this.lastSoundEffectTime = 0;
        this.uniqueId = `ufo_${Date.now()}_${Math.floor(Math.random() * 10000)}`; // Unique ID for this UFO
        
        // Get full config for the UFO
        const config = EnemyConfig.getEnemyConfig('ufo');
        
        // State machine
        this.state = 'emerging'; // States: emerging, approaching, hovering, attacking
        this.stateChangeTime = performance.now();
        
        // Get configuration parameters
        if (config) {
            // Movement speeds - DRAMATICALLY INCREASED for immediate engagement
            this.movementProfile = config.movementProfile || {
                emerging: 3.5,    // Much faster emergence (was 2.2)
                approach: 2.5,    // Much faster approach (was 1.5)
                hover: 1.2        // Faster hovering (was 0.9)
            };
            
            // Distance parameters
            this.distanceProfile = config.distanceProfile || {
                optimal: 30,
                margin: 10,
                emerge: 80
            };
            
            // Hover parameters
            this.hoverProfile = config.hoverProfile || {
                yOffset: 0,
                yVariation: 20,
                bobAmount: 5,
                orbitSpeed: 0.01
            };
            
            // Projectile configuration
            this.projectileConfig = config.projectile || {
                speed: 0.5,
                size: 2.0,      // Much larger size for better visibility
                color: 0x00ffff, // Bright cyan color for high contrast visibility
                spin: true       // Flag to enable special spinning animation
            };
        } else {
            // Default values if config is missing
            this.movementProfile = { emerging: 2.2, approach: 1.5, hover: 0.9 };
            this.distanceProfile = { optimal: 30, margin: 10, emerge: 80 };
            this.hoverProfile = { yOffset: 0, yVariation: 20, bobAmount: 5, orbitSpeed: 0.01 };
            this.projectileConfig = { speed: 0.5, size: 0.6, color: 0xff5500, spin: true };
        }
        
        // Initialize state-specific parameters
        this.baseSpeed = this.params.speed;
        this.updateSpeedForState('emerging');
        
        // Create UFO "personality" traits for more unique behavior
        this.personality = {
            // Aggression affects orbit distance (0-1)
            aggression: 0.3 + Math.random() * 0.7,
            // Erratic movement (0-1)
            erratic: Math.random(),
            // Attack frequency multiplier (0.7-1.3)
            attackFrequency: 0.7 + Math.random() * 0.6
        };
        
        // Hovering behavior with more randomization
        this.orbitDirection = Math.random() > 0.5 ? 1 : -1; // Clockwise or counter-clockwise
        
        // Use personality to affect hover parameters
        this.hoverY = this.hoverProfile.yOffset + (Math.random() - 0.5) * this.hoverProfile.yVariation * 2;
        
        // More aggressive UFOs orbit faster and closer
        const aggressionFactor = 1 + this.personality.aggression;
        this.orbitSpeed = this.hoverProfile.orbitSpeed * aggressionFactor; 
        
        // Randomize shoot interval based on personality
        this.params.shootInterval = this.params.shootInterval / this.personality.attackFrequency;
        
        // Animation
        this.rotationSpeed = {
            x: 0, // Keep level on x-axis
            y: 0.02 * this.orbitDirection, // Rotate on y-axis based on orbit direction
            z: 0.005 * this.orbitDirection // Slight z-axis tilt while moving
        };
        
        // Track if this UFO has attacked the player yet (for first attack delay)
        this.hasAttacked = false;
    }
    
    /**
     * Create the UFO mesh
     */
    createEnemy() {
        console.log("createEnemy called")
        // Use GeometryFactory to create UFO mesh with proper params
        this.mesh = GeometryFactory.createEnemyMesh('ufo', {
            size: this.params.size,
            color: this.params.color
        });
        
        // Set position
        this.mesh.position.copy(this.position);
        
        // Reference to this instance for collision detection
        //this.mesh.userData.enemyInstance = this;
        
        // No longer adding to scene - EnemyManager will handle that
        // this.scene.add(this.mesh);
        
        // Play UFO engine sound
        soundManager.playUFOEngine();
    }
    
    /**
     * UFO-specific update behavior - overrides parent's update method
     * @param {number} deltaTime 
     * @param {THREE.Vector3} playerPosition 
     * @returns {boolean} Whether the UFO is still active
     */
    update(deltaTime, playerPosition) {
        if (!this.mesh) return false;
        
        // Initialize dimensional instability properties if not already set
        if (this.dimensionalPhase === undefined) {
            this.dimensionalPhase = Math.random() * Math.PI * 2; // Random starting phase
            this.glitchIntensity = 0.7 + Math.random() * 0.3; // Randomize intensity (0.7-1.0)
            this.glitchSpeed = 0.004 + Math.random() * 0.003; // Random speed (0.004-0.007)
            this.lastGlitchTime = performance.now();
            this.glitchDuration = 0;
            this.isVisible = true;
        }
        
        // Update dimensional glitch effect
        this.updateDimensionalGlitch();
        
        // Update target information
        this.updateTargetInfo(playerPosition);
        
        // Manage state transitions
        this.updateState();
        
        // Execute current behavior based on state
        this.executeBehavior(deltaTime, playerPosition);
        
        // Apply movement
        this.updateMovement(deltaTime);
        
        // Check world boundaries
        this.checkBoundaries();
        
        // Update shooting regardless of state
        this.updateWeapon(deltaTime, playerPosition);
        
        // Play periodic UFO sound effect
        this.updateSoundEffects();
        
        return true;
    }
    
    /**
     * Play UFO sound effect at regular intervals
     */
    updateSoundEffects() {
        const now = performance.now();
        
        if (now - this.lastSoundEffectTime > this.soundEffectInterval) {
            // Play the UFO engine sound
            soundManager.playUFOEngine(this.uniqueId);
            
            // Update last sound time
            this.lastSoundEffectTime = now;
        }
    }
    
    /**
     * Create a dimensional glitch effect by toggling visibility
     */
    updateDimensionalGlitch() {
        const now = performance.now();
        const timeSinceLastGlitch = now - this.lastGlitchTime;
        
        // If we're in a glitch period
        if (this.glitchDuration > 0) {
            this.glitchDuration -= timeSinceLastGlitch;
            
            // End of glitch period
            if (this.glitchDuration <= 0) {
                this.isVisible = true;
                this.mesh.visible = true;
                this.glitchDuration = 0;
            }
        } 
        // Not in a glitch, check if we should start one
        else {
            // Base flicker on a sinusoidal pattern with some randomness
            const flickerValue = Math.sin(now * this.glitchSpeed + this.dimensionalPhase);
            
            // Add randomness to make it less predictable
            if (flickerValue > 0.7 && Math.random() < this.glitchIntensity * 0.2) {
                // Start a glitch
                this.isVisible = !this.isVisible;
                this.mesh.visible = this.isVisible;
                
                // Set glitch duration - shorter for visibility off, longer for on
                this.glitchDuration = this.isVisible ? 
                    100 + Math.random() * 400 : // 100-500ms for visible
                    50 + Math.random() * 150;   // 50-200ms for invisible
            }
        }
        
        this.lastGlitchTime = now;
    }
    
    /**
     * Execute the current behavior strategy based on state
     * @param {number} deltaTime 
     * @param {THREE.Vector3} playerPosition 
     */
    executeBehavior(deltaTime, playerPosition) {
        switch (this.state) {
            case 'emerging':
                this.emergeFromEdge(playerPosition);
                break;
            case 'approaching':
                this.approachPlayer(playerPosition);
                break;
            case 'hovering':
                this.hoverAroundPlayer(playerPosition);
                break;
            case 'attacking':
                this.attackPlayer(playerPosition);
                break;
        }
    }
    
    /**
     * Update UFO state based on distance and time
     */
    updateState() {
        const now = performance.now();
        const stateAge = now - this.stateChangeTime;
        
        switch (this.state) {
            case 'emerging':
                // Minimal emergence time for immediate player engagement
                if (stateAge > 500) { // Just 0.5 seconds in emerging state (was 1 second)
                    this.setState('approaching');
                }
                break;
                
            case 'approaching':
                // If we're at optimal distance, switch to hovering
                if (this.targetDistance < this.distanceProfile.optimal + this.distanceProfile.margin) {
                    this.setState('hovering');
                }
                break;
                
            case 'hovering':
                // More aggressive UFOs attack more frequently
                // Personality-based attack timing
                const initialAttackDelay = this.hasAttacked ? 
                    3000 / this.personality.attackFrequency : // Reduced subsequent attack delay (was 5000)
                    5000 / this.personality.attackFrequency;  // Reduced initial attack delay (was 8000)
                
                // Varying attack probability based on personality
                const attackProbability = 0.01 * this.personality.attackFrequency;
                
                // Occasionally switch to attack mode
                if (stateAge > initialAttackDelay && Math.random() < attackProbability) {
                    this.setState('attacking');
                    this.hasAttacked = true; // Mark that we've done our first attack
                }
                break;
                
            case 'attacking':
                // Attack duration varies based on personality
                const attackDuration = 2000 + (this.personality.aggression * 2000); // 2-4 seconds
                
                if (stateAge > attackDuration) {
                    this.setState('hovering');
                }
                break;
        }
    }
    
    /**
     * Set new state with timestamp
     * @param {string} newState - The new state to set
     */
    setState(newState) {
        this.state = newState;
        this.stateChangeTime = performance.now();
        
        // Update speed based on new state
        this.updateSpeedForState(newState);
        
        console.log(`UFO state changed to: ${newState}`);
    }
    
    /**
     * Update speed multiplier based on current state
     * @param {string} state - Current state
     */
    updateSpeedForState(state) {
        switch (state) {
            case 'emerging':
                this.params.speed = this.baseSpeed * this.movementProfile.emerging;
                break;
            case 'approaching':
                this.params.speed = this.baseSpeed * this.movementProfile.approach;
                break;
            case 'hovering':
            case 'attacking':
                this.params.speed = this.baseSpeed * this.movementProfile.hover;
                break;
        }
    }
    
    /**
     * Emerge from edge behavior - aggressively enters toward the player
     * @param {THREE.Vector3} playerPosition 
     */
    emergeFromEdge(playerPosition) {
        // Calculate direction vector toward player
        const direction = new THREE.Vector3().subVectors(
            playerPosition,
            this.mesh.position
        ).normalize();
        
        // Calculate distance from player
        const distanceFromPlayer = this.mesh.position.distanceTo(playerPosition);
        
        // Always use maximum speed for emergence - extremely aggressive approach
        const speedMultiplier = this.params.speed * 1.5; // Extra boost on top of already increased speed
            
        // Move directly toward player - no drift for most direct approach
        this.velocity.copy(direction).multiplyScalar(speedMultiplier);
        
        // Only add minimal drift for visual interest
        // Reduced to 20% of previous drift values
        this.velocity.x += (Math.random() - 0.5) * 0.01;
        this.velocity.y += (Math.random() - 0.5) * 0.01;
        this.velocity.z += (Math.random() - 0.5) * 0.01;
        
        // Tilt based on movement direction
        this.mesh.lookAt(playerPosition);
    }
    
    /**
     * Approach the player behavior
     * @param {THREE.Vector3} playerPosition 
     */
    approachPlayer(playerPosition) {
        const direction = new THREE.Vector3().subVectors(
            playerPosition,
            this.mesh.position
        ).normalize();
        
        // Move toward player
        this.velocity.copy(direction).multiplyScalar(this.params.speed);
        
        // Adjust altitude gradually toward hover height
        const currentY = this.mesh.position.y;
        const targetY = playerPosition.y + this.hoverY;
        this.velocity.y += (targetY - currentY) * 0.01;
        
        // Face toward player
        this.mesh.lookAt(playerPosition);
    }
    
    /**
     * Hover around player behavior
     * @param {THREE.Vector3} playerPosition 
     */
    hoverAroundPlayer(playerPosition) {
        // Create a direction to target
        const direction = new THREE.Vector3().subVectors(
            playerPosition,
            this.mesh.position
        );
        
        // Get current distance
        const distance = direction.length();
        direction.normalize();
        
        // Calculate orbit vector (perpendicular to direction)
        const up = new THREE.Vector3(0, 1, 0);
        const orbitVector = new THREE.Vector3().crossVectors(direction, up).normalize();
        orbitVector.multiplyScalar(this.orbitDirection); // Apply orbit direction
        
        // Calculate radial vector (toward or away from player)
        const radialVector = direction.clone();
        
        // Personalized distance - aggressive UFOs stay closer
        const personalOptimalDistance = this.distanceProfile.optimal * (1.5 - this.personality.aggression * 0.5);
        
        // Distance management with personality-based preferences
        let radialStrength = 0;
        if (distance > personalOptimalDistance + this.distanceProfile.margin) {
            // Too far, move closer
            radialStrength = 0.5 + (this.personality.aggression * 0.3);
        } else if (distance < personalOptimalDistance - this.distanceProfile.margin) {
            // Too close, move away
            radialStrength = -0.5;
        }
        
        // Apply vertical bobbing motion using sine wave
        const time = performance.now() * 0.001;
        // More erratic UFOs have more varied bobbing
        const bobFrequency = 1 + (this.personality.erratic * 2);
        const bobAmount = this.hoverProfile.bobAmount * (1 + this.personality.erratic);
        const bobOffset = Math.sin(time * bobFrequency) * bobAmount * 0.01;
        
        // Add some erratic behavior for high erratic UFOs
        let erraticX = 0, erraticY = 0, erraticZ = 0;
        if (this.personality.erratic > 0.6) {
            erraticX = (Math.sin(time * 2.7) * this.personality.erratic * 0.03);
            erraticY = (Math.cos(time * 3.1) * this.personality.erratic * 0.03);
            erraticZ = (Math.sin(time * 2.3) * this.personality.erratic * 0.03);
        }
        
        // Combine vectors into final velocity
        this.velocity.copy(orbitVector).multiplyScalar(this.params.speed);
        this.velocity.add(radialVector.multiplyScalar(radialStrength * this.params.speed));
        this.velocity.y += bobOffset;
        
        // Add erratic movement if applicable
        this.velocity.x += erraticX;
        this.velocity.y += erraticY;
        this.velocity.z += erraticZ;
        
        // Orient UFO to face slightly toward player but tilted for movement
        const lookPosition = new THREE.Vector3().addVectors(
            this.mesh.position,
            direction.multiplyScalar(2).add(this.velocity)
        );
        this.mesh.lookAt(lookPosition);
    }
    
    /**
     * Attack player behavior
     * @param {THREE.Vector3} playerPosition 
     */
    attackPlayer(playerPosition) {
        // Similar to hover but more aggressive
        // Create a direction to target
        const direction = new THREE.Vector3().subVectors(
            playerPosition,
            this.mesh.position
        );
        
        // Get current distance
        const distance = direction.length();
        direction.normalize();
        
        // Personality-influenced attack patterns
        const time = performance.now() * 0.003;
        
        // More aggressive UFOs have sharper, faster zigzags
        const zigzagSpeed = 1 + (this.personality.aggression * 1.5);
        const zigzagX = Math.sin(time * zigzagSpeed) * (0.3 + this.personality.aggression * 0.4);
        const zigzagZ = Math.cos(time * zigzagSpeed * 1.5) * (0.3 + this.personality.aggression * 0.4);
        
        // Create zigzag vector perpendicular to direction
        const up = new THREE.Vector3(0, 1, 0);
        const perpVector = new THREE.Vector3().crossVectors(direction, up).normalize();
        perpVector.multiplyScalar(zigzagX);
        
        // Create vertical zigzag
        const vertVector = new THREE.Vector3(0, zigzagZ, 0);
        
        // Erratic UFOs have additional unpredictable movement
        let erraticVector = new THREE.Vector3(0, 0, 0);
        if (this.personality.erratic > 0.5) {
            // Create more chaotic movement pattern for high erratic UFOs
            erraticVector.set(
                Math.sin(time * 3.7) * this.personality.erratic * 0.3,
                Math.cos(time * 4.3) * this.personality.erratic * 0.3,
                Math.sin(time * 5.1) * this.personality.erratic * 0.3
            );
        }
        
        // Distance management - attack from personality-based optimal distance
        let approachStrength = 0;
        // Aggressive UFOs attack from closer distance
        const attackDistance = this.distanceProfile.optimal * (1.2 - this.personality.aggression * 0.4);
        
        if (distance > attackDistance + 5) {
            // Too far, move closer - aggressive UFOs approach faster
            approachStrength = 0.7 + (this.personality.aggression * 0.3);
        } else if (distance < attackDistance - 5) {
            // Too close, move away
            approachStrength = -0.7;
        }
        
        // Combine vectors for attack movement
        this.velocity.copy(direction).multiplyScalar(approachStrength * this.params.speed);
        this.velocity.add(perpVector.multiplyScalar(this.params.speed));
        this.velocity.add(vertVector.multiplyScalar(this.params.speed));
        this.velocity.add(erraticVector.multiplyScalar(this.params.speed));
        
        // Face player directly during attack
        this.mesh.lookAt(playerPosition);
    }
    
    /**
     * Override updateWeapon to use UFO specific shooting behavior
     * @param {number} deltaTime 
     * @param {THREE.Vector3} playerPosition 
     */
    updateWeapon(deltaTime, playerPosition) {
        // Check if it's time to shoot
        const now = performance.now();
        
        // Only shoot in hovering or attacking states
        if ((this.state === 'hovering' || this.state === 'attacking')) {
            // Personality affects shooting behavior
            const timeElapsed = now - this.lastShotTime;
            
            // Randomize shoot interval slightly to make UFOs less predictable
            // and avoid all UFOs shooting at once
            const intervalVariation = 0.9 + (Math.random() * 0.2); // ±10% random variation
            const currentInterval = this.params.shootInterval * intervalVariation;
            
            if (timeElapsed > currentInterval) {
                // Aggressive UFOs shoot from farther away
                const shootRange = 120 + (this.personality.aggression * 60); // 120-180 units
                
                // Only shoot if player is within personality-based range
                if (this.targetDistance < shootRange) {
                    this.shoot(playerPosition);
                    this.lastShotTime = now;
                    
                    // If we're hovering, switch to attacking briefly
                    if (this.state === 'hovering') {
                        this.setState('attacking');
                    }
                }
            }
        }
    }
    
    /**
     * Handle UFO shooting using the enemyManager reference
     * @param {THREE.Vector3} targetPosition 
     */
    shoot(targetPosition) {
        // Validate targetPosition
        if (!targetPosition || !(targetPosition instanceof THREE.Vector3)) {
            console.error('UFO.shoot called with invalid targetPosition:', targetPosition);
            return;
        }
        
        // Calculate position and direction for the projectile
        const ufoPosition = this.mesh.position.clone();
        const direction = new THREE.Vector3().subVectors(targetPosition, ufoPosition).normalize();
        
        // Check if we have a reference to enemyManager from the Enemy base class
        if (this.enemyManager) {
            // Create projectile configuration 
            const projectileConfig = {
                position: ufoPosition.clone(),
                direction: direction.clone(),
                speed: this.projectileConfig.speed || 1.2, // Faster speed for better visibility
                color: this.projectileConfig.color || 0x00ffff, // Bright cyan
                size: this.projectileConfig.size || 2.0, // Larger size
                spin: true,
                enemyType: 'ufo'
            };
            
            // Call the enemyManager's createEnemyProjectile method directly
            this.enemyManager.createEnemyProjectile(projectileConfig);
        } else {
            // If no enemyManager reference, log a critical error
            console.error('UFO has no enemyManager reference!');
        }
        
        // Play the UFO laser sound
        soundManager.playUFOLaser();
    }
    
    // Removed setShootCallback method - we now use enemyManager directly
    
    
    /**
     * Override destroy to play UFO-specific explosion sound
     */
    destroy() {
        // Play the UFO explosion sound directly
        soundManager.playUFOExplosion();
        
        // Call parent destroy which will call remove() at the end
        super.destroy();
    }
    
    /**
     * Static method to create a UFO at a given position
     * @param {Object} scene - The THREE.js scene
     * @param {THREE.Vector3} position - Position to create the UFO
     * @param {Object} [params={}] - Optional parameters for UFO behavior
     * @returns {UFO} The created UFO instance
     */
    static create(scene, position, params = {}) {
        const ufo = new UFO(scene, position, params);
        return ufo;
    }
}

export default UFO;