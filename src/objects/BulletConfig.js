/**
 * BulletConfig.js
 * 
 * Configuration settings for bullets managed by BulletManager.
 */

const BulletConfig = {
    // Visual properties
    size: 15.0,        // Increased from 10.0 to 15.0 for 50% larger bullets
    color: 0x00ff00,   // Neon green color (hex) for retro Tron vibe

    // Gameplay properties
    lifetime: 6.0,     // Increased from 3.0 to 6.0 seconds for longer range
    speed: 15000,      // Increased from 12000 for faster bullet travel
    spawnOffset: 10.0,  // How far in front of the camera to spawn the bullet (units)
    
    // Collision settings
    collisionRadius: 24.0,  // Doubled from 12.0 to 24.0 for extremely generous hit detection
    
    // HUD bullet display settings
    hudBullet: {
        wireframe: true,       // Display as wireframe in HUD
        size: 2.0,             // Reduced from 3.0 to 2.0 for better visual proportion 
        opacity: 0.8,          // Semi-transparent for less visual distraction
        scale: 0.01125,        // Reduced to ~75% of previous value (0.015) for better visual padding
        spacing: 0.06,         // Increased spacing for better visual separation
        rotationSpeed: 0.01    // Rotation speed for animation
    }
};

export default BulletConfig;
