/**
 * GameOverStatsDisplay.js - Enhanced display of game over statistics
 * Shows collected ores, asteroid count, enemies destroyed and total score using GeometryFactory
 */
import GeometryFactory from '../shapes/GeometryFactory.js';
import { ORE_TYPES } from '../ores/index.js';
import OreConfig from '../ores/OreConfig.js';
import EnemyConfig from '../enemies/EnemyConfig.js';

class GameOverStatsDisplay {
    /**
     * Create a new enhanced game over stats display
     */
    constructor() {
        // Group containing all display elements
        this.group = new THREE.Group();
        this.group.visible = false;
        
        // Create a simple background
        this.createBackground();
        
        // Reference to mining display that will be used
        this.miningDisplay = null;
        
        // Store display groups for later cleanup
        this.statsDisplayGroup = null;
        this.oreDisplayGroup = null;
        this.asteroidDisplayGroup = null;
        this.totalScoreGroup = null;
    }
    
    /**
     * Create a simple background color
     */
    createBackground() {
        // Simple plane for the background color with increased size to avoid edge visibility
        const geometry = new THREE.PlaneGeometry(8, 6.5); // Increased from 6x4.5 to 8x6.5
        const material = new THREE.MeshBasicMaterial({
            color: 0x000055,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            depthTest: false, // Disable depth testing to prevent bleeding/clipping
            depthWrite: false, // Prevent depth writing so objects can render in front
            wireframe: false // Ensure we don't see wireframe edges
        });
        
        this.background = new THREE.Mesh(geometry, material);
        this.background.position.z = -0.8; // Move background further back to avoid any clipping
        
        // Remove any possible borders by explicitly setting them to null
        material.wireframeLinewidth = 0;
        
        this.group.add(this.background);
    }
    
    /**
     * Set the mining display to use
     * @param {MiningDisplay} miningDisplay - Instance of MiningDisplay to use
     */
    setMiningDisplay(miningDisplay) {
        this.miningDisplay = miningDisplay;
    }
    
