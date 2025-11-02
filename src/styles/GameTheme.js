/**
 * GameTheme.js
 * Defines visual styles and colors for game elements.
 */
import * as THREE from 'three';

const GameTheme = {
    // Asteroid colors based on size category
    asteroidColors: {
        small: new THREE.Color(0xffffff),  // White
        medium: new THREE.Color(0xffff00), // Yellow
        large: new THREE.Color(0xffa500),  // Orange
        default: new THREE.Color(0xaaaaaa) // Default grey if category unknown
    },

    // Scene background color
    scene: {
        background: new THREE.Color(0x000000) // Black background
    },

    // Player ship color
    player: {
        color: new THREE.Color(0x00ff00) // Green
    },

    // Bullet color
    bullet: {
        color: new THREE.Color(0xff0000) // Red
    },

    // Other UI or effect colors can be added here
    // ...

    /**
     * Gets the THREE.Color object for a given asteroid category.
     * @param {string} category - The asteroid size category ('small', 'medium', 'large').
     * @returns {THREE.Color} The color for the category, or a default color.
     */
    getAsteroidColor: function(category) {
        console.log(`[GameTheme] getAsteroidColor called with category: '${category}' (Type: ${typeof category})`); // Log the call
        const color = this.asteroidColors[category.toLowerCase()]; // Use lowercase for safety
        if (color) {
            return color;
        } else {
            console.warn(`[GameTheme] Unknown asteroid category: '${category}'. Returning default color.`);
            return this.asteroidColors.default;
        }
    }
};

export default GameTheme;
