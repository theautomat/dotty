/**
 * EntryScreen.ts - Entry screen overlay for Pirates Booty
 */

// Import game dependencies
import gameStateMachine, { GAME_STATES } from '../game/GameStateMachine';
import soundManager from '../managers/SoundManager';

// Global callback for when game starts
let onStartGameCallback: Function | null = null;
let entryScreenElement: HTMLElement | null = null;

/**
 * Initialize the entry screen
 */
function initEntryScreen() {
  console.log('Entry screen initialized');

  // Create the entry screen container if it doesn't exist
  entryScreenElement = document.getElementById('entry-screen');

  if (!entryScreenElement) {
    entryScreenElement = document.createElement('div');
    entryScreenElement.id = 'entry-screen';
    document.body.appendChild(entryScreenElement);
  }

  // Style the entry screen
  entryScreenElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #0a1628 0%, #1a2f4f 50%, #0a1628 100%);
    display: none;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    z-index: 10000;
    font-family: 'Press Start 2P', cursive, monospace;
  `;

  // Create the inner content
  entryScreenElement.innerHTML = `
    <div style="text-align: center; color: #ffd700;">
      <h1 style="font-size: 72px; margin-bottom: 20px; text-shadow: 4px 4px 8px rgba(0,0,0,0.8), 0 0 20px rgba(255,215,0,0.5);">
        BOOTY
      </h1>
      <p style="font-size: 18px; margin-bottom: 40px; color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
        Pirates Treasure Map
      </p>
      <button id="start-game-btn" style="
        font-family: 'Press Start 2P', cursive, monospace;
        font-size: 24px;
        padding: 20px 40px;
        background: linear-gradient(180deg, #ff6b35 0%, #d64500 100%);
        color: white;
        border: 4px solid #ffd700;
        border-radius: 10px;
        cursor: pointer;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        box-shadow: 0 6px 20px rgba(0,0,0,0.5);
        transition: all 0.2s;
      "
      onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 8px 30px rgba(255,215,0,0.6)';"
      onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.5)';"
      >
        START
      </button>
    </div>
  `;
}

/**
 * Show the entry screen
 * @param {Function} callback - Callback to execute when "Start Game" is clicked
 */
function showEntryScreen(callback: Function) {
  console.log('Showing entry screen');

  // Store the callback
  onStartGameCallback = callback;

  if (!entryScreenElement) {
    console.error('Entry screen element not initialized!');
    return;
  }

  // Show the entry screen
  entryScreenElement.style.display = 'flex';

  // Add click handler to start button
  const startButton = document.getElementById('start-game-btn');
  if (startButton) {
    startButton.onclick = () => {
      console.log('Start button clicked');

      // Play startup sound if available
      if (soundManager && typeof soundManager.playSound === 'function') {
        soundManager.playSound('start');
      }

      // Hide the entry screen
      hideEntryScreen();

      // Call the game start callback
      if (typeof onStartGameCallback === 'function') {
        onStartGameCallback();
      }
    };
  }
}

/**
 * Hide the entry screen
 */
function hideEntryScreen() {
  console.log('Hiding entry screen');

  if (entryScreenElement) {
    entryScreenElement.style.display = 'none';
  }
}

export { initEntryScreen, showEntryScreen, hideEntryScreen };
