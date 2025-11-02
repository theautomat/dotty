/**
 * GameConfig.js - Global configuration settings for the game
 * 
 * This file centralizes all the game-wide configuration parameters.
 * It serves as a single source of truth for values that are used
 * throughout the codebase, replacing hard-coded values.
 */

const GameConfig = {
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
    
    // Ore configuration
    ores: {
        // Collection radius for ores
        collectionRadius: 108.0
    },
    
    // Debug settings
    debug: {
        // Whether to show debug information
        enabled: false
    }
};

export default GameConfig; 