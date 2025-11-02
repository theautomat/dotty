/**
 * LevelManager.js - Manages level transitions, initialization, and game lifecycle
 */
import LevelConfig from '../game/LevelConfig.js';
import soundManager from './SoundManager.js';
import gameStateMachine, { GAME_STATES } from '../game/GameStateMachine.js';
import Timer from '../game/Timer.js';
import gameStats from '../game/GameStats.js';

class LevelManager {
    constructor() {
        // Game state is managed by gameStateMachine
        // We only track certain local flags that aren't part of the main game state
        this.gameStarted = false; // track if game has started
        this.gameInitialized = false; // track if game is initialized
        
        // Level timer - created and owned by LevelManager
        this.timer = new Timer();
        // Set completion callback
        this.timer.setOnComplete(this.onTimerComplete.bind(this));
        
        // Essential references (will be set during init)
        this.scene = null;
        this.camera = null;
        this.hud = null;
        
        // Manager references (will be set during init)
        this.asteroidManager = null;
        this.collectibleManager = null;
        this.bulletManager = null;
        this.explosionManager = null;
        this.enemyProjectiles = null;
        this.powerUpManager = null;
        this.enemyManager = null;
        
        // Boss reference
        this.boss = null;
        
        // Count of asteroids destroyed in the current level
        this.asteroidsDestroyed = 0;
        
        // Flag to track if LevelManager has been initialized
        this.initialized = false;
    }
    
    /**
     * Initialize the LevelManager with all required references
     * This should be called once after game components are created
     * 
     * @param {Object} options - Configuration options
     * @param {THREE.Scene} options.scene - Reference to the THREE.js scene
     * @param {THREE.Camera} options.camera - Reference to the player camera
     * @param {HUD} options.hud - Reference to the HUD system
     * @param {Object} options.managers - References to various game managers
     * @returns {LevelManager} - Returns this for method chaining
     */
    init(options) {
        // Store essential references
        this.scene = options.scene || null;
        this.camera = options.camera || null;
        this.hud = options.hud || null;
        
        // Log received manager options
        
        // Store manager references
        if (options.managers) {
            this.asteroidManager = options.managers.asteroidManager || null;
            this.collectibleManager = options.managers.collectibleManager || null;
            this.bulletManager = options.managers.bulletManager || null;
            this.explosionManager = options.managers.explosionManager || null;
            this.powerUpManager = options.managers.powerUpManager || null;
            this.enemyManager = options.managers.enemyManager || null;
            this.enemyProjectiles = options.managers.enemyProjectiles || null;
        }
        
        // Log the final saved references
        
        // Set initialized flag
        this.initialized = true;
        
        return this;
    }
    
    /**
     * Initialize a level with the given configuration
     * @param {Object} levelTimer - The level timer instance (now TimerDisplay)
     */
    initLevel() {
        // Reset level state
        this.asteroidsDestroyed = 0;
        // Update GameStateMachine
        gameStateMachine.transitionTo(GAME_STATES.PLAYING);
    }
    
    /**
     * Check if all asteroids have been destroyed
     * @returns {boolean} True if all asteroids are destroyed
     */
    areAllAsteroidsDestroyed() {
        return this.asteroidManager?.getAsteroidCount() === 0;
    }
    
    /**
     * End the current level and prepare for the next one
     * This happens when either the timer runs out or all asteroids are destroyed
     */
    endLevel() {
        
        // Stop timer if it's still running
        if (this.timer && this.timer.isRunning) {
            this.timer.pause();
        }
        
        // Get current level for info
        const currentLevel = LevelConfig.getCurrentLevel();
        let nextLevelId = currentLevel.id + 1;
        
        
        // Check if there's a next level
        const hasNextLevel = nextLevelId <= LevelConfig.levels.length;
        
        // Clean up all game objects
        this.cleanupLevel();
        
        // Trigger level transition event
        if (hasNextLevel) {
            
            // Handle the level transition directly
            this.handleLevelTransition(nextLevelId);
        } else {
            // This was the final level - show game complete
            
            // Handle game completion directly
            this.handleGameCompletion();
        }
    }
    
