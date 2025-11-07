/**
 * GameTheme.ts - Visual theme settings for the game
 * Contains base colors and visual properties that aren't tied to specific game objects
 */
import * as THREE from 'three';

interface SceneTheme {
  background: number;
  stars: number;
  starsSize: number;
  starsCount: number;
}

interface AsteroidsTheme {
  defaultColor: number;
  particleColor: number;
  colors: number[];
  small: number;
  medium: number;
  large: number;
}

interface BulletsTheme {
  color: number;
  size: number;
  trailColor: number;
}

interface GameThemeType {
  scene: SceneTheme;
  asteroids: AsteroidsTheme;
  bullets: BulletsTheme;
  getAsteroidColor(category: string): THREE.Color;
}

const GameTheme: GameThemeType = {
  // Base scene colors
  scene: {
    background: 0x000000,  // Black background
    stars: 0xffffff,       // White stars
    starsSize: 0.1,        // Size of star particles
    starsCount: 1000       // Number of stars in the background
  },

  // Asteroid default values (asteroids should use these if not specified elsewhere)
  asteroids: {
    defaultColor: 0xffffff,    // Default asteroid color (white)
    particleColor: 0xffffff,   // Default particle color for explosions (white)
    colors: [
      0xffffff,    // White
      0xffffff,    // White
      0xffffff,    // White
      0xffffff,    // White
      0xffffff,    // White
      0xffffff,    // White
      0xffffff,    // White
      0xffffff,    // White
      0xffffff,    // White
      0xffffff,    // White
      0xffffff,    // White
      0xffffff     // White
    ],
    // All categories use white color
    small: 0xffffff,      // White
    medium: 0xffffff,     // White
    large: 0xffffff       // White
  },

  // Bullet theme properties
  bullets: {
    color: 0xFFFF00,      // Yellow bullet color
    size: 0.5,            // Standard bullet size
    trailColor: 0xFF8800  // Optional trail color
  },

  // Method to get the color for an asteroid category
  getAsteroidColor(category: string): THREE.Color {
    console.log(`[GameTheme] getAsteroidColor called with category: '${category}'`);

    // Use bright, highly visible colors for debugging
    switch (category) {
      case 'small':
        return new THREE.Color(this.asteroids.small);
      case 'medium':
        return new THREE.Color(this.asteroids.medium);
      case 'large':
        return new THREE.Color(this.asteroids.large);
      default:
        console.warn(`Unknown asteroid category: ${category}. Using default color.`);
        return new THREE.Color(this.asteroids.defaultColor);
    }
  }
};

export default GameTheme;
