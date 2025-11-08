/**
 * Game.ts - Main game controller
 * Handles initialization, game loop, and core game state
 */

import * as THREE from 'three';
import Map from '../objects/Map';
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
import gameState from './GameState';
import { initHelpMenu, updateHelpMenu, toggleHelpMenu } from '../components/HelpMenu.js';
import { initGameOverOverlay } from '../components/GameOverOverlay.js';
import { initEntryScreen, showEntryScreen, hideEntryScreen } from '../components/EntryScreen.js';
import { initControlsBar, showControlsBar } from '../components/ControlsBar.js';
import GeometryFactory from '../objects/shapes/GeometryFactory';
import collectibleManager from '../managers/CollectibleManager';
import GameConfig from './GameConfig';
import BulletConfig from '../objects/BulletConfig';
import asteroidManager from '../managers/AsteroidManager';
import bulletManager from '../managers/BulletManager';
import explosionManager from '../managers/ExplosionManager.js';
import collisionManager from '../managers/CollisionManager';
import enemyManager from '../managers/EnemyManager';
import ASCIIEffect from '../effects/ASCIIEffect.js';

class Game {
    scene: THREE.Scene | null;
    camera: THREE.OrthographicCamera | null;
    renderer: THREE.WebGLRenderer | null;
    gameState: typeof gameState;
    map: Map | null;

    // Managers
    asteroidManager: typeof asteroidManager | null;
    powerUpManager: typeof powerUpManager | null;
    explosionManager: typeof explosionManager | null;
    bulletManager: typeof bulletManager | null;
    collectibleManager: typeof collectibleManager | null;
    enemyManager: typeof enemyManager | null;
    levelManager: typeof levelManager | null;

    // Game state
    frameCount: number;
    worldBoundary: WorldBoundary | null;
    gameInitialized: boolean;
    hud: any | null;
    timer: Timer | null;
    helpMenuVisible: boolean;
    lastTime: number | null;
    fps: number;
    deltaTime: number;
    clock: THREE.Clock;
    WORLD_SIZE: number;
    controls: Controls | null;
    velocity: THREE.Vector3;
    geometryFactory: GeometryFactory;
    asciiEffect: any | null;
    timestamp?: number;
    playerDot?: THREE.Mesh;
    isMobile?: boolean;
    timerDisplay?: any;

    // WebRTC (disabled but keep properties for compatibility)
    webRTCEnabled?: boolean;
    lastStateSync?: number;
    stateSyncInterval?: number;
    webRTCClient?: any;

    constructor() {
        // Game variables
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.gameState = gameState;
        this.map = null;

        // Managers for game objects
        this.asteroidManager = null;
        this.powerUpManager = null;
        this.explosionManager = null;
        this.bulletManager = null;
        this.collectibleManager = null;
        this.enemyManager = null;
        this.levelManager = null;

        // Frame counting for debug info
        this.frameCount = 0;

        // Bind animate method once in constructor
        this.animate = this.animate.bind(this);

        // World boundary - handles all out-of-bounds logic
        this.worldBoundary = null;

        // Game state flags
        this.gameInitialized = false;

        // HUD system - single entry point to all HUD components
        this.hud = null;

        // Game timer - managed by Game class, displayed by HUD
        this.timer = null;

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
        this.WORLD_SIZE = GameConfig.world.size;

        // Controls system
        this.controls = null;
        this.velocity = new THREE.Vector3(0, 0, 0);

        // Instantiate Geometry Factory (needed by AsteroidManager)
        this.geometryFactory = new GeometryFactory();

        // ASCII effect renderer (initialized in init())
        this.asciiEffect = null;
    }

    /**
     * Initialize the game
     */
    async init(): Promise<void> {
        // WebRTC disabled - multiplayer removed
        this.webRTCEnabled = false;
        this.lastStateSync = 0;
        this.stateSyncInterval = 33;

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

            // Initialize fingerprinting for user identification
            const visitorId = await initFingerprint();

            // Store the fingerprint ID globally
            (window as any).userFingerprint = visitorId;

            // Initialize gameStats singleton with the fingerprint ID
            await gameStats.initialize(visitorId);

            // Track game initialization
            gameStats.trackEvent('game_initialized', {
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                is_mobile: this.isMobile
            });
        } catch (error) {
            console.error('Failed to initialize services:', error);
        }

