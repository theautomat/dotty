// Cascade edit access test comment
/**
 * Game.js - Main game controller
 * Handles initialization, game loop, and core game state
 */

import Asteroid from '../objects/Asteroid';
import WorldBoundary from '../objects/WorldBoundary';
import { HUD } from '../objects/hud/index.js';
import { levelManager, LevelConfig, Timer } from './index.js';
import gameStateMachine, { GAME_STATES } from './GameStateMachine';
import gameStats from './GameStats';
import { initFingerprint } from '../scripts/fingerprint.js';
import soundManager from '../managers/SoundManager';
import powerUpManager from '../managers/PowerUpManager';
import GameTheme from './GameTheme';
import Controls from './Controls';
import webRTCClient from '../scripts/webrtc-client.js';
import gameState from './GameState';
import { initHelpMenu, updateHelpMenu, toggleHelpMenu } from '../components/HelpMenu.js';
import { initGameOverOverlay } from '../components/GameOverOverlay.js';
import { initEntryScreen, showEntryScreen, hideEntryScreen } from '../components/EntryScreen.js';
import { initControlsBar, showControlsBar } from '../components/ControlsBar.js';
import GeometryFactory from '../objects/shapes/GeometryFactory';
import collectibleManager from '../managers/CollectibleManager'; // Import collectibleManager singleton
import GameConfig from './GameConfig'; // Import the GameConfig for global settings
import BulletConfig from '../objects/BulletConfig'; // Import BulletConfig for bullet collision radius
import asteroidManager from '../managers/AsteroidManager';
import bulletManager from '../managers/BulletManager';
import explosionManager from '../managers/ExplosionManager.js';
import collisionManager from '../managers/CollisionManager'; // Import the CollisionManager
import enemyManager from '../managers/EnemyManager'; // Import enemyManager for enemy spawning
import ASCIIEffect from '../effects/ASCIIEffect.js'; // Import ASCII effect for retro rendering

class Game {
    constructor() {
        // Game variables
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.gameState = gameState; // Assign imported gameState to the instance
        
        // Managers for game objects etc, remove add memory etc
        this.asteroidManager = null;
        this.powerUpManager = null; // Reference to the powerUpManager singleton
        this.explosionManager = null; // Reference to explosionManager singleton
        this.bulletManager = null; // Reference to bulletManager singleton
        this.collectibleManager = null; // Reference to collectibleManager singleton
        this.enemyManager = null; // Reference to enemyManager singleton
        
        // Score is now handled by GameStats
        
        // Frame counting for debug info
        this.frameCount = 0;
        
        // Bind animate method once in constructor
        this.animate = this.animate.bind(this);
        
        // World boundary - handles all out-of-bounds logic
        this.worldBoundary = null;
        
        // Game state flags
        this.gameInitialized = false; // Flag to track if the game has been initialized
        // All game state is now managed by GameStateMachine
        
        // HUD system - single entry point to all HUD components
        this.hud = null;
        
        // Game timer - managed by Game class, displayed by HUD
        this.timer = null;
        
        // Game state is now fully managed by GameStateMachine
        
        // Help menu variables
        this.helpMenuVisible = false;
        
        // Simple FPS tracking
        this.lastTime = null;
        this.fps = 0;
        
        // Delta time for physics updates
        this.deltaTime = 0;
        
        // Initialize clock for animation timing
        this.clock = new THREE.Clock();
        
        // Game world constants - use values from GameConfig
        this.WORLD_SIZE = GameConfig.world.size; // Size of the world boundary cube
        
        // Controls system
        this.controls = null;
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        // GameStats is already a singleton and available globally
        
        // Instantiate Geometry Factory (needed by AsteroidManager)
        this.geometryFactory = new GeometryFactory();
        
        // ASCII effect renderer (initialized in init())
        this.asciiEffect = null;

        // Boundary flash callback is now handled directly by the WorldBoundary class
    }

