/**
 * SphereBoss.js - Sphere boss implementation
 * 
 * A boss in the shape of a sphere that has 4 phases:
 * - Phase 1: Basic attacks
 * - Phase 2: Faster movement, increased attack frequency
 * - Phase 3: Multiple projectiles
 * - Phase 4: Rapid fire with maximum aggression
 * 
 * Each hit causes torus knot ores to drop, with a large explosion on death
 */

import Boss from './Boss.js';
import GeometryFactory from '../shapes/GeometryFactory';
//import { playSound } from '../../managers/SoundManager';

class SphereBoss extends Boss {
    constructor(scene, position = new THREE.Vector3(), params = {}) {
        // Set specific boss type
        params.type = 'sphereBoss';
        
        // Call parent constructor with the position and params FIRST
        super(scene, position, params);
        
        // AFTER calling super(), we can use this
        // Store camera reference if provided
        this.playerCamera = params.playerCamera || null;
        
        // No need for initial positioning flag - positioning happens during regular updates
        
        console.log(`SphereBoss created - will position itself during first update`);
    }
    
    /**
     * This function should be about the boss creating enemies to pursue the player
     */
    createEnemy() {
        // Use the configured position from the parameters
        // This position comes from levelConfig.bossConfig.position in Game.js
        let spawnPosition = this.position.clone();
        
        // If no position was specified, use a default position
        if (this.position.length() === 0) {
            spawnPosition.set(0, 0, -70);
            console.log("No position specified, using default boss position");
        }
        
        console.log(`Creating SphereBoss with size ${this.params.size} at position ${spawnPosition.x.toFixed(1)}, ${spawnPosition.y.toFixed(1)}, ${spawnPosition.z.toFixed(1)}`);
        
        // Use a simple wireframe sphere to avoid shader issues
        const geometry = new THREE.IcosahedronGeometry(this.params.size, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: this.params.color || 0xff0000,
            wireframe: true
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Position the mesh at the spawn position
        this.mesh.position.copy(spawnPosition);
        
        // Store reference for collision detection
        //this.mesh.userData.enemyInstance = this;
        
        // Add to scene
        this.scene.add(this.mesh);
        
        //console.log(`Sphere boss created with ${this.params.health} health`);
        return this.mesh;
    }
    
    /**
     * Add spikes to the boss - simplified for debugging
     */
    addSpikes() {
        // Skip adding spikes for simpler rendering
        console.log(`Skipping spikes for simplified boss rendering`);
    }
    
    /**
     * Update sphere-boss specific behavior
     * @param {THREE.Vector3} playerPosition - Player's current position
     */
    updateBossSpecific(playerPosition) {
        if (!this.mesh) return;
        
        // Get current phase to determine specific sphere boss behavior
        const currentPhase = this.phase;
        
        // For Phase 3 and 4, we ONLY want to update appearance, not movement
        // Movement for these phases is handled entirely in executeBehavior
        if (currentPhase === 3 || currentPhase === 4) {
            // ONLY update appearance, skip movement completely for Phase 3 and 4
            this.updatePhaseAppearance(currentPhase);
            
            // Log for debugging - helps us see that we're avoiding the conflict
            const now = Date.now();
            if (!this.lastPhaseLog || now - this.lastPhaseLog > 5000) { // Every 5 seconds
                console.log(`SphereBoss in Phase ${currentPhase} - CUSTOM MOVEMENT ACTIVE - Distance from player: ${this.getDistanceToPlayer(playerPosition).toFixed(1)}`);
                this.lastPhaseLog = now;
            }
            return;
        }
        
        // For phases 1 and 2, use the standard movement logic
        this.updatePhaseMovement(currentPhase, playerPosition);
        
        // Apply phase-specific visual appearance for all phases
        this.updatePhaseAppearance(currentPhase);
        
        // Log less frequently to avoid console spam
        const now = Date.now();
        if (!this.lastPhaseLog || now - this.lastPhaseLog > 5000) { // Every 5 seconds
            console.log(`SphereBoss in Phase ${currentPhase} - Distance from player: ${this.getDistanceToPlayer(playerPosition).toFixed(1)}`);
            this.lastPhaseLog = now;
        }
    }
    
    /**
     * Update boss movement based on current phase
     * @param {number} phase - Current boss phase
     * @param {THREE.Vector3} playerPosition - Player's position
     */
    updatePhaseMovement(phase, playerPosition) {
        // CRITICAL: Skip this method entirely for Phase 3 and Phase 4
        // These phases have their own movement logic in executeBehavior
        if (phase === 3 || phase === 4) {
            console.log(`MOVEMENT CONFLICT AVOIDED: updatePhaseMovement skipped for Phase ${phase}`);
            return;
        }
        
        // Get phase-specific movement parameters
        const phaseParams = this.getCurrentPhaseParams();
        const behavior = phaseParams.behavior || 'keepDistance';
        
        switch(behavior) {
            case 'keepDistance':
                this.keepDistanceFromPlayer(playerPosition);
                break;
            case 'orbit':
                this.orbitAroundPlayer(playerPosition);
                break;
            case 'charge':
                this.bullChargePattern(playerPosition);
                break;
            case 'aggressive':
                // More aggressive behavior
                if (Math.random() < phaseParams.approachFrequency) {
                    this.chargeAtPlayer(playerPosition);
                } else {
                    this.orbitAroundPlayer(playerPosition);
                }
                break;
            default:
                // Default behavior - just maintain distance
                this.keepDistanceFromPlayer(playerPosition);
        }
    }
    
    /**
     * Update boss appearance based on current phase
     * @param {number} phase - Current boss phase
     */
    updatePhaseAppearance(phase) {
        if (!this.mesh.material) return;
        
        // Update color based on phase
        switch(phase) {
            case 1:
                // Blue in phase 1
                this.mesh.material.color.set(0x00ffff);
                break;
            case 2:
                // Orange in phase 2
                this.mesh.material.color.set(0xff8800);
                break;
            case 3:
                // Yellow in phase 3
                this.mesh.material.color.set(0xffff00);
                break;
            case 4:
                // White in phase 4 (changed back to white for better visibility)
                this.mesh.material.color.set(0xffffff);
                break;
        }
    }
    
    /**
     * Maintain optimal distance from player (Phase 1 behavior)
     * @param {THREE.Vector3} playerPosition - Player's position
     */
    keepDistanceFromPlayer(playerPosition) {
        if (!this.mesh || !this.playerCamera) return;
        
        // Get optimal distance from config
        const optimalDistance = this.params.distanceProfile?.optimal || 150;
        const margin = this.params.distanceProfile?.margin || 30;
        
        // Get player direction from camera
        const playerDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerCamera.quaternion);
        
        // Calculate current distance to player
        const currentDistance = this.getDistanceToPlayer(playerPosition);
        
        // Calculate ideal position at optimal distance from player
        const targetPosition = playerPosition.clone().add(
            playerDirection.clone().multiplyScalar(optimalDistance)
        );
        
        // Only adjust if we're outside the acceptable range
        if (Math.abs(currentDistance - optimalDistance) > margin) {
            // Move gradually toward the target position (smooth movement)
            const moveSpeed = 0.05; // Adjust for faster/slower movement
            this.mesh.position.lerp(targetPosition, moveSpeed);
        } else {
            // Add slight random movement when in optimal position for visual interest
            this.mesh.position.x += (Math.random() - 0.5) * 0.1;
            this.mesh.position.y += (Math.random() - 0.5) * 0.1;
            this.mesh.position.z += (Math.random() - 0.5) * 0.1;
        }
    }
    
