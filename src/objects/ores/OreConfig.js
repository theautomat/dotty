/**
 * OreConfig.js - Configuration for ore types in the Asteroids game
 * 
 * This file defines the properties for different ore types, including:
 * - Colors (in hex format)
 * - Geometry types (shape complexity increases with value)
 * - Escape velocity (how quickly ores move after creation)
 * - Basic values and appearance details
 */

const OreConfig = {
    // Ore types in order of increasing value/complexity
    oreTypes: [
        {
            type: 'iron',
            name: 'Iron',
            color: 0xc27946, // Brighter brown/copper color for better visibility
            size: 11.0, // Increased from 1.5 to match power-up size
            geometryType: 'tetrahedron', // Simplest shape (4 faces)
            detail: 0, // No subdivision
            distortion: 0, // No vertex distortion
            vertexCount: 4, // Faces in base shape
            escapeVelocity: 0.1, // Slowest moving
            multiplier: 1
        },
        {
            type: 'copper',
            name: 'Copper',
            color: 0xb87333, // Copper brown
            size: 11.0, // Increased from 1.5 to match power-up size
            geometryType: 'box', // Cube (6 faces)
            detail: 0,
            distortion: 0,
            vertexCount: 6, // Faces in base shape
            escapeVelocity: 0.12,
            multiplier: 2
        },
        {
            type: 'silver',
            name: 'Silver',
            color: 0xFF69B4, // Hot pink color to make it stand out more
            value: 1,
            size: 11.0, // Increased from 1.5 to match power-up size
            geometryType: 'dodecahedron', // Changed from octahedron to dodecahedron (12 faces)
            detail: 0, // No subdivision
            distortion: 0.05, // Slight distortion
            vertexCount: 12, // Faces in base shape
            escapeVelocity: 0.15,
            multiplier: 3
        },
        {
            type: 'gold',
            name: 'Gold',
            color: 0xDAA520, // Darker gold (less whitish)
            value: 1,
            size: 11.0, // Increased from 1.5 to match power-up size
            geometryType: 'sphere', // Changed from dodecahedron to sphere
            detail: 16, // Segments for the sphere (higher = smoother)
            distortion: 0, // No distortion for sphere
            vertexCount: 0, // Not applicable for sphere
            escapeVelocity: 0.18,
            multiplier: 4
        },
        {
            type: 'platinum',
            name: 'Platinum',
            color: 0x0066FF, // Electric blue color
            value: 1,
            size: 11.0, // Increased from 1.5 to match power-up size
            geometryType: 'torusKnot', // Changed to torus knot (twisted ring shape)
            detail: 64, // More segments for smoother appearance
            distortion: 0, // No distortion for torus knot
            vertexCount: 0, // Not applicable for torus knot
            escapeVelocity: 0.2, // Fastest moving, hardest to catch
            multiplier: 5
        }
    ],
    
    // Get config for a specific ore type
    getOreConfig(type) {
        return this.oreTypes.find(ore => ore.type === type);
    },
    
    // Get ore config by index (for cycling through types)
    getOreByIndex(index) {
        // Ensure index is within bounds
        const safeIndex = index % this.oreTypes.length;
        return this.oreTypes[safeIndex];
    }
};

export default OreConfig;