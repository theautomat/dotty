/**
 * PowerUpDisplay.js - Displays active power-ups at the top of the HUD
 * with responsive centering and animations
 */
import GeometryFactory from '../shapes/GeometryFactory.js';

class PowerUpDisplay {
    constructor() {
        // Create main group for positioning
        this.group = new THREE.Group();
        
        // Active power-ups container - only store non-null entries
        this.activePowerUps = [];
        
        // Configuration
        this.spacing = 0.15; // Increased spacing to prevent overlap
        this.maxPowerUps = 5; // Maximum number of simultaneous power-ups
        this.animationDuration = 300; // ms
    }
    
    /**
     * Create a power-up display element
     * @param {Object} powerUp - The power-up data object
     * @returns {Object} Container for the power-up display elements
     */
    createPowerUpElement(powerUpData) {
        // Create a container group for this power-up
        const container = new THREE.Group();
        
        // Use unified GeometryFactory to create a visible version of the power-up
        // For the shield, we're now using the LatheGeometry
        const miniPowerUp = GeometryFactory.createCollectibleMesh(powerUpData.type, 'powerUp', {
            size: 0.025, // Further reduced to 50% of previous size
            color: powerUpData.color
        });
        
        // Add to container
        container.add(miniPowerUp);
        
        // Timer bar below the icon
        const timerGeometry = new THREE.PlaneGeometry(0.12, 0.01); // 4x larger timer bar
        const timerMaterial = new THREE.MeshBasicMaterial({
            color: powerUpData.color,
            transparent: true,
            opacity: 0.8
        });
        
        const timer = new THREE.Mesh(timerGeometry, timerMaterial);
        timer.position.set(0, -0.05, 0); // Moved down a bit more
        container.add(timer);
        
        // Create the complete power-up element
        const powerUpElement = {
            container,
            icon: miniPowerUp,
            timer,
            data: powerUpData
        };
        
        return powerUpElement;
    }
    
    /**
     * Position all active power-ups with proper centering
     * @param {boolean} animate - Whether to animate the positioning
     */
    positionPowerUps() {
        const totalPowerUps = this.activePowerUps.length;
        if (totalPowerUps === 0) return;
        
        // Calculate horizontal positioning to center the group
        const totalWidth = (totalPowerUps - 1) * this.spacing;
        const startX = -totalWidth / 2; // Center the row horizontally
        
        // Position each power-up - no animations
        this.activePowerUps.forEach((powerUp, index) => {
            const targetX = startX + (index * this.spacing);
            
            // Direct positioning without animation
            powerUp.container.position.x = targetX;
            powerUp.container.position.y = 0;
            powerUp.container.scale.set(1, 1, 1);
            
            // Ensure full opacity
            if (powerUp.icon && powerUp.icon.material) {
                powerUp.icon.material.opacity = 1.0;
            }
        });
    }
    
    /**
     * Add a power-up to the display
     * @param {Object} powerUp - The power-up object with type and color
     * @returns {number} The index of the added power-up
     */
    addPowerUp(powerUp) {
        const type = powerUp.getType();
        const duration = powerUp.getDuration();
        const color = powerUp.params.color;
        
        // Create the power-up data
        const powerUpData = {
            type: type,
            geometryType: powerUp.getGeometryType(),
            startTime: performance.now(),
            duration: duration,
            color: color
        };
        
        // Check if we have room for this power-up
        if (this.activePowerUps.length >= this.maxPowerUps) {
            // No room, replace the oldest one (first in array)
            this.removePowerUp(0);
        }
        
        // Create the power-up element
        const powerUpElement = this.createPowerUpElement(powerUpData);
        
        // Add to the group
        this.group.add(powerUpElement.container);
        
        // Set proper position and scale immediately
        powerUpElement.container.position.x = 0;
        powerUpElement.container.position.y = 0;
        powerUpElement.container.scale.set(1, 1, 1);
        
        // Add to active power-ups
        this.activePowerUps.push(powerUpElement);
        
        // Reposition all power-ups without animation
        this.positionPowerUps();
        
        return this.activePowerUps.length - 1;
    }
    
    /**
     * Remove a power-up from the display
     * @param {number} index - The index of the power-up to remove
     */
    removePowerUp(index) {
        if (index >= 0 && index < this.activePowerUps.length) {
            const powerUp = this.activePowerUps[index];
            
            // Remove immediately without animation
            this.group.remove(powerUp.container);
            
            // Clean up resources
            if (powerUp.icon.geometry) powerUp.icon.geometry.dispose();
            if (powerUp.icon.material) powerUp.icon.material.dispose();
            if (powerUp.timer.geometry) powerUp.timer.geometry.dispose();
            if (powerUp.timer.material) powerUp.timer.material.dispose();
            
            // Remove from active list
            this.activePowerUps.splice(index, 1);
            
            // Reposition remaining power-ups without animation
            this.positionPowerUps();
        }
    }
    
    /**
     * Update all power-ups and timers
     */
    update() {
        const now = performance.now();
        
        // Check each power-up - use reversed loop to safely remove items
        for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
            const powerUp = this.activePowerUps[i];
            const data = powerUp.data;
            
            // Calculate elapsed time
            const elapsed = now - data.startTime;
            const progress = 1 - (elapsed / data.duration);
            
            // If expired, remove it
            if (progress <= 0) {
                this.removePowerUp(i);
                continue;
            }
            
            // Update the timer bar without animation
            const timer = powerUp.timer;
            timer.scale.x = progress;
            
            // Keep opacity constant - no flashing
            timer.material.opacity = 0.8;
            
            // Keep rotation for visual interest without changing color
            if (powerUp.icon) {
                powerUp.icon.rotation.y += 0.02;
                powerUp.icon.rotation.z += 0.01;
            }
        }
    }
    
    /**
     * Get the THREE.js group containing this component
     * @returns {THREE.Group} The group containing this component
     */
    getGroup() {
        return this.group;
    }
}

export default PowerUpDisplay;