    /**
     * Clean up all game objects to prepare for next level
     */
    cleanupLevel() {
        
        // Use only direct references to managers
        const asteroidManager = this.asteroidManager;
        const collectibleManager = this.collectibleManager;
        
        // Remove all asteroids via AsteroidManager
        if (asteroidManager) {
            asteroidManager.clearAllAsteroids(); // Standardize to use clearAllAsteroids
        } else {
            console.warn('[LEVEL-MANAGER] AsteroidManager not found on game instance.');
        }
        
        // Clear all ores via OreManager
        if (oreManager) {
            const oreCount = oreManager.activeCount || 0;
            
            // If available, use a dedicated clear method on the OreManager
            if (typeof oreManager.clearAll === 'function') {
                oreManager.clearAll();
            } else {
                // Fallback: manually remove each collectible by index
                for (let i = oreManager.activeCount - 1; i >= 0; i--) {
                    oreManager.removeOreByIndex(i);
                }
            }
        } else {
            console.warn('[LEVEL-MANAGER] OreManager not found on game instance.');
        }
        
        // Clean up bullets using BulletManager
        if (this.bulletManager) {
            this.bulletManager.clearAllBullets();
        }
        
        // Clean up enemies using EnemyManager if available
        if (this.enemyManager) {
            this.enemyManager.clearAllEnemies();
        }

        // Remove enemy projectiles if we have direct access to them
        if (this.enemyProjectiles && Array.isArray(this.enemyProjectiles)) {
            console.log(`[LEVEL-MANAGER] Cleaning up ${this.enemyProjectiles.length} enemy projectiles.`);
            while (this.enemyProjectiles.length > 0) {
                const projectile = this.enemyProjectiles[0];
                if (projectile && typeof projectile.remove === 'function') {
                    projectile.remove();
                }
                this.enemyProjectiles.splice(0, 1);
            }
        }
        
        // Don't remove explosions - let them finish naturally
        // Also don't touch any panels or UI elements - they should persist
        
        // Verify cleanup was successful
        const asteroidsLeft = asteroidManager ? (asteroidManager.getAsteroidCount ? asteroidManager.getAsteroidCount() : 0) : 0;
        const oresLeft = oreManager ? (oreManager.getOreCount ? oreManager.getOreCount() : 0) : 0;
        const bulletsLeft = this.bulletManager ? (this.bulletManager.getTotalActiveBullets ? this.bulletManager.getTotalActiveBullets() : 0) : 0;
        
        
        console.assert(asteroidsLeft === 0, "Asteroid count should be 0 after cleanup");
        console.assert(bulletsLeft === 0, "Bullet count should be 0 after cleanup");
        console.assert(collectiblesLeft === 0, "Collectible count should be 0 after cleanup");

    }
    
