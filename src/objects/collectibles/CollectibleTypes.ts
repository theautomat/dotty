/**
 * CollectibleTypes.ts - Constants for collectible types in the game
 *
 * This file defines constants for all collectible types to avoid hardcoded strings
 * throughout the codebase.
 */

export const COLLECTIBLE_TYPES = {
    IRON: 'iron',
    COPPER: 'copper',
    SILVER: 'silver',
    GOLD: 'gold',
    PLATINUM: 'platinum'
} as const;

export type CollectibleType = typeof COLLECTIBLE_TYPES[keyof typeof COLLECTIBLE_TYPES];

export default COLLECTIBLE_TYPES;