    /**
     * Initialize the game
     */
    async init() {
        // WebRTC initialization and state sync setup
        this.webRTCEnabled = window.ENABLE_MULTIPLAYER || false;
        this.lastStateSync = 0;
        this.stateSyncInterval = 33; // 33ms - 30 updates per second for ultra-smooth movement (near 30 FPS)
        
        
        // Set initial WebRTC variables but DON'T INITIALIZE YET
        // This is a CRITICAL change - we need to wait for GameSessionManager
        if (this.webRTCEnabled) {
            // Initialize GameState with reference to this game instance
            this.gameState.game = this;
            
            // Save refs for later initialization
            this.webRTCClient = webRTCClient;
            window.webRTCClient = webRTCClient;
            
            // Set up callback for receiving game state through WebRTC
            webRTCClient.onGameStateReceived = (receivedState) => {
                // Removed for now
            };
        }
        
        // Initialize Preact help menu
        initHelpMenu();
        
        // Initialize the game over overlay
        initGameOverOverlay();
        
        // Initialize the entry screen overlay
        initEntryScreen();
        
        // Initialize the controls bar
        initControlsBar();
        
        try {
            // Set initial game state
            gameStateMachine.transitionTo(GAME_STATES.INIT);
            
            // Initialize fingerprinting for user identification - this is needed for game analytics
            const visitorId = await initFingerprint();
            
            // Store the fingerprint ID globally
            window.userFingerprint = visitorId;
            
            // Initialize gameStats singleton with the fingerprint ID
            // This needs to be awaited because it initializes Firebase in the background
            await gameStats.initialize(visitorId);
            
            // Track game initialization
            gameStats.trackEvent('game_initialized', {
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                is_mobile: this.isMobile
            });
            
            // Mobile controls now handled by Controls
        } catch (error) {
            console.error('Failed to initialize services:', error);
        }
        
        // Create the scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000); // Black background for now

        // DOTTY: Top-down orthographic camera looking down at the world
        const aspect = window.innerWidth / window.innerHeight;
        const viewSize = 50; // How much of the world we can see
        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspect, // left
            viewSize * aspect,  // right
            viewSize,           // top
            -viewSize,          // bottom
            0.1,                // near
            1000                // far
        );
        // Position camera above the world, looking straight down
        this.camera.position.set(0, 100, 0);
        this.camera.lookAt(0, 0, 0);
        this.scene.add(this.camera);