    /**
     * Create a text display
     * @param {THREE.Group} group - The group to add the display to
     * @param {string} text - The text to display
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} options - Additional options (fontSize, width, height, color)
     */
    createTextDisplay(group, text, x, y, options = {}) {
        // Default options
        const fontSize = options.fontSize || 20;
        const width = options.width || 64;
        const height = options.height || 32;
        const color = options.color || 'white';
        
        // Create a canvas for the text with higher resolution to prevent pixelation
        const canvas = document.createElement('canvas');
        canvas.width = width * 2; // Double resolution
        canvas.height = height * 2; // Double resolution
        const ctx = canvas.getContext('2d');
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Add a slight text shadow for better readability against any background
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Set text style
        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize * 2}px Arial`; // Doubled font size for higher resolution
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw the text
        ctx.fillText(text.toString(), canvas.width/2, canvas.height/2);
        
        // Create texture and material with improved settings
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter; // Better filtering for sharper text
        texture.needsUpdate = true;
        
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false // Prevent depth writing for better visibility
        });
        
        // Create mesh for the text display
        const meshWidth = options.meshWidth || 0.15;
        const meshHeight = options.meshHeight || 0.08;
        const geometry = new THREE.PlaneGeometry(meshWidth, meshHeight);
        const textMesh = new THREE.Mesh(geometry, material);
        textMesh.position.set(x, y, 0.1); // Moved forward to ensure it's in front of background
        
        // Add to the group
        group.add(textMesh);
        return textMesh;
    }
    
    /**
     * Show the game over stats
     * @param {Object} stats - The game statistics to display
     */
    show(stats) {
        // Clean up previous display if it exists
        this.cleanupDisplayGroups();
        
        // Create a new main group for all statistics
        this.statsDisplayGroup = new THREE.Group();
        
        // Position the elements in the center of the screen
        // Reducing vertical gaps between components for a tighter layout
        
        // Create asteroid count display, moved lower
        this.createAsteroidCountDisplay(stats, 0, 0.5);
        
        // Create enemies display, moved closer to ores
        this.createEnemiesDisplay(stats, 0, 0.1);
        
        // Create ore display in the center (main focus)
        this.createOreDisplay(stats, 0, -0.3);
        
        // Create total score display at the bottom
        this.createTotalScoreDisplay(stats, 0, -0.8);
        
        // Add the main stats group to our component
        this.group.add(this.statsDisplayGroup);
        
        // Show the panel
        this.group.visible = true;
    }
    
    /**
     * Create the asteroid count display
     * @param {Object} stats - The game statistics
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createAsteroidCountDisplay(stats, x, y) {
        this.asteroidDisplayGroup = new THREE.Group();
        this.asteroidDisplayGroup.position.set(x, y, 0);
        
        // Create asteroid icon using GeometryFactory
        // Using the LARGE asteroid geometry for more detail and triangles
        const asteroidSize = 3.1; // Size > 3.0 to trigger the "large" asteroid code path
        const asteroidMesh = GeometryFactory.createAsteroidMesh({
            size: asteroidSize,
            variation: 0.5,
            detail: 1, // Explicitly request higher detail
            // Use the default asteroid color (gray) for consistency
        });
        
        // Scale down the large asteroid to fit in our UI (reduced by 50%)
        asteroidMesh.scale.set(0.025, 0.025, 0.025);
        
        // Ensure material properties are set properly, but preserve the color
        if (asteroidMesh.material) {
            // Just ensure wireframe is enabled
            asteroidMesh.material.wireframe = true;
            asteroidMesh.material.wireframeLinewidth = 1; // Set consistent line width
        }
        
        asteroidMesh.position.set(0, 0, 0.1); // Centered above the count and moved forward
        this.asteroidDisplayGroup.add(asteroidMesh);
        
        // Add userdata to identify this as an asteroid for animation
        asteroidMesh.userData.isAsteroid = true;
        
        // No label text as requested by user - just the icon is sufficient
        
        // Create asteroid count value below the asteroid (like ores)
        this.createTextDisplay(
            this.asteroidDisplayGroup,
            stats.asteroidsDestroyed || 0,
            0.0, // Center position
            -0.18, // Moved down to account for larger asteroid
            { 
                fontSize: 22, 
                width: 64,
                height: 32,
                meshWidth: 0.15,
                meshHeight: 0.1,
                color: '#ffffff' // White for count to match ore counts
            }
        );
        
        // Add to stats display group
        this.statsDisplayGroup.add(this.asteroidDisplayGroup);
    }
    
    /**
     * Create the enemies display section
     * @param {Object} stats - The game statistics
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createEnemiesDisplay(stats, x, y) {
        this.enemiesDisplayGroup = new THREE.Group();
        this.enemiesDisplayGroup.position.set(x, y, 0);
        
        // Enemy types to display - adding a "bomber" type to make 5 total for symmetry
        const enemyTypes = ['ufo', 'hunter', 'bomber', 'patroller', 'tetra'];
        const spacing = 0.25; // Horizontal spacing between enemies
        
        // Create a visual for each enemy type
        enemyTypes.forEach((enemyType, i) => {
            // Position horizontally, centered
            const xPos = (i - (enemyTypes.length - 1) / 2) * spacing;
            
            // Get the enemy config to use its native color
            const enemyConfig = EnemyConfig.getEnemyConfig(enemyType);
            const enemyColor = enemyConfig ? enemyConfig.color : undefined;
            
            // Create enemy mesh using GeometryFactory
            const enemyMesh = GeometryFactory.createEnemyMesh(enemyType, {
                size: 3.0, // Create a large enough enemy
                // Use the enemy's natural color from config
                color: enemyColor
            });
            
            // Special case for tetra which returns a group
            if (enemyType === 'tetra') {
                // Scale down the enemy to fit in our UI (reduced by 50%)
                enemyMesh.scale.set(0.02, 0.02, 0.02);
                
                // For the Tetra, just ensure the existing appearance is maintained
                // The Tetra already has the correct black tetrahedron and red sphere from GeometryFactory
                // We only need to ensure wireframe mode is enabled on the main mesh
                if (enemyMesh.userData && enemyMesh.userData.mainMesh) {
                    enemyMesh.userData.mainMesh.material.wireframe = true;
                }
                
                // The inner sphere should already have the correct red color from GeometryFactory
                // So we don't need to modify it at all
            } else {
                // Scale down regular enemies to fit in UI (reduced by 50%)
                enemyMesh.scale.set(0.02, 0.02, 0.02);
                
                // Set material properties for regular enemies - wireframe only
                if (enemyMesh.material) {
                    enemyMesh.material.wireframe = true;
                }
            }
            
            // Position the enemy
            enemyMesh.position.set(xPos, 0.05, 0.1);
            
            // Add to the group
            this.enemiesDisplayGroup.add(enemyMesh);
            
            // Add userdata to identify this as an enemy for animation
            enemyMesh.userData.isEnemy = true;
            enemyMesh.userData.enemyType = enemyType;
            
            // Get the enemy-specific count, properly handling the case when it's 0
            const enemyCount = stats.enemiesByType && (stats.enemiesByType[enemyType] !== undefined)
                ? stats.enemiesByType[enemyType] 
                : 0;
            
            // Create a count display for this specific enemy type
            this.createTextDisplay(
                this.enemiesDisplayGroup,
                enemyCount,
                xPos,
                -0.12,
                {
                    fontSize: 22,
                    width: 64,
                    height: 32,
                    meshWidth: 0.15,
                    meshHeight: 0.1,
                    color: '#ffffff' // White text
                }
            );
        });
        
        // Add to stats display group
        this.statsDisplayGroup.add(this.enemiesDisplayGroup);
    }
    
    /**
     * Create the ore display section
     * @param {Object} stats - The game statistics
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createOreDisplay(stats, x, y) {
        this.oreDisplayGroup = new THREE.Group();
        this.oreDisplayGroup.position.set(x, y, 0);
        
        // No label text as requested by user
        // The visuals will speak for themselves
        
        // All ore types we want to display (matching case with GameStats.oresMined keys)
        const oreTypes = ['iron', 'copper', 'silver', 'gold', 'platinum'];
        const spacing = 0.25; // Reduced spacing to match the smaller ore size
        
        // Create a visual for each ore type
        oreTypes.forEach((oreType, i) => {
            // Position horizontally, centered
            const xPos = (i - 2) * spacing;
            
            // Get ore config to preserve original colors
            const oreConfig = OreConfig.getOreConfig(oreType);
            
            // Create ore mesh using GeometryFactory's collectible method
            // This is the same approach used in MiningDisplay
            const oreMesh = GeometryFactory.createCollectibleMesh(oreType, 'ore', {
                size: 0.045, // Reduced by 50% from 0.09
                transparent: true,
                opacity: 0.9,
                // Use original color from config
                color: oreConfig ? oreConfig.color : undefined
                // wireframe is set to true by default in createOreMesh
            });
            
            // Make material brighter for better visibility but preserve original color
            if (oreMesh.material) {
                // Only add emissive properties if the material supports it (MeshBasicMaterial doesn't)
                if (oreMesh.material.isMeshStandardMaterial || oreMesh.material.isMeshPhongMaterial) {
                    oreMesh.material.emissive = new THREE.Color(oreMesh.material.color);
                    oreMesh.material.emissiveIntensity = 0.5;
                } else {
                    // For basic materials, just make the color brighter
                    oreMesh.material.color.multiplyScalar(1.2); // Less brightness multiplier to preserve color
                }
            }
            
            oreMesh.position.set(xPos, 0.05, 0.1); // Moved forward for better visibility
            this.oreDisplayGroup.add(oreMesh);
            
            // Create a count display for this ore
            this.createTextDisplay(
                this.oreDisplayGroup, 
                stats.oresMined?.[oreType] || 0,
                xPos,
                -0.12, // Lower position for better spacing with larger ores
                { 
                    fontSize: 22, // Larger font
                    width: 64,
                    height: 32,
                    meshWidth: 0.15,
                    meshHeight: 0.1,
                    color: '#ffffff' // White text
                }
            );
        });
        
        // Add to stats display group
        this.statsDisplayGroup.add(this.oreDisplayGroup);
    }
    
    /**
     * Create the total score display
     * @param {Object} stats - The game statistics
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createTotalScoreDisplay(stats, x, y) {
        this.totalScoreGroup = new THREE.Group();
        this.totalScoreGroup.position.set(x, y, 0);
        
        // Removing the horizontal line above the score as it was causing visual issues
        // We'll just have the score text by itself for a cleaner look
        
        // Only display the score value with a larger font
        // No "TOTAL SCORE" text label as requested
        this.createTextDisplay(
            this.totalScoreGroup,
            stats.score || 0,
            0,
            0, // Moved up to be more visible
            { 
                fontSize: 48, // Increased font size for better visibility
                width: 250, // Wider canvas to accommodate larger numbers
                height: 80, // Taller for larger font
                meshWidth: 1.2, // Wider mesh for larger numbers
                meshHeight: 0.4, // Taller mesh
                color: '#ffff00' // Yellow for score
            }
        );
        
        // Add to stats display group
        this.statsDisplayGroup.add(this.totalScoreGroup);
    }
    
    /**
     * Clean up all display groups
     */
    cleanupDisplayGroups() {
        // Clean up each group
        if (this.statsDisplayGroup) {
            this.group.remove(this.statsDisplayGroup);
            this.disposeGroup(this.statsDisplayGroup);
            this.statsDisplayGroup = null;
        }
        
        // Set all subgroups to null - they're already disposed by disposeGroup
        this.oreDisplayGroup = null;
        this.asteroidDisplayGroup = null;
        this.enemiesDisplayGroup = null;
        this.totalScoreGroup = null;
    }
    
    /**
     * Hide the game over stats
     */
    hide() {
        this.cleanupDisplayGroups();
        this.group.visible = false;
    }
    
    /**
     * Update the component animation
     */
    update() {
        if (!this.group.visible) return;
        
        // Gently pulse the background opacity
        const time = Date.now() * 0.001;
        const opacity = 0.5 + Math.sin(time * 0.5) * 0.1;
        
        if (this.background && this.background.material) {
            this.background.material.opacity = opacity;
        }
        
        // Animate the ore display group
        if (this.oreDisplayGroup) {
            this.oreDisplayGroup.children.forEach(child => {
                // Only rotate ore meshes, not text planes
                if (child.isMesh && child.geometry && 
                    child.geometry.type !== 'PlaneGeometry') {
                    child.rotation.x += 0.01;
                    child.rotation.y += 0.02;
                }
            });
        }
        
        // Animate the asteroid icon
        if (this.asteroidDisplayGroup) {
            this.asteroidDisplayGroup.children.forEach(child => {
                // Check for asteroid using userData flag we added
                if (child.isMesh && child.userData.isAsteroid) {
                    child.rotation.x += 0.02;
                    child.rotation.y += 0.03;
                    child.rotation.z += 0.01;
                }
            });
        }
        
        // Animate the enemy icons - different rotations based on enemy type
        if (this.enemiesDisplayGroup) {
            const time = Date.now() * 0.001; // For smooth oscillations
            
            this.enemiesDisplayGroup.children.forEach(child => {
                // Check for enemy using userData flag we added
                if ((child.isMesh || child.isGroup) && child.userData && child.userData.isEnemy) {
                    const enemyType = child.userData.enemyType;
                    
                    // Different animation patterns for each enemy type
                    switch(enemyType) {
                        case 'ufo':
                            // UFO spins horizontally and slightly bobs up and down
                            child.rotation.y += 0.03;
                            child.position.y = 0.05 + Math.sin(time * 2) * 0.01;
                            break;
                            
                        case 'hunter':
                            // Hunter has a more aggressive back-and-forth banking motion
                            child.rotation.z = Math.sin(time * 3) * 0.15;
                            child.rotation.x += 0.01;
                            child.rotation.y += 0.005;
                            break;
                            
                        case 'bomber':
                            // Bomber slowly rolls and pitches while bombs swing
                            child.rotation.z += 0.005;
                            child.rotation.x = Math.sin(time) * 0.1;
                            child.rotation.y += 0.01;
                            break;
                            
                        case 'patroller':
                            // Patroller hovers with small rotors spinning (slight wobble)
                            child.rotation.y += 0.02;
                            child.rotation.x = Math.sin(time * 2) * 0.05;
                            child.position.y = 0.05 + Math.cos(time * 3) * 0.008;
                            break;
                            
                        case 'tetra':
                            // Tetra rotates on all axes while inner sphere pulses
                            child.rotation.x += 0.01;
                            child.rotation.y += 0.02;
                            child.rotation.z += 0.01;
                            
                            // Pulse the inner sphere if it exists
                            if (child.userData.innerSphere) {
                                // Only modify scale, not color properties
                                const pulseFactor = 0.7 + Math.sin(time * 4) * 0.3;
                                child.userData.innerSphere.scale.set(pulseFactor, pulseFactor, pulseFactor);
                                
                                // Subtly pulse the emissive intensity without changing the color
                                if (child.userData.innerSphere.material) {
                                    // The material should already have emissive set to the proper color in GeometryFactory
                                    // Just modulate the intensity for the pulsing effect
                                    child.userData.innerSphere.material.emissiveIntensity = 0.3 + Math.abs(Math.sin(time * 2)) * 0.7;
                                }
                            }
                            break;
                            
                        default:
                            // Default rotation for any other enemy types
                            child.rotation.y += 0.02;
                    }
                }
            });
        }
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
        // Dispose of background
        if (this.background) {
            this.background.geometry.dispose();
            this.background.material.dispose();
        }
        
        // Clean up all display groups
        this.cleanupDisplayGroups();
    }
    
    /**
     * Recursively dispose all resources in a group
     * @param {THREE.Group} group - The group to dispose
     */
    disposeGroup(group) {
        if (!group) return;
        
        // Process all children
        while (group.children.length > 0) {
            const child = group.children[0];
            
            // Remove from parent
            group.remove(child);
            
            // Check for userData that might contain disposable resources
            if (child.userData) {
                // Special case for tetra which has an inner sphere
                if (child.userData.innerSphere) {
                    if (child.userData.innerSphere.geometry) {
                        child.userData.innerSphere.geometry.dispose();
                    }
                    if (child.userData.innerSphere.material) {
                        if (child.userData.innerSphere.material.map) {
                            child.userData.innerSphere.material.map.dispose();
                        }
                        child.userData.innerSphere.material.dispose();
                    }
                }
                
                // Special case for tetra which has a main mesh
                if (child.userData.mainMesh) {
                    if (child.userData.mainMesh.geometry) {
                        child.userData.mainMesh.geometry.dispose();
                    }
                    if (child.userData.mainMesh.material) {
                        if (child.userData.mainMesh.material.map) {
                            child.userData.mainMesh.material.map.dispose();
                        }
                        child.userData.mainMesh.material.dispose();
                    }
                }
            }
            
            // If it's a group, recursively dispose
            if (child.isGroup) {
                this.disposeGroup(child);
            } 
            // If it's a mesh, dispose its resources
            else if (child.isMesh) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                
                if (child.material) {
                    // Handle arrays of materials
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => {
                            if (material.map) material.map.dispose();
                            material.dispose();
                        });
                    } 
                    // Handle single materials
                    else {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                }
            }
            // If it's a line
            else if (child.isLine) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    child.material.dispose();
                }
            }
        }
    }
}

export default GameOverStatsDisplay;