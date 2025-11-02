/**
 * HUD.js - Heads-Up Display manager
 * Container for all in-game HUD elements in 3D space
 */
import TimerDisplay from './TimerDisplay.js';
import MiningDisplay from './MiningDisplay.js';
import BulletDisplay from './BulletDisplay.js';
import LevelTransitionDisplay from './LevelTransitionDisplay.js';
import DeathIndicator from './DeathIndicator.js';
import GameOverStats from './GameOverStats.js';
import GameCompletionDisplay from './GameCompletionDisplay.js';
import PowerUpDisplay from './PowerUpDisplay.js';
import ScreenFlash from './ScreenFlash.js';
import CollectibleConfig from '../../objects/collectibles/CollectibleConfig.js';
import PowerUpConfig from '../../objects/powers/PowerUpConfig.js';
import gameStats from '../../game/GameStats.js';
import gameStateMachine, { GAME_STATES } from '../../game/GameStateMachine.js';
class HUD {
    constructor(scene, camera, renderer, options = {}) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // Parse options
        const { 
            bulletConfig = { maxCharges: 10, rechargeRate: 500 }
        } = options;
        
        this.bulletConfig = bulletConfig;
        
        // Create the main HUD group as a direct child of the camera
        // This ensures it's always fixed relative to the camera view
        this.hudGroup = new THREE.Group();
        this.camera.add(this.hudGroup);
        
        // Storage for HUD components
        this.components = {};
        
        // Calculate the fixed distance from camera for HUD elements
        // This is based on camera FOV to ensure consistent visual size
        this.calculateHudPlacement();
        
        // No longer adding our own resize handler here - 
        // Game.js will call calculateHudPlacement when the window resizes
        
