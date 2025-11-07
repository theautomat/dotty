/**
 * game/index.js - Centralized exports for game components
 */

import levelManager from '../managers/LevelManager';
import GameStats from './GameStats';
import LevelConfig from './LevelConfig';
import Timer from './Timer';
import StartScreen from './StartScreen.js';
import Game from './Game.js';
import gameStateMachine, { GAME_STATES } from './GameStateMachine';
import gameState from './GameState';
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