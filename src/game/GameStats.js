/**
 * GameStats.js - Central source of truth for game statistics
 * 
 * This class handles all game statistics tracking, score calculations,
 * and Firebase persistence. Other components should read from this class
 * rather than maintaining their own counters.
 */
import firebaseService from '../scripts/firebase-service.js';
import { ENEMY_TYPES } from '../objects/enemies/index.js';
import CollectibleConfig from '../objects/collectibles/CollectibleConfig.js';
import EnemyConfig from '../objects/enemies/EnemyConfig.js';
import gameSessionManager from '../managers/GameSessionManager.js';

class GameStats {
    constructor() {
        this.reset();
        this.initialized = false;
        
        // Get game ID from the GameSessionManager
        this.gameId = null; // Will be set during initialization
        
        // Timer-related state (used by HUD)
        this.currentLevelTime = 0;
        this.levelTimerTotal = 0;
        this.levelTimerRemaining = 0;
    }

    /**
     * Initialize the stats service
     * @param {string} fingerprintId - The unique fingerprint ID for the player
     */
    initialize(fingerprintId) {
        if (this.initialized) return;
        
        // Initialize the game session with the fingerprint
        const sessionInfo = gameSessionManager.initialize(fingerprintId);
        
        // Get data from the session manager
        this.fingerprintId = sessionInfo.playerId;
        this.gameId = sessionInfo.gameId;
        this.isCaptain = sessionInfo.isCaptain;
        this.isCrew = sessionInfo.isCrew;
        
        this.initialized = true;
        
        // console.log('GameStats initialized:');
        // console.log('- Fingerprint ID:', this.fingerprintId);
        // console.log('- Game ID:', this.gameId);
        // console.log('- Role:', this.isCaptain ? 'CAPTAIN' : 'CREW');
        
        // Make stats globally available for debugging
        window.GameStats = this;
        
        // Initialize Firebase connection
        return firebaseService.initialize();
    }

    /**
     * Reset all game statistics to default values
     */
    reset() {
        this.score = 0;
        this.asteroidsDestroyed = 0;
        this.enemiesDestroyed = 0;
        this.shotsFired = 0;
        this.gameTime = 0;
        this.totalCollectiblesMined = 0;

        // Reset timer-related state
        this.currentLevelTime = 0;
        this.levelTimerTotal = 0;
        this.levelTimerRemaining = 0;

        // Track collectibles by type
        this.collectiblesMined = { 
            iron: 0, 
            copper: 0, 
            silver: 0, 
            gold: 0, 
            platinum: 0 
        };
        
        // Track enemy kills by type using ENEMY_TYPES constants
        this.enemiesByType = {
            [ENEMY_TYPES.UFO]: 0,
            [ENEMY_TYPES.HUNTER]: 0,
            [ENEMY_TYPES.PATROLLER]: 0,
            [ENEMY_TYPES.TETRA]: 0,
            [ENEMY_TYPES.BOMBER]: 0 // Added for display purposes even if not in actual game
        };
        
        this.currentLevel = {
            id: 1,
            name: "Level 1"
        };
    }

    /**
     * Get the current score
     * @returns {number} The current score
     */
    getScore() {
        return this.score;
    }

    /**
     * Record an asteroid being destroyed
     * @returns {number} The updated count of asteroids destroyed
     */
    asteroidDestroyed() {
        // Increment asteroid counter
        this.asteroidsDestroyed++;
        
        // Just track the count, don't calculate or add points
        return this.asteroidsDestroyed;
    }
    
    /**
     * Get the current asteroid destroy count
     * @returns {number} The current count of asteroids destroyed
     */
    getAsteroidDestroyCount() {
        return this.asteroidsDestroyed;
    }
    
    /**
     * Record a shot being fired
     */
    shotFired() {
        this.shotsFired++;
    }
    
    /**
     * Record an enemy being destroyed
     * @param {string} type - The type of enemy from ENEMY_TYPES constants
     */
    enemyDestroyed(type = ENEMY_TYPES.UFO) {
        // Increment total enemy counter
        this.enemiesDestroyed++;
        
        // Also track enemies by type
        if (this.enemiesByType[type] !== undefined) {
            this.enemiesByType[type]++;
        } else {
            // If it's an unknown type, default to UFO
            console.warn(`Unknown enemy type destroyed: ${type}`);
            this.enemiesByType[ENEMY_TYPES.UFO]++;
        }
        
        // Just track the count, don't calculate or add points
        return this.enemiesDestroyed;
    }
    
    /**
     * Get total enemies destroyed of a specific type
     * @param {string} type - Enemy type from ENEMY_TYPES constants
     * @returns {number} Total count of that enemy type destroyed
     */
    getEnemiesDestroyedByType(type) {
        if (this.enemiesByType[type] === undefined) {
            return 0;
        }
        return this.enemiesByType[type];
    }
    
