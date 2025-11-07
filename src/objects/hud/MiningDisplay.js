/**
 * MiningDisplay.js - 3D display of mining resources for the HUD
 * Uses the unified GeometryFactory for consistent rendering
 */
import CollectibleConfig from '../collectibles/CollectibleConfig';
import GeometryFactory from '../shapes/GeometryFactory';

class MiningDisplay {
    constructor() {
        // Group containing all display elements
        this.group = new THREE.Group();
        
        // Resource counts
        this.resources = {};
        
        // Active display elements
        this.activeOres = [];
        this.countIndicators = {};
        
        // Configuration
        this.spacing = 0.15; // Significantly increased spacing for better vertical separation
        this.maxOresDisplayed = 5;
        this.animationDuration = 300; // ms
        
        // Create empty panel
        this.createPanel();
    }
    
    /**
     * Create background panel
     */
    createPanel() {
        // No background panel or border - keeping method for compatibility
    }
    
    /**
     * Create a new ore display element using the unified GeometryFactory
     * @param {string} type - The ore type
     * @returns {Object} Container for the ore display elements
     */
    createOreDisplay(type) {
        // Create a container for this ore display
        const container = new THREE.Group();
        
        // Create ore mesh using the unified GeometryFactory
        // Get ore config to ensure we use the correct color
        const oreConfig = CollectibleConfig.getCollectibleConfig(type);
        
        // Always use the factory to create ore meshes with appropriate size
        const oreMesh = GeometryFactory.createCollectibleMesh(type, 'ore', {
            size: 0.025, // Reduced by 50% from 0.05
            transparent: true,
            opacity: 1.0, // Full opacity
            // Use the correct color from CollectibleConfig
            color: oreConfig ? oreConfig.color : null
        });
        
        // Position the ore mesh - moved further right to be closer to the number
        oreMesh.position.set(0.08, 0, 0);
        
        // Add to container (positioning will be done later)
        container.add(oreMesh);
        
        // Create text-based count indicator
        // Transparent background for the text (no visible background)
        const bgGeometry = new THREE.PlaneGeometry(0.16, 0.1); // Larger background for bigger text
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000, 
            transparent: true,
            opacity: 0, // Fully transparent/clear background
            side: THREE.DoubleSide
        });
        
        const countBg = new THREE.Mesh(bgGeometry, bgMaterial);
        countBg.position.set(0.08, 0, 0.01); // Position to the right of the ore, adjusted for larger size
        container.add(countBg);
        
        // Create a text label for the count
        const canvas = document.createElement('canvas');
        canvas.width = 512; // Larger canvas for bigger font
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = '220px Arial'; // Less bold, slightly smaller font
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('0', 256, 256); // Center text in the larger canvas
        
        const textTexture = new THREE.CanvasTexture(canvas);
        textTexture.minFilter = THREE.LinearFilter;
        const textMaterial = new THREE.MeshBasicMaterial({
            map: textTexture,
            transparent: true,
            opacity: 1.0 // Full opacity
        });
        
        const textGeometry = new THREE.PlaneGeometry(0.14, 0.09); // Larger plane for text
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(0.12, 0, 0.02); // Position over the background with offset for larger text
        container.add(textMesh);
        
        // Store indicators for updating later
        const indicators = {
            container,
            oreMesh,
            background: countBg,
            text: textMesh,
            texture: textTexture,
            canvas: canvas,
            context: ctx,
            type
        };
        
        this.countIndicators[type] = indicators;
        return indicators;
    }
    
    /**
     * Get the group containing all display elements
     * @returns {THREE.Group} The group
     */
    getGroup() {
        return this.group;
    }
    
    /**
     * Add an ore to the display
     * @param {string} type - The ore type to add
     */
    addOre(type) {
        // Check if this ore is already in the active list
        const existingIndex = this.activeOres.findIndex(ore => ore.type === type);
        
        if (existingIndex === -1) {
            // Create a new ore display if not already existing
            const oreDisplay = this.countIndicators[type] || this.createOreDisplay(type);
            
            if (!oreDisplay) {
                console.error(`Failed to create ore display for type: ${type}`);
                return;
            }
            
            // Add to the group if not already added
            if (!this.group.children.includes(oreDisplay.container)) {
                this.group.add(oreDisplay.container);
            }
            
            // Add to active ores
            this.activeOres.push(oreDisplay);
            
            // Set full opacity and direct position (no animation)
            oreDisplay.container.position.x = 0;
            oreDisplay.container.scale.set(1, 1, 1);
            
            // Make everything fully visible immediately
            if (oreDisplay.oreMesh && oreDisplay.oreMesh.material) {
                oreDisplay.oreMesh.material.opacity = 1.0;
            }
            
            if (oreDisplay.text && oreDisplay.text.material) {
                oreDisplay.text.material.opacity = 1.0;
            }
            
            if (oreDisplay.background && oreDisplay.background.material) {
                oreDisplay.background.material.opacity = 0; // Fully transparent background
            }
            
            // Trigger reposition without animation
            this.positionOres(false);
        }
    }
    
    /**
     * Remove an ore from the display
     * @param {string} type - The ore type to remove
     */
    removeOre(type) {
        // Find the ore in the active list
        const index = this.activeOres.findIndex(ore => ore.type === type);
        
        if (index >= 0) {
            const oreDisplay = this.activeOres[index];
            
            // Remove immediately without animation
            this.activeOres.splice(index, 1);
            
            // Remove from group immediately
            if (this.group.children.includes(oreDisplay.container)) {
                this.group.remove(oreDisplay.container);
            }
            
            // Reposition remaining ores without animation
            this.positionOres(false);
        }
    }
    
    /**
     * Position all active ores with proper centering
     * @param {boolean} animate - Whether to animate the positioning
     */
    positionOres() {
        const totalOres = this.activeOres.length;
        if (totalOres === 0) return;
        
        // Calculate vertical positioning
        const totalHeight = (totalOres - 1) * this.spacing;
        const startY = totalHeight / 2; // Center the stack vertically
        
        // Position each ore - no animations
        this.activeOres.forEach((oreDisplay, index) => {
            if (!oreDisplay || !oreDisplay.container) {
                console.error(`Invalid ore display at index ${index}`);
                return;
            }
            
            const targetY = startY - (index * this.spacing);
            
            // Direct positioning without animation
            oreDisplay.container.position.x = 0;
            oreDisplay.container.position.y = targetY;
            oreDisplay.container.scale.set(1, 1, 1);
            
            // Ensure full visibility
            if (oreDisplay.oreMesh && oreDisplay.oreMesh.material) {
                oreDisplay.oreMesh.material.opacity = 1.0;
            }
            if (oreDisplay.background && oreDisplay.background.material) {
                oreDisplay.background.material.opacity = 0; // Keep background fully transparent
            }
            if (oreDisplay.text && oreDisplay.text.material) {
                oreDisplay.text.material.opacity = 1.0; // Full opacity for text
            }
        });
    }
    
    /**
     * Update the display animation
     * Called each frame
     */
    update() {
        // Rotate ores for visual interest
        this.activeOres.forEach(oreDisplay => {
            if (oreDisplay && oreDisplay.oreMesh) {
                // Slow rotation to animate display
                // Use consistent rotation to avoid uneven appearance
                oreDisplay.oreMesh.rotation.x += 0.01;
                oreDisplay.oreMesh.rotation.y += 0.01;
                oreDisplay.oreMesh.rotation.z += 0.01;
            }
        });
    }
    
    /**
     * Update resource counts
     * @param {Object} resources - Object with ore counts by type
     */
    updateResources(resources) {
        // Don't process if resources is undefined
        if (!resources) return;
        
        // Track if anything changed
        const changes = {};
        
        // Update stored counts and check for new/changed ores
        Object.keys(resources).forEach(type => {
            // Skip non-ore properties (might be in GameStats)
            if (!['iron', 'copper', 'silver', 'gold', 'platinum'].includes(type)) {
                return;
            }
            
            const oldValue = this.resources[type] || 0;
            const newValue = resources[type] || 0;
            
            // Record if value increased
            changes[type] = newValue > oldValue;
            
            // Update stored value
            this.resources[type] = newValue;
            
            // Check if we need to add this ore to the display
            if (newValue > 0) {
                // Create or ensure this ore is visible
                const existingIndex = this.activeOres.findIndex(ore => ore.type === type);
                if (existingIndex === -1) {
                    this.addOre(type);
                }
            } else if (newValue === 0) {
                // Remove if count is zero
                this.removeOre(type);
            }
        });
        
        // Make sure we process all ore types even if not in resources
        ['iron', 'copper', 'silver', 'gold', 'platinum'].forEach(type => {
            if (!(type in resources)) {
                // If resource is missing from update, assume it's 0
                if (this.resources[type] > 0) {
                    this.resources[type] = 0;
                    this.removeOre(type);
                }
            }
        });
        
        // Update visualizations for all active ores
        this.activeOres.forEach(oreDisplay => {
            const type = oreDisplay.type;
            const count = this.resources[type] || 0;
            
            // Update text to show actual count
            if (oreDisplay.canvas && oreDisplay.context) {
                // Clear the canvas
                oreDisplay.context.clearRect(0, 0, oreDisplay.canvas.width, oreDisplay.canvas.height);
                
                // Draw the new count
                oreDisplay.context.fillStyle = 'white';
                oreDisplay.context.font = '220px Arial'; // Less bold, slightly smaller font
                oreDisplay.context.textAlign = 'center';
                oreDisplay.context.textBaseline = 'middle';
                oreDisplay.context.fillText(count.toString(), 256, 256);
                
                // Update texture
                oreDisplay.texture.needsUpdate = true;
            }
            
            // Highlight the ore icon if value increased
            if (changes[type]) {
                this.highlightOre(type);
            }
        });
    }
    
    /**
     * Highlight an ore when collected
     * @param {string} type - Ore type to highlight
     */
    highlightOre(type) {
        const oreDisplay = this.countIndicators[type];
        if (!oreDisplay) return;

        // Get ore config for color
        const oreConfig = CollectibleConfig.getCollectibleConfig(type);
        if (!oreConfig) return;

        // Store original color
        const originalColor = oreDisplay.oreMesh.material.color.clone();

        // Flash the ore mesh with its color
        oreDisplay.oreMesh.material.color.set(oreConfig.color);
        oreDisplay.oreMesh.material.opacity = 1.0;

        // Reset after animation duration
        setTimeout(() => {
            oreDisplay.oreMesh.material.color.copy(originalColor);
            oreDisplay.oreMesh.material.opacity = 1.0;
        }, this.animationDuration);
    }
}

export default MiningDisplay;