    /**
     * Orbit around the player with periodic stops in front (Phase 2 behavior)
     * @param {THREE.Vector3} playerPosition - Player's position
     */
    orbitAroundPlayer(playerPosition) {
        if (!this.mesh) return;
        
        // Get orbit parameters from config
        const orbitDistance = this.params.phases?.[this.phase]?.orbitDistance || 150;
        const orbitSpeed = this.params.phases?.[this.phase]?.orbitSpeed || 0.05;
        
        // Initialize orbit state variables if not already set
        if (!this.orbitState) {
            this.orbitState = {
                angle: 0,
                state: 'orbiting',
                timer: 0,
                verticalOffset: 0,
                verticalDirection: 1
            };
            
            // Calculate initial angle based on current position
            const vectorToPlayer = new THREE.Vector3().subVectors(this.mesh.position, playerPosition);
            this.orbitState.angle = Math.atan2(vectorToPlayer.x, vectorToPlayer.z);
        }
        
        // Update vertical motion - subtle up and down movement
        this.orbitState.verticalOffset += 0.1 * this.orbitState.verticalDirection;
        if (Math.abs(this.orbitState.verticalOffset) > 15) {
            // Reverse direction when we reach max offset
            this.orbitState.verticalDirection *= -1;
        }
        
        // State machine for orbital behavior
        switch (this.orbitState.state) {
            case 'orbiting':
                // Normal orbiting state - increment angle at full speed
                this.orbitState.angle += orbitSpeed;
                
                // Check if we're approaching the front of the player (cos near 1)
                // This is where the boss would be directly in front of the player
                if (Math.cos(this.orbitState.angle) > 0.95) {
                    this.orbitState.state = 'slowing';
                    console.log("Boss slowing down in front of player");
                }
                break;
                
            case 'slowing':
                // Gradually slow down as we approach the front
                this.orbitState.angle += orbitSpeed * 0.5;
                
                // Once we're exactly in front, stop
                if (Math.cos(this.orbitState.angle) > 0.99) {
                    this.orbitState.state = 'stopped';
                    this.orbitState.timer = 0;
                    console.log("Boss stopped in front of player");
                }
                break;
                
            case 'stopped':
                // Stay stopped for a moment (would be firing here in the future)
                this.orbitState.timer++;
                
                // Original value: Stay stopped for about 2 seconds (60 frames at 30fps)
                // Extended value: Stay stopped for about 4 seconds (120 frames at 30fps) for easier testing
                const stopDuration = 120; // Increased from 60 for longer pause
                
                if (this.orbitState.timer > stopDuration) {
                    this.orbitState.state = 'resuming';
                    console.log("Boss resuming orbit");
                }
                break;
                
            case 'resuming':
                // Gradually speed back up
                this.orbitState.angle += orbitSpeed * 0.2;
                this.orbitState.timer++;
                
                // Original value: Resume over 90 frames
                // Extended value: Resume over 120 frames to match longer stop
                const resumeDuration = 120; // Increased from 90 for longer transition
                
                // Increase speed over time until back to full
                if (this.orbitState.timer > resumeDuration) {
                    this.orbitState.state = 'orbiting';
                    console.log("Boss back to full orbital speed");
                }
                break;
        }
        
        // Calculate new position using circular motion in the XZ plane
        const newX = playerPosition.x + Math.sin(this.orbitState.angle) * orbitDistance;
        const newZ = playerPosition.z + Math.cos(this.orbitState.angle) * orbitDistance;
        
        // Apply Y position with player height plus subtle vertical motion
        const newY = playerPosition.y + this.orbitState.verticalOffset;
        
        // Set position directly
        this.mesh.position.set(newX, newY, newZ);
        
        // Add rotation to the boss - faster rotation when orbiting, slower when stopped
        if (this.mesh.rotation) {
            let rotationSpeed = 0;
            
            switch (this.orbitState.state) {
                case 'orbiting':
                    rotationSpeed = orbitSpeed * 0.8;
                    break;
                case 'slowing':
                    rotationSpeed = orbitSpeed * 0.4;
                    break;
                case 'stopped':
                    rotationSpeed = orbitSpeed * 0.1;
                    break;
                case 'resuming':
                    rotationSpeed = orbitSpeed * 0.2 + (this.orbitState.timer / 90) * orbitSpeed * 0.6;
                    break;
            }
            
            this.mesh.rotation.y += rotationSpeed;
        }
    }
    