        // Create the scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // DOTTY: Top-down orthographic camera looking down at the world
        const aspect = window.innerWidth / window.innerHeight;
        const viewSize = 50;
        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspect,
            viewSize * aspect,
            viewSize,
            -viewSize,
            0.1,
            1000
        );
        // Position camera above the world, looking straight down
        this.camera.position.set(0, 100, 0);
        this.camera.lookAt(0, 0, 0);
        this.scene.add(this.camera);

        // DOTTY: Grid helper removed - replaced by Map grid
        // const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
        // gridHelper.rotation.x = 0;
        // this.scene.add(gridHelper);

        // DOTTY: Player dot removed - not needed for map view
        // const dotGeometry = new THREE.CircleGeometry(2, 32);
        // const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        // this.playerDot = new THREE.Mesh(dotGeometry, dotMaterial);
        // this.playerDot.rotation.x = -Math.PI / 2;
        // this.playerDot.position.set(0, 0.1, 0);
        // this.scene.add(this.playerDot);

        // Make camera available globally
        (window as any).mainCamera = this.camera;

        // BOOTY: Managers disabled for map view
        // this.explosionManager = explosionManager;
        // this.explosionManager.init({ scene: this.scene });

        // this.collectibleManager = collectibleManager;
        // this.powerUpManager = powerUpManager;

        // this.powerUpManager.init(this);

        // this.collectibleManager.scene = this.scene;
        // this.collectibleManager.init(this);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this.renderer.domElement);

        // BOOTY: ASCII effect disabled for map view
        // this.asciiEffect = new ASCIIEffect(this.renderer, ' .:-=+*#%@', {
        //     resolution: 0.2,
        //     scale: 1,
        //     color: false,
        //     enabled: false
        // });

        // BOOTY: Stars disabled - map has its own background
        // this.createStars();

        // BOOTY: World boundary disabled for map view
        // this.worldBoundary = new WorldBoundary(this.scene, this.WORLD_SIZE);

        // BOOTY: HUD disabled for map view
        // this.initHUD();

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        // BOOTY: All game managers disabled for map view
        // this.asteroidManager = asteroidManager;
        // this.bulletManager = bulletManager;
        // this.enemyManager = enemyManager;

        // this.bulletManager.init({ scene: this.scene });

        // this.asteroidManager.init({ scene: this.scene });
        // this.asteroidManager.explosionManager = this.explosionManager;
        // this.asteroidManager.collectibleManager = this.collectibleManager;
        // this.asteroidManager.powerUpManager = this.powerUpManager;

        // this.enemyManager.init({
        //     scene: this.scene,
        //     camera: this.camera,
        //     explosionManager: this.explosionManager,
        //     collectibleManager: this.collectibleManager,
        //     powerUpManager: this.powerUpManager,
        //     gameStateMachine: gameStateMachine
        // });

        // this.levelManager = levelManager;
        // this.levelManager.init({
        //     scene: this.scene,
        //     camera: this.camera,
        //     hud: this.hud,
        //     managers: {
        //         asteroidManager: this.asteroidManager,
        //         bulletManager: this.bulletManager,
        //         collectibleManager: this.collectibleManager,
        //         explosionManager: this.explosionManager,
        //         powerUpManager: this.powerUpManager,
        //         enemyManager: this.enemyManager,
        //         enemyProjectiles: (this as any).enemyProjectiles
        //     }
        // });

        // Make game instance available globally
        (window as any).game = this;

        // BOOTY: Level config disabled for map view
        // const initialLevelConfig = LevelConfig.getLevelById(1);
        // const initialModifiers = initialLevelConfig ? initialLevelConfig.levelModifiers : {};

        // BOOTY: Controls kept for map navigation (zoom, pan, etc.)
        this.controls = new Controls({
            camera: this.camera,
            renderer: this.renderer,
            player: undefined, // No player in map view
            helpToggleCallback: (visible: boolean) => {
                this.helpMenuVisible = visible;
                if (visible) {
                    this.updateDebugInfo();
                }
            },
            hudClickCallback: () => {
                // No HUD in map view
                return false;
            },
            worldBoundaryToggleCallback: () => {
                // No world boundary in map view
                return false;
            },
            hud: null,
            gameStateMachine: gameStateMachine,
            initialModifiers: {}
        });

        // BOOTY: Collision manager disabled for map view
        // collisionManager.init({
        //     asteroidManager: this.asteroidManager,
        //     bulletManager: this.bulletManager,
        //     collectibleManager: this.collectibleManager,
        //     explosionManager: this.explosionManager,
        //     enemyManager: this.enemyManager,
        //     camera: this.camera,
        //     playerDot: this.playerDot,
        //     shipCollisionRadius: GameConfig.ship.collisionRadius,
        //     powerUpManager: this.powerUpManager,
        //     levelManager: this.levelManager
        // });

        // (window as any).collisionManager = collisionManager;

        // BOOTY: Asteroid callbacks disabled for map view
        // this.asteroidManager.onAsteroidDestroyed = (destroyedAsteroid: Asteroid) => {
        //     if (typeof this.handleAsteroidDestruction === 'function') {
        //         this.handleAsteroidDestruction(destroyedAsteroid);
        //     } else {
        //         console.warn('Asteroid destroyed, but handleAsteroidDestruction method not found!');
        //     }
        // };

        // BOOTY: Game state machine init (kept for state management)
        gameStateMachine.init(soundManager, null);

        // Show entry screen
        showEntryScreen(async () => {
            console.log("Entry screen callback executed - initializing map");

            // BOOTY: Pointer lock not needed for map view
            // if (this.renderer && this.renderer.domElement) {
            //     try {
            //         this.renderer.domElement.requestPointerLock();
            //     } catch (e) {
            //         console.error("Error requesting pointer lock:", e);
            //     }
            // }

            // BOOTY: Initialize the map
            this.map = new Map(
                this.scene!,
                this.camera!,
                {
                    worldSize: GameConfig.map.worldSize,
                    gridSize: GameConfig.map.gridSize,
                    gridColor: GameConfig.map.gridColor,
                    gridOpacity: GameConfig.map.gridOpacity,
                    backgroundImage: GameConfig.map.backgroundImage
                }
            );

            await this.map.init();
            console.log("Map initialized successfully");

            // Add mouse wheel zoom handler
            window.addEventListener('wheel', (event: WheelEvent) => {
                if (this.map) {
                    this.map.handleZoom(event.deltaY);
                }
            }, { passive: true });

            // Transition to PLAYING state (or we could add a MAP_VIEWING state)
            gameStateMachine.transitionTo(GAME_STATES.PLAYING);
        });

        // Start the game loop
        this.animate();
    }

    /**
     * Initialize the HUD system
     */
    initHUD(): void {
        // DOTTY: Temporarily disabled - will rebuild simpler 2D HUD later
    }

    /**
     * Create a simple star field in the background
     */
    createStars(): void {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: GameTheme.scene.stars,
            size: GameTheme.scene.starsSize
        });

        const starsVertices: number[] = [];
        for (let i = 0; i < 6000; i++) {
            const x = (Math.random() - 0.5) * this.WORLD_SIZE * 8;
            const y = (Math.random() - 0.5) * this.WORLD_SIZE * 8;
            const z = (Math.random() - 0.5) * this.WORLD_SIZE * 8;
            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const starField = new THREE.Points(starsGeometry, starsMaterial);
        this.scene!.add(starField);
    }

    /**
     * Handle window resizing
     */
    onWindowResize(): void {
        let width = window.innerWidth;
        let height = window.innerHeight;

        if (this.isMobile && window.innerHeight > window.innerWidth) {
            width = window.innerHeight;
            height = window.innerWidth;
        }

        // Update camera aspect ratio
        if (this.camera) {
            (this.camera as any).aspect = width / height;
            this.camera.updateProjectionMatrix();
        }

        this.renderer?.setSize(window.innerWidth, window.innerHeight);

        if (this.asciiEffect) {
            this.asciiEffect.setSize(window.innerWidth, window.innerHeight);
        }

        if (this.hud) {
            this.hud.calculateHudPlacement();
        }

        console.log(`Window resized: ${width}x${height}`);
    }

    /**
     * Create a bullet from the ship's position
     */
    shoot(): void {
        console.log('[GAME] Shoot method called');

        if (gameStateMachine.shouldLockControls()) {
            console.log('[GAME] Cannot shoot - controls locked');
            return;
        }

        if (this.bulletManager) {
            const bullet = this.bulletManager.shootBulletFromCamera({
                camera: this.camera!,
                velocity: this.velocity ? this.velocity.clone() : new THREE.Vector3(0, 0, 0),
                hud: this.hud,
                gameStateMachine: gameStateMachine
            });

            if (bullet) {
                console.log('[GAME] Successfully created bullet');
            }
        }

        gameStats.shotFired();
    }

    /**
     * Initializes a level
     */
    initializeLevel(levelConfig: any, isFirstLevel: boolean = false, isInitialSpawn: boolean = false): void {
        this.levelManager?.initializeLevel(levelConfig, isFirstLevel, isInitialSpawn);
    }

    /**
     * Animation loop
     */
    animate(timestamp?: number): void {
        if (timestamp) {
            this.timestamp = timestamp;
        }

        this.frameCount++;

        // BOOTY: HUD disabled for map view
        // if (this.hud) {
        //     this.hud.update();
        // }

        // BOOTY: All game object updates disabled for map view
        // const shouldUpdateGameObjects =
        //     gameStateMachine.isInState(GAME_STATES.PLAYING) ||
        //     gameStateMachine.isInState(GAME_STATES.TRANSITIONING);

        // if (shouldUpdateGameObjects) {
        //     if (!this.clock) {
        //         this.clock = new THREE.Clock();
        //     }

        //     const deltaTime = Math.min(0.1, this.clock.getDelta());
        //     this.deltaTime = deltaTime;

        //     this.handlePlayerMovement();

        //     this.updateAsteroids(deltaTime);
        //     this.updateOres(deltaTime);
        //     this.updateBullets(deltaTime);
        //     this.updateExplosions();
        //     this.updatePowerUps(deltaTime);

        //     if (this.enemyManager) {
        //         this.enemyManager.update(deltaTime);
        //     }

        //     if (gameStateMachine.isInState(GAME_STATES.PLAYING)) {
        //         collisionManager.checkCollisions();
        //     }

        //     this.levelManager?.update(deltaTime);
        // }

        // BOOTY: Simple render - no ASCII effect for map view
        // if (this.asciiEffect && this.asciiEffect.isEnabled) {
        //     this.asciiEffect.render(this.scene, this.camera);
        // } else {
        //     this.renderer?.render(this.scene!, this.camera!);
        // }
        this.renderer?.render(this.scene!, this.camera!);

        requestAnimationFrame(this.animate);
    }

    /**
     * Update asteroid positions and rotations
     */
    updateAsteroids(deltaTime: number): void {
        if (!this.asteroidManager) return;

        if (typeof this.asteroidManager.update === 'function') {
            this.asteroidManager.update(deltaTime, true);
        }
    }

    /**
     * Update ores positions
     */
    updateOres(deltaTime: number): void {
        if (this.playerDot && this.playerDot.position) {
            this.collectibleManager?.update(deltaTime, this.playerDot.position);
        }
    }

    /**
     * Update bullet positions and lifetime
     */
    updateBullets(deltaTime: number): void {
        if (!this.bulletManager) return;
        this.bulletManager.update(deltaTime || this.deltaTime);
    }

    /**
     * Handle player movement based on controls
     */
    handlePlayerMovement(): void {
        this.controls?.update();

        if (this.controls) {
            this.velocity = this.controls.getVelocity();
        }

        if (!this.worldBoundary || !gameStateMachine.isInState(GAME_STATES.PLAYING)) {
            return;
        }

        if (this.camera) {
            const shouldDie = this.worldBoundary.checkOutOfBounds(this.camera.position, this.hud);

            if (shouldDie) {
                this.playerDied();
            }
        }
    }

    /**
     * Handle ship collision with asteroid
     */
    handleShipCollision(logicalAsteroid: Asteroid): void {
        this.levelManager?.handleShipCollision(logicalAsteroid);
    }

    /**
     * Handle player death with a custom message
     */
    playerDied(message: string = "Ship destroyed!"): void {
        this.levelManager?.playerDied(message);
    }

    /**
     * Load the nipplejs library for mobile joystick controls
     */
    loadNippleJs(): Promise<void> {
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
     */
    isMobileDevice(): boolean {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Toggle fullscreen mode - temporarily disabled
     */
    toggleFullscreen(): void {
        console.log("Fullscreen mode is temporarily disabled");
    }

    /**
     * Toggle ASCII rendering effect
     */
    toggleAsciiEffect(): boolean {
        if (!this.asciiEffect) return false;

        const newState = this.asciiEffect.toggle();
        console.log(`ASCII effect ${newState ? 'enabled' : 'disabled'}`);

        if (this.helpMenuVisible) {
            this.updateDebugInfo();
        }

        return newState;
    }

    /**
     * Handle device orientation changes
     */
    onOrientationChange(): void {
        setTimeout(() => {
            this.onWindowResize();

            if (window.innerHeight > window.innerWidth && this.isMobile) {
                // Pause handled by overlay
            }
        }, 100);

        console.log("Orientation changed");
    }

    updateDebugInfo(): void {
        if (!this.helpMenuVisible) return;

        const currentLevel = LevelConfig.getCurrentLevel();

        const helpProps = {
            fps: this.fps || 0,
            objects: {
                asteroids: this.asteroidManager?.count || 0,
                bullets: this.bulletManager?.getTotalActiveBullets() || 0,
                collectibles: this.collectibleManager?.activeCount || 0,
                powerUps: this.powerUpManager?.initialized ? this.powerUpManager.getPowerUpCount() : 0
            },
            level: {
                id: currentLevel?.id || 1,
                name: currentLevel?.name || 'Loading...',
                timeRemaining: this.timerDisplay ? this.timerDisplay.getTimeRemaining() : 0
            },
            user: {
                id: (window as any).userFingerprint || 'Initializing...'
            },
            multiplayer: {
                enabled: false,
                isCaptain: false,
                isCrew: false,
                gameId: null,
                crewUrl: null,
                receivedStateCount: 0,
                latency: 0
            },
            score: gameStats.getScore() || 0,
            asciiMode: this.asciiEffect?.isEnabled || false
        };

        updateHelpMenu(helpProps);
    }

    /**
     * Handle asteroid destruction events
     */
    handleAsteroidDestruction(destroyedAsteroid: Asteroid): void {
        this.levelManager?.handleAsteroidDestruction(destroyedAsteroid);
    }

    /**
     * Create a bullet at the current camera position and direction
     */
    createBullet(): void {
        this.bulletManager?.shootBulletFromCamera({
            camera: this.camera!,
            velocity: this.velocity,
            hud: this.hud,
            gameStateMachine: gameStateMachine
        });
    }

    /**
     * Update explosions
     */
    updateExplosions(): void {
        if (!this.explosionManager) return;
        this.explosionManager.update(this.deltaTime || 0.016);
    }

    /**
     * Update all power-ups
     */
    updatePowerUps(deltaTime: number): void {
        if (!this.powerUpManager) return;

        this.powerUpManager.update(deltaTime);

        if (this.camera && this.camera.position) {
            this.powerUpManager.collectNearbyPowerUp(this.camera.position);
        }
    }
}

export default Game;
