/**
 * EnemyConfig.ts - Configuration for enemy types
 * Defines properties for different enemy types including appearance, behavior, and combat stats
 */

// Base enemy properties shared by all types
interface BaseEnemyConfig {
  type: string;
  name: string;
  description: string;
  speed: number;
  color: number;
  particleColor: number;
  size: number;
  geometryType: string;
  multiplier: number;
  health?: number;
  damage?: number;
}

// UFO-specific configuration
interface UFOConfig extends BaseEnemyConfig {
  type: 'ufo';
  behavior: 'hover';
  shootInterval: number;
  movementProfile: {
    emerging: number;
    approach: number;
    hover: number;
  };
  distanceProfile: {
    optimal: number;
    margin: number;
    emerge: number;
  };
  hoverProfile: {
    yOffset: number;
    yVariation: number;
    bobAmount: number;
    orbitSpeed: number;
  };
  projectile: {
    speed: number;
    size: number;
    color: number;
    spin: boolean;
  };
}

// Hunter-specific configuration
interface HunterConfig extends BaseEnemyConfig {
  type: 'hunter';
  behavior: 'kamikaze';
  profile: {
    speedMultiplier: number;
    maxSpeedMultiplier: number;
    acceleration: number;
    turnRate: number;
    targetLockTime: number;
    maxMissDistance: number;
    selfDestructDistanceMultiplier: number;
    explosionRadius: number;
    predictionFactor: number;
  };
}

// Tetra-specific configuration
interface TetraConfig extends BaseEnemyConfig {
  type: 'tetra';
  behavior: 'orbit';
}

// Boss phase configuration
interface BossPhase {
  behavior: string;
  projectileCount: number;
  shootInterval: number;
  speed: number;
  orbitDistance?: number;
  orbitSpeed?: number;
  chargeSpeed?: number;
  prepareTime?: number;
  recoveryTime?: number;
  orbitVerticalRange?: number;
  approachFrequency?: number;
}

// Sphere Boss-specific configuration
interface SphereBossConfig extends BaseEnemyConfig {
  type: 'sphereBoss';
  hitSound: string;
  spawnSettings: {
    distanceFromPlayer: number;
    maintainDistance: boolean;
  };
  phaseTransitions: number[];
  distanceProfile: {
    optimal: number;
    margin: number;
    maxApproach: number;
    maxRetreat: number;
  };
  oreType: string;
  oreDropsPerHit: number;
  oreDropsOnDeath: number;
  phases: {
    1: BossPhase;
    2: BossPhase;
    3: BossPhase;
    4: BossPhase;
  };
}

// Simple enemy types (bomber, patroller) that only need base config
interface SimpleEnemyConfig extends BaseEnemyConfig {
  type: 'bomber' | 'patroller';
}

// Union type for all enemy configurations
export type EnemyDefinition = UFOConfig | HunterConfig | TetraConfig | SphereBossConfig | SimpleEnemyConfig;

interface EnemyConfigType {
  enemyTypes: EnemyDefinition[];
  getEnemyConfig(type: string): EnemyDefinition | null;
  getRandomEnemyType(allowedTypes?: string[] | null): EnemyDefinition;
}