    /**
     * Play a level - unified method for starting any level
     * @param {number} levelId - The ID of the level to play
     * @param {boolean} showClickPrompt - Whether to show click prompt before starting (first level)
     */
    playLevel(levelId, showClickPrompt = false) {
        
        // Get the level configuration
        const levelConfig = LevelConfig.getLevelById(levelId);
        if (!levelConfig) {
            console.error(`[LEVEL-MANAGER] Invalid level ID: ${levelId}`);
            return;
        }
        
        // Set the current level in the config
        LevelConfig.setCurrentLevel(levelId);
        
        // Reset ship position
        if (this.camera) {
            this.camera.position.set(0, 0, 0);
        }
        
        // Game state managed by gameStateMachine
        
        if (showClickPrompt) {
            // Similar to old initFirstLevel, show prompt and wait for click
            
            // First initialize the level
            this.initializeLevel(levelConfig, levelId === 1, true);
            
            // Show the level transition overlay with the click prompt
            if (this.hud) {
                this.hud.onLevelTransition(levelConfig.id, () => {
                    this.gameStarted = true;
                    
                    // Make sure timer is running once game starts
                    if (this.timer && !this.timer.isRunning) {
                        this.timer.start();
                    }
                    
                    // Transition to PLAYING state
                    gameStateMachine.transitionTo(GAME_STATES.PLAYING, {
                        level: levelConfig.id
                    });
                    
                    // Play the level beginning sound
                    soundManager.playLevelBegin();
                }, 0, true); // 0 duration means it stays until clicked, waitForClick=true
            } else {
                console.error("[LEVEL-MANAGER] HUD not initialized, cannot show level transition!");
            }
            
            // Track game start event
            gameStats.trackEvent('game_start', {
                level_id: levelConfig.id,
                level_name: levelConfig.name,
                current_score: gameStats.getScore(),
                current_stats: gameStats.getStats()
            });
        } else {
            // For subsequent levels, just initialize and start right away
            this.initializeLevel(levelConfig, false, true);
            
            // CRITICAL: Ensure gameStarted is set to true for all subsequent levels
            this.gameStarted = true;
            
            // Make sure timer is running
            if (this.timer && !this.timer.isRunning) {
                this.timer.start();
            }
            
            // Track level start event
            gameStats.trackEvent('level_start', {
                level_id: levelConfig.id,
                level_name: levelConfig.name,
                current_score: gameStats.getScore(),
                current_stats: gameStats.getStats()
            });
        }
    }
    
    /**
     * Handle level transitions directly 
     * Manages the transition from one level to the next
     * 
     * @param {number} nextLevelId - The ID of the next level
     * @param {Function} [completionCallback] - Optional callback after transition completes
     */
    handleLevelTransition(nextLevelId, completionCallback) {
        
        // Transition to TRANSITIONING state in the state machine
        gameStateMachine.transitionTo(GAME_STATES.TRANSITIONING, {
            fromLevel: LevelConfig.getCurrentLevel().id,
            toLevel: nextLevelId
        });
        
        // Create a wrapped completion callback
        const wrappedCallback = () => {
            // Ensure game is started - this is critical for animations to work
            this.gameStarted = true;
            
            // Transition back to PLAYING state
            gameStateMachine.transitionTo(GAME_STATES.PLAYING, {
                level: nextLevelId
            });
            
                        
            // Then call the provided callback if one was passed
            if (typeof completionCallback === 'function') {
                completionCallback();
            }
            
            // Start the next level
            this.playLevel(nextLevelId);
        };
        
        // Use the HUD to handle the transition visuals
        if (this.hud) {
            this.hud.onLevelTransition(nextLevelId, wrappedCallback, 3000);
        } else {
            // Fallback if HUD is not available
            console.warn("[LEVEL-MANAGER] No HUD available for transition, using timeout");
            setTimeout(wrappedCallback, 1000);
        }
        
        // Call any registered external callback
        if (typeof this.onLevelTransition === 'function') {
            this.onLevelTransition(nextLevelId, wrappedCallback);
        }
    }
    
    /**
     * Handle game completion directly
     * Shows game completion UI and saves stats
     */
    handleGameCompletion() {
        
        // Transition to COMPLETE state in the state machine
        gameStateMachine.transitionTo(GAME_STATES.COMPLETE, {
            stats: gameStats.getStats(),
            finalLevel: LevelConfig.getCurrentLevel().id
        });
        
        // Stop the timer if it's still running
        if (this.levelTimer && this.levelTimer.isRunning) {
            this.levelTimer.pause();
        }
        
        // Save the final game stats to Firebase
        gameStats.saveToFirebase('game_complete')
            .then(success => {
                console.log("Game completion stats " + 
                    (success ? "saved successfully!" : "failed to save."));
            });
        
        // Play game complete sound
        soundManager.playGameComplete();
        
        // Use the HUD's API for game completion sequence
        if (this.hud) {
            this.hud.onGameComplete(); // No need to pass stats - HUD uses gameStats singleton
        }
        
        // Call the external callback if set
        if (typeof this.onGameComplete === 'function') {
            this.onGameComplete();
        }
    }
    
