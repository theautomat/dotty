/**
 * GameCompletionDisplay.js - 3D component for game completion visual
 * Displays when the player completes all levels
 */
import GeometryFactory from '../shapes/GeometryFactory';

class GameCompletionDisplay {
    /**
     * Create a new game completion indicator
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Default options
        this.options = {
            color: 0x55ff55, // Green success color
            symbolSize: 1.5,
            rotationSpeed: 0.03,
            pulseSpeed: 0.01,
            transitionDelay: 3000, // ms before transitioning to stats
            ...options
        };
        
        // Group containing all display elements
        this.group = new THREE.Group();
        this.group.visible = false;
        
        // State tracking
        this.active = false;
        this.creationTime = null;
        this.onGameCompletionStatsReady = null;
        
        // Create the success symbol (star)
        this.createSuccessSymbol();
        
        // Create success overlay (green tint to the whole view)
        this.createOverlay();
    }
    
    /**
     * Create the success symbol using GeometryFactory
     * Using a dodecahedron (similar to gold ore) for a special victory symbol
     */
    createSuccessSymbol() {
        const size = this.options.symbolSize;
        
        // Create a trophy-like shape using a modified dodecahedron from GeometryFactory
        // The dodecahedron mimics the shape of valuable ores like gold
        const geometry = new THREE.DodecahedronGeometry(size * 0.7, 1);
        
        // Create a bright green material 
        const material = new THREE.MeshBasicMaterial({ 
            color: this.options.color,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        
        // Create the mesh
        this.star = new THREE.Mesh(geometry, material);
        
        // Position it centrally
        this.star.position.set(0, 0, -1);
        
        // Add to group
        this.group.add(this.star);
        
        // Create a surrounding ring for enhanced visual effect
        const ringGeometry = new THREE.TorusGeometry(
            size * 1.1,       // radius
            size * 0.08,      // tube thickness
            16,               // radialSegments
            64                // tubularSegments
        );
        
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: this.options.color,
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });
        
        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.position.set(0, 0, -1.1); // Position slightly behind the star
        
        // Add to group
        this.group.add(this.ring);
    }
    
    /**
     * Create a green success overlay effect
     */
    createOverlay() {
        // Create a large plane that will be positioned extremely close to the camera
        // but not so close that it clips through
        const overlayGeometry = new THREE.PlaneGeometry(10, 10);
        const overlayMaterial = new THREE.MeshBasicMaterial({
            color: this.options.color,
            transparent: true,
            opacity: 0.15, // Slightly more subtle than death overlay
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
     * Show the game completion indicator
     * @param {Function} onComplete - Optional callback when completion sequence is done
     */
    show(onComplete) {
        this.active = true;
        this.creationTime = Date.now();
        this.group.visible = true;
        this.onGameCompletionStatsReady = onComplete;
    }
    
    /**
     * Hide the game completion indicator
     */
    hide() {
        this.active = false;
        this.group.visible = false;
    }
    
    /**
     * Update the game completion indicator animation
     * @param {THREE.WebGLRenderer} renderer - The renderer (not used but included for compatibility)
     * @returns {boolean} Whether the completion sequence is complete
     */
    update(renderer) {
        if (!this.active || !this.group.visible) return false;
        
        // Calculate elapsed time since creation
        const elapsed = Date.now() - this.creationTime;
        
        // Rotate the star
        this.star.rotation.x += this.options.rotationSpeed * 0.7;
        this.star.rotation.y += this.options.rotationSpeed * 1.3;
        this.star.rotation.z += this.options.rotationSpeed * 0.5;
        
        // Rotate the ring in the opposite direction for cool effect
        if (this.ring) {
            this.ring.rotation.x += this.options.rotationSpeed * 0.2;
            this.ring.rotation.y += this.options.rotationSpeed * -0.3;
        }
        
        // Pulse the star opacity
        const basePulse = 0.7 + Math.sin(elapsed * 0.005) * 0.3;
        this.star.material.opacity = basePulse;
        
        // Pulse the ring opacity in counter-phase
        if (this.ring) {
            this.ring.material.opacity = 0.7 + Math.sin(elapsed * 0.005 + Math.PI) * 0.3;
        }
        
        // Scale the star with a pulse effect
        const scale = 1 + 0.2 * Math.sin(elapsed * 0.003);
        this.star.scale.set(scale, scale, scale);
        
        // Scale the ring with opposite pulse
        if (this.ring) {
            const ringScale = 1 + 0.2 * Math.sin(elapsed * 0.003 + Math.PI);
            this.ring.scale.set(ringScale, ringScale, ringScale);
        }
        
        // Check if we should transition to stats screen
        if (elapsed > this.options.transitionDelay && this.onGameCompletionStatsReady) {
            const callback = this.onGameCompletionStatsReady;
            this.onGameCompletionStatsReady = null; // Clear to prevent multiple calls
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
        if (this.star) {
            this.star.geometry.dispose();
            this.star.material.dispose();
        }
        
        if (this.ring) {
            this.ring.geometry.dispose();
            this.ring.material.dispose();
        }
        
        if (this.overlay) {
            this.overlay.geometry.dispose();
            this.overlay.material.dispose();
        }
    }
}

export default GameCompletionDisplay;