/**
 * LevelTransitionDisplay.js - 3D HUD component for displaying level transitions
 * Shows the next level's primary ore as a visual indicator of progression
 */
// Using the global THREE object
import { LevelConfig } from '../../game/index.js';
import { CollectibleConfig, Collectible } from '../collectibles/index.js';
import soundManager from '../../managers/SoundManager';
import GeometryFactory from '../shapes/GeometryFactory';

class LevelTransitionDisplay {
    /**
     * Create a new level transition display
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Default options
        this.options = {
            visible: false,
            backgroundColor: new THREE.Color(0x000000),
            opacity: 0.8,
            ...options
        };
        
        this.group = new THREE.Group();
        this.group.visible = this.options.visible;
        
        // Create container for transition elements
        this.container = new THREE.Group();
        this.group.add(this.container);
        
        // For the ore display
        this.oreScene = null;
        this.oreCamera = null;
        this.oreRenderer = null;
        this.oreTextureTarget = null;
        this.oreMesh = null;
        this.ore = null;
        this.animationId = null;
        
        // Transition callback and timer
        this.transitionCallback = null;
        this.transitionTimeout = null;
        
        // Create background panel
        this.createBackgroundPanel();
        
        // Create ore display area
        this.createOreDisplayArea();
    }
    
    /**
     * Create the background panel
     */
    createBackgroundPanel() {
        // Create a larger panel with rounded corners
        const panelSize = { width: 8, height: 8 }; // Increased from 6x6 to 8x8
        const panelRadius = 0.4; // Rounded corners
        
        // Create rounded rectangle shape
        const shape = new THREE.Shape();
        const width = panelSize.width;
        const height = panelSize.height;
        const radius = panelRadius;
        
        shape.moveTo(-width/2 + radius, -height/2);
        shape.lineTo(width/2 - radius, -height/2);
        shape.quadraticCurveTo(width/2, -height/2, width/2, -height/2 + radius);
        shape.lineTo(width/2, height/2 - radius);
        shape.quadraticCurveTo(width/2, height/2, width/2 - radius, height/2);
        shape.lineTo(-width/2 + radius, height/2);
        shape.quadraticCurveTo(-width/2, height/2, -width/2, height/2 - radius);
        shape.lineTo(-width/2, -height/2 + radius);
        shape.quadraticCurveTo(-width/2, -height/2, -width/2 + radius, -height/2);
        
        const geometry = new THREE.ShapeGeometry(shape);
        
        // Create material with transparency and better depth handling
        const material = new THREE.MeshBasicMaterial({
            color: this.options.backgroundColor,
            transparent: true,
            opacity: this.options.opacity,
            side: THREE.DoubleSide,
            depthTest: false,  // Don't test against depth buffer
            depthWrite: false  // Don't write to depth buffer
        });
        
        const panel = new THREE.Mesh(geometry, material);
        
        // Position the panel farther back to avoid clipping with elements
        panel.position.z = -0.8; 
        
        this.backgroundPanel = panel;
        this.group.add(panel);
    }
    
    /**
     * Create the ore display area
     */
    createOreDisplayArea() {
        // We'll render the ore to a texture and apply it to a plane
        const displaySize = 4; // Size of the display area
        
        // Create render target for ore display with better quality matching the main scene
        this.oreTextureTarget = new THREE.WebGLRenderTarget(1024, 1024, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat
        });
        
        // Create a plane to display the ore
        const planeGeometry = new THREE.PlaneGeometry(displaySize, displaySize);
        const planeMaterial = new THREE.MeshBasicMaterial({
            map: this.oreTextureTarget.texture,
            transparent: true
        });
        
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.container.add(plane);
        