    /**
     * Set a callback function to be called during level transitions
     * This is mainly for backward compatibility - prefer using handleLevelTransition directly
     * 
     * @param {Function} callback - The function(nextLevelId, completionCallback) to call
     */
    setLevelTransitionCallback(callback) {
        this.onLevelTransition = callback;
    }
    
    /**
     * Set a callback function to be called when the game is completed
     * This is mainly for backward compatibility - prefer using handleGameCompletion directly
     * 
     * @param {Function} callback - The function to call
     */
    setGameCompleteCallback(callback) {
        this.onGameComplete = callback;
    }
    
    /**
     * Get the current level configuration
     * @returns {Object} The current level configuration
     */
    getCurrentLevel() {
        return LevelConfig.getCurrentLevel();
    }
    
    /**
     * Start the game - begins with level 1
     */
    startGame() {
        
        // Set initial game state
        this.gameStarted = false;
        
        // Transition to MENU state
        gameStateMachine.transitionTo(GAME_STATES.MENU, {
            waitingForClick: true
        });
        
        // Get level 1 configuration
        const levelConfig = LevelConfig.getLevelById(1);
        if (!levelConfig) {
            console.error("[LEVEL-MANAGER] Could not find configuration for level 1!");
            return;
        }
        
        // Play the first level with click prompt
        this.playLevel(1, true);
    }
    
    /**
     * Initialize a level, clearing previous state and setting up new objects.
     * @param {object} levelConfig - Configuration object for the level.
     * @param {boolean} isFirstLevel - Flag indicating if this is the very first level.
     * @param {boolean} isInitialSpawn - Flag indicating if this is the initial setup (vs. mid-game transition).
     */
    initializeLevel(levelConfig, isFirstLevel = false, isInitialSpawn = false) {
        // Set game state to transitioning for setup
        
        // Update the game state machine to reflect we're transitioning
        if (!isFirstLevel || !isInitialSpawn) {
            gameStateMachine.transitionTo(GAME_STATES.TRANSITIONING, {
                levelId: levelConfig.id,
                reason: 'level_initialization'
            });
        }
        
        // --- Clear previous level state ---
        // Clear existing asteroids using the manager
        if (this.asteroidManager) {
            this.asteroidManager.clearAllAsteroids();
            } else {
            console.warn("[LEVEL-MANAGER] AsteroidManager not found during level initialization.");
        }
        
        // Clear bullets using manager
        if (this.bulletManager) {
            this.bulletManager.clearAllBullets();
            }
        
        // Clean up enemy projectiles if we have direct access to them
        if (this.enemyProjectiles && Array.isArray(this.enemyProjectiles)) {
            this.enemyProjectiles.forEach(proj => {
                if (proj && typeof proj.remove === 'function') {
                    proj.remove();
                }
            });
            this.enemyProjectiles.length = 0;
        }
        
        // Clean up enemies using EnemyManager if available
        if (this.enemyManager) {
            this.enemyManager.clearAllEnemies();
        }
        
        // Clear power-ups
        if (this.powerUpManager && this.powerUpManager.initialized) {
            this.powerUpManager.clearAllPowerUps(); // Clear power-up objects in the world
            this.powerUpManager.clearActiveEffects(); // Clear applied effects
        }
        
        // Clear collectibles
        if (this.collectibleManager) {
            this.collectibleManager.clearAllCollectibles();
        }
        
        // Clear explosions using manager
        if (this.explosionManager) {
            this.explosionManager.clearAll();
        }
        
        // Clear boss if we have a reference to it
        if (this.boss) {
            if (typeof this.boss.remove === 'function') {
                this.boss.remove();
            }
            this.boss = null;
        }
        
        // Reset score only if it's the very first level
        if (isFirstLevel) {
            this.asteroidsDestroyed = 0;
            gameStats.reset(); // Reset GameStats
        }
        
        // Game state managed by gameStateMachine
        
        // --- Setup new level state ---
        // Update current level in LevelConfig *before* applying modifiers
        LevelConfig.setCurrentLevel(levelConfig.id);
        
        // Also update the level info in GameStats
        gameStats.updateLevel({
            id: levelConfig.id,
            name: levelConfig.name
        });
        
        // Spawn initial asteroids using AsteroidManager
        
        // Only use direct reference to asteroidManager
        if (this.asteroidManager && levelConfig.asteroidConfig) {
            if (typeof this.asteroidManager.spawnInitialAsteroids === 'function') {
                this.asteroidManager.spawnInitialAsteroids(levelConfig.asteroidConfig);
            } else {
                console.error("[LEVEL-MANAGER] AsteroidManager is missing the spawnInitialAsteroids method!");
            }
        } else {
            console.warn("[LEVEL-MANAGER] Cannot spawn asteroids: Manager or asteroidConfig missing.");
        }
        
        // Initialize boss if present in config
        if (levelConfig.bossConfig) {
            this.initBoss(levelConfig);
        }
        
        // Start or reset the timer
        this.timer.setDuration(levelConfig.timerDuration);
        this.timer.reset();
        this.timer.start();
        
        // Immediately update GameStats with the initial timer state
        gameStats.updateLevelTimerState({
            total: this.timer.durationSeconds,
            remaining: this.timer.durationSeconds, // Initially, remaining = total
            elapsed: 0 // Initially, elapsed = 0
        });
        
        // Set game state (only if not the very first initialization showing the menu)
        // Wait a brief moment before allowing updates to prevent race conditions
        setTimeout(() => {
            // If this is not the first level with click prompt, transition to PLAYING state
            if (!isFirstLevel || !isInitialSpawn) {
                gameStateMachine.transitionTo(GAME_STATES.PLAYING, {
                    levelId: levelConfig.id
                });
            }
        }, 100); // Short delay
    }
    
