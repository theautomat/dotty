/**
 * GameStateMachine.js - Manages game state transitions and ensures proper cleanup
 * 
 * Provides a central state management system to:
 * - Track current game state
 * - Handle transitions between states
 * - Notify listeners of state changes
 * - Ensure proper cleanup during transitions
 * 
 * Works alongside GameManager which handles level-specific logic:
 * - GameManager: Controls level transitions, level-specific configurations
 * - GameStateMachine: Manages overall game states and ensures proper cleanup
 */

// Define game states as constants
export const GAME_STATES = {
    INIT: 'init',           // Game initialization
    MENU: 'menu',           // Start menu / between games
    TRANSITIONING: 'transitioning', // Between levels or states
    PLAYING: 'playing',     // Normal gameplay
    PAUSED: 'paused',       // Game paused
    GAME_OVER: 'gameOver',  // Player died
    COMPLETE: 'complete'    // Game completed all levels
};

class GameStateMachine {
    constructor() {
        // Current state - start with INIT
        this.currentState = GAME_STATES.INIT;
        
        // Previous state - for returning from paused, etc.
        this.previousState = null;
        
        // Listeners for state changes
        this.listeners = [];
        
        // Additional state data - useful for transitions
        this.stateData = {};
        
        // console.log('GameStateMachine initialized');
    }
    
    /**
     * Get the current game state
     * @returns {string} Current state
     */
    getCurrentState() {
        return this.currentState;
    }
    
    /**
     * Check if the game is in a specific state
     * @param {string} state - State to check
     * @returns {boolean} True if in specified state
     */
    isInState(state) {
        return this.currentState === state;
    }
    
    /**
     * Transition to a new state
     * @param {string} newState - State to transition to
     * @param {Object} data - Optional data related to the state change
     */
    transitionTo(newState, data = {}) {
        // Skip if already in this state
        if (newState === this.currentState) {
            // console.log(`Already in state ${newState}, skipping transition`);
            return;
        }
        
        // Log the transition
        // console.log(`Game state transition: ${this.currentState} → ${newState}`);
        
        // Store previous state
        this.previousState = this.currentState;
        
        // Update current state
        this.currentState = newState;
        
        // Store state data
        this.stateData = data;
        
        // Notify all listeners
        this.notifyListeners(newState, this.previousState, data);
    }
    
    /**
     * Add a listener for state changes
     * @param {Function} listener - Function(newState, oldState, data) to call on state change
     * @returns {number} Listener ID for removal
     */
    addListener(listener) {
        if (typeof listener !== 'function') {
            console.error('GameStateMachine: Listener must be a function');
            return -1;
        }
        
        this.listeners.push(listener);
        return this.listeners.length - 1; // Return ID for removal
    }
    
    /**
     * Remove a listener by ID
     * @param {number} id - Listener ID to remove
     * @returns {boolean} True if successfully removed
     */
    removeListener(id) {
        if (id < 0 || id >= this.listeners.length) {
            console.error(`GameStateMachine: Invalid listener ID: ${id}`);
            return false;
        }
        
        // Replace with null to maintain indices
        this.listeners[id] = null;
        return true;
    }
    
    /**
     * Notify all listeners of a state change
     * @param {string} newState - New state
     * @param {string} oldState - Previous state
     * @param {Object} data - Additional state data
     */
    notifyListeners(newState, oldState, data) {
        this.listeners.forEach(listener => {
            if (listener) {
                try {
                    listener(newState, oldState, data);
                } catch (error) {
                    console.error('Error in state change listener:', error);
                }
            }
        });
    }
    
    /**
     * Return to the previous state
     * @param {Object} data - Optional data for the transition
     */
    returnToPreviousState(data = {}) {
        if (!this.previousState) {
            console.warn('GameStateMachine: No previous state to return to');
            return;
        }
        
        this.transitionTo(this.previousState, data);
    }
    
    /**
     * Check if controls should be locked based on current state
     * @returns {boolean} True if controls should be locked
     */
    shouldLockControls() {
        // Controls should be locked in these states
        return this.currentState === GAME_STATES.TRANSITIONING ||
               this.currentState === GAME_STATES.GAME_OVER ||
               this.currentState === GAME_STATES.COMPLETE ||
               this.currentState === GAME_STATES.PAUSED ||
               this.currentState === GAME_STATES.INIT;
    }
    
    /**
     * Initialize the GameStateMachine
     * @param {Object} soundManager - Sound manager for audio effects
     * @param {Object} hud - HUD for UI state display
     * @returns {GameStateMachine} - Returns this for method chaining
     */
    init(soundManager, hud) {
        // Store references
        this.soundManager = soundManager || null;
        this.hud = hud || null;
        
        // Track initialization
        this.initialized = true;
        
        // Initialize state effects
        this._initStateEffects();
        
        return this;
    }
    
    /**
     * Initialize core state effects handler (private method)
     * @private
     */
    _initStateEffects() {
        if (!this.soundManager) {
            console.warn("GameStateMachine: Sound manager not provided, sound effects won't play");
            return;
        }
        
        // Set up one central listener for state-related effects
        this.addListener((newState, oldState, data = {}) => {
            // Handle end-game states
            if (newState === GAME_STATES.GAME_OVER) {
                // Play game over sound - this is appropriate for the state machine to handle
                this.soundManager.playGameOver();
            }
            else if (newState === GAME_STATES.COMPLETE) {
                // Play game complete sound - this is appropriate for the state machine to handle
                this.soundManager.playGameComplete();
            }
            
            // Note: LevelManager should handle PLAYING and TRANSITIONING states and their sounds
            // HUD updates should be registered by the component that owns the HUD
        });
    }
}

// Create and export a singleton instance
const gameStateMachine = new GameStateMachine();
export default gameStateMachine;