const EnemyConfig: EnemyConfigType = {
  // Define all available enemy types with their configurations
  enemyTypes: [
    {
      type: 'ufo',
      name: 'Scout UFO',
      description: 'Small alien scout ship that follows the player',
      speed: 0.5, // Increased from 0.4 for faster overall movement
      color: 0xff4400, // Orange-red
      particleColor: 0xff5500, // Bright orange-red for explosion particles
      size: 3.0,
      geometryType: 'ufo',
      multiplier: 1, // Level 1 enemy
      behavior: 'hover', // Default behavior
      health: 2,
      damage: 1,
      shootInterval: 600, // ms between shots

      // Movement speeds (relative multipliers to base speed)
      movementProfile: {
        emerging: 2.2,   // Faster when first appearing (increased from 1.8)
        approach: 1.4,   // Faster when approaching (increased from 1.0)
        hover: 0.6       // Slower when hovering (unchanged)
      },

      // Distance parameters
      distanceProfile: {
        optimal: 30,     // Best distance to hover at
        margin: 10,      // How much variance is acceptable
        emerge: 80       // Distance to travel during emerging
      },

      // Hover behavior parameters
      hoverProfile: {
        yOffset: 0,      // Base vertical offset (will add random variation)
        yVariation: 20,  // Random variation in vertical position
        bobAmount: 5,    // Amount of vertical bobbing motion
        orbitSpeed: 0.01 // Base orbit speed (will add random variation)
      },

      // Projectile configuration
      projectile: {
        speed: 0.5,      // Slow-moving projectiles
        size: 0.6,       // Size of projectiles
        color: 0xff5500, // Orange-red energy orbs with spin effect
        spin: true       // Enable spinning animation for UFO projectiles
      }
    },
    {
      type: 'hunter',
      name: 'Hunter Ship',
      description: 'Aggressive kamikaze ship that charges toward the player',
      speed: 0.35, // Base speed
      color: 0x6a0dad, // Dark purple
      particleColor: 0xcc33ff, // Bright purple for explosion particles
      size: 200.0, // Dramatically increased for testing visibility
      geometryType: 'hunter',
      multiplier: 2, // Level 2 enemy
      behavior: 'kamikaze', // Kamikaze behavior
      health: 1, // Only takes one hit to destroy

      // Custom profile for Hunter-specific attributes
      profile: {
        // Movement parameters - more aggressive since they're now visible
        speedMultiplier: 1.7, // Faster speed now that players can see them coming
        maxSpeedMultiplier: 3.5, // Higher max speed for more challenge
        acceleration: 0.009, // Faster acceleration
        turnRate: 0.04, // Better turning ability

        // Targeting parameters
        targetLockTime: 800, // Shorter lock time for more aggressive feel
        maxMissDistance: 180, // Increased distance before considering it a "miss"

        // Self-destruct based on distance instead of time
        selfDestructDistanceMultiplier: 2.0, // Self-destruct after traveling 2x the initial distance to player

        // Explosion radius for damage
        explosionRadius: 22, // Larger explosion radius for bigger threat

        // Predictive targeting parameters (simplified)
        predictionFactor: 0.5, // Moderate prediction for player movement
      }
    },
    {
      type: 'bomber',
      name: 'Bomber Ship',
      description: 'Heavy bomber that drops explosive ordnance',
      speed: 0.2,
      color: 0xff8800, // Orange
      particleColor: 0xffa500, // Bright orange for explosion particles
      size: 3.5,
      geometryType: 'bomber',
      multiplier: 3 // Level 3 enemy
    },
    {
      type: 'patroller',
      name: 'Patrol Drone',
      description: 'Automated drone that patrols an area',
      speed: 0.3,
      color: 0x0088ff, // Blue
      particleColor: 0x33aaff, // Bright blue for explosion particles
      size: 2.5,
      geometryType: 'patroller',
      multiplier: 4, // Level 4 enemy
    },
    {
      type: 'tetra',
      name: 'Tetra',
      description: 'A glossy black tetrahedron with a red "mind" that kamikazes toward the player',
      speed: 3.0, // Increased from 1.0 to 3.0 for balanced movement
      color: 0xff0000, // Black tetrahedron
      particleColor: 0xff0000, // Red for explosion particles (matching the inner "mind")
      behavior: 'orbit',
      geometryType: 'tetra',
      size: 50.0,
      multiplier: 5 // Level 5 enemy
    },
    // Add boss types to the enemy configuration
    {
      type: 'sphereBoss',
      name: 'Sphere Boss',
      description: 'A powerful spherical boss with multiple attack phases',
      speed: 0.3,
      color: 0x00ffff, // Bright cyan color for better visibility
      particleColor: 0x66ffff,
      size: 20,
      health: 20, // 20 hits to destroy
      multiplier: 10, // Boss multiplier
      hitSound: 'bossSphereHit',

      // Spawn settings for initial position
      spawnSettings: {
        distanceFromPlayer: 180, // How far in front of player to spawn (increased by 50%)
        maintainDistance: true   // Always try to maintain optimal distance
      },

      // Phase settings - health percentage thresholds for transitions
      phaseTransitions: [75, 50, 25],

      // Movement settings
      distanceProfile: {
        optimal: 150,      // Optimal distance from player
        margin: 30,        // Acceptable distance variation
        maxApproach: 100,  // Closest the boss will approach
        maxRetreat: 250    // Furthest the boss will retreat
      },

      // Ore drop settings
      oreType: 'silver',
      oreDropsPerHit: 2,
      oreDropsOnDeath: 20,

      // Boss phases with specific behavior for each phase
      phases: {
        1: {
          behavior: 'keepDistance',  // Stay at a distance from player
          projectileCount: 1,
          shootInterval: 3000,
          speed: 0.3
        },
        2: {
          behavior: 'orbit',         // Circle around the player
          projectileCount: 2,
          shootInterval: 2500,
          speed: 0.4,
          orbitDistance: 150,        // Distance to maintain while orbiting
          orbitSpeed: 0.05           // Speed of orbit (fast planetary orbit)
        },
        3: {
          behavior: 'charge',        // Bull-like charging pattern
          projectileCount: 3,
          shootInterval: 2000,
          speed: 0.6,                // Normal movement speed
          chargeSpeed: 2.0,          // Fast charge speed
          prepareTime: 60,           // Frames to wait at distant point before charging
          recoveryTime: 45           // Frames to wait after charge before moving again
        },
        4: {
          behavior: 'aggressive',    // More aggressive pattern
          projectileCount: 4,
          shootInterval: 1500,
          speed: 0.8,
          orbitDistance: 110,
          orbitSpeed: 0.05,          // Very fast orbit
          orbitVerticalRange: 50,    // Extreme vertical movement
          approachFrequency: 0.03    // High chance to approach player
        }
      }
    }
  ],

  /**
   * Get configuration for a specific enemy type
   * @param type - Enemy type identifier
   * @returns Enemy configuration or null if not found
   */
  getEnemyConfig(type: string): EnemyDefinition | null {
    return this.enemyTypes.find(enemy => enemy.type === type) || null;
  },

  /**
   * Get a random enemy type
   * @param allowedTypes - Optional array of allowed enemy types
   * @returns Random enemy configuration
   */
  getRandomEnemyType(allowedTypes: string[] | null = null): EnemyDefinition {
    let availableTypes = this.enemyTypes;

    // Filter by allowed types if specified
    if (allowedTypes && Array.isArray(allowedTypes) && allowedTypes.length > 0) {
      availableTypes = this.enemyTypes.filter(enemy =>
        allowedTypes.includes(enemy.type)
      );

      // If no matching types, use all types
      if (availableTypes.length === 0) {
        availableTypes = this.enemyTypes;
      }
    }

    // Pick a random enemy from available types
    const randomIndex = Math.floor(Math.random() * availableTypes.length);
    return availableTypes[randomIndex];
  }
};

export default EnemyConfig;