    /**
     * Initialize boss for the level
     * @param {Object} levelConfig - Configuration for the current level
     */
    initBoss(levelConfig) {
        console.log(`[LEVEL-MANAGER] Initializing boss for level ${levelConfig.id}: ${levelConfig.bossConfig.type}`);
        
        if (!this.scene) {
            console.error("[LEVEL-MANAGER] Cannot initialize boss: scene reference is missing!");
            return;
        }
        
        // Clear existing boss if any
        if (this.boss) {
            if (typeof this.boss.remove === 'function') {
                this.boss.remove();
            }
            this.boss = null;
        }
        
        // Ensure SphereBoss class is loaded
        if (typeof SphereBoss !== 'function') {
            console.error("[LEVEL-MANAGER] SphereBoss class is not properly loaded!");
            return;
        }
        
        // Add lights to make boss visible - needed for PhongMaterial
        console.log("[LEVEL-MANAGER] Adding lights for boss visibility");
        const ambientLight = new THREE.AmbientLight(0x444444);
        this.scene.add(ambientLight);
        
        // Add directional light to create better shading on the boss
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1).normalize();
        this.scene.add(directionalLight);
        
        // Create the boss based on the specified type
        let boss = null;
        switch (levelConfig.bossConfig.type) {
            case 'sphereBoss':
                console.log("[LEVEL-MANAGER] Creating SphereBoss instance...");
                // Create with a default position - the boss will position itself in its update method
                const defaultPos = new THREE.Vector3(0, 0, 0);
                boss = new SphereBoss(this.scene, defaultPos, {
                    ...levelConfig.bossConfig.params,
                    playerCamera: this.camera // Pass camera reference ONCE during initialization
                });
                console.log("[LEVEL-MANAGER] SphereBoss created successfully:", boss);
                break;
            default:
                console.error(`[LEVEL-MANAGER] Unknown boss type: ${levelConfig.bossConfig.type}`);
                return;
        }
        
        // Store the boss locally
        this.boss = boss;
        
