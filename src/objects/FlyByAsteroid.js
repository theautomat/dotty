/**
 * FlyByAsteroid.js - Special type of asteroid that doesn't wrap around boundary
 * Extends the Asteroid class but gets removed once it leaves the play area
 */
import Asteroid from './Asteroid.js';
import GameTheme from '../game/GameTheme.js';
import GeometryFactory from './shapes/GeometryFactory.js';
import GameConfig from '../game/GameConfig.js'; // Import GameConfig for global settings

class FlyByAsteroid extends Asteroid {
    constructor(params = {}) {
        // Create the base asteroid with the provided parameters
        super({
            ...params,
            // Override or add specific FlyByAsteroid parameters
            wrapDistance: params.wrapDistance || GameConfig.world.wrapDistance,
            levelConfig: params.levelConfig || null
        });
        
        // Override size with more variety
        this.size = Math.random() < 0.2 
            ? 4 + Math.random() * 2      // 20% chance of larger asteroid (4-6 size)
            : 0.8 + Math.random() * 1.7; // 80% chance of smaller asteroid (0.8-2.5 size)
        
        // Apply a random color from the extended color palette
        this.applyRandomColor();
        
        // Significantly increased speed for fly-by effect
        // Smaller asteroids move faster, larger ones are slower but more destructive
        this.speedMultiplier = this.size > 3.0 ? 1.8 : 2.5; // Varied speeds based on size
        
        // Apply the speed multiplier
        this.velocity.multiplyScalar(this.speedMultiplier);
    }
    
    /**
     * Apply a random color from the asteroid color palette
     */
    applyRandomColor() {
        if (!GameTheme.asteroids.colors || GameTheme.asteroids.colors.length === 0) {
            return; // No colors defined, keep default
        }
        
        // Get a random color from the array
        const colorIndex = Math.floor(Math.random() * GameTheme.asteroids.colors.length);
        const color = GameTheme.asteroids.colors[colorIndex];
        
        // Apply the color to the mesh material
        if (this.mesh && this.mesh.material) {
            this.mesh.material.color.setHex(color);
        }
    }
    
    /**
     * Override the createAsteroid method to use custom positioning
     */
    createAsteroid() {
        // Use the GeometryFactory to create the mesh
        this.mesh = GeometryFactory.createAsteroidMesh({
            size: this.size,
            variation: 0.5,  // Controls how jagged the asteroid is
            color: this.getRandomAsteroidColor()
        });
        
        // Position the asteroid randomly but away from the player
        // Start from well outside the wrap distance to create the fly-by effect
        // Generate a random point on a sphere for true 3D spawning from all directions
        const phi = Math.random() * Math.PI * 2; // Horizontal angle
        const theta = Math.random() * Math.PI; // Vertical angle
        
        // Get spawn distance from level config or use default
        // Keep it outside the play area for fly-by effect
        const spawnDistance = this.wrapDistance * 1.3; // Start from well outside the wrap distance
        
        // Convert spherical coordinates to Cartesian (x,y,z)
        const x = spawnDistance * Math.sin(theta) * Math.cos(phi);
        const y = spawnDistance * Math.sin(theta) * Math.sin(phi);
        const z = spawnDistance * Math.cos(theta);
        
        this.mesh.position.set(x, y, z);
        
        // Get speed range from config
        const speedRange = this.levelConfig.asteroidConfig.speedRange;
            
        // Generate random speed within the range, but faster than normal asteroids
        const speedFactor = speedRange.min + Math.random() * (speedRange.max - speedRange.min);
        
        // Apply only the fly-by specific speed multiplier
        const adjustedSpeedFactor = speedFactor * this.speedMultiplier;
        
        // Calculate direction toward the player position (initially center, but will update)
        // Using (0,0,0) initially, but updateTrajectory will be called with actual player position
        const directionToPlayer = new THREE.Vector3(0, 0, 0)
            .sub(this.mesh.position)
            .normalize();
        
        // Set velocity directly toward the player with slight variation for unpredictability
        this.velocity = new THREE.Vector3(
            directionToPlayer.x * adjustedSpeedFactor * (0.9 + Math.random() * 0.2),
            directionToPlayer.y * adjustedSpeedFactor * (0.9 + Math.random() * 0.2),
            directionToPlayer.z * adjustedSpeedFactor * (0.9 + Math.random() * 0.2)
        );
        
        this.rotationSpeed = {
            x: (Math.random() - 0.5) * 0.02 * 1.5, // Slightly faster rotation
            y: (Math.random() - 0.5) * 0.02 * 1.5,
            z: (Math.random() - 0.5) * 0.02 * 1.5
        };
        
        // Store reference to this instance for collision detection
        this.mesh.userData.asteroidInstance = this;
        
        // Add asteroid to scene
        this.scene.add(this.mesh);
    }
    
    /**
     * Updates the trajectory to aim directly at the player
     * Call this immediately after creating the asteroid
     * @param {THREE.Vector3} playerPosition - The player's current position
     */
    updateTrajectory(playerPosition) {
        if (!playerPosition) return;
        
        // Get speed range from config
        const speedRange = this.levelConfig.asteroidConfig.speedRange;
            
        // Generate random speed within the range
        const speedFactor = speedRange.min + Math.random() * (speedRange.max - speedRange.min);
        
        // Apply only the fly-by specific speed multiplier
        const adjustedSpeedFactor = speedFactor * this.speedMultiplier;
        
        // Calculate direction toward player
        const directionToPlayer = new THREE.Vector3()
            .subVectors(playerPosition, this.mesh.position)
            .normalize();
        
        // Set velocity directly toward player with slight variation
        this.velocity = new THREE.Vector3(
            directionToPlayer.x * adjustedSpeedFactor * (0.95 + Math.random() * 0.1),
            directionToPlayer.y * adjustedSpeedFactor * (0.95 + Math.random() * 0.1),
            directionToPlayer.z * adjustedSpeedFactor * (0.95 + Math.random() * 0.1)
        );
    }
    
    /**
     * Overrides the update method to remove asteroid when it leaves the wrap distance
     * instead of wrapping it back around
     * @param {THREE.Vector3} playerPosition - Optional player position for trajectory
     * @returns {boolean} True if still active, false if it should be removed
     */
    update(playerPosition = null) {
        // Move asteroid according to its velocity
        this.mesh.position.add(this.velocity);
        
        // Rotate asteroid
        this.mesh.rotation.x += this.rotationSpeed.x;
        this.mesh.rotation.y += this.rotationSpeed.y;
        this.mesh.rotation.z += this.rotationSpeed.z;
        
        // Check if asteroid has left the wrap distance
        if (this.mesh.position.length() > this.wrapDistance) {
            // Return false to indicate it should be removed
            return false;
        }
        
        // Still active
        return true;
    }
}

export default FlyByAsteroid;