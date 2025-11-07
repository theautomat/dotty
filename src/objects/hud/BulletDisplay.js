/**
 * BulletDisplay.js - 3D display of bullet charges for the HUD
 * Shows available bullet charges as part of the 3D HUD system
 */
import Bullet from '../Bullet';
import BulletConfig from '../BulletConfig';

class BulletDisplay {
    constructor(options = {}) {
        // Group containing all display elements
        this.group = new THREE.Group();
        
        // Configure bullet charges
        this.maxCharges = options.maxCharges || 10;
        this.currentCharges = this.maxCharges;
        this.rechargeRate = options.rechargeRate || 200; // ms per recharge
        this.lastRechargeTime = Date.now();
        
        // Bullet models array
        this.bulletModels = [];
        
        // Create display elements
        this.createBulletDisplay();
        
        // Start recharge timer
        this.startRechargeTimer();
    }
    
    /**
     * Create bullet display elements
     */
    createBulletDisplay() {
        // Define dimensions for positioning (not creating actual panel)
        const panelWidth = 0.2;
        const panelHeight = 0.6;
        
        // Get bullet spacing from BulletConfig or use default
        const spacing = BulletConfig.hudBullet?.spacing || 0.06;
        
        for (let i = 0; i < this.maxCharges; i++) {
            // Create a wireframe bullet model using the Bullet class factory method
            // Explicitly set isHUD=true to ensure wireframe rendering
            const bulletModel = Bullet.createBulletModel(true, true); // isActive=true, isHUD=true
            
            // Apply uniform scaling from config to ensure the bullet maintains its shape
            const scale = BulletConfig.hudBullet?.scale || 0.03;
            bulletModel.scale.set(scale, scale, scale);
            
            // Make sure material settings prevent background clipping
            if (bulletModel.material) {
                bulletModel.material.depthTest = false;
                bulletModel.material.depthWrite = false;
            }
            
            // Position vertically stacked with adjusted spacing and additional margin
            // Add a small additional margin (0.02) between bullets for clearer separation
            bulletModel.position.set(0, panelHeight/2 - 0.05 - (i * (spacing + 0.02)), 0.01);
            
            // Add to group
            this.group.add(bulletModel);
            
            // Store reference
            this.bulletModels.push(bulletModel);
        }
        
        // Update the display
        this.updateDisplay();
    }
    
    /**
     * Get the group containing all display elements
     * @returns {THREE.Group} The group
     */
    getGroup() {
        return this.group;
    }
    
    /**
     * Update the display based on current charges
     */
    updateDisplay() {
        // Update each bullet indicator
        for (let i = 0; i < this.maxCharges; i++) {
            const bulletModel = this.bulletModels[i];
            if (bulletModel) {
                // Show bullets that are charged, hide those that aren't
                const isCharged = i < this.currentCharges;
                
                // Change material opacity instead of hiding completely
                if (bulletModel.material) {
                    // Use config opacity or fallback
                    const activeOpacity = BulletConfig.hudBullet?.opacity || 0.8;
                    bulletModel.material.opacity = isCharged ? activeOpacity : 0.1;
                }
            }
        }
    }
    
    /**
     * Use a bullet charge if available
     * @returns {boolean} Whether a charge was successfully used
     */
    useCharge() {
        if (this.currentCharges > 0) {
            this.currentCharges--;
            this.updateDisplay();
            return true;
        }
        return false;
    }
    
    /**
     * Set configuration for bullet display 
     * Simple method to update parameters - only expected to be called once during initialization
     * @param {Object} config - Configuration object
     */
    setConfig(config) {
        if (config.maxCharges !== undefined) {
            this.maxCharges = config.maxCharges;
        }
        
        if (config.rechargeRate !== undefined) {
            this.rechargeRate = config.rechargeRate;
        }
    }
    
    /**
     * Check if shooting is allowed (has charges)
     * @returns {boolean} Whether shooting is allowed
     */
    canShoot() {
        return this.currentCharges > 0;
    }
    
    /**
     * Start the recharge timer
     */
    startRechargeTimer() {
        // Use interval to periodically check and recharge bullets
        this.rechargeInterval = setInterval(() => this.recharge(), 100);
    }
    
    /**
     * Recharge one bullet if time has passed
     */
    recharge() {
        const now = Date.now();
        if (now - this.lastRechargeTime >= this.rechargeRate) {
            if (this.currentCharges < this.maxCharges) {
                this.currentCharges++;
                this.updateDisplay();
            }
            this.lastRechargeTime = now;
        }
    }
    
    /**
     * Update animations
     * Called each frame
     */
    update() {
        // Get rotation speed from config or use default
        const rotationSpeed = BulletConfig.hudBullet?.rotationSpeed || 0.01;
        
        // Animate bullets - slowly rotate for visual interest
        for (let i = 0; i < this.maxCharges; i++) {
            const bulletModel = this.bulletModels[i];
            if (bulletModel) {
                // Only animate charged bullets
                if (i < this.currentCharges) {
                    bulletModel.rotation.y += rotationSpeed;
                }
            }
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Clear recharge timer
        if (this.rechargeInterval) {
            clearInterval(this.rechargeInterval);
        }
        
        // Clean up bullet models
        for (let i = 0; i < this.bulletModels.length; i++) {
            const bulletModel = this.bulletModels[i];
            if (bulletModel) {
                if (bulletModel.material) {
                    bulletModel.material.dispose();
                }
                if (bulletModel.geometry) {
                    bulletModel.geometry.dispose();
                }
            }
        }
        
        // Clear arrays
        this.bulletModels = [];
    }
}

export default BulletDisplay;