    /**
     * Get all enemies destroyed by type
     * @returns {Object} Counts of each enemy type destroyed
     */
    getAllEnemiesDestroyedByType() {
        return { ...this.enemiesByType };
    }
    
    /**
     * Get total enemies destroyed (all types)
     * @returns {number} Total enemy count
     */
    getTotalEnemiesDestroyed() {
        return this.enemiesDestroyed;
    }
    
    /**
     * Get enemy score with level multiplier applied
     * @param {number} levelMultiplier - The level's difficulty multiplier
     * @returns {number} Total score value from enemies
     */
    getEnemiesScoreWithMultiplier(levelMultiplier = 1) {
        // Base score per enemy
        const baseScore = 100;
        
        // Apply multiplier to total count
        return this.enemiesDestroyed * baseScore * levelMultiplier;
    }

    /**
     * Record a collectible being mined
     * @param {string} type - Type of collectible (iron, copper, silver, gold, platinum)
     * @param {number} value - Value of the collectible mined
     */
    collectibleMined(type, value) {
        // Ensure the collectible type exists in our tracking
        if (this.collectiblesMined[type] === undefined) {
            console.warn(`Unknown collectible type: ${type}`);
            return 0;
        }

        // Increment collectible counter
        this.collectiblesMined[type] += value;
        this.totalCollectiblesMined += value;

        // Just return the total count, don't calculate or add points
        return this.totalCollectiblesMined;
    }

    /**
     * Update the current level information
     * @param {Object} levelInfo - Level information object with id and name
     */
    updateLevel(levelInfo) {
        this.currentLevel = {
            id: levelInfo.id,
            name: levelInfo.name
        };
    }

    /**
     * Update the game time
     * @param {number} seconds - Additional game time in seconds to accumulate
     */
    updateGameTime(seconds) {
        // Accumulate time rather than replacing it
        this.gameTime += seconds;
            }
    
    /**
     * Update the current level timer state
     * @param {Object} timerState - Current timer state from LevelManager
     * @param {number} timerState.total - Total duration of the timer in seconds
     * @param {number} timerState.remaining - Remaining time in seconds
     * @param {number} timerState.elapsed - Elapsed time in seconds
     */
    updateLevelTimerState(timerState) {
        this.levelTimerTotal = timerState.total;
        this.levelTimerRemaining = timerState.remaining;
        this.currentLevelTime = timerState.elapsed;
    }

    /**
     * Get total collectibles mined of a specific type
     * @param {string} type - Collectible type (iron, copper, silver, gold, platinum)
     * @returns {number} Total count of that collectible type
     */
    getTotalMined(type) {
        if (this.collectiblesMined[type] === undefined) {
            return 0;
        }
        return this.collectiblesMined[type];
    }

    /**
     * Get the raw count of all collectibles mined
     * @returns {Object} Counts of each collectible type
     */
    getAllCollectiblesMined() {
        return { ...this.collectiblesMined };
    }

    /**
     * Get score value of mined collectibles with level multipliers applied
     * @param {number} levelMultiplier - The level's value multiplier
     * @returns {number} Total score value of all mined collectibles
     */
    getCollectiblesScoreWithMultiplier(levelMultiplier = 1) {
        let totalScore = 0;

        // Calculate score by applying multiplier to each collectible type
        Object.entries(this.collectiblesMined).forEach(([type, count]) => {
            totalScore += count * levelMultiplier;
        });

        return totalScore;
    }
    
    /**
     * Calculate a total score based on game performance and multipliers from config
     * @returns {number} Total score based on game performance
     */
    calculateTotalScore() {
        let totalScore = 0;
        
        // 1. Add asteroid count (each asteroid is worth 1 point)
        totalScore += this.asteroidsDestroyed || 0;
        
        // 2. Add collectible scores with their respective multipliers from CollectibleConfig
        if (this.collectiblesMined) {
            Object.entries(this.collectiblesMined).forEach(([collectibleType, count]) => {
                if (count && typeof count === 'number') {
                    // Get multiplier from CollectibleConfig
                    const collectibleConfig = CollectibleConfig.getCollectibleConfig(collectibleType);
                    const multiplier = collectibleConfig?.multiplier || 1;

                    // Calculate collectible score: count * multiplier
                    totalScore += count * multiplier;
                }
            });
        }
        
        // 3. Add enemy scores with their respective multipliers from EnemyConfig
        if (this.enemiesByType) {
            Object.entries(this.enemiesByType).forEach(([enemyType, count]) => {
                if (count && typeof count === 'number') {
                    // Get multiplier from EnemyConfig
                    const enemyConfig = EnemyConfig.getEnemyConfig(enemyType);
                    const multiplier = enemyConfig?.multiplier || 1;
                    
                    // Calculate enemy score: count * multiplier
                    totalScore += count * multiplier;
                }
            });
        }
        
        return Math.round(totalScore);
    }
    
