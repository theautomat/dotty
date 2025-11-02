/**
 * ores/index.js - Centralized exports for ore components
 * Includes constants for ore types to avoid hardcoded strings
 */

import Ore from './Ore.js';
import OreConfig from './OreConfig.js';
import ORE_TYPES from './OreTypes.js';

// Export ore components and constants
export {
    Ore,
    OreConfig,
    ORE_TYPES
};