    /**
     * Override parent's executeBehavior to handle Phase 3 and Phase 4 behaviors
     * This prevents conflicts with the Boss.js executeBehavior method
     */
    executeBehavior(deltaTime, playerPosition) {
        // Special handling for Phase 3
        if (this.phase === 3) {
            // ONLY use our bullChargePattern in Phase 3
            console.log("Using Phase 3 charge pattern - WAIT + CHARGE cycle");
            
            // Make sure we're not interrupted by any other behavior
            this.bullChargePattern(playerPosition);
            return; // Skip parent's executeBehavior completely
        }
        
        // Special handling for Phase 4
        if (this.phase === 4) {
            // Use continuous orbit pattern in Phase 4
            console.log("Using Phase 4 continuous orbit pattern");
            
            // Call our continuous orbit method
            this.continuousOrbitPattern(playerPosition);
            return; // Skip parent's executeBehavior
        }
        
        // For phases 1 and 2, use the parent's behavior
        console.log(`Using standard behavior for Phase ${this.phase}`);
        super.executeBehavior(deltaTime, playerPosition);
    }
    
    /**
     * Continuous orbit pattern for Phase 4
     * Similar to Phase 2 orbit but without stopping and slightly slower
     * @param {THREE.Vector3} playerPosition - Player's position
     */
    continuousOrbitPattern(playerPosition) {
        if (!this.mesh) return;
        
        // We'll ignore the small movement conflicts for now, as they don't appear to be
        // significantly affecting our orbit behavior. The orbit is stable enough despite 
        // the small differences we were seeing in the logs.
        
        // Initialize orbit state if needed
        if (!this.phase4Orbit) {
            this.phase4Orbit = {
                angle: 0,
                verticalOffset: 0,
                verticalDirection: 1,
                initialTime: Date.now() // Track when Phase 4 started
            };
            console.log("Phase 4 continuous orbit initialized");
        }
        
        // Get orbit parameters (much larger radius and slower speed)
        const orbitDistance = 400; // Increased from 180 to 400 (more than doubled)
        const orbitSpeed = 0.01;   // Slowed down for more stately movement
        
        // Initialize additional orbit parameters if needed
        if (this.phase4Orbit.tiltAngle === undefined) {
            this.phase4Orbit.tiltAngle = 0;
            this.phase4Orbit.tiltSpeed = 0.005; // Slow tilt change for 3D orbit
            this.phase4Orbit.tiltAmount = Math.PI / 5; // ~36 degrees tilt
        }
        
        // Update vertical oscillation for more dramatic movement
        this.phase4Orbit.verticalOffset += 0.06 * this.phase4Orbit.verticalDirection;
        if (Math.abs(this.phase4Orbit.verticalOffset) > 40) {
            // Increased vertical range to 40 units
            this.phase4Orbit.verticalDirection *= -1;
        }
        
        // Update orbit angles continuously (no stopping)
        this.phase4Orbit.angle += orbitSpeed;
        this.phase4Orbit.tiltAngle += this.phase4Orbit.tiltSpeed;
        
        // Calculate 3D orbit position using spherical coordinates
        // This creates a more complex orbit path that isn't just a flat circle
        
        // Basic horizontal orbit components
        const horizontalAngle = this.phase4Orbit.angle;
        
        // Apply tilt for 3D motion (creates an orbital wobble)
        const tiltEffect = Math.sin(this.phase4Orbit.tiltAngle) * this.phase4Orbit.tiltAmount;
        
        // Calculate 3D position with tilt
        const newX = playerPosition.x + Math.sin(horizontalAngle) * orbitDistance * Math.cos(tiltEffect);
        const newZ = playerPosition.z + Math.cos(horizontalAngle) * orbitDistance * Math.cos(tiltEffect);
        
        // Add vertical component that combines bobbing and orbit tilt
        const tiltHeight = Math.sin(tiltEffect) * orbitDistance * 0.4; // Vertical component of orbit
        const newY = playerPosition.y + this.phase4Orbit.verticalOffset + tiltHeight;
        
        // Set position directly
        this.mesh.position.set(newX, newY, newZ);
        
        // Add complex rotation for visual effect - faster and more dynamic
        if (this.mesh.rotation) {
            // Faster rotation to be more visible at the greater distance
            this.mesh.rotation.y += 0.03; // Primary rotation axis
            this.mesh.rotation.x += 0.015; // Secondary axis rotation 
            this.mesh.rotation.z += 0.01; // Tertiary axis for more complex rotation
        }
        
        // Log position occasionally
        if (!this.debugCounter) this.debugCounter = 0;
        this.debugCounter++;
        
        if (this.debugCounter % 60 === 0) {
            // Calculate current distance to player
            const distToPlayer = this.mesh.position.distanceTo(playerPosition);
            const timeInPhase4 = (Date.now() - this.phase4Orbit.initialTime) / 1000; // seconds
            console.log(`PHASE 4 ORBIT: Time: ${timeInPhase4.toFixed(1)}s, Angle: ${this.phase4Orbit.angle.toFixed(2)}, Distance to player: ${distToPlayer.toFixed(1)}`);
        }
        
        // We removed the lastPhase4Position tracking code earlier but forgot to remove this line
        // Removing it now to fix the error
    }
    
