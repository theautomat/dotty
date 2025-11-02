/**
 * ScreenFlash.js - Component for creating colored screen flash effects
 * Used to provide visual feedback when collecting items or taking damage
 */
class ScreenFlash {
    /**
     * Create a new screen flash component
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Default options
        this.options = {
            defaultColor: 0xffffff, // Default white
            defaultOpacity: 0.3,
            defaultDuration: 300, // milliseconds
            ...options
        };
        
        // Group containing all display elements
        this.group = new THREE.Group();
        this.group.visible = false;
        
        // State tracking
        this.active = false;
        this.flashStartTime = null;
        this.flashDuration = this.options.defaultDuration;
        
        // Create overlay for screen flash
        this.createOverlay();
    }
    
    /**
     * Create the overlay that will flash
     */
    createOverlay() {
        // Create a much larger plane that will cover the entire view with margin
        // Increased from 10x10 to 20x20 to prevent any edge visibility
        const overlayGeometry = new THREE.PlaneGeometry(20, 20);
        const overlayMaterial = new THREE.MeshBasicMaterial({
            color: this.options.defaultColor,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false // Prevent writing to depth buffer
        });
        
        this.overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
        
        // Position further back from camera to avoid clipping with HUD elements
        this.overlay.position.set(0, 0, -0.5);
        
        // Add to group
        this.group.add(this.overlay);
    }
    
    /**
     * Trigger a screen flash with the given color
     * @param {number} color - Hexadecimal color value
     * @param {number} opacity - Maximum opacity (0-1)
     * @param {number} duration - Duration in milliseconds
     */
    flash(color = this.options.defaultColor, opacity = this.options.defaultOpacity, duration = this.options.defaultDuration) {
        // Update material color and reset opacity
        this.overlay.material.color.setHex(color);
        this.overlay.material.opacity = opacity;
        
        // Set state
        this.active = true;
        this.flashStartTime = Date.now();
        this.flashDuration = duration;
        this.group.visible = true;
    }
    
    /**
     * Update the flash effect animation
     * @returns {boolean} Whether the flash is still active
     */
    update() {
        if (!this.active || !this.group.visible) return false;
        
        // Calculate elapsed time since flash start
        const elapsed = Date.now() - this.flashStartTime;
        
        // Calculate fade based on elapsed time
        const progress = Math.min(1.0, elapsed / this.flashDuration);
        
        // Fade out the overlay
        const newOpacity = (1 - progress) * this.overlay.material.opacity;
        this.overlay.material.opacity = newOpacity;
        
        // Check if flash is complete
        if (progress >= 1.0) {
            this.active = false;
            this.group.visible = false;
            return false;
        }
        
        return true;
    }
    
    /**
     * Get the three.js group for this component
     * @returns {THREE.Group} The component's group
     */
    getGroup() {
        return this.group;
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        if (this.overlay) {
            this.overlay.geometry.dispose();
            this.overlay.material.dispose();
        }
    }
}

export default ScreenFlash;