        // Set shoot callback - when boss fires projectiles
        boss.setShootCallback((projectileConfig) => {
            // Create the actual projectile using EnemyWeapon class
            const { position, direction, speed, damage, color } = projectileConfig;
            
            // Create the projectile and add it to enemy projectiles array
            const projectile = new EnemyWeapon(
                this.scene,
                position,
                direction,
                {
                    speed: speed || 1.2,
                    damage: damage || 10,
                    color: color || 0xff0000,
                    size: 0.8, // Larger size for boss projectiles
                    lifetime: 5000 // Longer lifetime
                }
            );
            
            console.log("[LEVEL-MANAGER] Boss fired a projectile");
            
            // Add to enemy projectiles array if available
            if (this.enemyProjectiles && Array.isArray(this.enemyProjectiles)) {
                this.enemyProjectiles.push(projectile);
            }
        });
        
        // Set destroy callback - when boss is destroyed
        boss.setDestroyCallback(() => {
            console.log("[LEVEL-MANAGER] Boss destroyed, dropping rewards");
            
            // If collectible drops are configured for this boss
            if (levelConfig.bossConfig.params && levelConfig.bossConfig.params.collectibleDropsOnDeath) {
                const position = boss.getPosition();
                const collectibleCount = levelConfig.bossConfig.params.collectibleDropCount || 5;

                // Spawn collectibles using collectibleManager
                for (let i = 0; i < collectibleCount; i++) {
                    // Add some randomness to positions
                    const offset = new THREE.Vector3(
                        (Math.random() - 0.5) * 10,
                        (Math.random() - 0.5) * 10,
                        (Math.random() - 0.5) * 10
                    );

                    const collectiblePosition = position.clone().add(offset);

                    // Use CollectibleManager to spawn collectibles
                    if (this.collectibleManager) {
                        // Determine collectible type based on level (could be improved with proper type selection)
                        const collectibleType = 'gold'; // Default to valuable collectible for boss drops
                        const collectibleValue = 100;   // Higher value for boss-dropped collectibles
                        this.collectibleManager.spawnCollectible(collectiblePosition, collectibleType, collectibleValue);
                    }
                }
            }
            
            // Clear boss reference
            this.boss = null;
            
            // End the level (since defeating the boss is the objective)
            this.endLevel();
        });
        
