/**
 * game-integration-example.js
 * 
 * This is an example of how to integrate the EntryScreenManager with Game.js.
 * NOT intended to be used directly - this is for reference only.
 */

// In Game.js:

import EntryScreenManager from './EntryScreenManager.js';

class Game {
  constructor() {
    // Add entryScreenManager property
    this.entryScreenManager = null;
    
    // Other existing properties...
    // ...
  }
  
  async init() {
    // Initialize normal game systems
    // ... [existing initialization code]
    
    // Initialize entry screen manager AFTER other systems
    this.entryScreenManager = new EntryScreenManager(this);
    await this.entryScreenManager.init();
    
    // Show entry screen instead of starting the game directly
    this.entryScreenManager.show({
      // Custom props can be passed here
      // The EntryScreenManager will handle callbacks internally
    });
    
    // Rest of init() without starting the game...
    // Game will start when player selects mode from entry screen
    
    // Later, you might update this part:
    /*
    // If you want to bypass entry screen in development
    if (this.DEVELOPMENT_MODE && window.location.search.includes('skip_entry=true')) {
      // Skip entry screen and start game directly
      this.entryScreenManager.hide();
      this.handleSinglePlayer();
    }
    */
  }
  
  // EntryScreenManager will call these methods:
  
  /**
   * Start the game in single player mode
   * This would be called by EntryScreenManager
   */
  handleSinglePlayer() {
    // Hide entry screen if not done yet
    if (this.entryScreenManager) {
      this.entryScreenManager.hide();
    }
    
    // Start the game - use existing functionality
    this.gameStarted = true;
    
    // Transition to PLAYING state
    GameStateMachine.transitionTo(GAME_STATES.PLAYING, {
      level: LevelConfig.getCurrentLevel().id
    });
    
    // Play the level beginning sound
    SoundManager.playLevelBegin();
  }
  
  /**
   * Handle game over
   * Should show entry screen when game is over
   */
  handleGameOver() {
    // Existing game over logic
    // ...
    
    // Show entry screen again
    if (this.entryScreenManager) {
      // You might want to wait a bit
      setTimeout(() => {
        this.entryScreenManager.show();
      }, 3000); // Show after delay
    }
  }
}

// NOTE: This is just an example, not meant to be used directly
// The actual integration should be done carefully, preserving
// existing game functionality.