    /**
     * Override parent's checkBoundaries to allow boss to move beyond normal wrap distance during charges
     * and to prevent boundary checking from interfering with custom movement in Phase 4
     */
    checkBoundaries() {
        // In Phase 3 with charging behavior, we want to allow going beyond boundaries
        // In Phase 4, we want to fully control position via orbit logic
        if (this.phase === 3 || this.phase === 4) {
            // Log that we're skipping boundary check 
            if (Math.random() < 0.01) { // Only log occasionally (1% of frames)
                console.log(`BOUNDARY CHECK BYPASSED: Phase ${this.phase} boss has custom positioning logic`);
                
                if (this.mesh && this.mesh.position) {
                    const distFromOrigin = this.mesh.position.length();
                    console.log(`Current distance from origin: ${distFromOrigin.toFixed(1)}`);
                }
            }
            return; // Skip boundary check completely for Phase 3 and 4
        } else {
            // For other phases, use normal boundary checking from parent
            super.checkBoundaries();
        }
    }

    /**
     * Ultra-simplified charge pattern for Phase 3
     * The boss alternates between waiting at edges and charging
     * @param {THREE.Vector3} playerPosition - Player's position
     */
    bullChargePattern(playerPosition) {
        if (!this.mesh) return;
        
        // Reduced map distance by 50% to make boss easier to hit
        const mapDistance = 437.5;  // 875 * 0.5 (half of the previous distance)
        
        // Initialize charge state if not already set
        if (!this.chargeState) {
            // Start at "waiting" state
            this.chargeState = {
                state: 'waiting',
                waitStartTime: Date.now(),  // Use actual timestamp instead of frame counting
                waitDuration: 2000,         // Wait duration in milliseconds (2 seconds)
                chargeDirection: null,
                // Teleport to edge position immediately when starting Phase 3
                isFirstCycle: true
            };
            console.log("Phase 3 initialized - WAIT-CHARGE cycle begins");
        }
        
        // Log current state periodically
        if (!this.debugCounter) this.debugCounter = 0;
        this.debugCounter++;
        
        if (this.debugCounter % 30 === 0) {
            console.log(`BOSS STATE: ${this.chargeState.state}, Wait Timer: ${this.chargeState.waitTimer}, Distance from center: ${this.mesh.position.length().toFixed(1)}`);
        }
        
        // Super-simple state machine with only TWO states: waiting and charging
        switch (this.chargeState.state) {
            case 'waiting':
                // When waiting, we stay at our current position
                
                // On first cycle, teleport directly to an edge
                if (this.chargeState.isFirstCycle) {
                    this.chargeState.isFirstCycle = false;
                    
                    // Always go behind player on first cycle
                    const playerDirection = (this.playerCamera) 
                        ? new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerCamera.quaternion)
                        : new THREE.Vector3(0, 0, 1);
                    
                    // Position directly behind player (opposite to where they're looking)
                    const edgePosition = playerDirection.clone().multiplyScalar(-1 * mapDistance);
                    edgePosition.y = playerPosition.y; // Match player height
                    
                    // Teleport to edge position
                    this.mesh.position.copy(edgePosition);
                    
                    // Reset wait start time when teleporting
                    this.chargeState.waitStartTime = Date.now();
                    
                    console.log(`BOSS TELEPORTED TO INITIAL EDGE: ${edgePosition.x.toFixed(1)}, ${edgePosition.y.toFixed(1)}, ${edgePosition.z.toFixed(1)}`);
                    console.log(`BOSS WILL WAIT ${this.chargeState.waitDuration/1000} SECONDS BEFORE FIRST CHARGE`);
                }
                
                // Calculate elapsed wait time in milliseconds
                const currentTime = Date.now();
                const elapsedWaitTime = currentTime - this.chargeState.waitStartTime;
                
                // Calculate wait progress as a percentage (0-1)
                const waitProgress = Math.min(elapsedWaitTime / this.chargeState.waitDuration, 1);
                
                // Pulsate while waiting to telegraph the coming charge
                if (this.mesh.scale) {
                    const pulseScale = 1 + Math.sin(waitProgress * Math.PI * 4) * 0.2; // 2 full pulses during wait
                    this.mesh.scale.set(pulseScale, pulseScale, pulseScale);
                }
                
                // Visual indicator - orange during waiting
                if (this.mesh.material) {
                    this.mesh.material.color.set(0xff8800);
                }
                
                // Log remaining wait time occasionally
                if (this.debugCounter % 30 === 0) {
                    const remainingTime = Math.max(0, this.chargeState.waitDuration - elapsedWaitTime);
                    console.log(`BOSS WAITING: ${(remainingTime/1000).toFixed(1)} seconds remaining, Progress: ${(waitProgress*100).toFixed(0)}%`);
                }
                
                // After waiting for the full duration, start charging
                if (elapsedWaitTime >= this.chargeState.waitDuration) {
                    // Record new wait start time for next cycle
                    this.chargeState.waitStartTime = currentTime;
                    
                    // Calculate vector to player
                    const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.mesh.position);
                    
                    // Get distance to player
                    const distanceToPlayer = toPlayer.length();
                    
                    // Calculate time it will take to reach player at our charge speed
                    const chargeSpeed = 3.0; // Same as used in charging state
                    const timeToReachPlayer = distanceToPlayer / chargeSpeed;
                    
                    console.log(`Boss charge will take approximately ${timeToReachPlayer.toFixed(1)} frames to reach player`);
                    
                    // Normalize to get base direction vector to player
                    const directionToPlayer = toPlayer.clone().normalize();
                    
                    // For better targeting, we could predict player movement here if needed
                    // For now, we'll just aim directly at player's current position
                    
                    // Store charge direction pointing exactly at player
                    this.chargeState.chargeDirection = directionToPlayer;
                    
                    // Store player position at charge start (for debugging)
                    this.chargeState.targetPlayerPosition = playerPosition.clone();
                    
                    console.log(`DIRECT TARGETING: Will charge at player from ${distanceToPlayer.toFixed(1)} units away`);
                    
                    // Log the exact player position we're targeting
                    console.log(`BOSS TARGETING PLAYER AT: ${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)}`);
                    
                    // Store target position on the opposite edge
                    // We extend the line from boss through player to the opposite edge
                    this.chargeState.targetEdge = directionToPlayer.clone().multiplyScalar(mapDistance * 2);
                    
                    // Reset scale to normal
                    if (this.mesh.scale) {
                        this.mesh.scale.set(1, 1, 1);
                    }
                    
                    // Switch to charging state
                    this.chargeState.state = 'charging';
                    console.log("BOSS CHARGING! Will travel to opposite edge.");
                }
                break;
                
