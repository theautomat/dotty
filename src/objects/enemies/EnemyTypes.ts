/**
 * EnemyTypes.ts - Constants for enemy types in the game
 *
 * This file defines constants for all enemy types to avoid hardcoded strings
 * throughout the codebase.
 */

const ENEMY_TYPES = {
    UFO: 'ufo'
} as const;

export type EnemyType = typeof ENEMY_TYPES[keyof typeof ENEMY_TYPES];

export default ENEMY_TYPES;