    /**
     * For backward compatibility - calculate a simple total score
     * @returns {number} Simple sum of asteroids, enemies and ores
     * @deprecated Use calculateTotalScore instead
     */
    calculateSimpleScore() {
        console.warn("calculateSimpleScore is deprecated, use calculateTotalScore instead");
        return this.calculateTotalScore();
    }
    
    /**
     * Get the current game statistics
     * @returns {Object} The current game statistics
     */
    getStats() {
        // Calculate total score using the new method with multipliers
        const totalScore = this.calculateTotalScore();
        
        // Get the collaborator URL for sharing if player is captain
        let crewUrl = null;
        if (this.isCaptain && gameSessionManager) {
            crewUrl = gameSessionManager.getCrewUrl();
        }
        
        return {
            // Game and session info
            gameId: this.gameId,
            playerId: this.fingerprintId,
            isCaptain: this.isCaptain || false,
            isCrew: this.isCrew || false,
            crewUrl: crewUrl,
            
            // Game statistics
            score: totalScore, // Use the new score calculation with multipliers
            asteroidsDestroyed: this.asteroidsDestroyed || 0,
            enemiesDestroyed: this.enemiesDestroyed || 0,
            enemiesByType: this.enemiesByType ? { ...this.enemiesByType } : {}, // Include enemy kills by type
            shotsFired: this.shotsFired || 0,
            collectiblesMined: this.collectiblesMined ? { ...this.collectiblesMined } : {}, // Handle potential null
            totalCollectiblesMined: this.totalCollectiblesMined || 0,
            level: this.currentLevel ? { ...this.currentLevel } : { id: 1, name: "Level 1" },
            gameTime: this.gameTime || 0,
            
            // Timer-related state for HUD display
            levelTimerTotal: this.levelTimerTotal || 0,
            levelTimerRemaining: this.levelTimerRemaining || 0,
            currentLevelTime: this.currentLevelTime || 0
        };
    }

    /**
     * Save the current game statistics to Firebase
     * @param {string} eventType - The type of event that triggered the save (e.g., "game_over", "level_complete")
     * @returns {Promise} A promise that resolves when the save is complete
     */
    async saveToFirebase(eventType = 'game_stats_update') {
        // Make sure this never breaks the game
        try {
            if (!this.initialized || !this.fingerprintId) {
                console.warn('Cannot save game stats: GameStats not properly initialized');
                return false;
            }

            // Get the current stats and add the event type
            const stats = {
                ...this.getStats(),
                eventType: eventType
            };
            console.log('Saving game stats to Firebase:', stats);
            
            // Safely track the event in Firebase Analytics
            try {
                const totalScore = this.calculateTotalScore();
                await firebaseService.trackEvent(eventType, {
                    level_id: this.currentLevel?.id || 1,
                    score: totalScore, // Use the new total score calculation
                    asteroids_destroyed: this.asteroidsDestroyed,
                    enemies_destroyed: this.enemiesDestroyed,
                    enemies_ufo: this.enemiesByType[ENEMY_TYPES.UFO],
                    enemies_hunter: this.enemiesByType[ENEMY_TYPES.HUNTER],
                    enemies_patroller: this.enemiesByType[ENEMY_TYPES.PATROLLER],
                    enemies_tetra: this.enemiesByType[ENEMY_TYPES.TETRA],
                    shots_fired: this.shotsFired,
                    total_collectibles_mined: this.totalCollectiblesMined,
                    game_time_seconds: this.gameTime
                });
            } catch (analyticsError) {
                console.warn('Failed to track analytics event:', analyticsError);
                // Continue anyway - don't let analytics failure stop the save
            }
            
            // Save to Firebase using the fingerprint ID as the key
            const result = await firebaseService.saveGameStats(this.fingerprintId, stats);
            return result;
        } catch (error) {
            // Log the error but don't let it crash the game
            console.error('Error saving game stats to Firebase:', error);
            return false;
        }
    }
    
    /**
     * Track game event - safely wrapped to prevent game crashes
     * @param {string} eventName - Name of the event to track
     * @param {Object} additionalParams - Additional parameters to include
     */
    trackEvent(eventName, additionalParams = {}) {
        // Make this function completely safe - never throw errors that could affect the game
        try {
            if (!this.initialized) {
                console.warn('Cannot track event: GameStats not initialized');
                return false;
            }
            
            // Add standard game stats to the event
            const eventParams = {
                level_id: this.currentLevel?.id || 1,
                score: this.calculateTotalScore(), // Use the new total score calculation
                ...additionalParams
            };
            
            // Fire and forget - don't wait for result or let errors propagate
            firebaseService.trackEvent(eventName, eventParams)
                .catch(error => {
                    console.warn(`Failed to track event '${eventName}':`, error);
                });
                
            return true;
        } catch (error) {
            console.warn(`Error in trackEvent '${eventName}':`, error);
            return false;
        }
    }
}

// Export a singleton instance
const gameStats = new GameStats();
export default gameStats;