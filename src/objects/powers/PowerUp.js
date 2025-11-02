/**
 * PowerUp.js - Base class for power-ups in the game
 */
import GameObject from '../GameObject.js';
import GeometryFactory from '../shapes/GeometryFactory.js';
import PowerUpConfig from './PowerUpConfig.js';

class PowerUp extends GameObject {
    /**
     * Create a new power-up instance
     * @param {THREE.Scene} scene - The THREE.js scene
     * @param {THREE.Vector3} position - Position of the power-up
     * @param {string} type - Type of power-up from PowerUpConfig
     * @param {object} params - Additional parameters to override defaults
     */
    constructor(scene, position, type, params = {}) {
        super(scene);
        
        // Create a fresh Vector3 copy with explicit values to avoid reference issues
        this.position = new THREE.Vector3(
            parseFloat(position.x),
            parseFloat(position.y),
            parseFloat(position.z)
        );
        
        this.type = type;
        
        // Get configuration for this power-up type
        const config = PowerUpConfig.getPowerUpConfig(type);
        
        // Default parameters with overrides from config and params
        this.params = {
            size: params.size || (config ? config.size : 2.0),
            duration: params.duration || (config ? config.duration : 10000), // Duration in ms
            color: params.color || (config ? config.color : 0xFFFFFF),
            lifespan: 15000 // How long power-up exists in the world (15 seconds)
        };
        
        // Initial state
        this.age = 0;
        this.rotationSpeed = {
            x: 0.005,
            y: 0.01,
            z: 0.005
        };
        
        // Create the visual representation
        this.createVisualRepresentation();
    }
    
    /**
     * Create the visual representation of the power-up
     */
    createVisualRepresentation() {
        try {
            // Create the mesh using the unified factory with minimal parameters
            // Wireframe is set in GeometryFactory.createPowerMaterial
            this.mesh = GeometryFactory.createCollectibleMesh(this.type, 'powerUp', {
                size: this.params.size,
                color: this.params.color
            });
            
            // Set position explicitly 
            this.mesh.position.set(
                this.position.x,
                this.position.y,
                this.position.z
            );
            
            // Note: We don't add to scene here - PowerUpManager will do that
        } catch (error) {
            console.error(`PowerUp: Error creating power-up mesh for type ${this.type}:`, error);
        }
    }
    
    update(deltaTime = 16) {
        // Increment age and check if power-up should expire
        this.age += deltaTime;
        if (this.age > this.params.lifespan) {
            this.remove();
            return false; // Signal that this power-up is no longer active
        }
        
        // Rotate
        if (this.mesh) {
            this.mesh.rotation.x += this.rotationSpeed.x;
            this.mesh.rotation.y += this.rotationSpeed.y;
            this.mesh.rotation.z += this.rotationSpeed.z;
            
            // Add fade out effect as power-up ages
            if (this.age > this.params.lifespan * 0.7) {
                const remainingTime = this.params.lifespan - this.age;
                const opacity = Math.max(0.2, remainingTime / (this.params.lifespan * 0.3));
                
                if (this.mesh.material) {
                    this.mesh.material.opacity = opacity;
                }
            }
        }
        
        return true; // Still active
    }
    
    /**
     * Destroy the power-up and clean up resources
     */
    destroy() {
        // Call parent destroy for common cleanup
        super.destroy();
    }
    
    getType() {
        return this.type;
    }
    
    getDuration() {
        return this.params.duration;
    }
    
    getName() {
        const config = PowerUpConfig.getPowerUpConfig(this.type);
        return config ? config.name : this.type;
    }
    
    getGeometryType() {
        const config = PowerUpConfig.getPowerUpConfig(this.type);
        return config ? config.geometryType : this.type;
    }
}

export default PowerUp;