        // DOTTY: Add a grid ground plane so we can see movement
        const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x222222); // size 200, 20 divisions
        gridHelper.rotation.x = 0; // Grid is already horizontal
        this.scene.add(gridHelper);

        // DOTTY: Create the player character (simple circle for now)
        // TODO: Move this to /src/objects/Player.js or Dotty.js
        const dotGeometry = new THREE.CircleGeometry(2, 32); // radius 2, 32 segments for smooth circle
        const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green dot
        this.playerDot = new THREE.Mesh(dotGeometry, dotMaterial);
        this.playerDot.rotation.x = -Math.PI / 2; // Rotate to face up (circle is in XY plane by default)
        this.playerDot.position.set(0, 0.1, 0); // Slightly above ground so it's visible
        this.scene.add(this.playerDot);
        
        // Make camera available globally for Hunter and other enemies to use
        window.mainCamera = this.camera;
        
        // Begin initializing singleton manager instances
        this.explosionManager = explosionManager;
        this.explosionManager.init({ scene: this.scene });
        
        // Initialize singleton managers using a consistent pattern
        this.collectibleManager = collectibleManager;
        this.powerUpManager = powerUpManager;

        // Initialize power-up manager with the game instance
        this.powerUpManager.init(this);
        
        // Initialize collectible manager with the game instance and scene
        this.collectibleManager.scene = this.scene;
        this.collectibleManager.init(this);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer();//{ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        //this.renderer.setPixelRatio(window.devicePixelRatio); // Ensure proper pixel ratio
        
        // Set cursor style via CSS
        
        document.body.appendChild(this.renderer.domElement);
        
        // Initialize ASCII effect renderer
        this.asciiEffect = new ASCIIEffect(this.renderer, ' .:-=+*#%@', {
            resolution: 0.2,     // Slightly higher resolution for more details
            scale: 1,            // Default scale
            color: false,        // No color to maintain retro look
            enabled: false       // Disabled by default
        });
        
        // Create distant stars (simple dots)
        this.createStars();
        
        // No need for collectible factory - we'll use Collectible directly with CollectibleConfig
        
        // Initialize world boundary
        this.worldBoundary = new WorldBoundary(this.scene, this.WORLD_SIZE);
        
        // Initialize 3D HUD system with renderer
        this.initHUD();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        
        // Initialize remaining manager singletons
        
        this.asteroidManager = asteroidManager;
        this.bulletManager = bulletManager;
        this.enemyManager = enemyManager;
        
        // Initialize bullet manager with scene
        this.bulletManager.init({ scene: this.scene });
        
        // Initialize asteroid manager with scene and configure its references to other managers
        this.asteroidManager.init({ scene: this.scene });
        this.asteroidManager.explosionManager = this.explosionManager;
        this.asteroidManager.collectibleManager = this.collectibleManager;
        this.asteroidManager.powerUpManager = this.powerUpManager;
        
        // Initialize enemy manager with all the necessary references
        this.enemyManager.init({
            scene: this.scene,
            camera: this.camera,
            explosionManager: this.explosionManager,
            collectibleManager: this.collectibleManager,
            powerUpManager: this.powerUpManager,
            gameStateMachine: gameStateMachine
        });
        
        
        // NOW initialize the levelManager with all required references
        // Access levelManager from the import on line 10
        
        this.levelManager = levelManager;
        this.levelManager.init({
            scene: this.scene,
            camera: this.camera,
            hud: this.hud,
            managers: {
                asteroidManager: this.asteroidManager,
                bulletManager: this.bulletManager,
                collectibleManager: this.collectibleManager,
                explosionManager: this.explosionManager,
                powerUpManager: this.powerUpManager,
                enemyManager: this.enemyManager,
                enemyProjectiles: this.enemyProjectiles
            }
        });
        
        // CRITICAL FIX: Make the game instance available globally
        // This ensures webrtc-test.js can access game.onGameStateReceived
        window.game = this;
        
        // Fetch first level config for initial control settings
        const initialLevelConfig = LevelConfig.getLevelById(1);
        const initialModifiers = initialLevelConfig ? initialLevelConfig.levelModifiers : {};

        // Initialize controls system
        this.controls = new Controls({
            camera: this.camera,
            renderer: this.renderer,
            player: this.playerDot, // DOTTY: Pass player object to controls
            helpToggleCallback: (visible) => {
                // Handle help menu toggle
                this.helpMenuVisible = visible;
                if (visible) {
                    this.updateDebugInfo();
                }
            },
            // Pass HUD's click handler to allow level transitions to work
            hudClickCallback: () => {
                if (this.hud) {
                    return this.hud.handleClick();
                }
            },
            // Add world boundary toggle callback
            worldBoundaryToggleCallback: () => {
                if (this.worldBoundary) {
                    return this.worldBoundary.toggle();
                }
            },
            // Pass game state information for direct bullet manager access
            hud: this.hud,
            gameStateMachine: gameStateMachine,
            // Pass initial modifiers for control setup
            initialModifiers: initialModifiers
        });
        // console.log("Controls initialized with options:", this.controls);
        
        // Initialize the CollisionManager with references to all managers
        collisionManager.init({
            asteroidManager: this.asteroidManager,
            bulletManager: this.bulletManager,
            collectibleManager: this.collectibleManager,
            explosionManager: this.explosionManager,
            enemyManager: this.enemyManager,
            camera: this.camera,
            playerDot: this.playerDot,  // DOTTY: Add player reference for 2D collision detection
            shipCollisionRadius: GameConfig.ship.collisionRadius,
            powerUpManager: this.powerUpManager,  // Add powerUpManager reference
            levelManager: this.levelManager  // Add levelManager reference
        });
        
        // Make collisionManager globally available for other components that need it
        window.collisionManager = collisionManager;
        
        // Set callback for asteroid destruction (scoring, enemy spawning etc.)
        this.asteroidManager.onAsteroidDestroyed = (destroyedAsteroid) => {
            // Check if the handler exists before calling
            if (typeof this.handleAsteroidDestruction === 'function') {
                this.handleAsteroidDestruction(destroyedAsteroid);
            } else {
                console.warn('Asteroid destroyed, but handleAsteroidDestruction method not found!');
            }
        };
        
        // Initialize the gameStateMachine
        // DOTTY: Pass null for HUD since it's disabled
        gameStateMachine.init(soundManager, this.hud || null);

        // Show the entry screen overlay
        showEntryScreen(() => {
            console.log("Entry screen callback executed - requesting pointer lock");
            
            // When the "start" button is clicked on the second screen
            if (this.renderer && this.renderer.domElement) {
                console.log("Found renderer.domElement, requesting pointer lock");
                
                // Try to request pointer lock
                try {
                    this.renderer.domElement.requestPointerLock();
                    
                    // Also ensure the crosshair is visible
                    const crosshair = document.getElementById('crosshair');
                    if (crosshair) {
                        crosshair.style.display = 'block';
                    }
                    
                    // Additional fallback: try again after a short delay
                    setTimeout(() => {
                        if (!document.pointerLockElement) {
                            console.log("Pointer lock not established, trying again after delay");
                            this.renderer.domElement.requestPointerLock();
                        }
                    }, 100);
                } catch (e) {
                    console.error("Error requesting pointer lock:", e);
                }
            } else {
                console.warn("No renderer.domElement found to request pointer lock");
            }

            // DOTTY: Temporarily disable level/asteroid/enemy spawning
            // Start the game using the LevelManager
            // LevelManager will handle loading the first level
            // this.levelManager.startGame();

            // DOTTY: Spawn test treasures for collision testing
            // Position at Y=6 so the ore (size 11) sits on the grid at Y=0
            this.collectibleManager.spawnCollectible(new THREE.Vector3(10, 6, 10), 'iron', 100, 300000);
            this.collectibleManager.spawnCollectible(new THREE.Vector3(-15, 6, 5), 'copper', 150, 300000);

            // Transition to PLAYING state
            gameStateMachine.transitionTo(GAME_STATES.PLAYING);
        });

        // Start the game loop
        this.animate();
    }

    /**
     * Initialize the HUD system
     */
    initHUD() {
        // DOTTY: Temporarily disable HUD - will rebuild a simpler 2D HUD later
        // The 3D HUD was designed for perspective camera and needs significant updates

        // this.hud = new HUD(
        //     this.scene,
        //     this.camera,
        //     this.renderer,
        //     {
        //         // No timer passed - LevelManager will update the HUD's timer display directly
        //         bulletConfig: {
        //             maxCharges: 10,
        //             rechargeRate: 100 // Much faster recharge rate (was 500ms)
        //         }
        //     }
        // );

    }
    
    /**
     * Initialize WebRTC after GameSessionManager is ready
     * This is CRITICAL - must be called after GameSessionManager is initialized
     */
    initWebRTC() {
        if (!this.webRTCEnabled || !this.webRTCClient) {
            console.log('[GAME-WEBRTC] WebRTC not enabled or client not available');
            return;
        }
        
        // Check if GameSessionManager is available
        if (!window.gameSessionManager) {
            console.error('[GAME-WEBRTC] GameSessionManager still not available - cannot initialize WebRTC');
            return;
        }
        
        // Get session info
        const sessionInfo = window.gameSessionManager.getSessionInfo();
        console.log(`[GAME-WEBRTC] Initializing connection with GameSessionManager info - gameId=${sessionInfo.gameId}, role=${sessionInfo.isCaptain ? 'CAPTAIN' : 'CREW'}`);
        
        // Store the callback before initialization
        const originalCallback = this.webRTCClient.onGameStateReceived;
        
        try {
            // Initialize WebRTC client
            console.log('[GAME-WEBRTC] Calling init() on webRTCClient with session info');
            this.webRTCClient.init({
                roomId: sessionInfo.gameId,
                requestPrimary: sessionInfo.isCaptain,
            }).then(success => {
                console.log("[GAME-WEBRTC] Connection initialized:", success ? "SUCCESS" : "FAILED");
                
                // Restore our callback in case it was overwritten
                this.webRTCClient.onGameStateReceived = originalCallback;
                console.log("[GAME-WEBRTC] Restored Game.js callback for WebRTC data");
            }).catch(error => {
                console.error('[GAME-WEBRTC] Error during WebRTC init:', error);
            });
        } catch (error) {
            console.error('[GAME-WEBRTC] Exception calling webRTCClient.init():', error);
        }
    }


    /**
     * Create a simple star field in the background
     */
    createStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: GameTheme.scene.stars,
            size: GameTheme.scene.starsSize
        });
        
        const starsVertices = [];
        // Create more stars for the larger view distance - 4x the stars, distributed much further
        for (let i = 0; i < 6000; i++) {
            const x = (Math.random() - 0.5) * this.WORLD_SIZE * 8; // Much wider distribution
            const y = (Math.random() - 0.5) * this.WORLD_SIZE * 8;
            const z = (Math.random() - 0.5) * this.WORLD_SIZE * 8;
            starsVertices.push(x, y, z);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const starField = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(starField);
    }

    // setupControls method removed - functionality moved to Controls

    /**
     * Handle window resizing
     */
    onWindowResize() {
        // For mobile devices in portrait, we've forced landscape via CSS transform
        // So we need to swap width and height for the camera aspect ratio
        let width = window.innerWidth;
        let height = window.innerHeight;
        
        // Check if we're on mobile and in portrait mode
        if (this.isMobile && window.innerHeight > window.innerWidth) {
            // Swap dimensions for the camera aspect calculation
            width = window.innerHeight;
            height = window.innerWidth;
        }
        
        // Update camera aspect ratio and projection matrix
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Resize renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Resize ASCII effect if it exists
        if (this.asciiEffect) {
            this.asciiEffect.setSize(window.innerWidth, window.innerHeight);
        }
        
        // Update HUD elements if they exist
        if (this.hud) {
            // Force HUD to recalculate placement
            this.hud.calculateHudPlacement();
        }
        
        console.log(`Window resized: ${width}x${height} (original: ${window.innerWidth}x${window.innerHeight})`);
    }

    /**
     * Create a bullet from the ship's position in the direction it's facing
     */
    shoot() {
        console.log('Shooting bullet from ship');
        console.log('[GAME] Shoot method called - trying to shoot bullet');
        
        // Don't allow shooting if controls should be locked based on game state
        if (gameStateMachine.shouldLockControls()) {
            console.log('[GAME] Cannot shoot - controls locked');
            return;
        }
        
        // Create a new bullet using the BulletManager's shootBulletFromCamera method
        if (this.bulletManager) {
            console.log('[GAME] Calling bulletManager.shootBulletFromCamera');
            const bullet = this.bulletManager.shootBulletFromCamera({
                camera: this.camera,
                velocity: this.velocity ? this.velocity.clone() : new THREE.Vector3(0, 0, 0),
                hud: this.hud,
                gameStateMachine: gameStateMachine
            });
            
            if (bullet) {
                console.log('[GAME] Successfully created bullet');
            } else {
                console.log('[GAME] Failed to create bullet');
            }
        } else {
            console.warn("[GAME] BulletManager not available! Cannot create bullet.");
        }
        
        // Play the bullet firing sound
        // No need to handle here as BulletManager already plays the sound
        
        // Track shot fired in game stats
        gameStats.shotFired();
    }

    // Level management is handled entirely by LevelManager
    
    /**
     * Initializes a level, clearing previous state and setting up new objects.
     * @param {object} levelConfig - Configuration object for the level.
     * @param {boolean} isFirstLevel - Flag indicating if this is the very first level.
     * @param {boolean} isInitialSpawn - Flag indicating if this is the initial setup (vs. mid-game transition).
     */
    initializeLevel(levelConfig, isFirstLevel = false, isInitialSpawn = false) {
        // Delegate to LevelManager
        this.levelManager.initializeLevel(levelConfig, isFirstLevel, isInitialSpawn);
        // Game state is now fully managed by gameStateMachine
    }

    /**
     * Animation loop
     * @param {number} timestamp - Current timestamp
     */
    animate(timestamp) {
        // Store current timestamp for use in other methods
        this.timestamp = timestamp;
        
        // Increment frame counter for logging
        this.frameCount++;
        
        // Log performance at start of game
        if (this.frameCount === 1) {
        }
        
        // HUD should always be updated regardless of game state
        // This is critical for transitions, menus, etc. to work correctly
        if (this.hud) {
            this.hud.update();
        }
        
        // Determine if game objects should be updated based on game state
        // We update objects during PLAYING and TRANSITIONING states
        const shouldUpdateGameObjects = 
            gameStateMachine.isInState(GAME_STATES.PLAYING) || 
            gameStateMachine.isInState(GAME_STATES.TRANSITIONING);
        
        if (shouldUpdateGameObjects) {
            // Initialize clock if it doesn't exist
            if (!this.clock) {
                this.clock = new THREE.Clock();
            }
            
            // Calculate delta time with max limit to avoid large jumps
            const deltaTime = Math.min(0.1, this.clock.getDelta());
            this.deltaTime = deltaTime;
            
            // Handle player ship movement (also moves camera)
            this.handlePlayerMovement();
            
            // Core game updates - order matters for collision detection
            this.updateAsteroids(deltaTime);
            this.updateOres(deltaTime);
            this.updateBullets(deltaTime);
            this.updateExplosions(); // Enable explosion updates
            this.updatePowerUps(deltaTime); // Update power-ups
            
            // Update enemies - using the manager directly
            if (this.enemyManager) {
                this.enemyManager.update(deltaTime);
            }
            
            // Check for collisions only during PLAYING state
            if (gameStateMachine.isInState(GAME_STATES.PLAYING)) {
                // Let CollisionManager handle all collision detection and delegate to object managers
                collisionManager.checkCollisions();
            }
            
            // Update the LevelManager (which will update the timer internally)
            this.levelManager.update(deltaTime);
        }
        
        // Render the scene - use ASCII effect if enabled, otherwise use normal renderer
        if (this.asciiEffect && this.asciiEffect.isEnabled) {
            this.asciiEffect.render(this.scene, this.camera);
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        
        // Continue the animation loop
        requestAnimationFrame(this.animate);
    }

    /**
     * Update asteroid positions and rotations
     */
    updateAsteroids(deltaTime) { 
        if (!this.asteroidManager) return;
        
        // Let AsteroidManager handle the updates internally
        // This is safer than iterating through all asteroids directly
        if (typeof this.asteroidManager.update === 'function') {
            // Add a special parameter to indicate we want boundary wrap logging
            this.asteroidManager.update(deltaTime, true); // Pass true to enable wrap logging
        } else {
            console.error("AsteroidManager missing update method");
        }
    }
    
    /**
     * Update ores positions
     * @param {number} deltaTime - Time in milliseconds since last frame
     */
    updateOres(deltaTime) {
        // Only update the ores (movement, lifespan, etc.)
        // DOTTY: Use playerDot position for 2D top-down collision detection
        if (this.playerDot && this.playerDot.position) {
            this.collectibleManager.update(deltaTime, this.playerDot.position);
        }
    }
    
    /**
     * Update bullet positions and lifetime
     * @param {number} deltaTime - Time in milliseconds since last frame
     */
    updateBullets(deltaTime) {
        if (!this.bulletManager) {
            // Only log occasionally to avoid spam
            if (Math.random() < 0.01) {
                console.log("[BULLET-UPDATE] No bullet manager available in updateBullets");
            }
            return;
        }
        
        // Delegate update to the bulletManager
        this.bulletManager.update(deltaTime || this.deltaTime);
    }
    
    // checkOreCollisions method removed - now handled by CollisionManager
    
    // Enemy projectile creation has been moved to EnemyManager
    
    // Enemy update functions have been moved to EnemyManager
    
    // Enemy spawning is now handled by EnemyManager

    /**
     * Handle player movement based on controls
     */
    handlePlayerMovement() {
        // Let the Controls class handle all movement physics and camera updates
        this.controls.update();
        
        // Store velocity from Controls for other systems that might need it
        this.velocity = this.controls.getVelocity();
        
        // Early return if not playing or no world boundary
        if (!this.worldBoundary || !gameStateMachine.isInState(GAME_STATES.PLAYING)) {
            return;
        }
        
        // Check if player is out of bounds
        const shouldDie = this.worldBoundary.checkOutOfBounds(this.camera.position, this.hud);
        
        // If player was outside too long, trigger death
        if (shouldDie) {
            this.playerDied();
        }
    }
    
    /**
     * Handle camera movement for crew members (limited controls)
     * Crew can look around but not move or shoot
     */
    handleCrewCameraMovement() {
        // No-op - crew view is controlled by captain data
        // This ensures we don't accidentally modify the camera
    }
    
    
    /**
     * Update camera position based on received state (for crew)
     * Commented out during refactoring
     */
    /*
    updateCameraFromReceivedState(receivedState) {
        if (!receivedState || !receivedState.playerPosition) return;
        
        // Get the captain's position and rotation
        const captainPosition = new THREE.Vector3().fromArray(receivedState.playerPosition);
        const captainRotation = new THREE.Quaternion().fromArray(receivedState.playerRotation);
        
        // Make crew camera identical to captain camera
        // This gives them the same view, as if looking through the same window
        this.camera.position.copy(captainPosition);
        this.camera.quaternion.copy(captainRotation);
    }
    */
    
    /**
     * Handles crew camera movement (intentionally minimal)
     * Crew view should match captain's view
     * Commented out during refactoring
     */
    /*
    handleCrewCameraMovement() {
        // No-op - crew view is controlled by captain data
        // This ensures we don't accidentally modify the camera
    }
    */
    

    // checkCollisions method removed - now handled by CollisionManager

    // checkShipAsteroidCollisions method removed - now handled by CollisionManager

    /**
     * Handle ship collision with asteroid
     */
    handleShipCollision(logicalAsteroid) { // Accept logical asteroid
        // Delegate to LevelManager
        this.levelManager.handleShipCollision(logicalAsteroid);
        // Game state is now managed by gameStateMachine, no need to sync locally
    }

    /**
     * Handle player death with a custom message
     * @param {string} message - The custom death message to display
     */
    playerDied(message = "Ship destroyed!") {
        // Delegate to LevelManager
        this.levelManager.playerDied(message);
        // Game state is now managed by gameStateMachine, no need to sync locally
    }

    

    /**
     * Load the nipplejs library for mobile joystick controls
     * @returns {Promise} A promise that resolves when the library is loaded
     */
    loadNippleJs() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/nipplejs@0.10.2/dist/nipplejs.min.js';
            script.onload = () => {
                console.log('Nipplejs library loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load Nipplejs library');
                reject(new Error('Failed to load Nipplejs library'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Detect if the current device is a mobile device
     * @returns {boolean} True if a mobile device is detected
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Toggle fullscreen mode - temporarily disabled
     */
    toggleFullscreen() {
        console.log("Fullscreen mode is temporarily disabled");
    }
    
    /**
     * Toggle ASCII rendering effect
     * @returns {boolean} New state of the ASCII effect
     */
    toggleAsciiEffect() {
        if (!this.asciiEffect) return false;
        
        const newState = this.asciiEffect.toggle();
        console.log(`ASCII effect ${newState ? 'enabled' : 'disabled'}`);
        
        // Update help menu if visible
        if (this.helpMenuVisible) {
            this.updateDebugInfo();
        }
        
        return newState;
    }

    // setupMobileControls method removed - functionality moved to Controls

    /**
     * Handle device orientation changes
     */
    onOrientationChange() {
        // After orientation change, we need to recalculate the camera aspect
        // and potentially reposition the HUD
        setTimeout(() => {
            this.onWindowResize();

            // If in portrait, pause the game to prevent accidental interactions
            if (window.innerHeight > window.innerWidth && this.isMobile) {
                // Pause game actions if needed
                // This is handled by the overlay that appears in portrait mode
            }
        }, 100); // Short delay
        
        console.log("Orientation changed");
    }

    updateDebugInfo() {
        if (!this.helpMenuVisible) return;

        // Get current level
        const currentLevel = LevelConfig.getCurrentLevel();

        // Prepare props for Preact component with safety checks
        const helpProps = {
            fps: this.fps || 0,
            objects: {
                asteroids: this.asteroidManager?.count || 0,
                bullets: this.bulletManager?.getTotalActiveBullets() || 0,
                collectibles: this.collectibleManager?.activeCount || 0,
                powerUps: powerUpManager?.initialized ? powerUpManager.getPowerUpCount() : 0
            },
            level: {
                id: currentLevel?.id || 1,
                name: currentLevel?.name || 'Loading...',
                timeRemaining: this.timerDisplay ? this.timerDisplay.getTimeRemaining() : 0
            },
            user: {
                id: window.userFingerprint || 'Initializing...'
            },
            multiplayer: {
                enabled: this.webRTCEnabled || false,
                isCaptain: window.gameSessionManager?.isCaptain || false,
                isCrew: window.gameSessionManager?.isCrew || false,
                gameId: window.gameSessionManager?.gameId || null,
                crewUrl: window.gameSessionManager?.getCrewUrl?.() || null,
                receivedStateCount: this.gameState?.receivedStateCount || 0,
                latency: this.gameState?.latency || 0
            },
            score: gameStats.getScore() || 0,
            asciiMode: this.asciiEffect?.isEnabled || false
        };

        // Update the Preact component
        updateHelpMenu(helpProps);
    }

    /**
     * Handle asteroid destruction events
     * @param {Asteroid} destroyedAsteroid - The logical asteroid object that was destroyed.
     */
    handleAsteroidDestruction(destroyedAsteroid) {
        // Delegate to LevelManager
        this.levelManager.handleAsteroidDestruction(destroyedAsteroid);
    }

    /**
     * Create a bullet at the current camera position and direction
     */
    createBullet() {
        // Let the BulletManager handle all bullet creation logic
        this.bulletManager.shootBulletFromCamera({
            camera: this.camera,
            velocity: this.velocity,
            hud: this.hud,
            gameStateMachine: gameStateMachine
        });
    }

    /**
     * Update explosions
     * @param {number} deltaTime - Time since last frame
     */
    updateExplosions() {
        // Skip if no explosion manager 
        if (!this.explosionManager) return;
        
        // Use the explosionManager to update all explosions
        this.explosionManager.update(this.deltaTime || 0.016);
    }

    /**
     * Update all power-ups
     * @param {number} deltaTime - Time in milliseconds since last frame
     */
    updatePowerUps(deltaTime) {
        if (!powerUpManager) return;
        
        // First update the power-ups (movement, lifespan, etc.)
        powerUpManager.update(deltaTime);
        
        // Then check if player has collected any power-ups
        if (this.camera && this.camera.position) {
            const collectedPowerUp = powerUpManager.collectNearbyPowerUp(this.camera.position);
            
            // If a power-up was collected, we don't need to do anything here
            // as the PowerUpManager already handles applying the effect
        }
    }
    
}

export default Game;