        // Initialize all components
        this.initializeComponents();
    }
    
    /**
     * Calculate HUD placement parameters based on camera properties
     * This is called on init and window resize
     */
    calculateHudPlacement() {
        // Base distance from camera for HUD elements
        // Negative Z is in front of the camera in camera local space
        this.distance = -1.0;

        let width, height;

        // DOTTY: Handle both OrthographicCamera and PerspectiveCamera
        if (this.camera.isOrthographicCamera) {
            // For orthographic camera, use the frustum dimensions directly
            // The HUD should match the visible area
            width = (this.camera.right - this.camera.left);
            height = (this.camera.top - this.camera.bottom);
        } else {
            // For perspective camera, calculate based on FOV
            const fovRadians = (this.camera.fov * Math.PI) / 180;
            // Use absolute value of distance since we're using negative Z now
            height = 2 * Math.tan(fovRadians / 2) * Math.abs(this.distance);
            width = height * this.camera.aspect;
        }

        // Store edges for easy component placement
        this.edges = {
            left: -width / 2,
            right: width / 2,
            top: height / 2,
            bottom: -height / 2,
            width: width,
            height: height
        };

        // Update existing components if any
        this.updateComponentPositions();
    }
    
    /**
     * Add a component to the HUD
     * @param {string} name - Name identifier for the component
     * @param {Object} component - The component to add
     * @param {Object} position - Position configuration
     * @param {string} position.anchor - Anchor point ('right', 'top-right', etc.)
     * @param {number} position.offsetX - X offset from anchor (default: 0)
     * @param {number} position.offsetY - Y offset from anchor (default: 0)
     */
    addComponent(name, component, position = {}) {
        // Default to center if not specified
        const posConfig = {
            anchor: position.anchor || 'center',
            offsetX: position.offsetX || 0,
            offsetY: position.offsetY || 0
        };
        
        // Store component with position config
        this.components[name] = {
            component,
            position: posConfig
        };
        
        // If the component has a group, add it to the HUD
        if (component.getGroup) {
            const group = component.getGroup();
            if (group) {
                // Position it according to anchor
                this.positionComponentGroup(group, posConfig);
                this.hudGroup.add(group);
            }
        }
        
        return component;
    }
    
    /**
     * Position a component group based on anchor and offsets
     * @param {THREE.Group} group - The component's group
     * @param {Object} posConfig - Position configuration
     */
    positionComponentGroup(group, posConfig) {
        let x = 0, y = 0, z = this.distance; // Z is already negative in this.distance
        
        // Check if this is the special full-width bottom timer
        if (posConfig.anchor === 'bottom-full') {
            // Set the timer bar to span the full width
            // We assume this is the timer's group
            if (group.children.length > 0 && group.children[0].geometry) {
                // Resize to match screen width
                const newWidth = this.edges.width + 0.2; // Make it slightly wider than screen
                group.children[0].geometry.dispose();
                group.children[0].geometry = new THREE.PlaneGeometry(newWidth, 0.01);
                
                // Position at exact bottom of screen
                group.position.set(0, this.edges.bottom, z);
            }
            return;
        }
        
        // Regular component positioning
        // Set base position based on anchor
        switch (posConfig.anchor) {
            case 'left':
                x = this.edges.left + 0.1; // Small margin
                break;
            case 'right':
                x = this.edges.right - 0.1; // Small margin
                break;
            case 'top':
                y = this.edges.top - 0.1;
                break;
            case 'bottom':
                y = this.edges.bottom + 0.1;
                break;
            case 'top-left':
                x = this.edges.left + 0.1;
                y = this.edges.top - 0.1;
                break;
            case 'top-right':
                x = this.edges.right - 0.1;
                y = this.edges.top - 0.1;
                break;
            case 'bottom-left':
                x = this.edges.left + 0.1;
                y = this.edges.bottom + 0.1;
                break;
            case 'bottom-right':
                x = this.edges.right - 0.1;
                y = this.edges.bottom + 0.1;
                break;
            case 'center-right':
                x = this.edges.right - 0.1;
                y = 0;
                break;
            case 'center-left':
                x = this.edges.left + 0.1;
                y = 0;
                break;
            // Default is center (0,0)
        }
        
        // Apply offsets
        x += posConfig.offsetX;
        y += posConfig.offsetY;
        
        // Set position
        group.position.set(x, y, z);
    }
    
    /**
     * Update positions of all components
     * Called after window resize
     */
    updateComponentPositions() {
        Object.values(this.components).forEach(({ component, position }) => {
            if (component.getGroup) {
                const group = component.getGroup();
                if (group) {
                    this.positionComponentGroup(group, position);
                }
            }
        });
    }
    
    /**
     * Get a component by name
     * @param {string} name - The name of the component
     * @returns {Object} The component
     */
    getComponent(name) {
        return this.components[name]?.component;
    }
    
    /**
     * Initialize all HUD components
     * Creates and configures all HUD elements
     */
    initializeComponents() {
        // Create all necessary HUD components
        // We import the classes at the top of the file
        
        // Add mining display component
        const miningDisplay = new MiningDisplay();
        this.addComponent('mining', miningDisplay, {
            anchor: 'center-right',
            offsetX: -0.15,  // More inward offset to fully show the ores and their counts
            offsetY: 0       // Centered vertically
        });
        
        // Add timer display component
        const timerDisplay = new TimerDisplay();
        this.addComponent('timer', timerDisplay, {
            anchor: 'bottom-full' // Special anchor for full-width timer
        });
        
        // Add bullet display component
        const bulletDisplay = new BulletDisplay();
        this.addComponent('bullets', bulletDisplay, {
            anchor: 'center-left',
            offsetX: 0 // Position directly at the left edge
        });
        
        // Add power-up display component
        const powerUpDisplay = new PowerUpDisplay();
        this.addComponent('powerUps', powerUpDisplay, {
            anchor: 'top', // Position at the top center
            offsetY: -0.02 // Small downward offset from the top
        });
        
        // Add level transition display component
        const levelTransitionDisplay = new LevelTransitionDisplay();
        this.addComponent('levelTransition', levelTransitionDisplay, {
            anchor: 'center',
            visible: false // Hidden by default until needed
        });
        
        // Add death indicator component
        const deathIndicator = new DeathIndicator();
        this.addComponent('deathIndicator', deathIndicator, {
            anchor: 'center',
            visible: false // Hidden by default until needed
        });
        
        // Add game over stats display
        const gameOverStats = new GameOverStats();
        this.addComponent('gameOverStats', gameOverStats, {
            anchor: 'center',
            visible: false, // Hidden by default and we'll keep it that way
            skipGameOverDisplay: true // Add a flag to indicate this should never be shown
        });
        
        // Add game completion display
        const gameCompletionDisplay = new GameCompletionDisplay();
        this.addComponent('gameCompletionDisplay', gameCompletionDisplay, {
            anchor: 'center',
            visible: false // Hidden by default until needed
        });
        
        // Add screen flash component for visual feedback
        const screenFlash = new ScreenFlash();
        this.addComponent('screenFlash', screenFlash, {
            anchor: 'center', // Covers the entire screen
            visible: false // Hidden by default until needed
        });
        
        // Connect components with their data sources
        this.connectComponents();
    }
    
    /**
     * Connect components with their data sources
     */
    connectComponents() {
        // Set timer for the timer display if available
        const timerDisplay = this.getComponent('timer');
        if (timerDisplay && this.timer) {
            timerDisplay.setTimer(this.timer);
        }
        
        // Initialize bullet display with config if available
        const bulletDisplay = this.getComponent('bullets');
        if (bulletDisplay && this.bulletConfig) {
            bulletDisplay.setConfig(this.bulletConfig);
        }
        
        // Connect game over stats with mining display
        const gameOverStats = this.getComponent('gameOverStats');
        const miningDisplay = this.getComponent('mining');
        if (gameOverStats && miningDisplay) {
            gameOverStats.setMiningDisplay(miningDisplay);
        }
    }
    
    /**
     * Check if player has enough bullet charges to shoot
     * @returns {boolean} True if player can shoot
     */
    canShoot() {
        const bulletDisplay = this.getComponent('bullets');
        return bulletDisplay ? bulletDisplay.canShoot() : true;
    }
    
    /**
     * Use a bullet charge
     */
    useCharge() {
        const bulletDisplay = this.getComponent('bullets');
        if (bulletDisplay) {
            bulletDisplay.useCharge();
        }
    }
    
    /**
     * Update the HUD and all components
     * Called each frame
     * Note: For future optimization, we could throttle updates to reduce performance impact
     */
    update() {
        // The HUD group is now a direct child of the camera,
        // so we don't need to update its position or rotation
        // This ensures it's always fixed relative to the camera view
        
        /* 
        // PERFORMANCE OPTIMIZATION (currently disabled):
        // Throttle updates to 4 times per second (250ms) to save on performance
        // This is commented out as you requested to not implement throttling yet
        // To enable, uncomment the following code:
        
        // Create lastUpdateTime property if it doesn't exist yet
        this.lastUpdateTime = this.lastUpdateTime || 0;
        const now = Date.now();
        const updateInterval = 250; // 4 updates per second (250ms)
        
        // Only update HUD components at the specified interval
        if (now - this.lastUpdateTime >= updateInterval) {
            this.lastUpdateTime = now;
            
            // Update all components at the lower frequency
            Object.values(this.components).forEach(({ component }) => {
                if (component.update) {
                    if (component.update.length > 0) {
                        component.update(this.renderer);
                    } else {
                        component.update();
                    }
                }
            });
        }
        */
        
        // Regular full-speed updates (default behavior)
        // Update all components
        Object.values(this.components).forEach(({ component }) => {
            if (component.update) {
                // Pass renderer to components that might need it (like LevelTransitionDisplay)
                if (component.update.length > 0) {
                    component.update(this.renderer);
                } else {
                    component.update();
                }
            }
        });
        
        // Update component visibility based on game state
        this.updateComponentVisibility();
    }
    
    /**
     * Update component visibility based on game state
     * Hides certain HUD elements when the game is over
     */
    updateComponentVisibility() {
        // Get the current game state
        const currentState = gameStateMachine.getCurrentState();
        
        // Components to hide during game over
        const bulletDisplay = this.getComponent('bullets');
        const timerDisplay = this.getComponent('timer');
        const miningDisplay = this.getComponent('mining');
        
        // Hide bullet display, timer display, and mining display when game is over
        if (bulletDisplay && bulletDisplay.getGroup) {
            const group = bulletDisplay.getGroup();
            if (group) {
                group.visible = currentState !== GAME_STATES.GAME_OVER;
            }
        }
        
        if (timerDisplay && timerDisplay.getGroup) {
            const group = timerDisplay.getGroup();
            if (group) {
                group.visible = currentState !== GAME_STATES.GAME_OVER;
            }
        }
        
        if (miningDisplay && miningDisplay.getGroup) {
            const group = miningDisplay.getGroup();
            if (group) {
                group.visible = currentState !== GAME_STATES.GAME_OVER;
            }
        }
    }
    
    /**
     * Toggle visibility of the HUD
     */
    toggleVisibility() {
        return this.setVisibility(!this.visible);
    }
    
    /**
     * Set HUD visibility explicitly
     * @param {boolean} visible - Whether the HUD should be visible
     * @returns {boolean} The new visibility state
     */
    setVisibility(visible) {
        this.visible = visible;
        this.hudGroup.visible = this.visible;
        
        // When showing, recalculate placement to ensure correct positioning
        if (this.visible) {
            this.calculateHudPlacement();
        }
        
        return this.visible;
    }
    
    /**
     * Check if the HUD is currently visible
     * @returns {boolean} Whether the HUD is visible
     */
    isVisible() {
        return this.visible || false;
    }
    
    /**
     * Handle player death event
     * @param {string} customMessage - Optional custom message to show
     */
    onPlayerDeath(customMessage = null) {
        console.log("Showing death sequence in HUD");
        
        const deathIndicator = this.getComponent('deathIndicator');
        const gameOverStats = this.getComponent('gameOverStats');
        
        if (deathIndicator) {
            // Show death indicator first with custom message if provided
            deathIndicator.show(() => {
                // After death animation completes, hide death indicator
                deathIndicator.hide();
                
                // Update component visibility to reflect game over state
                this.updateComponentVisibility();
                
                // No need to show 3D stats - HTML overlay will handle it
            }, customMessage);
        } else {
            console.error("Missing death sequence components in HUD");
        }
    }
    
    /**
     * Handle game completion event
     */
    onGameComplete() {
        console.log("Showing game completion sequence in HUD");
        
        const completionDisplay = this.getComponent('gameCompletionDisplay');
        
        if (completionDisplay) {
            // Show completion indicator first
            completionDisplay.show(() => {
                // After completion animation finishes, hide completion display
                completionDisplay.hide();
                
                // No need to show 3D stats - HTML overlay will handle it
            });
        } else {
            console.error("Missing game completion components in HUD");
        }
    }
    
    /**
     * Handle level transition
     * @param {number} nextLevelId - ID of the next level
     * @param {Function} completionCallback - Callback to execute when transition is done
     * @param {number} duration - Duration of the transition in ms
     * @param {boolean} waitForClick - Whether to wait for user click to continue
     */
    onLevelTransition(nextLevelId, completionCallback, duration = 3000, waitForClick = false) {
        const levelTransition = this.getComponent('levelTransition');
        if (levelTransition) {
            // console.log(`Showing level transition for level ${nextLevelId}, waitForClick=${waitForClick}`);
            // Show the level transition with the next level's ore
            levelTransition.showNextLevelOre(nextLevelId, completionCallback, duration, waitForClick);
        } else {
            console.error("Missing level transition component in HUD");
            // Fallback to directly calling completion callback
            setTimeout(completionCallback, 500);
        }
    }
    
    /**
     * Update mining resources display
     * @param {Object} resources - Object containing resource counts
     */
    updateResources(resources) {
        const miningDisplay = this.getComponent('mining');
        if (miningDisplay) {
            miningDisplay.updateResources(resources);
        }
    }
    
    /**
     * Highlight a specific ore type in the mining display
     * @param {string} oreType - The type of ore to highlight
     */
    highlightOre(oreType) {
        const miningDisplay = this.getComponent('mining');
        if (miningDisplay) {
            miningDisplay.highlightOre(oreType);
        }
        
        // Flash the screen with the ore's color
        this.flashScreenForOre(oreType);
    }
    
    /**
     * Flash the screen with the color of a collected ore
     * @param {string} oreType - The type of ore collected
     */
    flashScreenForOre(oreType) {
        // Get collectible color from CollectibleConfig
        const oreConfig = CollectibleConfig.getCollectibleConfig(oreType);
        if (!oreConfig) return;
        
        // Use the general flash method
        this.flash(oreConfig.color, 0.3, 300); // 300ms flash duration
    }
    
    /**
     * Add a power-up to the HUD display
     * @param {Object} powerUp - The power-up object to display
     */
    addPowerUp(powerUp) {
        const powerUpDisplay = this.getComponent('powerUps');
        if (powerUpDisplay) {
            powerUpDisplay.addPowerUp(powerUp);
        }
        
        // Flash the screen with the power-up's color
        this.flashScreenForPowerUp(powerUp);
    }
    
    /**
     * Flash the screen with the color of a collected power-up
     * @param {Object} powerUp - The power-up object
     */
    flashScreenForPowerUp(powerUp) {
        if (!powerUp) return;
        
        // Get power-up type and color
        const powerUpType = powerUp.getType?.() || null;
        if (!powerUpType) return;
        
        // Get power-up color from the power-up object or config
        const color = powerUp.getColor?.() || (PowerUpConfig.getPowerUpConfig(powerUpType)?.color) || 0xFFFFFF;
        
        // Use the general flash method instead of directly accessing screenFlash
        this.flash(color, 0.3, 300); // 300ms flash duration
    }
    
    /**
     * Flash the screen with a custom color
     * @param {number} color - The color to flash in hex format (e.g., 0xff0000 for red)
     * @param {number} opacity - The maximum opacity of the flash (0-1)
     * @param {number} duration - Duration of the flash in milliseconds
     */
    flash(color, opacity = 0.3, duration = 300) {
        const screenFlash = this.getComponent('screenFlash');
        if (!screenFlash) return;
        
        screenFlash.flash(color, opacity, duration);
    }
    
    /**
     * Remove a power-up from the display by type
     * @param {string} type - The type of power-up to remove
     */
    removePowerUp(type) {
        const powerUpDisplay = this.getComponent('powerUps');
        if (powerUpDisplay) {
            // Find the power-up by type
            const index = this.findPowerUpIndexByType(type);
            if (index !== -1) {
                powerUpDisplay.removePowerUp(index);
            }
        }
    }
    
    /**
     * Find the index of a power-up by its type
     * @param {string} type - The type of power-up to find
     * @returns {number} The index of the power-up, or -1 if not found
     * @private
     */
    findPowerUpIndexByType(type) {
        const powerUpDisplay = this.getComponent('powerUps');
        if (!powerUpDisplay || !powerUpDisplay.activePowerUps) return -1;
        
        // Find the power-up with the matching type
        return powerUpDisplay.activePowerUps.findIndex(
            powerUp => powerUp.data && powerUp.data.type === type
        );
    }
    
    /**
     * Handle clicks for the HUD
     * @returns {boolean} True if the click was handled by any HUD component
     */
    handleClick() {
        // console.log("[HUD] handleClick called");
        
        // Check if level transition component needs to handle the click
        const levelTransition = this.getComponent('levelTransition');
        // console.log("[HUD] Level transition component exists:", !!levelTransition);
        
        if (levelTransition && levelTransition.handleClick) {
            // Try to handle click in level transition display
            // console.log("[HUD] Delegating click to level transition component");
            try {
                if (levelTransition.handleClick()) {
                    // console.log("[HUD] Level transition handled click successfully");
                    return true;
                } else {
                    // console.log("[HUD] Level transition did not handle the click");
                }
            } catch (error) {
                console.error("[HUD] Error in level transition handleClick:", error);
            }
        }
        
        // Add other click handlers for HUD components here if needed
        
        // console.log("[HUD] No HUD component handled the click");
        return false; // No HUD component handled the click
    }
    
    /**
     * Show the HUD game elements
     */
    showHUD() {
        console.log("[HUD] Showing HUD elements");
        this.setVisibility(true);
    }
}

export default HUD;