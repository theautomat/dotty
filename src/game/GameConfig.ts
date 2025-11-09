/**
 * GameConfig.ts - Global configuration settings for the game
 *
 * This file centralizes all the game-wide configuration parameters.
 * It serves as a single source of truth for values that are used
 * throughout the codebase, replacing hard-coded values.
 */

interface WorldConfig {
  size: number;
  wrapDistance: number;
  boundaryMargin: number;
  safeSpawnDistance: number;
}

interface ShipConfig {
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  drag: number;
  collisionRadius: number;
}

interface PowerUpsConfig {
  collectionRadius: number;
  minSpawnDistance: number;
  maxActiveItems: number;
  spawnInterval: number;
  duration: number;
  types: string[];
}

interface CollectiblesConfig {
  collectionRadius: number;
}

interface DebugConfig {
  enabled: boolean;
}

interface MapConfig {
  worldSize: number;
  gridSize: number;
  gridColor: number;
  gridOpacity: number;
  minZoom: number;
  maxZoom: number;
  zoomSpeed: number;
  defaultZoom: number;
  backgroundImage?: string;
  highlightColor: number;
  highlightOpacity: number;
  cameraPanSpeed: number;
}

interface GameConfigType {
  world: WorldConfig;
  ship: ShipConfig;
  powerUps: PowerUpsConfig;
  collectibles: CollectiblesConfig;
  debug: DebugConfig;
  map: MapConfig;
}

const GameConfig: GameConfigType = {
  // World boundary settings
  world: {
    // Size of the world boundary cube
    // This defines the dimensions of the playable area
    size: 6000,

    // Distance at which objects wrap around to the other side
    // This should be smaller than world.size/2 to ensure proper wrapping
    wrapDistance: 3000,

    // Margin beyond the world boundary before destroying objects
    // Adding a small margin prevents immediate destruction at the exact boundary
    boundaryMargin: 50,

    // Default safe distance for player spawn points
    // Used to prevent spawning too close to danger
    safeSpawnDistance: 100
  },

  // Ship movement settings
  ship: {
    // Maximum speed the ship can reach
    maxSpeed: 7.0,

    // How quickly the ship accelerates
    acceleration: 0.022,

    // How quickly the ship decelerates when not thrusting
    deceleration: 0.009,

    // Air resistance factor (0-1, where 1 is no resistance)
    drag: 0.995,

    // Radius for collision detection with ship
    collisionRadius: 2.0
  },

  // Power-up settings
  powerUps: {
    // Collection radius for power-ups
    collectionRadius: 108.0,

    // Minimum distance from player for spawning
    minSpawnDistance: 200.0,

    // Maximum number of active power-ups
    maxActiveItems: 3,

    // Spawn interval in milliseconds
    spawnInterval: 10000,

    // Duration of power-ups in milliseconds
    duration: 15000,

    // Types of power-ups that can spawn
    types: ['speedBoost', 'shield', 'doublePoints', 'magnet']
  },

  // Collectible configuration
  collectibles: {
    // Collection radius for collectibles
    // DOTTY: Reduced from 108.0 to 5.0 for 2D top-down gameplay
    collectionRadius: 5.0
  },

  // Debug settings
  debug: {
    // Whether to show debug information
    enabled: false
  },

  // Map settings
  map: {
    // Physical size of the map in Three.js world units
    worldSize: 1000,

    // Grid dimensions (100x100 = 10,000 squares)
    gridSize: 100,

    // Grid line color (white)
    gridColor: 0xffffff,

    // Grid line opacity (reduced to minimize dulling of background colors)
    gridOpacity: 0.15,

    // Minimum zoom level
    minZoom: 0.5,

    // Maximum zoom level
    maxZoom: 3.0,

    // Zoom speed multiplier
    zoomSpeed: 0.1,

    // Default zoom level
    defaultZoom: 1.0,

    // Optional background image path
    backgroundImage: '/assets/images/pirate-game-map.png',

    // Grid navigation settings
    // Highlight color for selected square (yellow/gold)
    highlightColor: 0xffd700,

    // Highlight opacity
    highlightOpacity: 0.6,

    // Camera pan speed (0-1, higher = faster/snappier)
    cameraPanSpeed: 0.15
  }
};

export default GameConfig;