        console.log("[LEVEL-MANAGER] Boss initialized successfully");
    }
    
    /**
     * Called when the timer completes
     */
    onTimerComplete() {
        // Explicitly pause the timer to ensure it stops completely
        if (this.timer && this.timer.isRunning) {
            this.timer.pause();
        }
        
        // Get current level
        const currentLevel = LevelConfig.getCurrentLevel();
        
        // Update final game time in stats
        if (this.timer) {
            // Add the completed level's duration to the total game time
            const levelDuration = currentLevel.timerDuration;
            gameStats.updateGameTime(levelDuration);
        }
        
        // Transition to TRANSITIONING state
        gameStateMachine.transitionTo(GAME_STATES.TRANSITIONING, {
            reason: 'timer_complete',
            level: currentLevel.id
        });
        
        // End the level
        this.endLevel();
    }
    
    /**
     * Handle ship collision with asteroid or other obstacle
     * @param {Object} logicalAsteroid - The logical asteroid that caused the collision (optional)
     */
    handleShipCollision(logicalAsteroid) {
        // Transition to game over state via gameStateMachine
        
        // Transition to GAME_OVER state in the state machine
        gameStateMachine.transitionTo(GAME_STATES.GAME_OVER, {
            reason: 'asteroid_collision',
            message: "Ship destroyed by asteroid!",
            stats: gameStats.getStats()
        });

        // Play ship destruction sound
        soundManager.playShipExplosion();
        soundManager.playGameOver();
        
        // Clean up enemies using EnemyManager if available
        if (this.enemyManager) {
            console.log("[LEVEL-MANAGER] Clearing enemies via EnemyManager due to ship collision");
            this.enemyManager.clearAllEnemies();
        }
        
        // Handle asteroid cleanup
        if (this.asteroidManager) {
            // Save the closest asteroid (likely the one that caused the collision)
            // let closestAsteroid = null;
            // let closestDistance = Infinity;
            
            // if (this.camera) {
            //     for (const asteroid of this.asteroidManager.getAsteroids()) {
            //         const distance = asteroid.getMesh().position.distanceTo(this.camera.position);
            //         if (distance < closestDistance) {
            //             closestDistance = distance;
            //             closestAsteroid = asteroid;
            //         }
            //     }
            // }
            
            // Now clear all asteroids except the closest one
            for (let i = this.asteroidManager.getAsteroids().length - 1; i >= 0; i--) {
                const asteroid = this.asteroidManager.getAsteroids()[i];
                
                // Skip the closest asteroid (collision causer)
                //if (asteroid === closestAsteroid) continue;
                
                // Remove all other asteroids
                //asteroid.remove();
                this.asteroidManager.removeAsteroid(asteroid);
            }
        }
        
        // Stop the timer
        if (this.timer && this.timer.isRunning) {
            this.timer.pause();
        }
        
        // Update final game time in stats
        if (this.timer) {
            const elapsedTime = this.timer.durationSeconds - this.timer.getTimeRemaining();
            GameStats.updateGameTime(elapsedTime);
        }
        
        // Save game stats to Firebase with game_over event
        GameStats.saveToFirebase('game_over')
            .then(success => {
                console.log("[LEVEL-MANAGER] Game stats saved to Firebase successfully");
            });
        
        // Use HUD's death sequence
        if (this.hud) {
            this.hud.onPlayerDeath();
        }
    }
    
    /**
     * Handle player death with a custom message
     * @param {string} message - The custom death message to display
     */
    playerDied(message = "Ship destroyed!") {
        // Transition to game over state via gameStateMachine
        
        // Transition to GAME_OVER state in the state machine
        gameStateMachine.transitionTo(GAME_STATES.GAME_OVER, {
            reason: 'out_of_bounds',
            message: message,
            stats: gameStats.getStats()
        });
        
        // Play ship explosion and game over sounds
        soundManager.playShipExplosion();
        soundManager.playGameOver();
        
        console.log(`[LEVEL-MANAGER] Player died: ${message}`);
        
        // Clean up enemies using EnemyManager if available
        if (this.enemyManager) {
            console.log("[LEVEL-MANAGER] Clearing enemies via EnemyManager due to player death");
            this.enemyManager.clearAllEnemies();
        }
        
        // Clean up all asteroids
        if (this.asteroidManager) {
            console.log(`[LEVEL-MANAGER] Game over - clearing ${this.asteroidManager.count} asteroids`);
            
            for (let i = this.asteroidManager.getAsteroids().length - 1; i >= 0; i--) {
                const asteroid = this.asteroidManager.getAsteroids()[i];
                asteroid.remove();
                this.asteroidManager.removeAsteroid(asteroid);
            }
        }
        
        // Stop the timer
        if (this.timer && this.timer.isRunning) {
            this.timer.pause();
        }
        
        // Update final game time in stats
        if (this.timer) {
            const elapsedTime = this.timer.durationSeconds - this.timer.getTimeRemaining();
            GameStats.updateGameTime(elapsedTime);
        }
        
        // Save game stats to Firebase with game_over event
        GameStats.saveToFirebase('game_over')
            .then(success => {
                console.log("[LEVEL-MANAGER] Game stats saved to Firebase successfully");
            });
        
        // World boundary reset is handled through GameStateMachine state change
        
        // Use HUD's death sequence with custom message
        if (this.hud) {
            this.hud.onPlayerDeath(message); // Just pass the message, HUD gets stats from singleton
        }
    }
    
    /**
     * Update method called each frame from the game loop
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Update timer and other level state
        
        // Update the timer if it's active
        if (this.timer && this.timer.isRunning) {
            this.timer.update();
            
            
            // Update the timer state in GameStats for HUD to access
            gameStats.updateLevelTimerState({
                total: this.timer.durationSeconds,
                remaining: this.timer.getTimeRemaining(),
                elapsed: this.timer.getElapsedTime()
            });
        }
        
        // In the future, any other per-frame level management logic can go here
        // Examples: stat tracking, dynamic difficulty adjustment, etc.
    }
}


// Create and export a singleton instance
const levelManager = new LevelManager();
export default levelManager;