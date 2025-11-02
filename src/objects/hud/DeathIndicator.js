/**
 * DeathIndicator.js - 3D component for game over visual
 * Displays when the player ship is destroyed
 */
class DeathIndicator {
    /**
     * Create a new death indicator
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Default options
        this.options = {
            color: 0xff0000,
            triangleSize: 0.375, // Reduced to 25% of original 1.5 size
            rotationSpeed: 0.03,
            pulseSpeed: 0.01,
            transitionDelay: 1500, // Reduced to 1.5 seconds for faster transition to stats
            ...options
        };
        
        // Group containing all display elements
        this.group = new THREE.Group();
        this.group.visible = false;
        
        // State tracking
        this.active = false;
        this.creationTime = null;
        this.onGameOverComplete = null;
        
        // Create the triangle indicator
        this.createTriangle();
        
        // Create collision overlay (red tint to the whole view)
        this.createOverlay();
    }
    
    /**
     * Create the triangle death indicator
     * Using a centered, properly aligned triangle with wireframe rendering
     */
    createTriangle() {
        const size = this.options.triangleSize;
        
        // Create a centered cone geometry with proper aspect ratio
        // Using 3 segments to create a triangular look
        const triangleGeometry = new THREE.ConeGeometry(size, size*2, 3);
        
        // Center the geometry on its origin for proper rotation
        triangleGeometry.translate(0, 0, 0);
        triangleGeometry.rotateX(Math.PI); // Flip it so the point is at the top
        
        // Create a bright red material for the edges
        const material = new THREE.MeshBasicMaterial({ 
            color: this.options.color,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        
        // Create the mesh
        this.triangle = new THREE.Mesh(triangleGeometry, material);
        
        // Position it centrally in front of the camera
        this.triangle.position.set(0, 0, -1);
        
        // Add to group
        this.group.add(this.triangle);
        
        /* ORIGINAL TRIANGLE CODE COMMENTED OUT
        // Create a triangular geometry
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            0, size, 0,         // top vertex
            -size, -size/2, 0,  // bottom left
            size, -size/2, 0    // bottom right
        ]);
        
        // Add vertices as position attribute
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        
        // Create edges (wireframe) for the triangle
        const edges = new THREE.EdgesGeometry(geometry);
        
        // Create a bright red material for the edges
        const material = new THREE.LineBasicMaterial({ 
            color: this.options.color,
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });
        
        // Create the mesh
        this.triangle = new THREE.LineSegments(edges, material);
        
        // Position it centrally
        this.triangle.position.set(0, 0, -1);
        
        // Add to group
        this.group.add(this.triangle);
        */
    }
    
    /**
     * Create a red overlay effect
     */
    createOverlay() {
        // Create a large plane that will be positioned extremely close to the camera
        // but not so close that it clips through
        const overlayGeometry = new THREE.PlaneGeometry(10, 10);
        const overlayMaterial = new THREE.MeshBasicMaterial({
            color: this.options.color,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            depthTest: false
        });
        
        this.overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
        
        // Position very close to camera (will be repositioned in update)
        this.overlay.position.set(0, 0, -0.1);
        
        // Add to group
        this.group.add(this.overlay);
    }
    
    /**
     * Show the death indicator
     * @param {Function} onComplete - Optional callback when death sequence is complete
     */
    show(onComplete) {
        this.active = true;
        this.creationTime = Date.now();
        this.group.visible = true;
        this.onGameOverComplete = onComplete;
    }
    
    /**
     * Hide the death indicator
     */
    hide() {
        this.active = false;
        this.group.visible = false;
    }
    
    /**
     * Update the death indicator animation
     * @param {THREE.WebGLRenderer} renderer - The renderer (not used but included for compatibility)
     * @returns {boolean} Whether the death sequence is complete
     */
    update(renderer) {
        if (!this.active || !this.group.visible) return false;
        
        // Calculate elapsed time since creation
        const elapsed = Date.now() - this.creationTime;
        
        // For the overlay, we don't need to position it relative to camera
        // since the entire HUD group already follows the camera
        
        // Rotate the triangle
        this.triangle.rotation.z += this.options.rotationSpeed;
        
        // Pulse the triangle opacity
        const basePulse = 0.7 + Math.sin(elapsed * 0.005) * 0.3;
        this.triangle.material.opacity = basePulse;
        
        // Scale the triangle with a pulse effect
        const scale = 1 + 0.2 * Math.sin(elapsed * 0.003);
        this.triangle.scale.set(scale, scale, scale);
        
        // Check if we should transition to stats screen
        if (elapsed > this.options.transitionDelay && this.onGameOverComplete) {
            const callback = this.onGameOverComplete;
            this.onGameOverComplete = null; // Clear to prevent multiple calls
            callback();
            return true;
        }
        
        return false;
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
        // Dispose of geometries and materials
        if (this.triangle) {
            this.triangle.geometry.dispose();
            this.triangle.material.dispose();
        }
        
        if (this.overlay) {
            this.overlay.geometry.dispose();
            this.overlay.material.dispose();
        }
    }
}

export default DeathIndicator;