// webrtc-signaling.js
const socketIo = require('socket.io');

// We're not using this file anymore - the implementation has been moved directly to server.js
// Keeping this file for reference but it's not being used

// Track active rooms and connections
const rooms = new Map();

// Initialize WebRTC signaling with existing Express server
function initWebRTC(server, options = {}) {
  console.log('[DEPRECATED] This function is no longer used. See server.js for the new implementation.');
  return null;
}

module.exports = { initWebRTC };