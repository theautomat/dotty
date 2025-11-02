/**
 * collectibles/index.js - Centralized exports for collectible components
 * Includes constants for collectible types to avoid hardcoded strings
 */

import Collectible from './Collectible.js';
import CollectibleConfig from './CollectibleConfig.js';
import COLLECTIBLE_TYPES from './CollectibleTypes.js';

// Export collectible components and constants
export {
    Collectible,
    CollectibleConfig,
    COLLECTIBLE_TYPES
};