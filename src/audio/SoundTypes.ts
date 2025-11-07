/**
 * SoundTypes.ts - Constants for sound types in the Dotty game
 *
 * This file defines constants for all sound-related event types to avoid
 * hardcoded strings throughout the codebase.
 */

// Weapon sound types
export const WEAPON_TYPES = {
    BULLET: 'bullet',
    PHASER: 'phaser',
    PHASER_FAIL: 'phaserFail'
} as const;

export type WeaponSoundType = typeof WEAPON_TYPES[keyof typeof WEAPON_TYPES];

// Explosion sound types
export const EXPLOSION_TYPES = {
    ASTEROID: 'asteroid',
    SHIP: 'ship',
    UFO: 'ufo'  // Adding UFO explosion type
} as const;

export type ExplosionSoundType = typeof EXPLOSION_TYPES[keyof typeof EXPLOSION_TYPES];

// Thruster sound types
export const THRUSTER_TYPES = {
    FORWARD: 'forward',
    REVERSE: 'reverse',
    STRAFE: 'strafe'
} as const;

export type ThrusterSoundType = typeof THRUSTER_TYPES[keyof typeof THRUSTER_TYPES];

// Boss sound types
export const BOSS_SOUND_TYPES = {
    SPHERE_HIT: 'sphereHit'
} as const;

export type BossSoundType = typeof BOSS_SOUND_TYPES[keyof typeof BOSS_SOUND_TYPES];

// Boundary sound types
export const BOUNDARY_SOUND_TYPES = {
    BREACH: 'boundaryBreach'
} as const;

export type BoundarySoundType = typeof BOUNDARY_SOUND_TYPES[keyof typeof BOUNDARY_SOUND_TYPES];

// Export all sound type constants
export default {
    WEAPON_TYPES,
    EXPLOSION_TYPES,
    THRUSTER_TYPES,
    BOSS_SOUND_TYPES,
    BOUNDARY_SOUND_TYPES
};
