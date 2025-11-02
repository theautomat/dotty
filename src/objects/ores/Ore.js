/**
 * Ore.js - Handles the behavior of ores in the game
 */
import GameObject from '../GameObject.js';
import GeometryFactory from '../shapes/GeometryFactory.js';
import OreConfig from './OreConfig.js';
import GameConfig from '../../game/GameConfig.js'; // Import GameConfig for global settings

class Ore extends GameObject {
    /**
     * Create a new ore
     * @param {Object} scene - The THREE.js scene
     * @param {THREE.Vector3} position - Position to spawn the ore
     * @param {string} type - Type of ore (determines appearance and value)
     * @param {number} value - Value of the ore
     * @param {Object} params - Additional parameters
     */
    constructor(scene, position, type = 'common', value = 1, params = {}) {
        super(scene);
        
        // Store the type and value
        this.type = type;
        this.value = value;
        
        // Store the position (clone to avoid reference issues)
        this.position = position.clone();
        
        // Get configuration for this ore type
        const config = OreConfig.getOreConfig(type);
        
        // Default parameters with overrides from config and params
        this.params = {
            size: params.size || (config ? config.size : 1.0),
            color: params.color || (config ? config.color : 0xCCCCCC),
            lifetime: params.lifetime || 10000, // 10 seconds by default
            wrapDistance: params.wrapDistance || GameConfig.world.wrapDistance,
            rotationSpeed: params.rotationSpeed || 0.01
        };
        
        // Set up the initial state
        this.age = 0;
        this.collected = false;
        
        // Add throttled logging properties
        this.lastLogTime = 0;
        this.logInterval = 250 + (Math.random() * 25); // 250ms + random 0-25ms
        
        // Set up velocity for movement
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05
        );
        
        // Create the visual representation
        this.createOreMesh();
    }
    
    /**
     * Create the ore's visual representation
     */
    createOreMesh() {
        // Get ore options based on type
        const options = OreConfig.getOreConfig(this.type);
        
        // Create the mesh using the factory
        this.mesh = GeometryFactory.createCollectibleMesh(this.type, 'ore', {
            size: this.params.size,
            color: this.params.color
        });
        
        // Apply position
        this.mesh.position.copy(this.position);
        
        // Reference back to this instance
        this.mesh.userData.oreInstance = this;
        
        // Add to scene
        this.scene.add(this.mesh);
    }
    
    /**
     * Update the ore's state
     * @param {number} deltaTime - Delta time in milliseconds
     * @returns {boolean} - Whether the ore is still active
     */
    update(deltaTime) {
        if (this.collected || !this.mesh) return false;
        
        // Update age and check if expired
        this.age += deltaTime;
        if (this.age > this.params.lifetime) {
            this.remove();
            return false;
        }
        
        // Apply simple physics
        this.mesh.position.add(this.velocity);
        
        // Apply rotation for visual appeal
        this.mesh.rotation.x += this.params.rotationSpeed;
        this.mesh.rotation.y += this.params.rotationSpeed * 0.7;
        
        // Check if ore has gone beyond wrap distance
        if (this.mesh.position.length() > this.params.wrapDistance) {
            // Wrap it back around
            const direction = this.mesh.position.clone().normalize();
            const newPosition = direction.multiplyScalar(-this.params.wrapDistance * 0.9);
            this.mesh.position.copy(newPosition);
        }
        
        // Make ore fade out as it ages
        if (this.age > this.params.lifetime * 0.7) {
            const opacity = 1 - ((this.age - (this.params.lifetime * 0.7)) / (this.params.lifetime * 0.3));
            
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(mat => {
                        mat.opacity = opacity;
                        mat.transparent = true;
                    });
                } else {
                    this.mesh.material.opacity = opacity;
                    this.mesh.material.transparent = true;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Check if the ore is collectible
     * @returns {boolean} - Whether the ore can be collected
     */
    checkCollection() {
        return !this.collected && this.mesh;
    }
    
    /**
     * Collect this ore
     */
    collect() {
        if (this.collected) return;
        
        this.collected = true;
        this.destroy();
    }
    
    /**
     * Destroy this ore and clean up resources
     */
    destroy() {
        // Call parent destroy for common cleanup
        super.destroy();
    }
    
    /**
     * Get the ore's value
     * @returns {number} - Ore value
     */
    getValue() {
        return this.value;
    }
    
    /**
     * Get the ore's type
     * @returns {string} - Ore type
     */
    getType() {
        return this.type;
    }
    
    /**
     * Create an ore at the given position
     * @param {Object} scene - THREE.js scene
     * @param {THREE.Vector3} position - Position to create the ore
     * @param {string} type - Ore type
     * @param {number} value - Ore value
     * @param {Object} params - Additional parameters
     * @returns {Ore} - Created ore instance
     */
    static create(scene, position, type = 'common', value = 1, params = {}) {
        return new Ore(scene, position, type, value, {
            ...params,
            wrapDistance: GameConfig.world.wrapDistance, // This should ideally come from game config
            size: params.size || 0.8,
            lifetime: params.lifetime || 5000 // 5 seconds by default
        });
    }
}

export default Ore;