            case 'charging':
                // When charging, we move in a straight line until we reach the opposite edge
                
                // Visual indicator - red during charge
                if (this.mesh.material) {
                    this.mesh.material.color.set(0xff0000);
                }
                
                // Add forward rotation for visual effect
                if (this.mesh.rotation) {
                    this.mesh.rotation.x += 0.08;
                    this.mesh.rotation.y += 0.05;
                }
                
                // Use a more moderate charge speed so player has less time to dodge
                const chargeSpeed = 3.0;  // Slowed down to make it harder for player to dodge
                const chargeVelocity = this.chargeState.chargeDirection.clone().multiplyScalar(chargeSpeed);
                this.mesh.position.add(chargeVelocity);
                
                // Check if we're getting close to the player during charge
                const currentPos = this.mesh.position.clone();
                const distToPlayer = currentPos.distanceTo(playerPosition);
                
                // Check if we're within "hit" range of the player (15 units is a good collision distance)
                if (distToPlayer < 15) {
                    console.log(`!!!! BOSS HIT PLAYER !!!! Distance: ${distToPlayer.toFixed(1)}`);
                    // Note: The actual collision and damage will be handled by the game's collision system
                    // This is just for debugging to see if we're getting close
                }
                
                // Calculate how far we've traveled along our charge path
                const distanceToTarget = currentPos.distanceTo(this.chargeState.targetEdge);
                
