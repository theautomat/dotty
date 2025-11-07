// main.ts - Entry point for Vite
import * as THREE from 'three';
import { Game } from './src/game/index';
import { io } from 'socket.io-client';

// Make THREE globally available for legacy code
declare global {
  interface Window {
    THREE: typeof THREE;
    ENABLE_MULTIPLAYER: boolean;
    io: typeof io;
    LEADERBOARD_PAGE?: boolean;
    GAME_INITIALIZING?: boolean;
    game?: Game;
  }
}

window.THREE = THREE;

// Enable WebRTC multiplayer
window.ENABLE_MULTIPLAYER = true;

// Make Socket.IO available for WebRTC
window.io = io;

// Initialize game on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  // Check if we're on the leaderboard page
  // Keep both detection methods for backward compatibility
  const isLeaderboard =
    window.location.pathname.includes('/leaderboard') ||
    window.location.search.includes('leaderboard=true');

  if (isLeaderboard) {
    console.log('On leaderboard page - loading leaderboard instead of game');
    window.LEADERBOARD_PAGE = true;

    // Clean up the game container
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      // Hide game UI elements
      gameContainer.style.display = 'none';
    }

    try {
      // Load the leaderboard Preact application
      await loadLeaderboard();
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }

    return;
  }

  // Set a flag to indicate initialization is in progress
  window.GAME_INITIALIZING = true;

  const game = new Game();
  window.game = game;

  // Initialize the game
  game.init();
});

/**
 * Dynamically load and render the leaderboard
 * TODO: Migrate to React component (Phase 9)
 */
async function loadLeaderboard(): Promise<void> {
  // TEMPORARY STUB: Leaderboard disabled during React/TypeScript migration
  console.log('⚠️ Leaderboard temporarily disabled during React migration');

  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #000;
      color: #fff;
      font-family: 'Press Start 2P', monospace;
      text-align: center;
      padding: 20px;
    ">
      <h1 style="font-size: 32px; margin-bottom: 20px;">Leaderboard</h1>
      <p style="font-size: 14px; margin-bottom: 30px; opacity: 0.7;">
        Temporarily disabled during React migration
      </p>
      <button onclick="window.location.href='/'" style="
        padding: 15px 40px;
        font-family: 'Press Start 2P', monospace;
        font-size: 14px;
        background-color: transparent;
        color: white;
        border: 2px solid #ffffff;
        cursor: pointer;
      ">
        ← Back to Game
      </button>
    </div>
  `;
}
