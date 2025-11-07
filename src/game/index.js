/**
 * game/index.js - Centralized exports for game components
 */

import levelManager from '../managers/LevelManager';
import GameStats from './GameStats';
import LevelConfig from './LevelConfig';
import Timer from './Timer';
import StartScreen from './StartScreen';
import Game from './Game';
import gameStateMachine, { GAME_STATES } from './GameStateMachine';
import gameState from './GameState';
import gameSessionManager from '../managers/GameSessionManager';

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