/**
 * WebRTCDebugPanel.js - Preact component for WebRTC debugging
 * A persistent panel showing connection status and game state
 */

// Use the same Preact import as the help menu
import { html, render } from 'https://esm.sh/htm/preact/standalone';
import { useState, useEffect } from 'https://esm.sh/htm/preact/standalone';

/**
 * WebRTC Debug Panel component
 * @param {Object} props Component props
 */
function WebRTCDebugPanel(props) {
  const {
    connectionStatus = 'Not connected',
    role = 'Unknown',
    gameId = 'None',
    testMode = false,
    fps = 0,
    objects = { asteroids: 0, bullets: 0, ores: 0, powerUps: 0 },
    stateUpdates = { count: 0, latency: 0 },
    gameState = null,
    logs = []
  } = props;

  // Calculate total objects
  const totalObjects = objects.asteroids + objects.bullets + objects.ores + objects.powerUps;
  
  // Determine if this is a crew member
  const isCrew = role === 'CREW';
  
  return html`
    <div class="webrtc-debug-panel" style="
      position: fixed;
      top: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
      max-width: 300px;
      max-height: 400px;
      overflow-y: auto;
    ">
      <div style="font-weight: bold; margin-bottom: 5px;">WebRTC STATUS</div>
      <div>Connection: ${connectionStatus}</div>
      <div>Role: ${role}</div>
      <div>Game ID: ${gameId}</div>
      
      ${testMode ? html`
        <button onClick=${props.onSendTest} style="
          margin: 8px 0;
          padding: 5px;
          background: #333;
          border: 1px solid #555;
          color: white;
          cursor: pointer;
          ${!props.isPrimary ? 'display: none;' : ''}
        ">
          Send Test Data
        </button>
      ` : ''}
      
      <div style="
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid #444;
        font-weight: bold;
      ">
        GAME DEBUG
      </div>
      
      <div>FPS: ${fps}</div>
      <div>Objects: ${totalObjects} (${objects.asteroids} asteroids)</div>
      
      ${isCrew ? html`
        <div style="
          margin-top: 8px;
          color: ${stateUpdates.count > 0 ? '#8f8' : '#888'};
        ">
          Received: ${stateUpdates.count} updates
          ${stateUpdates.latency ? html`(${stateUpdates.latency}ms latency)` : ''}
        </div>
        
        ${gameState ? html`
          <div style="
            margin-top: 10px;
            padding: 5px;
            background-color: rgba(0, 100, 0, 0.3);
            border: 1px solid #0f0;
            border-radius: 3px;
            font-size: 11px;
          ">
            <div style="font-weight: bold; color: #0f0;">Received Game State:</div>
            <div style="color: #ff9">Asteroids: ${gameState.asteroids?.length || 0}</div>
            <div style="color: #f99">Enemies: ${gameState.enemies?.length || 0}</div>
            <div style="color: #9ff">Ores: ${gameState.ores?.length || 0}</div>
            <div style="color: #f9f">Bullets: ${gameState.bullets?.length || 0}</div>
            <div>Game State: ${gameState.currentState || 'Unknown'}</div>
            <div>Timestamp: ${new Date(gameState.timestamp).toLocaleTimeString()}</div>
            
            <div style="margin-top: 5px; border-top: 1px solid #555; padding-top: 5px;">
              <div style="font-weight: bold; color: #0f0;">Local Objects:</div>
              <div style="color: #ff9">Local Asteroids: ${objects.asteroids}</div>
              <div style="color: #9ff">Local Ores: ${objects.ores}</div>
              <div style="color: #f9f">Local Bullets: ${objects.bullets}</div>
            </div>
          </div>
        ` : ''}
      ` : ''}
      
      ${logs.length > 0 ? html`
        <div style="
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid #444;
          max-height: 150px;
          overflow-y: auto;
        ">
          ${logs.slice(-5).map(log => html`
            <div style="
              font-size: 10px;
              color: #aaa;
              margin-bottom: 3px;
            ">
              [${log.time}] ${log.message}
            </div>
          `)}
        </div>
      ` : ''}
    </div>
  `;
}

// Container element reference
let container = null;

/**
 * Initialize the WebRTC debug panel
 */
function initWebRTCDebugPanel() {
  // Create container if it doesn't exist
  if (!container) {
    container = document.createElement('div');
    container.id = 'webrtc-debug-container';
    document.body.appendChild(container);
  }
  
  // Make sure Preact is available
  if (!document.querySelector('script[src*="preact"]')) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://esm.sh/htm/preact/standalone';
    document.head.appendChild(script);
  }
  
  // Initial render with empty props
  updateWebRTCDebugPanel({
    logs: []
  });
  
  return true;
}

/**
 * Update the debug panel with new props
 * @param {Object} props Component props
 */
function updateWebRTCDebugPanel(props) {
  if (!container) {
    initWebRTCDebugPanel();
  }
  
  // Add timestamp to logs if provided
  if (props.logs) {
    props.logs = props.logs.map(log => {
      // If log is already formatted, leave as is
      if (typeof log === 'object' && log.time) {
        return log;
      }
      // Otherwise format with timestamp
      return {
        time: new Date().toLocaleTimeString(),
        message: log
      };
    });
  }
  
  // Render component
  render(html`<${WebRTCDebugPanel} ...${props} />`, container);
}

/**
 * Add a log message to the debug panel
 * @param {string} message Log message
 */
function logToWebRTCDebugPanel(message) {
  const logEntry = {
    time: new Date().toLocaleTimeString(),
    message
  };
  
  // Get existing logs
  const currentProps = container?.__currentProps || { logs: [] };
  const updatedLogs = [...(currentProps.logs || []), logEntry];
  
  // Update with new logs
  updateWebRTCDebugPanel({
    ...currentProps,
    logs: updatedLogs
  });
  
  // Store latest props for later updates
  if (container) {
    container.__currentProps = {
      ...currentProps,
      logs: updatedLogs
    };
  }
}

// Make updateWebRTCDebugPanel available globally for Game.js
window.updateWebRTCDebugPanel = updateWebRTCDebugPanel;

export {
  initWebRTCDebugPanel,
  updateWebRTCDebugPanel,
  logToWebRTCDebugPanel
};