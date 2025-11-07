/**
 * Patroller.js - Implementation of Patroller enemy type
 * Automated drone that patrols an area and occasionally fires
 */
import Enemy from './Enemy.js';
import GeometryFactory from '../shapes/GeometryFactory';

class Patroller extends Enemy {
    constructor(scene, position, params = {}) {
        // Call parent constructor with type 'patroller'
        super(scene, position, 'patroller', params);
        
        // Patroller-specific properties
        this.patrolTimer = 0;
        this.patrolInterval = 1000; // Change patrol direction every second
        this.patrolPoints = []; // Will be initialized in initPatrolPoints
        this.currentPatrolPoint = 0;
        
        // Create unique ID for this patroller instance
        this.id = `patroller_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        
        // Initialize patrol points around spawn position
        this.initPatrolPoints();
    }
    
    /**
     * Initialize patrol points in a square pattern around spawn point
     */
    initPatrolPoints() {
        const patrolRadius = 50 + Math.random() * 50; // Random radius between 50-100
        
        // Create a square patrol pattern
        this.patrolPoints = [
            new THREE.Vector3(this.position.x + patrolRadius, this.position.y, this.position.z + patrolRadius),
            new THREE.Vector3(this.position.x + patrolRadius, this.position.y, this.position.z - patrolRadius),
            new THREE.Vector3(this.position.x - patrolRadius, this.position.y, this.position.z - patrolRadius),
            new THREE.Vector3(this.position.x - patrolRadius, this.position.y, this.position.z + patrolRadius)
        ];
    }
    
    /**
     * Create the Patroller mesh
     */
    createEnemy() {
        // Use GeometryFactory to create patroller mesh with proper params
        this.mesh = GeometryFactory.createEnemyMesh('patroller', {
            size: this.params.size,
            color: this.params.color
        });
        
        // Set position
        this.mesh.position.copy(this.position);
        
        // Reference to this instance for collision detection
       // this.mesh.userData.enemyInstance = this;
        
        // Add to scene
        this.scene.add(this.mesh);
    }
    
    /**
     * Patroller-specific update behavior
     * @param {number} deltaTime 
     * @param {THREE.Vector3} playerPosition 
     * @returns {boolean} Whether the Patroller is still active
     */
    update(deltaTime, playerPosition) {
        if (!this.mesh) return false;
        
        // Handle patrol timer
        const now = performance.now();
        this.patrolTimer += deltaTime;
        
        // Check if player is close and switch to attack behavior
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
        if (distanceToPlayer < 100) {
            // Player detected, switch to attack
            this.params.behavior = 'attack';
        } else {
            // Return to patrol behavior when player is far
            this.params.behavior = 'patrol';
        }
        
        // Special patrol behavior override
        if (this.params.behavior === 'patrol') {
            this.patrolArea();
        }
        
        // Call parent update method for basic behavior, except for patrol
        return super.update(deltaTime, playerPosition);
    }
    
    /**
     * Override patrolArea to use predefined points
     */
    patrolArea() {
        if (!this.mesh || this.patrolPoints.length === 0) return;
        
        // Get current target point
        const targetPoint = this.patrolPoints[this.currentPatrolPoint];
        
        // Create a direction vector to the target point
        const direction = new THREE.Vector3().subVectors(
            targetPoint,
            this.mesh.position
        );
        
        // Calculate distance to current patrol point
        const distance = direction.length();
        
        // If we've reached the current patrol point, move to the next one
        if (distance < 5) {
            this.currentPatrolPoint = (this.currentPatrolPoint + 1) % this.patrolPoints.length;
            
            // Add some height variation when changing points
            this.mesh.position.y += (Math.random() - 0.5) * 10;
        } else {
            // Move toward the current patrol point
            direction.normalize();
            this.velocity.copy(direction).multiplyScalar(this.params.speed);
            
            // Rotate to face direction of movement
            if (this.mesh) {
                // Calculate rotation to face direction of movement gradually
                const lookAt = new THREE.Vector3().addVectors(
                    this.mesh.position,
                    direction
                );
                this.mesh.lookAt(lookAt);
                
                // Add a gentle bobbing motion
                this.mesh.rotation.z = Math.sin(Date.now() / 500) * 0.1;
            }
        }
    }
    
    /**
     * Handle Patroller shooting
     * @param {THREE.Vector3} targetPosition 
     */
    shoot(targetPosition) {
        // This will be handled by the Game class to create bullets
        if (this.onShoot) {
            this.onShoot(this.mesh.position, targetPosition);
        }
    }
    
    /**
     * Set callback for shooting
     * @param {Function} callback 
     */
    setShootCallback(callback) {
        this.onShoot = callback;
    }
    
    /**
     * Remove the Patroller from the scene
     */
    remove() {
        // Call destroy for cleanup - parent class will handle the callback
        this.destroy();
    }
}

export default Patroller;