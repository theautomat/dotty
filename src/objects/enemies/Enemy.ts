/**
 * Enemy.ts - Base class for all enemy types
 * Provides core functionality for enemy behavior, movement, and combat
 *
 * Subclasses should override the createEnemy method to create appropriate geometry
 * using GeometryFactory for consistent rendering across the game.
 */
import * as THREE from 'three';
import GameObject from '../GameObject';
import GeometryFactory from '../shapes/GeometryFactory';
import EnemyConfig from './EnemyConfig';
import GameConfig from '../../game/GameConfig';
import soundManager from '../../managers/SoundManager';
import explosionManager from '../../managers/ExplosionManager.js';
import { isOutsideWorldBoundary } from '../../utils/WorldUtils';

interface RotationSpeed {
    x: number;
    y: number;
    z: number;
}

interface EnemyParams {
    size?: number;
    health?: number;
    speed?: number;
    damage?: number;
    shootInterval?: number;
    behavior?: 'follow' | 'patrol' | 'attack' | 'idle';
    color?: number;
    hitSound?: string | null;
    phaseTransitions?: any;
    oreType?: string | null;
    oreDropsPerHit?: number | null;
    oreDropsOnDeath?: number | null;
    orbitDistance?: number | null;
    phases?: any;
    enemyManager?: any;
}

interface ExplosionOptions {
    color?: THREE.Color | number;
    size?: number;
    fragmentCount?: number;
    explosionSpeed?: number;
    lifespan?: number;
}

class Enemy extends GameObject {
    protected position: THREE.Vector3;
    protected type: string;
    protected enemyManager: any;
    protected params: Required<EnemyParams>;
    protected velocity: THREE.Vector3;
    protected rotation: THREE.Euler;
    protected rotationSpeed: RotationSpeed;
    protected health: number;
    protected lastShotTime: number;
    protected targetPosition: THREE.Vector3 | null;
    protected targetDistance: number;

    constructor(scene: THREE.Scene, position: THREE.Vector3, type: string, params: EnemyParams = {}) {
        super(scene);
        // Safely handle position - only call clone() if it's a THREE.Vector3
        this.position = position.clone ? position.clone() : position;
        this.type = type;

        // Store reference to enemy manager if provided in params
        // This allows any enemy to access the manager directly
        this.enemyManager = params.enemyManager || null;

        // Get configuration for this enemy type
        const config = EnemyConfig.getEnemyConfig(type);

        if (!config) {
            console.error(`No configuration found for enemy type: ${type}`);
        }

        // Default parameters with overrides from config and params
        this.params = {
            size: params.size || (config ? config.size : 3.0),
            health: params.health || (config ? config.health : 2),
            speed: params.speed || (config ? config.speed : 0.3),
            damage: params.damage || (config ? config.damage : 1),
            shootInterval: params.shootInterval || (config ? config.shootInterval : 3000),
            behavior: params.behavior || (config ? config.behavior : 'follow'),
            color: params.color || (config ? config.color : 0xff4400),

            // Sound parameters
            hitSound: params.hitSound || (config ? config.hitSound : null),

            // Boss-specific parameters (will only be used by Boss subclasses)
            phaseTransitions: params.phaseTransitions || (config ? config.phaseTransitions : null),
            oreType: params.oreType || (config ? config.oreType : null),
            oreDropsPerHit: params.oreDropsPerHit || (config ? config.oreDropsPerHit : null),
            oreDropsOnDeath: params.oreDropsOnDeath || (config ? config.oreDropsOnDeath : null),
            orbitDistance: params.orbitDistance || (config ? config.orbitDistance : null),
            phases: params.phases || (config ? config.phases : null),
            enemyManager: this.enemyManager
        };

        // Movement and state variables
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.rotationSpeed = {
            x: (Math.random() - 0.5) * 0.01,
            y: (Math.random() - 0.5) * 0.01,
            z: (Math.random() - 0.5) * 0.01
        };

        // Combat variables
        this.health = this.params.health;
        this.lastShotTime = 0;

        // Target tracking
        this.targetPosition = null;
        this.targetDistance = Infinity;

        // Create the enemy mesh
        this.createEnemy();
    }

