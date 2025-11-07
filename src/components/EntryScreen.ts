/**
 * EntryScreen.js - Entry screen overlay (TEMPORARY STUB)
 * TODO: Migrate to React component (Phase 9)
 */

// Import game dependencies
import gameStateMachine, { GAME_STATES } from '../game/GameStateMachine';
import soundManager from '../managers/SoundManager';

// Global callback for when game starts
let onStartGameCallback = null;

/**
 * Initialize the entry screen
 */
function initEntryScreen() {
  console.log('Entry screen initialized (stub version)');
  // Do nothing for now - entry screen disabled during migration
}

/**
 * Show the entry screen
 * @param {Function} callback - Callback to execute when "Start Game" is clicked
 */
function showEntryScreen(callback) {
  console.log('⚠️ Entry screen bypassed during React migration - starting game immediately');

  // Store the callback
  onStartGameCallback = callback;

  // For now, just call the callback immediately to start the game
  // This bypasses the entry screen entirely
  setTimeout(() => {
    if (typeof onStartGameCallback === 'function') {
      onStartGameCallback();
    }
  }, 100);
}

/**
 * Hide the entry screen
 */
function hideEntryScreen() {
  console.log('Entry screen hide (no-op in stub version)');
  // Do nothing - no entry screen to hide
}

export { initEntryScreen, showEntryScreen, hideEntryScreen };
