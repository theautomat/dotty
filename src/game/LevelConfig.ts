/**
 * LevelConfig.ts - Configuration for game levels
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

interface AsteroidConfig {
  count: number;
  valueMultiplier: number;
  speedRange: { min: number; max: number };
  hostility: number;
  safeSpawnDistance: number;
}

interface PowerUpConfig {
  spawnProbability: number;
  types: string[];
}

interface EnemyConfig {
  types: string[];
  asteroidSpawnModulo: number;
  difficulty: number;
  shootInterval?: number;
}

interface LevelModifiers {
  shipSpeed?: number;
  shipAcceleration?: number;
}

interface Level {
  id: number;
  name: string;
  description: string;
  timerDuration: number;
  asteroidConfig: AsteroidConfig;
  powerUpConfig: PowerUpConfig;
  enemyConfig: EnemyConfig;
  primaryOreType: string;
  allowedOreTypes: string[];
  levelModifiers: LevelModifiers;
}

interface LevelConfigType {
  currentLevel: number;
  levels: Level[];
  getCurrentLevel(): Level;
  setCurrentLevel(level: number): void;
  getLevelById(levelId: number): Level | null;
}

const LevelConfig: LevelConfigType = {
  // Current level tracker (1-based)
  currentLevel: 1,

  // All level configurations
  levels: [
    {
      id: 1,
      name: "Iron Mining",
      description: "Begin your mining career with basic iron extraction.",
      timerDuration: 90, // seconds (1 minute and 30 seconds)
      asteroidConfig: {
        count: 200,
        valueMultiplier: 1,
        speedRange: { min: 300, max: 450 },
        hostility: 0.2, // 20% chance of targeting player when wrapping
        safeSpawnDistance: 70
      },
      powerUpConfig: {
        spawnProbability: 0.15, // 15% spawn rate
        types: ["shield", "magnetPull"]
      },
      enemyConfig: {
        types: ["ufo"],
        asteroidSpawnModulo: 3, // Spawn every 3 asteroid destructions
        difficulty: 0.9,
        shootInterval: 1500 // 1.5 seconds between shots
      },
      primaryOreType: "iron",
      allowedOreTypes: ["iron"],
      levelModifiers: {}
    },
    {
      id: 2,
      name: "Copper Extraction",
      description: "Expand your mining operation to include copper.",
      timerDuration: 90, // seconds (1 minute and 30 seconds)
      asteroidConfig: {
        count: 250,
        valueMultiplier: 2,
        speedRange: { min: 350, max: 500 },
        hostility: 0.3, // 30% chance of targeting player when wrapping
        safeSpawnDistance: 75
      },
      powerUpConfig: {
        spawnProbability: 0.1, // 10% chance of power-up spawning
        types: ["shield", "shield", "magnetPull"]
      },
      enemyConfig: {
        types: ["hunter"],
        asteroidSpawnModulo: 1, // Spawn every asteroid destruction
        difficulty: 1.0
      },
      primaryOreType: "copper",
      allowedOreTypes: ["iron", "copper"],
      levelModifiers: {}
    }
  ],

  /**
   * Get the current level configuration
   * @returns The current level configuration
   */
  getCurrentLevel(): Level {
    // Array is 0-indexed, but levels are 1-indexed
    return this.levels[this.currentLevel - 1];
  },

  /**
   * Set the current level (1-2)
   * @param level - The level to set (1-2)
   */
  setCurrentLevel(level: number): void {
    if (level >= 1 && level <= this.levels.length) {
      this.currentLevel = level;
    } else {
      console.error(`Invalid level: ${level}. Must be between 1 and ${this.levels.length}`);
    }
  },

  /**
   * Get level configuration by ID
   * @param levelId - The level ID to retrieve (1-2)
   * @returns The level configuration or null if not found
   */
  getLevelById(levelId: number): Level | null {
    if (levelId >= 1 && levelId <= this.levels.length) {
      return this.levels[levelId - 1];
    }
    return null;
  }
};

export default LevelConfig;
