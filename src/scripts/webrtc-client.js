/**
 * WebRTC client module for multiplayer functionality
 * Handles peer connections, signaling, and data channels
 */
import { io } from 'socket.io-client';

class WebRTCClient {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.isPrimary = false;
    this.connections = new Map(); // PeerId -> RTCPeerConnection
    this.dataChannels = new Map(); // PeerId -> RTCDataChannel
    this.onGameStateReceived = null; // Callback for collaborators receiving state
    this.initialized = false;
    this.enabled = false;
    
    // STUN servers for NAT traversal
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }
  
  /**
   * Initialize WebRTC client and connect to signaling server
   * @param {Object} options - Configuration options
   * @param {string} options.roomId - Room ID (game hash)
   * @param {boolean} options.requestPrimary - Whether to request primary role
   * @param {Function} options.onStateReceived - Callback for collaborators to handle game state
   * @returns {Promise} - Resolves when connection is established
   */
  async init(options) {
    // Check if WebRTC is enabled
    if (!this.enabled) {
      console.log('WebRTC is disabled, skipping initialization.');
      return false;
    }

    if (!options.roomId) {
      console.error('WebRTC: Room ID is required');
      return false;
    }
    
    // Log role override if necessary
    if (window.gameSessionManager && typeof options.requestPrimary !== 'undefined') {
      console.log(`[WEBRTC INIT] GameSessionManager.isCaptain=${window.gameSessionManager.isCaptain}, requestPrimary=${options.requestPrimary}`);
      
      if (window.gameSessionManager.isCaptain !== options.requestPrimary) {
        console.warn(`[WEBRTC INIT] Role mismatch detected! Forcing WebRTC role to match GameSessionManager`);
      }
    }
    
    // Store options
    this.roomId = options.roomId;
    this.onGameStateReceived = options.onStateReceived;

    try {
      // Connect to signaling server using imported Socket.IO
      this.socket = io(window.location.origin, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 15000, // Increased timeout
        transports: ['websocket', 'polling'],
        forceNew: true,
        debug: true
      });
      
      // Add connection event logging
      this.socket.on('connect', () => {
        console.log('WebRTC: Connected successfully');
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('WebRTC: Connection error:', error.message);
        
        // Update the debug panel if available
        if (window.updateWebRTCDebugPanel) {
          window.updateWebRTCDebugPanel({
            connectionStatus: `Error: ${error.message || 'Connection failed'}`
          });
        }
      });
      
      this.socket.on('connect_timeout', () => {
        console.error('WebRTC: Socket.io connection timeout');
        
        // Update the debug panel if available
        if (window.updateWebRTCDebugPanel) {
          window.updateWebRTCDebugPanel({
            connectionStatus: 'Error: Connection timeout'
          });
        }
      });
      
      // Add disconnect handler
      this.socket.on('disconnect', (reason) => {
        console.error('WebRTC: Socket.io disconnected, reason:', reason);
        
        // Update the debug panel if available
        if (window.updateWebRTCDebugPanel) {
          window.updateWebRTCDebugPanel({
            connectionStatus: `Disconnected: ${reason}`
          });
        }
      });
      
      // Set up socket event handlers
      this.setupSocketHandlers();
      
      // Join room
      await new Promise((resolve) => {
        this.socket.emit('join-room', {
          roomId: this.roomId,
          requestPrimary: options.requestPrimary || false
        });
        
        // Wait for role assignment
        this.socket.once('role-assigned', (data) => {
          this.isPrimary = data.isPrimary;
          resolve();
        });
      });
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('WebRTC initialization failed:', error);
      return false;
    }
  }
  
  /**
   * Set up socket event handlers for signaling
   */
  setupSocketHandlers() {
    // Handle new peer joining
    this.socket.on('new-peer', async ({ peerId }) => {
      if (this.isPrimary) {
        await this.createPeerConnection(peerId);
        await this.createOffer(peerId);
      }
    });
    
    // Handle offers from other peers
    this.socket.on('offer', async ({ offer, offererId }) => {
      await this.handleOffer(offererId, offer);
    });
    
    // Handle answers to our offers
    this.socket.on('answer', async ({ answer, answererId }) => {
      await this.handleAnswer(answererId, answer);
    });
    
    // Handle ICE candidates from other peers
    this.socket.on('ice-candidate', async ({ candidate, senderId }) => {
      await this.handleIceCandidate(senderId, candidate);
    });
    
    // Handle peer disconnections
    this.socket.on('peer-disconnected', ({ peerId }) => {
      this.closeConnection(peerId);
    });
    
    // Handle primary disconnecting
    this.socket.on('primary-disconnected', () => {
      // Client code handles this event
    });
  }
  
  /**
   * Create a new peer connection
   * @param {string} peerId - ID of the peer to connect to
   */
  async createPeerConnection(peerId) {
    try {
      // Create a new RTCPeerConnection
      const peerConnection = new RTCPeerConnection(this.rtcConfig);
      this.connections.set(peerId, peerConnection);
      
      // Set up ICE candidate handling
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('ice-candidate', {
            targetId: peerId,
            candidate: event.candidate
          });
        }
      };
      
      // Set up data channel (primary creates, collaborator listens)
      if (this.isPrimary) {
        const dataChannel = peerConnection.createDataChannel('gameState', {
          ordered: false,
          maxRetransmits: 0  // Unreliable for game state updates (newer ones supersede older)
        });
        
        this.setupDataChannel(dataChannel, peerId);
      } else {
        peerConnection.ondatachannel = (event) => {
          this.setupDataChannel(event.channel, peerId);
        };
      }
      
      return peerConnection;
    } catch (error) {
      console.error(`WebRTC: Error creating peer connection to ${peerId}:`, error);
      return null;
    }
  }
  
  /**
   * Set up a data channel for game state
   * @param {RTCDataChannel} channel - The data channel to set up
   * @param {string} peerId - ID of the peer associated with this channel
   */
  setupDataChannel(channel, peerId) {
    this.dataChannels.set(peerId, channel);
    
    channel.onopen = () => {
      // If we're the captain, send a test message
      if (this.isPrimary) {
        try {
          const testMessage = JSON.stringify({
            timestamp: Date.now(),
            type: "test",
            message: "This is a test message from the captain"
          });
          channel.send(testMessage);
        } catch (e) {
          console.error(`WebRTC: Error sending test message:`, e);
        }
      }
    };
    
    channel.onclose = () => {
      this.dataChannels.delete(peerId);
    };
    
    channel.onerror = (error) => {
      console.error(`WebRTC: Data channel error with ${peerId}:`, error);
    };
    
    channel.onmessage = (event) => {
      // Process received game state (for collaborators)
      if (!this.isPrimary) {
        try {
          // Parse the JSON data
          const gameState = JSON.parse(event.data);
          
          // Pass the data to the onGameStateReceived callback
          if (this.onGameStateReceived) {
            this.onGameStateReceived(gameState);
          } else {
            console.error("WebRTC: No game state handler registered");
          }
        } catch (error) {
          console.error('WebRTC: Error processing received data:', error);
        }
      }
    };
  }
  
  // Removed unused method - keeping WebRTC client focused on communication only

  /**
   * Create and send an offer to a peer
   * @param {string} peerId - ID of the peer to send the offer to
   */
  async createOffer(peerId) {
    const peerConnection = this.connections.get(peerId);
    if (!peerConnection) return;
    
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      this.socket.emit('offer', {
        targetId: peerId,
        offer
      });
    } catch (error) {
      console.error(`WebRTC: Error creating offer for ${peerId}:`, error);
    }
  }
  
  /**
   * Handle an offer from another peer
   * @param {string} peerId - ID of the peer that sent the offer
   * @param {RTCSessionDescription} offer - The offer to handle
   */
  async handleOffer(peerId, offer) {
    try {
      // Create connection if it doesn't exist
      if (!this.connections.has(peerId)) {
        await this.createPeerConnection(peerId);
      }
      
      const peerConnection = this.connections.get(peerId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create and send answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      this.socket.emit('answer', {
        targetId: peerId,
        answer
      });
    } catch (error) {
      console.error(`WebRTC: Error handling offer from ${peerId}:`, error);
    }
  }
  
  /**
   * Handle an answer from another peer
   * @param {string} peerId - ID of the peer that sent the answer
   * @param {RTCSessionDescription} answer - The answer to handle
   */
  async handleAnswer(peerId, answer) {
    try {
      const peerConnection = this.connections.get(peerId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error(`WebRTC: Error handling answer from ${peerId}:`, error);
    }
  }
  
  /**
   * Handle an ICE candidate from another peer
   * @param {string} peerId - ID of the peer that sent the candidate
   * @param {RTCIceCandidate} candidate - The ICE candidate to handle
   */
  async handleIceCandidate(peerId, candidate) {
    try {
      const peerConnection = this.connections.get(peerId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error(`WebRTC: Error handling ICE candidate from ${peerId}:`, error);
    }
  }
  
  /**
   * Close a connection to a peer
   * @param {string} peerId - ID of the peer to disconnect from
   */
  closeConnection(peerId) {
    // Close data channel
    const dataChannel = this.dataChannels.get(peerId);
    if (dataChannel) {
      dataChannel.close();
      this.dataChannels.delete(peerId);
    }
    
    // Close peer connection
    const peerConnection = this.connections.get(peerId);
    if (peerConnection) {
      peerConnection.close();
      this.connections.delete(peerId);
    }
  }
  
  /**
   * Send game state to all connected peers (primary only)
   * @param {Object} gameState - The game state to send
   */
  sendGameState(gameState) {
    if (!this.initialized || !this.isPrimary) {
      return;
    }
    
    // Validate game state
    if (!gameState) {
      console.error('WebRTC: Cannot send null or undefined game state');
      return;
    }
    
    // Check for required properties
    const requiredProperties = ['timestamp', 'playerPosition', 'asteroids'];
    for (const prop of requiredProperties) {
      if (!gameState[prop]) {
        console.warn(`WebRTC: Game state missing required property: ${prop}`);
      }
    }
    
    // Check if we have any peers to send to
    if (this.dataChannels.size === 0) {
      return;
    }
    
    // Serialize the game state
    let stateString;
    try {
      stateString = JSON.stringify(gameState);
    } catch (error) {
      console.error('WebRTC: Error serializing game state:', error);
      return;
    }
    
    // Send to all connected peers
    for (const [peerId, channel] of this.dataChannels.entries()) {
      if (channel.readyState === 'open') {
        try {
          channel.send(stateString);
        } catch (error) {
          console.error(`WebRTC: Error sending to peer ${peerId}:`, error);
        }
      }
    }
  }
  
  // loadScript method removed - no longer needed since we're importing socket.io
  
  /**
   * Clean up all connections and resources
   */
  destroy() {
    // Close all connections
    for (const peerId of this.connections.keys()) {
      this.closeConnection(peerId);
    }
    
    // Disconnect from signaling server
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.initialized = false;
    this.enabled = false;
  }
}

// Export singleton instance
const webRTCClient = new WebRTCClient();
export default webRTCClient;