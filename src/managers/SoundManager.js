/**
 * SoundManager.js - Centralized sound management system
 * 
 * Manages all game sounds with a direct, easy-to-debug approach:
 * - Each sound has a dedicated function with its path hardcoded
 * - No lookup tables or constants for sound IDs
 * - Every sound file has exactly one function that plays it
 * - Associates sounds with game objects via IDs
 * - Automatically manages cleanup
 */

// No need to import any sound types as we use dedicated methods for each sound

class SoundManager {
    constructor() {
        // Map of sound IDs to Audio objects
        this.sounds = {};
        
        // Map of object IDs to their active sounds
        this.activeSounds = new Map();
        
        // Global volume setting
        this.masterVolume = 0.25;
        
        // Holds the volume level before muting, to restore it on unmute
        this._volumeBeforeMute = this.masterVolume;
        
        // Flag for global mute status
        this.muted = false;
        
        // Track initialization state
        this.initialized = false;
        
        // Add sound debounce tracking
        this.lastPlayedTime = {};
        this.debounceIntervals = {
            'boundaryBreach': 1000 // 1 second minimum between boundary sounds
        };
    }
    
    /**
     * Initialize the sound manager
     */
    init() {
        // Only initialize once
        if (this.initialized) {
            console.log('SoundManager: Already initialized');
            return this;
        }
        
        // No preloading - we'll load sounds on-demand the first time each method is called
        
        // Mark as initialized
        this.initialized = true;
        
        return this;
    }
    
    /**
     * Load a sound file and store it
     * @param {string} path - Path to the sound file (also used as the unique identifier)
     * @returns {Audio} The loaded Audio object
     */
    loadSound(path) {
        // If we already have this sound loaded, return it
        if (this.sounds[path]) {
            return this.sounds[path];
        }
        
        try {
            const audio = new Audio(path);
            audio.volume = this.masterVolume;
            
            // Store the audio object using path as key
            this.sounds[path] = audio;
            
            // Simple debug logging
                        
            return audio;
        } catch (error) {
            console.error(`SoundManager: Failed to load sound from ${path}`, error);
            return null;
        }
    }
    
