/**
 * Firebase Service - Game data storage and analytics
 * 
 * This service handles saving game statistics to Cloud Firestore
 * and tracking analytics events.
 */
import { initializeFirebase } from './firebase-module.js';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';

class FirebaseService {
  constructor() {
    this.initialized = false;
    this.app = null;
    this.db = null;
    this.analytics = null;
  }

  /**
   * Initialize Firebase services
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.initialized) return true;

    try {
      // Initialize Firebase through our centralized module
      const firebase = initializeFirebase();
      
      // Store references
      this.app = firebase.app;
      this.db = firebase.db;
      this.analytics = firebase.analytics;
      
      // Set initialized flag
      this.initialized = true;
      
      // Just log the database instance for debugging
      // console.log('Cloud Firestore initialized successfully');
      
      return true;
    } catch (error) {
      console.error('CRITICAL: Firebase initialization failed:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Save game statistics to Firebase
   * @param {string} fingerprintId - Unique player identifier
   * @param {Object} stats - Game statistics to save
   * @returns {Promise<boolean>} Success status
   */
  async saveGameStats(fingerprintId, stats) {
    // Ensure Firebase is initialized
    if (!this.initialized) {
      console.log('Firebase not initialized, attempting to initialize now...');
      const initResult = await this.initialize();
      if (!initResult) {
        console.error('Cannot save game stats: Firebase not initialized');
        return false;
      }
    }
    
    // Verify Firestore is available
    if (!this.db) {
      console.error('Cannot save game stats: Cloud Firestore not available');
      return false;
    }
    
    try {
      // Validate player ID
      if (!fingerprintId || typeof fingerprintId !== 'string' || fingerprintId.length < 5) {
        console.error('Invalid fingerprint ID for saving game stats:', fingerprintId);
        return false;
      }
      
      // Use game ID from stats or generate a new one
      const gameId = stats.gameId || `game_${Date.now()}`;
      
      // Prepare data for storage
      const gameData = {
        // Game and player identification
        gameId: gameId,
        playerId: fingerprintId,
        
        // Core stats
        score: stats.score,
        asteroidsDestroyed: stats.asteroidsDestroyed,
        enemiesDestroyed: stats.enemiesDestroyed,
        shotsFired: stats.shotsFired,
        totalOresMined: stats.totalOresMined,
        gameTime: stats.gameTime,
        
        // Level information
        level: stats.level?.id || 0,
        levelName: stats.level?.name || '',
        
        // Individual ore counts for easier querying
        oresMined: {
          iron: stats.oresMined?.iron || 0,
          copper: stats.oresMined?.copper || 0,
          silver: stats.oresMined?.silver || 0,
          gold: stats.oresMined?.gold || 0,
          platinum: stats.oresMined?.platinum || 0
        },
        
        // Event metadata
        eventType: stats.eventType || 'unknown',
        timestamp: new Date().toISOString(),
        created: Date.now()
      };
      
      // Log what we're saving
      console.log(`Saving game stats for player ${fingerprintId}, game ${gameId}`);
      
      try {
        // Using Firestore to add document to 'games' collection
        // We can use either addDoc (auto-generated ID) or setDoc (with custom ID)
        if (gameId) {
          // Use setDoc with a specific document ID (gameId)
          const docRef = doc(this.db, 'games', gameId);
          await setDoc(docRef, gameData);
          console.log(`Game stats saved successfully with ID: ${gameId}`);
        } else {
          // Use addDoc for auto-generated ID
          const docRef = await addDoc(collection(this.db, 'games'), gameData);
          console.log(`Game stats saved successfully with auto ID: ${docRef.id}`);
        }
        return true;
      } catch (writeError) {
        console.error('Firestore write failed:', writeError);
        return false;
      }
    } catch (error) {
      console.error('Failed to save game stats:', error);
      return false;
    }
  }

  /**
   * Track an analytics event
   * @param {string} eventName - Name of the event
   * @param {Object} eventParams - Event parameters
   * @returns {Promise<boolean>} Success status
   */
  async trackEvent(eventName, eventParams = {}) {
    // Non-critical function - wrap in try/catch
    try {
      // Skip if analytics is unavailable
      if (!this.analytics) {
        console.debug('Analytics not available for event tracking');
        return false;
      }
      
      // Log the event
      logEvent(this.analytics, eventName, eventParams);
      // console.debug(`Analytics event tracked: ${eventName}`);
      return true;
    } catch (error) {
      // Just log the error - don't fail the game
      console.warn('Failed to track analytics event:', error);
      return false;
    }
  }
}

// Export a singleton instance
const firebaseService = new FirebaseService();
export default firebaseService;