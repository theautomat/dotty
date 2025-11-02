/**
 * game/index.js - Centralized exports for game components
 */

import levelManager from '../managers/LevelManager.js';
import GameStats from './GameStats.js';
import LevelConfig from './LevelConfig.js';
import Timer from './Timer.js';
import StartScreen from './StartScreen.js';
import Game from './Game.js';
import gameStateMachine, { GAME_STATES } from './GameStateMachine.js';
import gameState from './GameState.js';
import gameSessionManager from '../managers/GameSessionManager.js';

// Export game components
export {
    Game,
    levelManager,
    GameStats,
    LevelConfig,
    Timer,
    StartScreen,
    gameStateMachine,
    GAME_STATES,
    gameState,
    gameSessionManager
};