    /**
     * Create the enemy mesh
     */
    protected createEnemy(): void {
        // This will be implemented differently for each enemy type
        console.log(`Creating ${this.type} enemy`);
    }

    /**
     * Update enemy state
     * @param deltaTime - Time since last update in ms
     * @param playerPosition - Current player position
     * @returns Whether the enemy is still active
     */
    update(deltaTime: number, playerPosition: THREE.Vector3): boolean {
        if (!this.mesh) return false;

        // Update target information
        this.updateTargetInfo(playerPosition);

        // Execute current behavior
        this.executeBehavior(deltaTime, playerPosition);

        // Apply movement
        this.updateMovement(deltaTime);

        // Check world boundaries
        this.checkBoundaries();

        // Update shooting
        this.updateWeapon(deltaTime, playerPosition);

        return true;
    }

    /**
     * Update targeting information based on player position
     */
    protected updateTargetInfo(playerPosition: THREE.Vector3): void {
        if (!playerPosition) return;

        this.targetPosition = playerPosition.clone();
        this.targetDistance = this.mesh.position.distanceTo(playerPosition);
    }

    /**
     * Execute the current behavior strategy
     */
    protected executeBehavior(deltaTime: number, playerPosition: THREE.Vector3): void {
        switch (this.params.behavior) {
            case 'follow':
                this.followTarget(playerPosition);
                break;
            case 'patrol':
                this.patrolArea();
                break;
            case 'attack':
                this.attackTarget(playerPosition);
                break;
            case 'idle':
            default:
                // Do nothing
                break;
        }
    }

    /**
     * Follow behavior - move toward the target
     */
    protected followTarget(targetPosition: THREE.Vector3): void {
        if (!targetPosition || !this.mesh) return;

        // Only follow if not too close to target
        if (this.targetDistance > 20) {
            // Direction vector to target
            const direction = new THREE.Vector3().subVectors(
                targetPosition,
                this.mesh.position
            ).normalize();

            // Set velocity toward target, scaled by speed
            this.velocity.copy(direction).multiplyScalar(this.params.speed);
        } else {
            // If close enough, slow down
            this.velocity.multiplyScalar(0.95);
        }
    }

    /**
     * Patrol behavior - move in a pattern
     */
    protected patrolArea(): void {
        // Simple patrol behavior - random movement
        if (Math.random() < 0.02) {
            this.velocity.set(
                (Math.random() - 0.5) * this.params.speed,
                (Math.random() - 0.5) * this.params.speed,
                (Math.random() - 0.5) * this.params.speed
            );
        }
    }

    /**
     * Attack behavior - move toward target and prepare to attack
     */
    protected attackTarget(targetPosition: THREE.Vector3): void {
        // Similar to follow, but maintain some distance for attacks
        if (!targetPosition || !this.mesh) return;

        // Optimal attack distance
        const optimalDistance = 30;

        if (this.targetDistance > optimalDistance + 10) {
            // Too far, move closer
            const direction = new THREE.Vector3().subVectors(
                targetPosition,
                this.mesh.position
            ).normalize();

            this.velocity.copy(direction).multiplyScalar(this.params.speed);
        } else if (this.targetDistance < optimalDistance - 10) {
            // Too close, back away
            const direction = new THREE.Vector3().subVectors(
                this.mesh.position,
                targetPosition
            ).normalize();

            this.velocity.copy(direction).multiplyScalar(this.params.speed * 0.5);
        } else {
            // At good distance, strafe
            const up = new THREE.Vector3(0, 1, 0);
            const direction = new THREE.Vector3().subVectors(
                targetPosition,
                this.mesh.position
            ).normalize();

            // Create perpendicular vector for strafing
            const strafeDir = new THREE.Vector3().crossVectors(direction, up).normalize();

            // Oscillate strafing direction
            if (Math.sin(Date.now() / 1000) > 0) {
                strafeDir.negate();
            }

            this.velocity.copy(strafeDir).multiplyScalar(this.params.speed * 0.7);
        }
    }