                // Calculate distance to the original target player position when charging started
                const distToOriginalTarget = currentPos.distanceTo(this.chargeState.targetPlayerPosition);
                
                // Log charging progress and distance to player
                if (this.debugCounter % 15 === 0) { // Increased logging frequency to every 15 frames
                    console.log(`CHARGING PROGRESS: Distance to edge: ${distanceToTarget.toFixed(1)}, Position: ${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)}`);
                    console.log(`PLAYER TARGETING: Distance to player: ${distToPlayer.toFixed(1)}, Distance to target point: ${distToOriginalTarget.toFixed(1)}`);
                }
                
                // When we get close to the opposite edge OR we exceed max distance, we stop
                // Using a smaller threshold (25) because the overall distance is smaller
                if (distanceToTarget < 25 || currentPos.length() >= mapDistance * 1.2) {
                    // We've reached the opposite edge, switch back to waiting state
                    this.chargeState.state = 'waiting';
                    
                    // Reset wait start time for the new waiting period
                    this.chargeState.waitStartTime = Date.now();
                    
                    // Stop at the opposite edge (at map distance, in the direction we were traveling)
                    const edgeDirection = currentPos.clone().normalize();
                    const edgePosition = edgeDirection.multiplyScalar(mapDistance);
                    
                    // Set position exactly at the edge
                    this.mesh.position.copy(edgePosition);
                    
                    console.log(`BOSS REACHED OPPOSITE EDGE (distance from origin: ${edgePosition.length().toFixed(1)})`);
                    console.log(`BOSS WILL WAIT ${this.chargeState.waitDuration/1000} SECONDS at position: ${edgePosition.x.toFixed(1)}, ${edgePosition.y.toFixed(1)}, ${edgePosition.z.toFixed(1)}`);
                }
                break;
        }
    }
    
    /**
     * Charge directly at player with higher speed (Phase 4 behavior)
     * @param {THREE.Vector3} playerPosition - Player's position
     */
    chargeAtPlayer(playerPosition) {
        if (!this.mesh) return;
        
        // Initialize charge state if not set
        if (this.chargeState === undefined) {
            this.chargeState = 'preparing';
            this.chargeTimer = 0;
            this.chargeTarget = playerPosition.clone();
        }
        
        // Increment timer
        this.chargeTimer += 1;
        
        // Get charge parameters
        const minDistance = this.params.distanceProfile?.maxApproach || 100;
        const chargeSpeed = this.params.phases?.[this.phase]?.speed * 2 || 1.6; // Even faster charge
        const currentDistance = this.getDistanceToPlayer(playerPosition);
        
        // State machine for charging behavior
        switch(this.chargeState) {
            case 'preparing':
                // Telegraph the charge by pulsating and rotating rapidly
                if (this.mesh.scale) {
                    const pulseScale = 1 + Math.sin(this.chargeTimer * 0.2) * 0.2;
                    this.mesh.scale.set(pulseScale, pulseScale, pulseScale);
                }
                
                if (this.mesh.rotation) {
                    this.mesh.rotation.y += 0.1;
                }
                
                // After preparing for a moment, select target and begin charge
                if (this.chargeTimer > 30) {
                    this.chargeState = 'charging';
                    this.chargeTarget = playerPosition.clone(); // Snapshot player position for charge
                    
                    // Reset scale
                    if (this.mesh.scale) {
                        this.mesh.scale.set(1, 1, 1);
                    }
                    
                    // Log the charge (for debugging)
                    console.log("BOSS CHARGING!");
                }
                break;
                
            case 'charging':
                // Execute the actual charge - very fast movement toward target
                const chargeDirection = new THREE.Vector3().subVectors(this.chargeTarget, this.mesh.position).normalize();
                const chargeVelocity = chargeDirection.multiplyScalar(chargeSpeed);
                
                // Add charge movement
                this.mesh.position.add(chargeVelocity);
                
                // If we reached target or got close to player, go to cooldown
                const targetDistance = this.mesh.position.distanceTo(this.chargeTarget);
                if (targetDistance < 10 || currentDistance < minDistance) {
                    this.chargeState = 'cooldown';
                    this.chargeTimer = 0;
                }
                break;
                
            case 'cooldown':
                // Retreat and cooldown before next charge
                const retreatDir = new THREE.Vector3().subVectors(this.mesh.position, playerPosition).normalize();
                const retreatVel = retreatDir.multiplyScalar(chargeSpeed * 0.5);
                
                // Add retreat movement
                this.mesh.position.add(retreatVel);
                
                // Reset charge state after cooldown period
                if (this.chargeTimer > 60) {
                    this.chargeState = 'preparing';
                    this.chargeTimer = 0;
                }
                break;
        }
    }
    
    /**
     * Helper method to get distance to player
     * @param {THREE.Vector3} playerPosition 
     * @returns {number} Distance to player
     */
    getDistanceToPlayer(playerPosition) {
        if (!this.mesh || !playerPosition) return 0;
        return this.mesh.position.distanceTo(playerPosition);
    }
    
    /**
     * We don't need to override takeDamage anymore - the shake effect
     * is now handled by the parent Boss class
     */
    
    /**
     * Override transition to phase - simplified for debugging
     * @param {number} newPhase - The new phase number
     */
    transitionToPhase(newPhase) {
        // Call parent method first
        super.transitionToPhase(newPhase);
        
        // Log the phase change but avoid material manipulation for now
        console.log(`=== BOSS PHASE CHANGED ===`);
        console.log(`Boss transitioned to phase ${newPhase}`);
        
        // Describe what would happen in each phase (without actual effects)
        switch(newPhase) {
            case 2:
                console.log(`Phase 2: Faster movement, increased attack frequency (orange color)`);
                break;
                
            case 3:
                console.log(`Phase 3: Multiple projectiles (yellow color)`);
                break;
                
            case 4:
                console.log(`Phase 4: Rapid fire with maximum aggression (white color)`);
                break;
        }
    }
}

export default SphereBoss;