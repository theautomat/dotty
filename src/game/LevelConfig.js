/**
 * LevelConfig.js - Configuration for game levels
 * 
 * This file defines the properties for different game levels, including:
 * - Level names and descriptions
 * - Timer duration
 * - Asteroid types, counts, and properties
 * - Ore types for mining progression
 * - Enemy types, counts, and behaviors
 * - Level-specific modifiers
 * 
 * Enemy Spawning System:
 * Enemies spawn based on asteroid destruction rather than time intervals.
 * Each level has an "asteroidSpawnModulo" property which determines how frequently
 * enemies spawn. For example, a value of 5 means an enemy will spawn after every
 * 5th asteroid is destroyed (when destroyCount % 5 === 0).
 * 
 * This creates a risk/reward system where more aggressive mining attracts
 * more enemy attention, while still respecting the maximum enemy count per level.
 */

const LevelConfig = {
    // Current level tracker (1-based)
    currentLevel: 1, // You can set this to whatever level you want to start at
    
    // All level configurations
    levels: [
        {
            id: 1,
            name: "Iron Mining",
            description: "Begin your mining career with basic iron extraction.",
            timerDuration: 90, // seconds (1 minute and 30 seconds)
            asteroidConfig: {
                count: 200, // Combined count (previously 35 small + 8 large)
                valueMultiplier: 1,
                // Speed ranges
                speedRange: {min: 300, max: 450}, // Increased from {min: 200, max: 300}
                // Probability (0-1) that asteroids will retarget toward the player
                // when they wrap around the edge of the world boundary.
                hostility: 0.2, // 20% chance of targeting player when wrapping
                // Minimum safe distance from player when spawning asteroids (helps prevent instant deaths)
                safeSpawnDistance: 70
            },
            powerUpConfig: {
                spawnProbability: 0.15, // 15% spawn rate
                types: ["shield", "magnetPull"] // Both shield and magnetPull
            },
            enemyConfig: {
                types: ["ufo"], // Changed from "ufo" to "tetra" for testing
                asteroidSpawnModulo: 3, // Spawn a Tetra every 3 asteroid destructions
                difficulty: 0.9, // Slightly easier for first level
                shootInterval: 1500 // 1.5 seconds between shots (reduced from 3.5 for testing)
            },
            primaryOreType: "iron",
            allowedOreTypes: ["iron"], // Only iron available in level 1
            levelModifiers: {
            }
        },
        {
            id: 2,
            name: "Copper Extraction",
            description: "Expand your mining operation to include copper.",
            timerDuration: 90, // seconds (1 minute and 30 seconds)
            asteroidConfig: {
                count: 250, // Combined count (previously 45 small + 12 large)
                valueMultiplier: 2,
                // Speed ranges - matching the same scale as level 1
                speedRange: {min: 350, max: 500}, // Fixed to match level 1's scale
                // Probability (0-1) that asteroids target the player when wrapping
                hostility: 0.3, // 30% chance of targeting player when wrapping
                // Minimum safe distance from player when spawning asteroids
                safeSpawnDistance: 75
            },
            powerUpConfig: {
                spawnProbability: 0.1, // 10% chance of power-up spawning
                types: ["shield", "shield", "magnetPull"] // Only shield is implemented for now
                // Commented out other power-ups until they're implemented
                // "timeWarp", "weaponBoost", "magnetPull", "multiShot", "hyperdrive", "oreScanner"
            },
            enemyConfig: {
                types: ["hunter"], // Level 2 uses Hunters only
                asteroidSpawnModulo: 1, // Spawn a Hunter every 4 asteroid destructions (reduced from 1)
                difficulty: 1.0 // Normal difficulty (reduced from 1.2)
            },
            primaryOreType: "copper",
            allowedOreTypes: ["iron", "copper"],
            levelModifiers: {
            }
        },
        {
            id: 3,
            name: "Silver Rush: ASTEROID BANANZA!",
            description: "INCOMING! Survive relentless asteroid barrage from deep space!",
            timerDuration: 90, // seconds (1 minute and 30 seconds)
            asteroidConfig: {
                count: 350, // No initial asteroids - only spawn from outside
                valueMultiplier: 4, // Higher value reward for the challenge
                // Speed ranges with wider variance for unpredictable movement
                speedRange: {min: 380, max: 600}, // Fixed to match level 1's scale
                // Probability (0-1) that asteroids target the player when wrapping
                hostility: 0.55, // 55% chance of targeting player when wrapping
                // FlyBy asteroid settings
                flyByCount: 0, // Start with none - they'll spawn continuously from outside
                continuousFlyBy: true, // Enable continuous spawning
                flyByInterval: 40, // Spawn a new fly-by asteroid every 40ms - INSANE barrage!
                // Special bananza properties
                sizeVariation: 1.3, // Variance in asteroid sizes (not affecting color)
                // Minimum safe distance from player when spawning asteroids
                safeSpawnDistance: 80
            },
            powerUpConfig: {
                spawnProbability: 0.1, // 10% chance of power-up spawning during chaos
                types: ["shield", "shield", "magnetPull", "magnetPull"] // Only shield and magnetPull
                // Commented out other power-ups until they're implemented
                // "timeWarp", "weaponBoost", "multiShot", "hyperdrive", "oreScanner"
            },
            enemyConfig: {
                types: [], // No enemies - pure asteroid chaos!
                asteroidSpawnModulo: 999, // Effectively disable enemy spawning
                difficulty: 0 // No difficulty scaling needed
            },
            primaryOreType: "silver",
            allowedOreTypes: ["iron", "copper", "silver"],
            oreConfig: {
                frequency: 0.35 // Higher chance of ores appearing (35%)
            },
            levelModifiers: {
            }
        },
        {
            id: 4,
            name: "Gold Fever",
            description: "Test your skills in challenging fields with valuable gold deposits.",
            timerDuration: 90, // seconds (1 minute and 30 seconds)
            asteroidConfig: {
                count: 83, // Combined count (previously 65 small + 18 large)
                valueMultiplier: 4,
                // Speed range
                speedRange: {min: 450, max: 650}, // Fixed to match level 1's scale
                // Probability (0-1) that asteroids target the player when wrapping
                hostility: 0.6, // 60% chance of targeting player when wrapping
                // Minimum safe distance from player when spawning asteroids
                safeSpawnDistance: 80
            },
            powerUpConfig: {
                spawnProbability: 0.1, // 10% chance of power-up spawning
                types: ["shield", "shield", "shield"] // Only shield is implemented for now
                // Commented out other power-ups until they're implemented
                // "timeWarp", "weaponBoost", "magnetPull", "multiShot", "hyperdrive", "oreScanner"
            },
            enemyConfig: {
                types: ["tetra"],
                //count: 4, no longer needed because of modulo and other logic
                asteroidSpawnModulo: 1, // Spawn an enemy every 2 asteroid destructions
                difficulty: 1.8 // Even more challenging enemies
            },
            primaryOreType: "gold",
            allowedOreTypes: ["iron", "copper", "silver", "gold"],
            levelModifiers: {
            }
        },
        {
            id: 5,
            name: "Big Boss",
            description: "This is the final boss level",
            timerDuration: 180, // 3 minutes to test the boss fight
            
            asteroidConfig: {
                count: 0, // No asteroids for boss testing
                valueMultiplier: 5,
                speedRange: {min: 400, max: 550}, // Fixed to match level 1's scale
                hostility: 0.5,
                // Minimum safe distance from player when spawning asteroids
                safeSpawnDistance: 90
            },
            
            powerUpConfig: {
                spawnProbability: 0.1, // 10% chance for power-ups
                types: ["shield", "shield", "magnetPull", "magnetPull"]
            },
            
            enemyConfig: {
                types: [], // No regular enemies - just the boss
                asteroidSpawnModulo: 999, // Effectively disable regular enemy spawning
                difficulty: 0
            },
            
            // Special boss config for this level
            bossConfig: {
                enabled: true, // Enable boss for this level
                type: 'sphereBoss',
                spawnDelay: 2000, // Delay before spawning boss (ms)
                position: { x: 0, y: 0, z: -70 }, // Moved closer to player for initial testing
                params: {
                    health: 20, // 20 hits total (5 per phase at 25% intervals)
                    size: 20, // Reduced from 40 to avoid immediate collisions while still being visible
                    oreDropsPerHit: 1, // Number of platinum ores dropped when boss is hit by a bullet
                    oreDropsOnDeath: 20, // Number of platinum ores dropped when boss is fully defeated
                    orbitDistance: 80
                }
            },
            
            primaryOreType: "platinum", // Higher value ore for testing
            allowedOreTypes: ["iron", "copper", "silver", "gold", "platinum"],
            
            levelModifiers: {
            }
        }
        // {
        //     id: 5,
        //     name: "Platinum Challenge",
        //     description: "Master the ultimate mining challenge with rare platinum ores.",
        //     timerDuration: 90, // seconds (1 minute and 30 seconds)
        //     asteroidConfig: {
        //         smallCount: 75, // +40 from level 1
        //         largeCount: 22, // Reduced since large asteroids split into smaller ones
        //         speedMultiplier: 1.3, // Faster than before
        //         valueMultiplier: 5,
        //         // Speed ranges for small and large asteroids
        //         smallSpeedRange: {min: 0.5, max: 0.7},
        //         largeSpeedRange: {min: 0.4, max: 0.6},
        //         // Probability (0-1) that asteroids target the player when wrapping
        //         hostility: 0.75 // 75% chance of targeting player when wrapping
        //     },
        //     powerUpConfig: {
        //         spawnProbability: 0.05, // 5% chance of power-up spawning
        //         types: ["shield", "shield", "shield"] // Only shield is implemented for now
        //         // Commented out other power-ups until they're implemented
        //         // "timeWarp", "weaponBoost", "magnetPull", "multiShot", "hyperdrive", "oreScanner"
        //     },
        //     enemyConfig: {
        //         types: ["tetra"], // Level 5 boss is the Tetra with heat-seeking mines
        //         asteroidSpawnModulo: 2, // Spawn a Tetra every 2 asteroid destructions
        //         difficulty: 1.8, // High difficulty but not maximum (reduced from 2.0)
        //         shootInterval: 3000, // 3 seconds between mine drops
        //         orbitDistance: 180, // Keep at a distance from player
        //         orbitSpeed: 0.3 // Speed at which the Tetra orbits the player
        //     },
        //     primaryOreType: "platinum",
        //     allowedOreTypes: ["iron", "copper", "silver", "gold", "platinum"],
        //     levelModifiers: {
        //         shipSpeed: 1.3,
        //         shipAcceleration: 1.2
        //     }
        // }
        // Boss Test Level
    ],
    
    /**
     * Get the current level configuration
     * @returns {Object} The current level configuration
     */
    getCurrentLevel() {
        // Array is 0-indexed, but levels are 1-indexed
        return this.levels[this.currentLevel - 1];
    },
    
    /**
     * Set the current level (1-5)
     * @param {number} level - The level to set (1-5)
     */
    setCurrentLevel(level) {
        if (level >= 1 && level <= this.levels.length) {
            this.currentLevel = level;
        } else {
            console.error(`Invalid level: ${level}. Must be between 1 and ${this.levels.length}`);
        }
    },
    
    /**
     * Get level configuration by ID
     * @param {number} levelId - The level ID to retrieve (1-5)
     * @returns {Object|null} The level configuration or null if not found
     */
    getLevelById(levelId) {
        if (levelId >= 1 && levelId <= this.levels.length) {
            return this.levels[levelId - 1];
        }
        return null;
    }
};

export default LevelConfig;