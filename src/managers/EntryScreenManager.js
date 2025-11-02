/**
 * EntryScreenManager.js - Manages integration between entry screen and game
 * 
 * This file handles the transition between the retro arcade entry screen and the main game.
 * Later, it will be integrated directly into the game flow.
 */

import { initEntryScreen, updateEntryScreen, toggleEntryScreen } from '../entry-screen/components/EntryScreen.js';
import gameSessionManager from './GameSessionManager.js';
import gameStateMachine, { GAME_STATES } from '../game/GameStateMachine.js';

class EntryScreenManager {
  constructor(game) {
    this.game = game;
    this.initialized = false;
    this.visible = false;
  }
  
  /**
   * Initialize the entry screen
   * @returns {Promise<boolean>} Success status
   */
  async init() {
    // Check if container exists
    if (!document.getElementById('entry-screen')) {
      // Create container if it doesn't exist
      const container = document.createElement('div');
      container.id = 'entry-screen';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.zIndex = '1000';
      container.style.display = 'none'; // Start hidden
      document.body.appendChild(container);
    }
    
    // Initialize Preact component
    const success = initEntryScreen();
    if (!success) {
      console.error('Failed to initialize entry screen');
      return false;
    }
    
    // Add CSS styles if they don't exist
    if (!document.querySelector('#entry-screen-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'entry-screen-styles';
      
      // Add core styles (a subset of what's in entry-screen.html)
      styleSheet.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
        
        :root {
          --cabinet-color: #333;
          --cabinet-trim: #222;
          --cabinet-accent: #ff0000;
          --screen-color: #000;
          --screen-glow: #0f0;
          --text-color: #33ff33;
          --text-highlight: #88ff88;
          --button-color: #ff0000;
          --button-text: #ffffff;
          --joystick-color: #000;
        }
        
        /* Core styles are included here - see entry-screen.html for full styles */
        .arcade-cabinet {
          position: relative;
          width: 90vw;
          max-width: 800px;
          height: 90vh;
          max-height: 900px;
          margin: 0 auto;
          perspective: 1000px;
        }
      `;
      
      document.head.appendChild(styleSheet);
    }
    
    this.initialized = true;
    return true;
  }
  
  /**
   * Show the entry screen
   * @param {Object} props - Props to pass to the entry screen component
   */
  show(props = {}) {
    if (!this.initialized) {
      console.warn('Entry screen not initialized. Call init() first.');
      return false;
    }
    
    // Set up callbacks if not provided
    const defaultProps = {
      onStart: () => this.handleSinglePlayer(),
      onMultiplayer: () => this.handleMultiplayer(),
      onCopySuccess: () => this.handleCopySuccess()
    };
    
    // Merge default props with provided props
    const mergedProps = { ...defaultProps, ...props };
    
    // Update and show the entry screen
    updateEntryScreen(mergedProps);
    this.visible = toggleEntryScreen(true);
    
    return this.visible;
  }
  
  /**
   * Hide the entry screen
   */
  hide() {
    if (!this.initialized) return false;
    
    this.visible = !toggleEntryScreen(false);
    return !this.visible;
  }
  
  /**
   * Handle single player mode selection
   */
  handleSinglePlayer() {
    console.log('Starting single player game...');
    
    // Hide entry screen
    this.hide();
    
    // Start the game
    if (this.game) {
      // Reset game session manager for single player
      gameSessionManager.isCaptain = true;
      gameSessionManager.isCrew = false;
      
      // Transition to MENU state
      gameStateMachine.transitionTo(GAME_STATES.MENU, {
        waitingForClick: true
      });
      
      // If we need to start the game immediately, we could call:
      // this.game.gameStarted = true;
      // gameStateMachine.transitionTo(GAME_STATES.PLAYING);
    } else {
      console.error('Game instance not available');
    }
  }
  
  /**
   * Handle multiplayer mode selection
   */
  handleMultiplayer() {
    console.log('Setting up multiplayer game...');
    
    // Update entry screen to show multiplayer options
    const crewUrl = gameSessionManager.getCrewUrl();
    
    // Show crew URL in the entry screen
    updateEntryScreen({
      onStart: () => this.handleSinglePlayer(),
      onMultiplayer: () => this.handleMultiplayer(),
      onCopySuccess: () => this.handleCopySuccess(),
      crewUrl: crewUrl,
      showCopiedMessage: false
    });
  }
  
  /**
   * Handle copy success for crew URL
   */
  handleCopySuccess() {
    console.log('Crew URL copied to clipboard');
    
    // Show success message
    updateEntryScreen({
      onStart: () => this.handleSinglePlayer(),
      onMultiplayer: () => this.handleMultiplayer(),
      onCopySuccess: () => this.handleCopySuccess(),
      crewUrl: gameSessionManager.getCrewUrl(),
      showCopiedMessage: true
    });
    
    // Hide success message after 2 seconds
    setTimeout(() => {
      updateEntryScreen({
        onStart: () => this.handleSinglePlayer(),
        onMultiplayer: () => this.handleMultiplayer(),
        onCopySuccess: () => this.handleCopySuccess(),
        crewUrl: gameSessionManager.getCrewUrl(),
        showCopiedMessage: false
      });
    }, 2000);
  }
}

// Create and export a singleton instance
const entryScreenManager = new EntryScreenManager();
export default entryScreenManager;