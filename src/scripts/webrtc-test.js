import webRTCClient from './webrtc-client.js';
import { initWebRTCDebugPanel, updateWebRTCDebugPanel, logToWebRTCDebugPanel } from '../components/WebRTCDebugPanel.js';

// Test data
const testData = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  asteroids: []
};

/**
 * Initialize WebRTC test UI
 */
export function initWebRTCTest() {
  // Make webRTCClient globally available
  window.webRTCClient = webRTCClient;
  
  // Initialize the Preact debug panel
  initWebRTCDebugPanel();
  
  // Get role and game info from GameSessionManager if available
  let role = 'Unknown';
  let gameId = 'None';
  let isCaptain = false;
  
  if (window.gameSessionManager && window.gameSessionManager.getSessionInfo) {
    const sessionInfo = window.gameSessionManager.getSessionInfo();
    gameId = sessionInfo.gameId || 'None';
    role = sessionInfo.isCaptain ? 'CAPTAIN' : 'CREW';
    isCaptain = sessionInfo.isCaptain;
  }
  
  // Initial update with available info
  updateWebRTCDebugPanel({
    connectionStatus: 'Initializing...',
    role: role,
    gameId: gameId,
    isPrimary: isCaptain,
    testMode: true,
    logs: ['Initializing WebRTC test...'],
    onSendTest: sendTestData
  });
  
  // Try to initialize WebRTC connection
  setTimeout(() => {
    // Small delay to ensure GameSessionManager is fully initialized
    initWebRTC();
  }, 500);
}

/**
 * Log a message to the test UI
 * @param {string} message - The message to log
 */
function log(message) {
  // Log to Preact panel only
  logToWebRTCDebugPanel(message);
}

/**
 * Initialize WebRTC connection
 */
async function initWebRTC() {
  // Get session info - try GameSessionManager first, then fallback
  let gameId, requestPrimary;
  
  if (window.gameSessionManager && window.gameSessionManager.getSessionInfo) {
    // Get info from GameSessionManager
    const sessionInfo = window.gameSessionManager.getSessionInfo();
    gameId = sessionInfo.gameId;
    
    // Force the WebRTC role to match GameSessionManager role
    requestPrimary = sessionInfo.isCaptain;
    
    // Update panel with session info
    updateWebRTCDebugPanel({
      role: requestPrimary ? 'CAPTAIN' : 'CREW',
      gameId: gameId
    });
  } else {
    // Fallback to URL for role
    log('Warning: Using URL parameters for session info');
    
    // Get game ID from URL path
    const pathMatch = window.location.pathname.match(/^\/games\/([a-zA-Z0-9_-]+)$/);
    gameId = pathMatch ? pathMatch[1] : null;
    
    // Get role from URL query
    requestPrimary = !window.location.search.includes('crew=true');
    
    // Update panel with URL-based info
    updateWebRTCDebugPanel({
      role: requestPrimary ? 'CAPTAIN' : 'CREW',
      gameId: gameId || 'Not found'
    });
  }
  
  // Validate game ID
  if (!gameId) {
    log('Error: No game ID available from URL or GameSessionManager.');
    updateWebRTCDebugPanel({
      connectionStatus: 'Error: Missing game ID'
    });
    return;
  }
  
  // Update connection status
  updateWebRTCDebugPanel({
    connectionStatus: 'Connecting...'
  });
  
  // Force the WebRTC role to match what GameSessionManager says
  const forcedRole = window.gameSessionManager?.isCaptain || !window.location.search.includes('crew=true');
  
  // Initialize WebRTC client with correct role
  const success = await webRTCClient.init({
    roomId: gameId,
    requestPrimary: forcedRole,  // This should match GameSessionManager's decision
    onStateReceived: handleGameState
  });
  
  if (success) {
    // Get role information from GameSessionManager if available
    let role = webRTCClient.isPrimary ? 'CAPTAIN' : 'CREW';
    let isCaptain = webRTCClient.isPrimary;
    
    // Get more accurate role info from GameSessionManager if available
    if (window.gameSessionManager) {
      const sessionInfo = window.gameSessionManager.getSessionInfo();
      role = sessionInfo.isCaptain ? 'CAPTAIN' : 'CREW';
      isCaptain = sessionInfo.isCaptain;
    }
    
    // Update Preact panel with connection success and correct role
    updateWebRTCDebugPanel({
      connectionStatus: 'Connected',
      role: role,
      isPrimary: isCaptain
    });
    
    log('WebRTC connection established');
    log(`Room ID: ${gameId}`);
    log(`Role: ${webRTCClient.isPrimary ? 'CAPTAIN' : 'CREW'}`);
  } else {
    // Update Preact panel with connection failure
    updateWebRTCDebugPanel({
      connectionStatus: 'Connection failed'
    });
    
    log('WebRTC connection failed');
  }
}

/**
 * Send test data (primary only)
 */
function sendTestData() {
  if (!webRTCClient || !webRTCClient.isPrimary) return;
  
  // Update test data with random values
  testData.position.x = Math.random() * 100 - 50;
  testData.position.y = Math.random() * 100 - 50;
  testData.position.z = Math.random() * 100 - 50;
  
  testData.rotation.y = Math.random() * Math.PI * 2;
  
  // Reset and add random asteroids
  testData.asteroids = [];
  const asteroidCount = 3 + Math.floor(Math.random() * 5);
  
  for (let i = 0; i < asteroidCount; i++) {
    testData.asteroids.push({
      id: `asteroid-${i}`,
      position: {
        x: Math.random() * 200 - 100,
        y: Math.random() * 200 - 100,
        z: Math.random() * 200 - 100
      },
      size: 1 + Math.random() * 5
    });
  }
  
  // Add timestamp and test message
  testData.timestamp = Date.now();
  testData.testMessage = "Test message from CAPTAIN at " + new Date().toLocaleTimeString();
  
  // Send data
  webRTCClient.sendGameState(testData);
  
  // Update the debug panel
  updateWebRTCDebugPanel({
    objects: {
      asteroids: testData.asteroids.length,
      bullets: 0,
      ores: 0,
      powerUps: 0
    }
  });
  
  log(`Sent test data with ${testData.asteroids.length} asteroids`);
  log(`Test message: ${testData.testMessage}`);
}

/**
 * Handle received game state (collaborator only)
 * @param {Object} gameState - The received game state
 */
function handleGameState(gameState) {
  if (webRTCClient.isPrimary) return;
  
  // Calculate latency
  const latency = Date.now() - gameState.timestamp;
  
  // Update state updates counter in the debug panel
  let stateCount = (parseInt(document.getElementById('webrtc-debug-state')?.dataset?.count || '0') || 0) + 1;
  
  // Update the Preact panel
  updateWebRTCDebugPanel({
    stateUpdates: {
      count: stateCount,
      latency
    }
  });
  
  // Update objects count in the panel
  if (gameState) {
    updateWebRTCDebugPanel({
      objects: {
        asteroids: gameState.asteroids?.length || 0,
        bullets: gameState.bullets?.length || 0,
        ores: gameState.ores?.length || 0,
        powerUps: gameState.powerUps?.length || 0
      }
    });
  }
}