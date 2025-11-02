/**
 * PowerUpConfig.js - Configuration for power-up types in the game
 */

const PowerUpConfig = {
    // Defining all available power-up types with configuration
    powerUpTypes: [
        // Removing timeWarp power-up (torusKnot) since we're using torus knot for platinum ore
        // {
        //     type: 'timeWarp',
        //     name: 'Time Warp',
        //     color: 0x00FFFF, // Cyan
        //     description: 'Slows down asteroid movement',
        //     duration: 15000, // 15 seconds
        //     size: 2.0,
        //     geometryType: 'torusKnot' 
        // },
        {
            type: 'shield',
            name: 'Shield Generator',
            color: 0x0066FF, // Electric blue
            particleColor: 0x00ddff, // Brighter blue for particles/effects
            description: 'Temporary invulnerability to collisions',
            duration: 16000, // seconds
            size: 11.0, // 10x larger for better visibility
            geometryType: 'stellatedDodecahedron'
        },
        {
            type: 'weaponBoost',
            name: 'Weapon Boost',
            color: 0xFF3333, // Red
            particleColor: 0xFF5555, // Brighter red for particles
            description: 'More powerful bullets',
            duration: 16000, // seconds
            size: 11.0, // 10x larger for better visibility
            geometryType: 'truncatedIcosahedron'
        },
        {
            type: 'magnetPull',
            name: 'Magnet Pull',
            color: 0xFFCC00, // Bright yellow
            particleColor: 0xFFEE55, // Brighter yellow for particles
            description: 'Attracts nearby ores to your ship',
            duration: 20000, // 20 seconds
            size: 11.0, // 10x larger for better visibility
            geometryType: 'torus' // Ring shape like a magnet
        },
        {
            type: 'multiShot',
            name: 'Multi-Shot',
            color: 0xFF6600, // Orange
            particleColor: 0xFF8800, // Brighter orange for particles
            description: 'Fire 3 bullets simultaneously',
            duration: 16000, // seconds
            size: 11.0, // 10x larger for better visibility
            geometryType: 'gyroelongatedSquareDipyramid'
        },
        {
            type: 'hyperdrive',
            name: 'Hyperdrive',
            color: 0xFFFF00, // Yellow
            particleColor: 0xFFFF66, // Brighter yellow for particles
            description: 'Temporary speed boost',
            duration: 16000, // seconds
            size: 11.0, // 10x larger for better visibility
            geometryType: 'twistedStarPrism'
        },
        {
            type: 'oreScanner',
            name: 'Ore Scanner',
            color: 0x33CC33, // Green
            particleColor: 0x66FF66, // Brighter green for particles
            description: 'Reveals all ores on the map',
            duration: 16000, // seconds
            size: 11.0, // 10x larger for better visibility
            geometryType: 'twistedHexagon'
        }
    ],
    
    // Get config for a specific power-up type
    getPowerUpConfig(type) {
        return this.powerUpTypes.find(powerUp => powerUp.type === type);
    },
    
    // Get a random power-up type
    getRandomPowerUpType() {
        const randomIndex = Math.floor(Math.random() * this.powerUpTypes.length);
        return this.powerUpTypes[randomIndex];
    }
};

export default PowerUpConfig;