    /**
     * Play a sound with optional object association
     * @param {string} path - Path to the sound file to play
     * @param {string|null} objectId - Optional ID of the object to associate with the sound
     * @param {Object} options - Optional playback options
     * @returns {Audio|null} - The Audio object that was played
     */
    play(path, objectId = null, options = {}) {
                
        // Skip if muted globally
        if (this.muted) {
            return null;
        }
        
        // Load or get the sound
        const sound = this.loadSound(path);
        if (!sound) {
            console.warn(`SoundManager: Sound '${path}' could not be loaded`);
            return null;
        }
        
        try {
            // Always clone the audio for multiple simultaneous playbacks
            // This ensures that rapid-fire sounds like boss hits don't cut each other off
            let audioToPlay = sound.cloneNode();
            
            // Set options
            audioToPlay.loop = !!options.loop;
            audioToPlay.volume = (options.volume !== undefined ? options.volume : 1) * this.masterVolume;
            
            // For boundary sounds, we want each instance to have a unique ID to prevent conflict
            if (objectId === 'boundary') {
                objectId = `boundary_${Date.now()}`;
            }
            
            // If this sound is associated with an object, stop any previous sounds from that object
            if (objectId) {
                this.stop(objectId);
                
                // Store this new association
                this.activeSounds.set(objectId, {
                    audio: audioToPlay,
                    path: path // Store path instead of soundId
                });
            }
            
            // Play the sound and handle play promise
            const playPromise = audioToPlay.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        // Successfully started playing
                    })
                    .catch(error => {
                        console.warn(`SoundManager: Error playing sound '${path}'`, error);
                        
                        // Clean up failed sound association
                        if (objectId) {
                            this.activeSounds.delete(objectId);
                        }
                    });
            }
            
            return audioToPlay;
        } catch (error) {
            console.error(`SoundManager: Failed to play sound '${path}'`, error);
            return null;
        }
    }
    
    /**
     * Stop a sound associated with an object
     * @param {string} objectId - ID of the object whose sound should be stopped
     */
    stop(objectId) {
        if (!this.activeSounds.has(objectId)) return;
        
        try {
            const soundData = this.activeSounds.get(objectId);
            const audio = soundData.audio;
            
            if (audio) {
                // Check if it's actually playing first
                if (!audio.paused) {
                    audio.pause();
                }
                
                // Reset sound position
                audio.currentTime = 0;
                
                // Simple debug logging without process.env check
                // console.log(`SoundManager: Stopped sound '${soundData.soundId}' for object '${objectId}'`);
            }
        } catch (error) {
            console.warn(`SoundManager: Error stopping sound for object '${objectId}'`, error);
        } finally {
            // Always remove the association
            this.activeSounds.delete(objectId);
        }
    }
    
    /**
     * Stop all currently playing sounds
     */
    stopAll() {
        // First collect all objectIds to avoid modifying while iterating
        const objectIds = Array.from(this.activeSounds.keys());
        
        // Stop each sound
        objectIds.forEach(objectId => {
            this.stop(objectId);
        });
        
        console.log(`SoundManager: Stopped all sounds (${objectIds.length} total)`);
    }
    
    /**
     * Sets the master volume for all sounds.
     * Also updates the volume of currently playing sounds.
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this._volumeBeforeMute = this.masterVolume; // Store the desired volume
        this.muted = this.masterVolume === 0;
        
        // Update volume for all loaded sounds
        Object.values(this.sounds).forEach(audio => {
            audio.volume = this.masterVolume;
        });
        
        // Optionally update volume for active associated sounds if needed
        // This might be redundant if the Audio objects reference the same volume
        this.activeSounds.forEach(activeSoundInfo => {
            activeSoundInfo.sound.volume = this.masterVolume;
        });
        
        console.log(`SoundManager: Master volume set to ${this.masterVolume}`);
    }
    
    /**
     * Gets the current master volume.
     * @returns {number} Current volume level (0.0 to 1.0)
     */
    getMasterVolume() {
        return this.masterVolume;
    }
    
    /**
     * Toggles the global mute state.
     */
    toggleMute() {
        if (this.muted) {
            // Unmute: Restore volume to the level it was before muting
            this.setMasterVolume(this._volumeBeforeMute > 0 ? this._volumeBeforeMute : 0.25); // Restore or default to 0.25
            this.muted = false;
            console.log(`SoundManager: Unmuted. Volume set to ${this.masterVolume}`);
        } else {
            // Mute: Store current volume and set master volume to 0
            this._volumeBeforeMute = this.masterVolume; // Remember the current volume
            this.setMasterVolume(0);
            this.muted = true;
            console.log('SoundManager: Muted.');
        }
    }
    
    /**
     * Checks if the sound manager is currently muted.
     * @returns {boolean} True if muted, false otherwise.
     */
    isMuted() {
        return this.muted;
    }
    
    /**
     * Generate a unique ID for an object
     * @param {string} prefix - Optional prefix for the ID
     * @returns {string} A unique ID
     */
    generateId(prefix = 'sound') {
        return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }
    
    /**
     * Play iron level transition sounds
     */
    playIronLevelTransition() {
        this.playIronOreRevealed();
    }
    
    /**
     * Play copper level transition sounds
     */
    playCopperLevelTransition() {
        this.playCopperOreRevealed();
    }
    
    /**
     * Play silver level transition sounds
     */
    playSilverLevelTransition() {
        this.playSilverOreRevealed();
    }
    
    /**
     * Play gold level transition sounds
     */
    playGoldLevelTransition() {
        this.playGoldOreRevealed();
    }
    
    /**
     * Play platinum level transition sounds
     */
    playPlatinumLevelTransition() {
        this.playPlatinumOreRevealed();
    }
    
    /**
     * @deprecated Use the specific level transition methods instead
     */
    playLevelTransition(levelId, primaryOreType) {
        console.warn('playLevelTransition with arguments is deprecated. Use specific methods instead.');
        // Call the specific level transition method based on ore type
        if (primaryOreType === 'iron') this.playIronLevelTransition();
        else if (primaryOreType === 'copper') this.playCopperLevelTransition();
        else if (primaryOreType === 'silver') this.playSilverLevelTransition();
        else if (primaryOreType === 'gold') this.playGoldLevelTransition();
        else if (primaryOreType === 'platinum') this.playPlatinumLevelTransition();
        else console.warn(`Unknown ore type: ${primaryOreType} for level transition sound`);
    }
    
    /**
     * Play level beginning sound
     * @returns {Audio|null} The Audio object that was played
     */
    playLevelBegin() {
        return this.play('/sounds/levels/level-beginning-2.mp3');
    }
    
    /**
     * Play iron ore revealed sound
     * @returns {Audio|null} The Audio object that was played
     */
    playIronOreRevealed() {
        return this.play('/sounds/ores/iron-treasure-revealed.mp3');
    }
    
    /**
     * Play copper ore revealed sound
     * @returns {Audio|null} The Audio object that was played
     */
    playCopperOreRevealed() {
        return this.play('/sounds/ores/copper-treasure-revealed.mp3');
    }
    
    /**
     * Play silver ore revealed sound
     * @returns {Audio|null} The Audio object that was played
     */
    playSilverOreRevealed() {
        return this.play('/sounds/ores/silver-treasure-revealed.mp3');
    }
    
    /**
     * Play gold ore revealed sound
     * @returns {Audio|null} The Audio object that was played
     */
    playGoldOreRevealed() {
        return this.play('/sounds/ores/gold-treasure-revealed.mp3');
    }
    
    /**
     * Play platinum ore revealed sound
     * @returns {Audio|null} The Audio object that was played
     */
    playPlatinumOreRevealed() {
        return this.play('/sounds/ores/platinum-treasure-revealed.mp3');
    }
    
    /**
     * Play iron ore retrieved sound
     * @returns {Audio|null} The Audio object that was played
     */
    playIronOreRetrieved() {
        return this.play('/sounds/ores/iron-treasure-retrieved.mp3');
    }
    
    /**
     * Play copper ore retrieved sound
     * @returns {Audio|null} The Audio object that was played
     */
    playCopperOreRetrieved() {
        return this.play('/sounds/ores/copper-treasure-retrieved.mp3');
    }
    
    /**
     * Play silver ore retrieved sound
     * @returns {Audio|null} The Audio object that was played
     */
    playSilverOreRetrieved() {
        return this.play('/sounds/ores/silver-treasure-retrieved.mp3');
    }
    
    /**
     * Play gold ore retrieved sound
     * @returns {Audio|null} The Audio object that was played
     */
    playGoldOreRetrieved() {
        return this.play('/sounds/ores/gold-treasure-retrieved.mp3');
    }
    
    /**
     * Play platinum ore retrieved sound
     * @returns {Audio|null} The Audio object that was played
     */
    playPlatinumOreRetrieved() {
        return this.play('/sounds/ores/platinum-treasure-retrieved.mp3');
    }
    
    // Note: Any code that previously called playOreRevealed or playOreRetrieved
    // should be updated to call the specific methods directly:
    // e.g., soundManager.playIronOreRevealed() instead of soundManager.playOreRevealed('iron')
    //
    // This is much clearer and easier to debug since each sound has exactly one function
    // that plays it with the path hardcoded in that function.
    
    /**
     * Play forward thruster sound
     * @param {string} objectId - Optional ID to associate with the sound
     * @returns {Audio|null} The Audio object that was played
     */
    playThrusterForward(objectId = null) {
        return this.play('/sounds/ships/engines/thrusters-forward.mp3', objectId);
    }
    
    /**
     * Play reverse thruster sound
     * @param {string} objectId - Optional ID to associate with the sound
     * @returns {Audio|null} The Audio object that was played
     */
    playThrusterReverse(objectId = null) {
        return this.play('/sounds/ships/engines/thrusters-reverse.mp3', objectId);
    }
    
    /**
     * Play strafe thruster sound
     * @param {string} objectId - Optional ID to associate with the sound
     * @returns {Audio|null} The Audio object that was played
     */
    playThrusterStrafe(objectId = null) {
        return this.play('/sounds/ships/engines/thrusters-left-and-right.mp3', objectId);
    }
    
    // Note: Any code that previously called playThruster should be updated to call
    // the specific methods directly: playThrusterForward, playThrusterReverse, or playThrusterStrafe
    
    /**
     * Play asteroid explosion sound
     * @returns {Audio|null} The Audio object that was played
     */
    playAsteroidExplosion() {
        return this.play('/sounds/asteroids/asteroid-explosion.mp3');
    }
    
    /**
     * Play ship explosion sound
     * @returns {Audio|null} The Audio object that was played
     */
    playShipExplosion() {
        return this.play('/sounds/ships/explosions/ship-explosion.mp3');
    }
    
    // Note: Any code that previously called playExplosion should be updated to call
    // the specific methods directly: playAsteroidExplosion, playShipExplosion, playUFOExplosion, or playHunterExplosion
    
    // Hunter sound types constants
    static HUNTER_SOUND_TYPES = {
        SPAWN: 'spawn',
        EXPLODE: 'explode',
        NEARBY: 'nearby'
    };
    
    // Note: Boss sound types are defined in SoundTypes.js
    
    /**
     * Play Hunter spawn sound
     * @param {string} objectId - Optional ID to associate with the sound (usually the Hunter's ID)
     * @returns {Audio|null} The Audio object that was played
     */
    playHunterSpawn(objectId = null) {
        return this.play('/sounds/ships/aliens/hunter/hunter-spawn.mp3', objectId);
    }
    
    /**
     * Play Hunter explosion sound
     * @param {string} objectId - Optional ID to associate with the sound
     * @returns {Audio|null} The Audio object that was played
     */
    playHunterExplosion(objectId = null) {
        return this.play('/sounds/ships/aliens/hunter/hunter-ship-explosion.mp3', objectId);
    }
    
    /**
     * Play Hunter nearby/trash talk sound
     * @param {string} objectId - Optional ID to associate with the sound
     * @returns {Audio|null} The Audio object that was played
     */
    playHunterNearby(objectId = null) {
        return this.play('/sounds/ships/aliens/hunter/hunter-alien-pilot-trash-talk-when-nearby.mp3', objectId);
    }
    
    // Note: Any code that previously called playHunterSound should be updated to call
    // the specific methods directly: playHunterSpawn, playHunterExplosion, or playHunterNearby
    
    /**
     * Play UFO engine sound
     * @param {string} objectId - Optional ID to associate with the sound (usually the UFO's ID)
     * @returns {Audio|null} The Audio object that was played
     */
    playUFOEngine(objectId = null) {
        return this.play('/sounds/ships/aliens/ufo/alien-ship-engine.mp3', objectId);
    }
    
    /**
     * Play UFO laser sound
     * @param {string} objectId - Optional ID to associate with the sound
     * @returns {Audio|null} The Audio object that was played
     */
    playUFOLaser(objectId = null) {
        return this.play('/sounds/ships/aliens/ufo/ufo-laser-shot.mp3', objectId);
    }
    
    /**
     * Play UFO explosion sound
     * @param {string} objectId - Optional ID to associate with the sound
     * @returns {Audio|null} The Audio object that was played
     */
    playUFOExplosion(objectId = null) {
        // Using ship explosion sound since ufo-explosion.mp3 doesn't exist
        return this.play('/sounds/ships/explosions/ship-explosion.mp3', objectId);
    }
    
    // Note: Any code that previously called playUFOSound should be updated to call
    // the specific methods directly: playUFOEngine, playUFOLaser, or playUFOExplosion
    
    /**
     * Play standard bullet fire sound
     * @returns {Audio|null} The Audio object that was played
     */
    playBulletFire() {
        return this.play('/sounds/ships/guns/phaser-gun-shot.mp3');
    }
    
    /**
     * Play phaser shot sound
     * @returns {Audio|null} The Audio object that was played
     */
    playPhaserShot() {
        return this.play('/sounds/ships/guns/phaser-gun-shot.mp3');
    }
    
    /**
     * Play phaser fail sound (when unable to fire)
     * @returns {Audio|null} The Audio object that was played
     */
    playPhaserFail() {
        return this.play('/sounds/ships/guns/phaser-gun-shot-fail.mp3');
    }
    
    // Note: Any code that previously called playWeapon should be updated to call
    // the specific methods directly: playBulletFire, playPhaserShot, or playPhaserFail
    
    /**
     * Play power-up collection sound
     * @returns {Audio|null} The Audio object that was played
     */
    playPowerUpCollect() {
        return this.play('/sounds/powers/power-not-sure-yet.mp3');
    }
    
    /**
     * Play magnet pull sound 
     * @param {string} objectId - Optional ID to associate with the sound
     * @returns {Audio|null} The Audio object that was played
     */
    playMagnetPull(objectId = null) {
        return this.play('/sounds/powers/magnet-pull.mp3', objectId);
    }
    
    /**
     * Legacy method to play powerup sound - kept for backward compatibility
     * @deprecated Use playPowerUpCollect instead
     */
    playPowerUp() {
        return this.playPowerUpCollect();
    }
    
    /**
     * Play game over sound when player dies
     * @returns {Audio|null} The Audio object that was played
     */
    playGameOver() {
        return this.play('/sounds/game/mancer-death-game-over.mp3');
    }
    
    /**
     * Play game complete sound when all levels are finished
     * @returns {Audio|null} The Audio object that was played
     */
    playGameComplete() {
        return this.play('/sounds/game/mancer-completed-game.mp3');
    }
    
    /**
     * Play shield hit sound
     * @param {string} objectId - Optional ID to associate with the sound
     * @returns {Audio|null} The Audio object that was played
     */
    playShieldHit(objectId = null) {
        return this.play('/sounds/ships/shields/shield-equipped-or-deflected-danger.mp3', objectId);
    }
    
    /**
     * Play heat seeking mine radio sound
     * @param {string} objectId - Optional ID to associate with the sound
     * @returns {Audio|null} The Audio object that was played
     */
    playHeatSeekingMineRadio(objectId = null) {
        return this.play('/sounds/ships/aliens/tetra/heat-seeking-mine-radio.mp3', objectId);
    }
    
    /**
     * Play sound when Tetra drops a heat-seeking mine
     * @param {string} objectId - Optional ID to associate with the sound
     * @returns {Audio|null} The Audio object that was played
     */
    playTetraDropMine(objectId = null) {
        return this.play('/sounds/ships/aliens/tetra/tetra-drop-mine.mp3', objectId);
    }
    
    /**
     * Play boundary breach sound (debounced to prevent sound spam)
     * @param {boolean} isWarning - If true, indicates this is just a warning (parameter kept for API compatibility)
     * @returns {Audio|null} The Audio object that was played
     */
    playBoundaryBreach(isWarning = false) {
        const soundPath = '/sounds/game/boundaries/world-boundary-breach.mp3';
        const now = Date.now();
        
        // Debounce check - don't play sounds too frequently
        if (this.lastPlayedTime['boundaryBreach'] && 
            now - this.lastPlayedTime['boundaryBreach'] < this.debounceIntervals['boundaryBreach']) {
            // Sound was played too recently, skip this one
            return null;
        }
        
        // Update last played time
        this.lastPlayedTime['boundaryBreach'] = now;
        
        // Play at full volume relative to master volume
        // Master volume will handle the actual output level
        return this.play(soundPath, 'boundary');
    }
    
    /**
     * Play the Mancer theme song
     * @returns {Audio|null} The Audio object that was played
     */
    playMancerTheme() {
        return this.play('/sounds/game/theme-songs/mancer-kill-all-aliens.mp3', 'mancer_theme');
    }
    
    /**
     * Stop the Mancer theme song if it's playing
     */
    stopMancerTheme() {
        this.stop('mancer_theme');
    }
    
    /**
     * Play boss sphere hit sound
     * @param {string} objectId - Optional ID to associate with the sound
     * @returns {Audio|null} The Audio object that was played
     */
    playBossSphereHit(objectId = null) {
        return this.play('/sounds/bosses/sphere/takes-damage.mp3', objectId);
    }
    
    // Removed getOreRevealSound and getOreRetrievedSound methods
    // Now using direct function calls for each sound instead
    
    // Removed playWithVariation method - we want consistent, predictable sound playback
    
    // We no longer need to check if sounds exist - just call the appropriate function
    // for the sound you want to play. If a sound function doesn't exist, add it!
}

// Create and export a singleton instance
const soundManager = new SoundManager().init();

// No more sound type constants - every sound has its own dedicated function

export default soundManager;