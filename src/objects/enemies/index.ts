/**
 * enemies/index.ts - Centralized exports for enemy components
 * Includes constants for enemy types to avoid hardcoded strings
 */

import Enemy from './Enemy';
import EnemyConfig from './EnemyConfig';
import UFO from './UFO';
import EnemyWeapon from './EnemyWeapon';
import ENEMY_TYPES from './EnemyTypes';
import enemyManager from '../../managers/EnemyManager';

// Export enemy components and constants
export {
    Enemy,
    EnemyConfig,
    UFO,
    EnemyWeapon,
    ENEMY_TYPES,
    enemyManager
};