    /**
     * Update movement based on current velocity
     */
    protected updateMovement(deltaTime: number): void {
        if (!this.mesh) return;

        // Apply velocity
        this.mesh.position.add(this.velocity);

        // CRITICAL: Update the position property to match mesh position for collision detection
        this.position = this.mesh.position.clone();

        // Apply rotation
        this.mesh.rotation.x += this.rotationSpeed.x;
        this.mesh.rotation.y += this.rotationSpeed.y;
        this.mesh.rotation.z += this.rotationSpeed.z;
    }

    /**
     * Check if enemy has gone beyond world boundaries
     */
    protected checkBoundaries(): void {
        if (!this.mesh) return;

        // Import the isOutsideWorldBoundary function if not available
        if (typeof isOutsideWorldBoundary === 'function') {
            // Use utility function to check if outside boundary
            if (isOutsideWorldBoundary(this.mesh.position, 0)) {
                // If outside boundary, destroy this enemy
                this.destroy();
            }
        } else {
            // Fallback for backward compatibility - check distance from origin against world half-size
            const worldHalfSize = GameConfig.world.size / 2;
            if (this.mesh.position.length() > worldHalfSize) {
                this.destroy();
            }
        }
    }

    /**
     * Update weapon status and potentially fire
     */
    protected updateWeapon(deltaTime: number, playerPosition: THREE.Vector3): void {
        // Check if it's time to shoot
        const now = performance.now();
        if (now - this.lastShotTime > this.params.shootInterval) {
            // Only shoot if player is within range and visible
            if (this.targetDistance < 100) {
                this.shoot(playerPosition);
                this.lastShotTime = now;
            }
        }
    }

    /**
     * Fire a projectile at the target
     */
    protected shoot(targetPosition: THREE.Vector3): void {
        // Will be implemented in derived classes or by the game
        console.log(`${this.type} enemy firing at player`);
    }

    /**
     * Handles collision with other game objects
     * @param otherObject - The object that collided with this enemy
     */
    handleCollision(otherObject: GameObject): void {
        // Log collision info
        console.log(`[COLLISION] Enemy ${this.type} hit:`, {
            position: this.mesh ? this.mesh.position.clone() : this.position,
            health: this.health,
            enemyId: this.id,
            bulletType: (otherObject as any).type || 'unknown'
        });

        // Create explosion effect at enemy's position
        if (this.mesh) {
            this.createExplosion();
        }

        // Call destroy() like in Asteroid pattern
        // For UFO, this will call UFO's overridden destroy() method
        this.destroy();
    }

    /**
     * Create an explosion at the enemy's position
     */
    protected createExplosion(options: ExplosionOptions = {}): void {
        // Skip if no mesh
        if (!this.mesh) return;

        // Get position and color for the explosion
        const position = this.mesh.position.clone();
        const color = options.color || this.getColor();

        // Use provided size or calculate from enemy size
        const size = options.size || (this.params.size || 3.0) * 0.3;

        // Create explosion with appropriate size and color
        explosionManager.createExplosion(
            position,
            size,
            {
                fragmentCount: options.fragmentCount || 40, // More fragments for enemy explosion
                fragmentColor: color,
                explosionSpeed: options.explosionSpeed || 2.0, // Faster explosion
                lifespan: options.lifespan || 1.0 // Slightly longer lifespan
            }
        );
    }

    /**
     * Base destroy method - will be overridden by subclasses like UFO
     * to play their specific sounds before calling super.destroy()
     */
    destroy(): void {
        // No sound played here - specific enemy types will handle their own sounds

        // Call parent's destroy() to clean up resources
        super.destroy();
    }

    /**
     * Get the enemy's color from the mesh material or params
     * @returns The enemy's color
     */
    protected getColor(): THREE.Color | number {
        // Primary source: mesh material color if available
        if (this.mesh && this.mesh.material && 'color' in this.mesh.material) {
            return (this.mesh.material as THREE.MeshStandardMaterial).color;
        }

        // Secondary source: params color
        if (this.params && this.params.color) {
            return this.params.color;
        }

        // Final fallback: default orange-red color
        return 0xff4400;
    }

    /**
     * Get the type of this enemy
     */
    getType(): string {
        return this.type;
    }

    /**
     * Get the damage this enemy deals
     */
    getDamage(): number {
        return this.params.damage;
    }
}

export default Enemy;
