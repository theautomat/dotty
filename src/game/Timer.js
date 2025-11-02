/**
 * Timer.js - Pure logic timer for game events
 * Handles time tracking without any visual representation
 */
class Timer {
    constructor(durationSeconds = 100) {
        this.durationSeconds = durationSeconds;
        this.remainingSeconds = durationSeconds;
        this.startTime = null;
        this.isRunning = false;
        this.onCompleteCallback = null;
        this.hasEnded = false;
    }
    
    /**
     * Set callback function to call when timer completes
     * @param {Function} callback - Function to call when timer ends
     */
    setOnComplete(callback) {
        this.onCompleteCallback = callback;
    }
    
    /**
     * Starts the timer countdown
     */
    start() {
        this.startTime = Date.now();
        this.isRunning = true;
        this.hasEnded = false;
    }
    
    /**
     * Pauses the timer
     */
    pause() {
        if (this.isRunning) {
            this.remainingSeconds = this.getTimeRemaining();
            this.isRunning = false;
        }
    }
    
    /**
     * Resumes the timer
     */
    resume() {
        if (!this.isRunning && !this.hasEnded) {
            this.startTime = Date.now() - ((this.durationSeconds - this.remainingSeconds) * 1000);
            this.isRunning = true;
        }
    }
    
    /**
     * Resets the timer to the initial duration
     */
    reset() {
        this.remainingSeconds = this.durationSeconds;
        this.startTime = null;
        this.isRunning = false;
        this.hasEnded = false;
        this.callbackExecuted = false; // Important: reset callback execution flag
    }
    
    /**
     * Sets a new duration for the timer
     * @param {number} seconds - The new duration in seconds
     */
    setDuration(seconds) {
        this.durationSeconds = seconds;
        this.reset();
    }
    
    /**
     * Gets the remaining time in seconds
     * @returns {number} Remaining time in seconds
     */
    getTimeRemaining() {
        if (!this.isRunning) return this.remainingSeconds;
        
        const elapsedMilliseconds = Date.now() - this.startTime;
        const elapsedSeconds = elapsedMilliseconds / 1000;
        return Math.max(0, this.durationSeconds - elapsedSeconds);
    }
    
    /**
     * Gets the elapsed time in seconds
     * @returns {number} Elapsed time in seconds
     */
    getElapsedTime() {
        if (!this.isRunning && this.startTime === null) return 0;
        
        if (!this.isRunning) {
            return this.durationSeconds - this.remainingSeconds;
        }
        
        const elapsedMilliseconds = Date.now() - this.startTime;
        const elapsedSeconds = elapsedMilliseconds / 1000;
        return Math.min(this.durationSeconds, elapsedSeconds);
    }
    
    /**
     * Gets the time as a percentage (0-1) of completion
     * @returns {number} Percentage of time elapsed (0-1)
     */
    getPercentComplete() {
        return this.getElapsedTime() / this.durationSeconds;
    }
    
    /**
     * Gets percentage of time remaining (0-1)
     * @returns {number} Percentage of time remaining (0-1)
     */
    getPercentRemaining() {
        return this.getTimeRemaining() / this.durationSeconds;
    }
    
    /**
     * Updates the timer state
     * @returns {boolean} True if timer is still running, false if it has ended
     */
    update() {
        if (!this.isRunning) {
            return !this.hasEnded;
        }
        
        // Calculate remaining time
        const remaining = this.getTimeRemaining();
        this.remainingSeconds = remaining;
        
        // Track whole seconds remaining (for potential events triggered at specific times)
        const wholeSecondsRemaining = Math.ceil(remaining);
        if (wholeSecondsRemaining !== this._lastWholeSeconds) {
            this._lastWholeSeconds = wholeSecondsRemaining;
        }
        
        // Check if timer has ended
        if (remaining <= 0) {
            this.isRunning = false;
            this.hasEnded = true;
            
            // Call the completion callback if defined
            if (this.onCompleteCallback && !this.callbackExecuted) {
                this.callbackExecuted = true;
                this.onCompleteCallback();
            } else if (!this.onCompleteCallback) {
                console.error("No timer completion callback defined!");
            } else if (this.callbackExecuted) {
                console.warn("Timer callback already executed, not calling again");
            }
            
            return false;
        }
        
        return true;
    }
}

export default Timer;