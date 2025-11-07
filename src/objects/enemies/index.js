/**
 * enemies/index.js - Centralized exports for enemy components
 * Includes constants for enemy types to avoid hardcoded strings
 */

import Enemy from './Enemy.js';
import EnemyConfig from './EnemyConfig';
import UFO from './UFO.js';
import Hunter from './Hunter.js';
import Patroller from './Patroller.js';
import Tetra from './Tetra.js';
import EnemyWeapon from './EnemyWeapon.js';
import ENEMY_TYPES from './EnemyTypes.js';
import Boss from './Boss.js';
import SphereBoss from './SphereBoss.js';
import enemyManager from '../../managers/EnemyManager';

// Export enemy components and constants
export {
    Enemy,
    EnemyConfig,
    UFO,
    Hunter,
    Patroller,
    Tetra,
    EnemyWeapon,
    ENEMY_TYPES,
    Boss,
    SphereBoss,
    enemyManager
};