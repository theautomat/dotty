/**
 * SoundTypes.js - Constants for sound types in the Asteroids game
 * 
 * This file defines constants for all sound-related event types to avoid
 * hardcoded strings throughout the codebase.
 */

// Weapon sound types
export const WEAPON_TYPES = {
    BULLET: 'bullet',
    PHASER: 'phaser',
    PHASER_FAIL: 'phaserFail'
};

// Explosion sound types
export const EXPLOSION_TYPES = {
    ASTEROID: 'asteroid',
    SHIP: 'ship',
    UFO: 'ufo'  // Adding UFO explosion type
};

// Thruster sound types
export const THRUSTER_TYPES = {
    FORWARD: 'forward',
    REVERSE: 'reverse',
    STRAFE: 'strafe'
};

// Boss sound types
export const BOSS_SOUND_TYPES = {
    SPHERE_HIT: 'sphereHit'
};

// Boundary sound types
export const BOUNDARY_SOUND_TYPES = {
    BREACH: 'boundaryBreach'
};

// Export all sound type constants
export default {
    WEAPON_TYPES,
    EXPLOSION_TYPES,
    THRUSTER_TYPES,
    BOSS_SOUND_TYPES,
    BOUNDARY_SOUND_TYPES
};