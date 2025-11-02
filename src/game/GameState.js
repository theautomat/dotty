/**
 * GameState.js - Manages and tracks the game state for multiplayer functionality
 * Responsible for collecting, formatting, and processing game state data
 */

import { gameStateMachine } from './index.js';

class GameState {
  constructor(game) {
    this.game = game; // Reference to Game instance for accessing objects
    this.receivedStateCount = 0; // Track number of received state updates
    this.lastReceivedState = null; // Store the last received state
    this.latency = 0; // Track latency of received updates
    this.stateChangeCallbacks = []; // Callbacks to notify when state is received
  }

  /**
   * Collect current game state for transmission
   * @returns {Object} Formatted game state
   */
  collectState() {
    if (!this.game) {
      console.error('[CAPTAIN] Game reference is null or undefined');
      return null;
    }
    
    // Build minimal state object with only necessary data
    const gameState = {
      timestamp: Date.now(),
      playerPosition: this.game.camera.position.toArray(),
      playerRotation: this.game.camera.quaternion.toArray(),
      currentState: gameStateMachine.getCurrentState(),
      asteroids: this.game.asteroidManager ? this.game.asteroidManager.getAllAsteroidDataForState() : [], 
      enemies: this.game.enemies.filter(e => e && e.mesh).map(enemy => ({
        id: enemy.id || Date.now() + Math.random(),
        position: enemy.mesh.position.toArray(),
        type: enemy.type
      })),
      ores: this.game.oreManager ? this.game.oreManager.getAllOreDataForState() : [],
      bullets: this.game.bullets.filter(b => b && b.getMesh()).map(bullet => ({
        position: bullet.getMesh().position.toArray()
      }))
    };
    
    return gameState;
  }

  /**
   * Register a callback to be notified when state is received
   * @param {Function} callback - Function to call when state is received
   */
  onStateReceived(callback) {
    if (typeof callback === 'function') {
      this.stateChangeCallbacks.push(callback);
    }
  }

  /**
   * Process state received from WebRTC
   * @param {Object} gameState - The game state received from primary
   */
  processReceivedState(gameState) {
    if (!gameState) {
      console.error('[CREW] Received null or undefined game state');
      return { count: this.receivedStateCount, latency: 0 };
    }
    
    this.receivedStateCount++;
    this.lastReceivedState = gameState;
    
    // Calculate latency
    const latency = Date.now() - (gameState.timestamp || Date.now());
    this.latency = latency;
    
    // Log the full received state
    console.log(`[CREW] Received game state #${this.receivedStateCount}:`, gameState);
    console.log(`[CREW] Received ${gameState.asteroids?.length || 0} asteroids`);
    
    // Notify all registered callbacks
    this.stateChangeCallbacks.forEach(callback => callback(gameState, this.receivedStateCount, latency));
    
    return { count: this.receivedStateCount, latency };
  }

  /**
   * Get statistics about received state
   * @returns {Object} State statistics
   */
  getStats() {
    return {
      receivedCount: this.receivedStateCount,
      latency: this.latency,
      lastState: this.lastReceivedState
    };
  }
}

// Export singleton instance
const gameState = new GameState();
export default gameState;