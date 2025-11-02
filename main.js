// main.js - Entry point for Vite
import * as THREE from 'three';
import { Game } from './src/game/index.js';
import { io } from 'socket.io-client';

// Make THREE globally available for legacy code
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
 */
async function loadLeaderboard() {
  // Create container if it doesn't exist
  let leaderboardContainer = document.getElementById('leaderboard-app');
  if (!leaderboardContainer) {
    leaderboardContainer = document.createElement('div');
    leaderboardContainer.id = 'leaderboard-app';
    document.body.appendChild(leaderboardContainer);
  }
  
  // Add required styles
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      background-color: #000000;
      color: #ffffff;
      font-family: 'Press Start 2P', monospace;
      line-height: 1.5;
      overflow-x: hidden;
      overflow-y: auto;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      font-weight: 300;
    }
    
    .leaderboard-container {
      width: 90%;
      max-width: 800px;
      margin: 40px auto;
      text-align: center;
      padding-bottom: 40px;
    }
    
    .leaderboard-title {
      font-size: 42px;
      margin: 0 0 40px 0;
      color: #ffffff;
      text-shadow: 0 0 10px rgba(0, 100, 255, 0.7);
      font-family: 'Press Start 2P', monospace;
      letter-spacing: 2px;
      font-weight: 300;
      text-transform: lowercase;
      text-align: center;
    }
    
    .leaderboard-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 auto;
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      text-transform: lowercase;
      letter-spacing: 1px;
    }
    
    .leaderboard-table th {
      color: #ffffff;
      font-weight: 300;
      text-align: left;
      padding: 10px;
      border-bottom: 2px solid rgba(255, 255, 255, 0.3);
    }
    
    .leaderboard-table td {
      padding: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .leaderboard-table tr:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
    
    .rank-col {
      width: 15%;
      text-align: center;
    }
    
    .id-col {
      width: 35%;
    }
    
    .score-col {
      width: 50%;
      text-align: right;
    }
    
    .player-highlight {
      background-color: rgba(0, 100, 255, 0.2);
    }
    
    .back-button {
      margin-top: 40px;
      padding: 15px 40px;
      font-family: 'Press Start 2P', monospace;
      font-size: 16px;
      background-color: transparent;
      color: white;
      border: 2px solid #ffffff;
      border-radius: 0;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 300;
      text-transform: lowercase;
    }
    
    .back-button:hover {
      background-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }
    
    /* New navigation button positioned at top left */
    .nav-button {
      position: fixed;
      top: 20px;
      left: 20px;
      padding: 10px 20px;
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      background-color: transparent;
      color: white;
      border: 2px solid #ffffff;
      border-radius: 0;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 300;
      text-transform: lowercase;
      display: flex;
      align-items: center;
      z-index: 100;
    }
    
    .nav-button:hover {
      background-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }
    
    .nav-button .arrow {
      margin-right: 10px;
      font-size: 16px;
    }
    
    .loading {
      font-size: 18px;
      margin: 40px 0;
      font-family: 'Press Start 2P', monospace;
    }
    
    .error {
      color: #ff6b6b;
      font-size: 16px;
      margin: 40px 0;
      font-family: 'Press Start 2P', monospace;
    }
    
    /* Add scanlines and CRT effect */
    .scanlines {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(to bottom, 
        rgba(0,0,0,0.15), 
        rgba(0,0,0,0.15) 1px, 
        transparent 1px, 
        transparent 2px);
      background-size: 100% 4px;
      z-index: -1;
      pointer-events: none;
      opacity: 0.4;
    }
    
    /* Top 3 ranks special styling */
    .rank-1 {
      color: #ffdd00;
      text-shadow: 0 0 5px rgba(255, 221, 0, 0.5);
    }
    
    .rank-2 {
      color: #c0c0c0;
      text-shadow: 0 0 5px rgba(192, 192, 192, 0.5);
    }
    
    .rank-3 {
      color: #cd7f32;
      text-shadow: 0 0 5px rgba(205, 127, 50, 0.5);
    }
    
    /* Media queries for responsiveness */
    @media (max-width: 768px) {
      .leaderboard-title {
        font-size: 32px;
        margin-bottom: 30px;
        /* Add padding at the top for the nav button */
        padding-top: 30px;
      }
      
      .leaderboard-table {
        font-size: 12px;
      }
      
      .back-button, .nav-button {
        padding: 12px 20px;
        font-size: 14px;
      }
      
      .nav-button {
        top: 15px;
        left: 15px;
      }
    }
    
    @media (max-width: 480px) {
      .leaderboard-title {
        font-size: 24px;
        margin-bottom: 20px;
        /* Add more padding at the top for the nav button on mobile */
        padding-top: 50px;
      }
      
      .leaderboard-table {
        font-size: 10px;
      }
      
      .leaderboard-table th,
      .leaderboard-table td {
        padding: 8px 5px;
      }
      
      .back-button, .nav-button {
        padding: 8px 15px;
        font-size: 12px;
      }
      
      .nav-button {
        top: 10px;
        left: 10px;
      }
    }
  `;
  document.head.appendChild(styleEl);
  
  // Add scanlines element
  const scanlines = document.createElement('div');
  scanlines.className = 'scanlines';
  document.body.appendChild(scanlines);
  
  // Dynamically import Preact and other dependencies
  const { html, render, useState, useEffect } = await import('https://esm.sh/htm/preact/standalone');
  
  // Import Firebase config 
  const initFirebase = async () => {
    try {
      // Try the module path that should work based on the game structure
      console.log('Attempting to load Firebase module...');
      
      // Try multiple possible paths since we're not sure which is correct
      let firebaseModule;
      
      try {
        // First try direct import from src/scripts
        firebaseModule = await import('./src/scripts/firebase-module.js');
        console.log('Loaded Firebase module from src/scripts');
      } catch (e) {
        console.log('Could not load from src/scripts, trying scripts folder:', e);
        try {
          // Then try scripts without src prefix
          firebaseModule = await import('./scripts/firebase-module.js');
          console.log('Loaded Firebase module from scripts');
        } catch (e2) {
          console.log('Could not load from scripts either, trying firebase-service.js:', e2);
          try {
            // Try firebase-service as an alternative
            firebaseModule = await import('./src/scripts/firebase-service.js');
            console.log('Loaded Firebase service from src/scripts');
          } catch (e3) {
            console.log('Could not load from src/scripts firebase-service, trying scripts folder:', e3);
            firebaseModule = await import('./scripts/firebase-service.js');
            console.log('Loaded Firebase service from scripts');
          }
        }
      }
      
      return firebaseModule.initializeFirebase ? 
        firebaseModule.initializeFirebase() : 
        firebaseModule.default?.initializeFirebase();
    } catch (err) {
      console.error('Firebase initialization error:', err);
      // Create a mock Firebase client for testing
      return {
        db: {
          name: 'Mock DB - Firebase module not found'
        }
      };
    }
  };
  
  // Leaderboard component
  function Leaderboard() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPlayerId, setCurrentPlayerId] = useState(null);
    const [debugInfo, setDebugInfo] = useState(null); // For showing detailed error info
    
    // Version 0.1 cutoff date: March 23, 2025, 3:00 PM
    const VERSION_CUTOFF_DATE = new Date("2025-03-23T15:00:00Z").getTime();
    console.log('Cutoff timestamp:', VERSION_CUTOFF_DATE, 'Cutoff date:', new Date(VERSION_CUTOFF_DATE).toISOString());
    
    useEffect(() => {
      const fetchData = async () => {
        try {
          setLoading(true);
          
          // Initialize Firebase
          console.log('Initializing Firebase...');
          const firebase = await initFirebase();
          console.log('Firebase initialized:', firebase);
          const db = firebase.db;
          
          if (!db) {
            throw new Error('Firebase database reference not available');
          }
          
          // Try to get user fingerprint
          try {
            console.log('Getting fingerprint...');
            let fingerprintModule;
            
            try {
              fingerprintModule = await import('./src/scripts/fingerprint.js');
            } catch (e) {
              console.log('Trying alternative fingerprint path');
              fingerprintModule = await import('./scripts/fingerprint.js');
            }
            
            const initFingerprint = fingerprintModule.initFingerprint;
            const fingerprint = await initFingerprint();
            setCurrentPlayerId(fingerprint);
            console.log('Got fingerprint:', fingerprint.substring(0, 8) + '...');
          } catch(e) {
            console.warn("Could not get fingerprint:", e);
          }
          
          // Import Firebase Firestore functions
          console.log('Importing Firestore...');
          const { collection, query, orderBy, limit, getDocs, where } = await import('firebase/firestore');
          
          // Reference to games collection
          console.log('Creating query...');
          const gamesRef = collection(db, "games");
          
          // Simplified query first - just get top scores without date filter
          let q;
          try {
            // First try a simple query without where clause
            q = query(
              gamesRef,
              orderBy('score', 'desc'), 
              limit(100)
            );
            
            console.log('Query created, fetching documents...');
            const snapshot = await getDocs(q);
            console.log('Documents fetched:', snapshot.size);
            
            const games = [];
            
            // Log the VERSION_CUTOFF_DATE for reference
            console.log('VERSION_CUTOFF_DATE:', new Date(VERSION_CUTOFF_DATE).toISOString(), '(timestamp:', VERSION_CUTOFF_DATE, ')');
            
            // Add date debugging
            let recordsBeforeCutoff = 0;
            let recordsAfterCutoff = 0;
            
            snapshot.forEach(doc => {
              const data = doc.data();
              games.push({
                id: doc.id,
                ...data
              });
              
              // Debug creation dates
              if (data.created) {
                const createdDate = new Date(data.created);
                // Ensure we're comparing timestamp numbers, not strings or Date objects
                const createdTimestamp = typeof data.created === 'number' ? data.created : createdDate.getTime();
                const isAfterCutoff = createdTimestamp >= VERSION_CUTOFF_DATE;
                
                console.log(
                  `Record ${doc.id.substr(0, 6)}... | ` +
                  `Date: ${createdDate.toISOString()} | ` +
                  `Timestamp: ${createdTimestamp} | ` +
                  `Cutoff: ${VERSION_CUTOFF_DATE} | ` +
                  `After cutoff: ${isAfterCutoff ? 'YES' : 'NO'}`
                );
                
                if (isAfterCutoff) {
                  recordsAfterCutoff++;
                } else {
                  recordsBeforeCutoff++;
                }
              } else {
                console.log(`Record ${doc.id.substr(0, 6)}... | No creation date!`);
              }
            });
            
            console.log(`Date summary: ${recordsAfterCutoff} records after cutoff, ${recordsBeforeCutoff} records before cutoff`);
            
            // Sort by score
            games.sort((a, b) => b.score - a.score);
            
            // Now try to enable the date filter if we have records after the cutoff
            if (recordsAfterCutoff > 0) {
              console.log(`Found ${recordsAfterCutoff} records after cutoff, filtering out older records...`);
              const filteredGames = games.filter(game => {
                if (!game.created) return false;
                const createdTimestamp = typeof game.created === 'number' ? game.created : new Date(game.created).getTime();
                return createdTimestamp >= VERSION_CUTOFF_DATE;
              });
              console.log(`Filtered from ${games.length} to ${filteredGames.length} records`);
              setLeaderboard(filteredGames);
            } else {
              console.log('No records found after cutoff date, showing all records');
              setLeaderboard(games);
            }
            
            console.log('Leaderboard data processed:', games.length, 'entries');
            setLoading(false);
          } catch (err) {
            console.error('Error executing Firestore query:', err);
            setDebugInfo({
              message: err.message,
              code: err.code,
              name: err.name,
              stack: err.stack
            });
            throw err;
          }
        } catch (err) {
          console.error('Error fetching leaderboard:', err);
          setError(`Failed to fetch leaderboard data: ${err.message}`);
          setLoading(false);
        }
      };
      
      fetchData();
    }, []);
    
    // Format player ID (last 4 digits)
    const formatPlayerId = (id) => {
      if (!id) return 'ANON';
      return `#${id.slice(-4)}`;
    };
    
    // Check if this entry is the current player
    const isCurrentPlayer = (entry) => {
      const entryId = String(entry.playerId || "");
      const currentId = String(currentPlayerId || "");
      return currentId && entryId && entryId === currentId;
    };
    
    // Handle back button click
    const handleBackClick = () => {
      window.location.href = '/';
    };
    
    if (loading) {
      return html`
        <div class="leaderboard-container">
          <button class="nav-button" onClick=${handleBackClick}><span class="arrow">${'<'}</span> play game</button>
          <h1 class="leaderboard-title">leaderboard</h1>
          <div class="loading">loading scores...</div>
        </div>
      `;
    }
    
    if (error) {
      return html`
        <div class="leaderboard-container">
          <button class="nav-button" onClick=${handleBackClick}><span class="arrow">${'<'}</span> play game</button>
          <h1 class="leaderboard-title">leaderboard</h1>
          <div class="error">${error}</div>
          ${debugInfo && html`
            <div style="margin-top: 20px; text-align: left; font-size: 12px; color: #ff8888; max-width: 100%; overflow-x: auto; white-space: pre-wrap; font-family: monospace;">
              <div>Error details (for debugging):</div>
              <div>Message: ${debugInfo.message}</div>
              <div>Code: ${debugInfo.code}</div>
              <div>Name: ${debugInfo.name}</div>
              <div style="margin-top: 10px;">Stack: ${debugInfo.stack}</div>
            </div>
          `}
        </div>
      `;
    }
    
    return html`
      <div class="leaderboard-container">
        <button class="nav-button" onClick=${handleBackClick}><span class="arrow">${'<'}</span> play game</button>
        <h1 class="leaderboard-title">leaderboard</h1>
        
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th class="rank-col">rank</th>
              <th class="id-col">player</th>
              <th class="score-col">score</th>
            </tr>
          </thead>
          <tbody>
            ${leaderboard.map((entry, index) => html`
              <tr class="${isCurrentPlayer(entry) ? 'player-highlight' : ''}">
                <td class="rank-col ${index < 3 ? `rank-${index + 1}` : ''}">${index + 1}</td>
                <td class="id-col">${formatPlayerId(entry.playerId)}</td>
                <td class="score-col">${entry.score}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `;
  }
  
  // Render the app
  render(html`<${Leaderboard} />`, leaderboardContainer);
}