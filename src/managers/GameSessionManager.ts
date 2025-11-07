/**
 * GameSessionManager.js - Manages game session identity and connectivity
 * 
 * Responsible for:
 * 1. Generating game session IDs
 * 2. Managing URL/sharing
 * 3. Determining captain (primary) vs crew (collaborator) roles
 * 4. Integration with fingerprinting for player identification
 */

class GameSessionManager {
  constructor() {
    // Game session identification
    this.gameId = null;
    this.playerId = null;
    
    // Role determination
    this.isCaptain = true;
    this.isCrew = false;
    
    // Parse URL parameters on instantiation
    this.parseUrlParameters();
  }

  /**
   * Initialize the session manager with player ID
   * @param {string} fingerprintId - Player's fingerprint ID
   */
  initialize(fingerprintId) {
    // Store the player ID from fingerprint
    this.playerId = fingerprintId;

    // Generate or retrieve game ID
    this.setupGameId();
    
    // Determine player role (captain or crew)
    this.determinePlayerRole();
    
    // Update URL if needed
    this.updateGameUrl();
    
    // console.log(`GameSessionManager initialized:
    //   Game ID: ${this.gameId}
    //   Player ID: ${this.playerId}
    //   Role: ${this.isCaptain ? 'CAPTAIN' : 'CREW'}`);
    
    // Make available globally for testing/debugging
    window.gameSessionManager = this;
    
    return {
      gameId: this.gameId,
      playerId: this.playerId,
      isCaptain: this.isCaptain,
      isCrew: this.isCrew
    };
  }
  
  /**
   * Parse URL parameters and path to extract relevant information
   */
  parseUrlParameters() {
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check if this is a crew view
    this.isCrew = searchParams.has('crew') && searchParams.get('crew') === 'true';
    this.isCaptain = !this.isCrew;
    
    // Extract game ID from URL path if present
    const pathMatch = window.location.pathname.match(/^\/games\/([a-zA-Z0-9_-]+)$/);
    if (pathMatch && pathMatch[1]) {
      this.gameId = pathMatch[1];
    }
  }
  
  /**
   * Setup the game ID - either generate a new one or use existing
   */
  setupGameId() {
    // If already has a game ID from URL, keep it
    if (this.gameId) {
      return;
    }
    
    // Generate a new secure game ID
    this.gameId = this.generateSecureGameId();
  }
  
  /**
   * Determine if player is captain or crew based on URL and fingerprint
   */
  determinePlayerRole() {
    // URL parameter indicates crew role for testing
    if (window.location.search.includes('crew=true')) {
      this.isCaptain = false;
      this.isCrew = true;
      
      // For testing: modify the fingerprint ID to avoid collisions
      if (this.playerId && window.location.search.includes('test=true')) {
        this.playerId = `${this.playerId}-crew`;
      }
      return;
    }
    
    // Default to captain
    this.isCaptain = true;
    this.isCrew = false;
      }
  
  /**
   * Generate a secure, URL-friendly hash ID for games
   * @param {number} length - Length of the hash (default: 16 chars)
   * @returns {string} Secure random hash ID
   */
  generateSecureGameId(length = 16) {
    // Use Web Crypto API for cryptographically secure randomness
    const array = new Uint8Array(Math.ceil(length * 0.75)); // 3 bytes -> 4 chars in base64
    crypto.getRandomValues(array);
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...array));
    
    // Make URL-safe by replacing non-URL safe chars and removing padding
    const urlSafe = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    // Return exact length requested
    return urlSafe.substring(0, length);
  }
  
  /**
   * Update the browser URL with the game ID for sharing
   */
  updateGameUrl() {
    if (!this.gameId) return;
    
    // Skip URL updates on the leaderboard page
    if (window.LEADERBOARD_PAGE || window.location.pathname.includes('/leaderboard')) {
      console.log('On leaderboard page - skipping game URL update');
      return;
    }
    
    // Only update URL if we're the captain and not already on the game URL
    if (this.isCaptain && !window.location.pathname.includes(`/games/${this.gameId}`)) {
      const newUrl = `${window.location.origin}/games/${this.gameId}`;
      window.history.pushState({ gameId: this.gameId }, '', newUrl);
    }
  }
  
  /**
   * Get the URL for sharing with crew members
   */
  getCrewUrl() {
    if (!this.gameId) return null;
    
    const baseUrl = `${window.location.origin}/games/${this.gameId}`;
    return `${baseUrl}?crew=true`;
  }
  
  /**
   * Get current session information
   */
  getSessionInfo() {
    return {
      gameId: this.gameId,
      playerId: this.playerId,
      isCaptain: this.isCaptain,
      isCrew: this.isCrew,
      crewUrl: this.getCrewUrl()
    };
  }
}

// Export singleton instance
const gameSessionManager = new GameSessionManager();
export default gameSessionManager;