        // Setup separate scene and camera for rendering the ore
        this.oreScene = new THREE.Scene();
        this.oreCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 50);
        this.oreCamera.position.z = 10;
        
        // Add lighting for better visibility
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(1, 1, 1).normalize();
        this.oreScene.add(light);
        
        const ambientLight = new THREE.AmbientLight(0x555555);
        this.oreScene.add(ambientLight);
    }
    
    /**
     * Show the next level's primary ore
     * @param {number} nextLevelId - The ID of the next level
     * @param {Function} callback - Function to call after transition completes
     * @param {number} duration - How long to show the panel in ms (default: 3000)
     * @param {boolean} waitForClick - If true, wait for user click before continuing (default: false)
     */
    showNextLevelOre(nextLevelId, callback, duration = 3000, waitForClick = false) {
        // Save callback
        this.transitionCallback = callback;
        
        // Clear any previous ore display
        this.clearOreDisplay();
        
        // Get config for the next level
        const nextLevelConfig = LevelConfig.getLevelById(nextLevelId);
        if (!nextLevelConfig) return;
        
        // If waitForClick is true (first level), don't show the ore
        // This is for the initial game start
        if (waitForClick) {
            // Store the transition info for when the user clicks
            this.pendingTransition = {
                callback: callback,
                sound: false,
                levelId: nextLevelId
            };
            
            // For initial game start, we just continue without showing the ore
            return;
        }
        
        // Create the ore using the real Ore class
        this.createOrePreview(nextLevelConfig.primaryOreType);
        
        // Play the ore reveal sound
        this.playOreRevealSound(nextLevelConfig.primaryOreType);
        
        // Show the display
        this.show();
        
        // Hide after duration and call callback
                
        // Clear any existing timeout first
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }
        
        this.transitionTimeout = setTimeout(() => {
                        this.completeTransition();
        }, duration);
    }
    
    /**
     * Complete the transition - can be called by timeout or click handler
     */
    completeTransition() {
        // console.log("Completing level transition");
        
        this.hide();
        this.clearOreDisplay();
        
        // Play the level beginning sound
        this.playLevelBeginSound();
        
        // Call transition callback
        if (typeof this.transitionCallback === 'function') {
            // console.log("Calling transition completion callback");
            this.transitionCallback();
            this.transitionCallback = null;
        } else {
            console.warn("No transition callback found to complete transition");
        }
        
        // Clear pending transition if it exists
        this.pendingTransition = null;
    }
    
    /**
     * Handle user click - continue if waiting for click
     * @returns {boolean} True if click was handled
     */
    handleClick() {
        // console.log("[LEVEL_TRANSITION] handleClick called, pendingTransition:", !!this.pendingTransition);
        // console.log("[LEVEL_TRANSITION] Group visibility:", this.group?.visible);
        
        // If not waiting for click, do nothing
        if (!this.pendingTransition) {
            // console.log("[LEVEL_TRANSITION] No pending transition found, click not handled");
            return false;
        }
        
        const levelId = this.pendingTransition.levelId || "unknown";
        
        // Complete the transition
        // console.log(`[LEVEL_TRANSITION] Handling click to start level ${levelId}`);
        this.completeTransition();
        return true;
    }
    
    /**
     * Play the level beginning sound using SoundManager
     */
    playLevelBeginSound() {
        try {
            // Use soundManager to play the level begin sound
            soundManager.playLevelBegin();
        } catch (e) {
            console.log('Error playing level begin sound:', e);
        }
    }
    
    /**
     * Play the ore reveal sound for the given ore type using SoundManager
     * @param {string} oreType - Type of ore (iron, copper, etc.)
     */
    playOreRevealSound(oreType) {
        // Ensure we have a valid ore type
        if (!oreType) return;
        
        try {
            // Call the specific ore reveal sound method based on ore type
            switch(oreType) {
                case 'iron':
                    soundManager.playIronOreRevealed();
                    break;
                case 'copper':
                    soundManager.playCopperOreRevealed();
                    break;
                case 'silver':
                    soundManager.playSilverOreRevealed();
                    break;
                case 'gold':
                    soundManager.playGoldOreRevealed();
                    break;
                case 'platinum':
                    soundManager.playPlatinumOreRevealed();
                    break;
                default:
                    console.warn(`Unknown ore type: ${oreType} for level transition`);
            }
        } catch (e) {
            console.log('Error playing ore sound:', e);
        }
    }
    
    /**
     * Create an ore preview using GeometryFactory directly
     * @param {string} oreType - Type of ore to display (iron, copper, etc.)
     */
    createOrePreview(oreType) {
        if (!this.oreScene) return;
        
        // Get the ore config for parameters
        const oreConfig = CollectibleConfig.getCollectibleConfig(oreType);
        
        // Create the ore mesh directly using GeometryFactory
        // Use a smaller size (1/10th) for the level transition display
        const originalSize = oreConfig ? oreConfig.size : 1.5;
        const displaySize = originalSize * 0.1; // 10 times smaller
        
        this.oreMesh = GeometryFactory.createCollectibleMesh(oreType, 'ore', {
            size: displaySize
        });
        
        // Position at center
        this.oreMesh.position.set(0, 0, 0);
        
        // Add to our scene
        this.oreScene.add(this.oreMesh);
        
        // Start animation
        this.animateOre();
    }
    
    /**
     * Initialize ore animation
     * The actual rotation is now handled in the update method
     */
    animateOre() {
        // No need for a separate animation loop
        // The rotation is handled in the update method
        
        // Reset rotation
        if (this.oreMesh) {
            this.oreMesh.rotation.x = 0;
            this.oreMesh.rotation.y = 0;
        }
    }
    
    /**
     * Clear the ore display and stop animation
     */
    clearOreDisplay() {
        // No animation to stop since we're using the update method
        
        // Clear any pending timeouts
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
        
        // Clean up mesh
        if (this.oreMesh) {
            if (this.oreMesh.geometry) {
                this.oreMesh.geometry.dispose();
            }
            if (this.oreMesh.material) {
                if (Array.isArray(this.oreMesh.material)) {
                    this.oreMesh.material.forEach(material => material.dispose());
                } else {
                    this.oreMesh.material.dispose();
                }
            }
            if (this.oreScene) {
                this.oreScene.remove(this.oreMesh);
            }
            this.oreMesh = null;
        }
        
        // Clear the ore reference
        if (this.ore) {
            // The ore doesn't need additional cleanup as we manually handled the mesh
            this.ore = null;
        }
        
        // Clear oreScene (lights, etc.)
        if (this.oreScene) {
            while(this.oreScene.children.length > 0) { 
                const child = this.oreScene.children[0];
                this.oreScene.remove(child);
            }
            
            // Re-add lights
            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(1, 1, 1).normalize();
            this.oreScene.add(light);
            
            const ambientLight = new THREE.AmbientLight(0x555555);
            this.oreScene.add(ambientLight);
        }
    }
    
    /**
     * Update the component
     * @param {THREE.WebGLRenderer} renderer - The main renderer
     */
    update(renderer) {
        // Only update if visible and ore is present
        if (!this.group.visible || !this.oreMesh || !this.oreScene || !this.oreCamera) {
            return;
        }
        
        // Update rotation every frame
        if (this.oreMesh) {
            this.oreMesh.rotation.x += 0.01;
            this.oreMesh.rotation.y += 0.02;
        }
        
        // Render every frame for consistent appearance
        const currentRenderTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(this.oreTextureTarget);
        renderer.render(this.oreScene, this.oreCamera);
        renderer.setRenderTarget(currentRenderTarget);
    }
    
    /**
     * Show the display
     */
    show() {
        this.group.visible = true;
    }
    
    /**
     * Hide the display
     */
    hide() {
        this.group.visible = false;
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
        this.clearOreDisplay();
        
        // Dispose of render target
        if (this.oreTextureTarget) {
            this.oreTextureTarget.dispose();
            this.oreTextureTarget = null;
        }
        
        // Dispose of background panel geometry and material
        if (this.backgroundPanel) {
            if (this.backgroundPanel.geometry) {
                this.backgroundPanel.geometry.dispose();
            }
            if (this.backgroundPanel.material) {
                this.backgroundPanel.material.dispose();
            }
        }
        
        // Cancel any pending callbacks
        this.transitionCallback = null;
    }
}

export default LevelTransitionDisplay;