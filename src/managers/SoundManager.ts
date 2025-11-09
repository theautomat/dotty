/**
 * SoundManager.ts - Centralized sound management system
 *
 * Manages all game sounds with a direct, easy-to-debug approach:
 * - Each sound has a dedicated function with its path hardcoded
 * - No lookup tables or constants for sound IDs
 * - Every sound file has exactly one function that plays it
 * - Associates sounds with game objects via IDs
 * - Automatically manages cleanup
 */

interface SoundData {
  audio: HTMLAudioElement;
  path: string;
}

interface PlayOptions {
  loop?: boolean;
  volume?: number;
}

interface DebounceIntervals {
  [key: string]: number;
  boundaryBreach: number;
}

class SoundManager {
  private sounds: { [path: string]: HTMLAudioElement };
  private activeSounds: Map<string, SoundData>;
  private masterVolume: number;
  private _volumeBeforeMute: number;
  private muted: boolean;
  private initialized: boolean;
  private lastPlayedTime: { [key: string]: number };
  private debounceIntervals: DebounceIntervals;

  // Hunter sound types constants
  static HUNTER_SOUND_TYPES = {
    SPAWN: 'spawn',
    EXPLODE: 'explode',
    NEARBY: 'nearby'
  } as const;

  constructor() {
    // Map of sound IDs to Audio objects
    this.sounds = {};

    // Map of object IDs to their active sounds
    this.activeSounds = new Map<string, SoundData>();

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
  init(): this {
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
   * @param path - Path to the sound file (also used as the unique identifier)
   * @returns The loaded Audio object
   */
  loadSound(path: string): HTMLAudioElement | null {
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
   * @param path - Path to the sound file to play
   * @param objectId - Optional ID of the object to associate with the sound
   * @param options - Optional playback options
   * @returns The Audio object that was played
   */
  play(path: string, objectId: string | null = null, options: PlayOptions = {}): HTMLAudioElement | null {

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
      let audioToPlay = sound.cloneNode() as HTMLAudioElement;

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
   * @param objectId - ID of the object whose sound should be stopped
   */
  stop(objectId: string): void {
    if (!this.activeSounds.has(objectId)) return;

    try {
      const soundData = this.activeSounds.get(objectId);
      if (!soundData) return;

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
  stopAll(): void {
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
   * @param volume - Volume level (0.0 to 1.0)
   */
  setMasterVolume(volume: number): void {
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
      activeSoundInfo.audio.volume = this.masterVolume;
    });

    console.log(`SoundManager: Master volume set to ${this.masterVolume}`);
  }

  /**
   * Gets the current master volume.
   * @returns Current volume level (0.0 to 1.0)
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Toggles the global mute state.
   */
  toggleMute(): void {
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
   * @returns True if muted, false otherwise.
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Generate a unique ID for an object
   * @param prefix - Optional prefix for the ID
   * @returns A unique ID
   */
  generateId(prefix: string = 'sound'): string {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Play iron level transition sounds
   */
  playIronLevelTransition(): HTMLAudioElement | null {
    return this.playIronOreRevealed();
  }

  /**
   * Play copper level transition sounds
   */
  playCopperLevelTransition(): HTMLAudioElement | null {
    return this.playCopperOreRevealed();
  }

  /**
   * Play silver level transition sounds
   */
  playSilverLevelTransition(): HTMLAudioElement | null {
    return this.playSilverOreRevealed();
  }

  /**
   * Play gold level transition sounds
   */
  playGoldLevelTransition(): HTMLAudioElement | null {
    return this.playGoldOreRevealed();
  }

  /**
   * Play platinum level transition sounds
   */
  playPlatinumLevelTransition(): HTMLAudioElement | null {
    return this.playPlatinumOreRevealed();
  }

  /**
   * @deprecated Use the specific level transition methods instead
   */
  playLevelTransition(levelId: number, primaryOreType: string): void {
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
   * @returns The Audio object that was played
   */
  playLevelBegin(): HTMLAudioElement | null {
    return this.play('/sounds/levels/level-beginning-2.mp3');
  }

  /**
   * Play iron ore revealed sound
   * @returns The Audio object that was played
   */
  playIronOreRevealed(): HTMLAudioElement | null {
    return this.play('/sounds/ores/iron-treasure-revealed.mp3');
  }

  /**
   * Play copper ore revealed sound
   * @returns The Audio object that was played
   */
  playCopperOreRevealed(): HTMLAudioElement | null {
    return this.play('/sounds/ores/copper-treasure-revealed.mp3');
  }

  /**
   * Play silver ore revealed sound
   * @returns The Audio object that was played
   */
  playSilverOreRevealed(): HTMLAudioElement | null {
    return this.play('/sounds/ores/silver-treasure-revealed.mp3');
  }

  /**
   * Play gold ore revealed sound
   * @returns The Audio object that was played
   */
  playGoldOreRevealed(): HTMLAudioElement | null {
    return this.play('/sounds/ores/gold-treasure-revealed.mp3');
  }

  /**
   * Play platinum ore revealed sound
   * @returns The Audio object that was played
   */
  playPlatinumOreRevealed(): HTMLAudioElement | null {
    return this.play('/sounds/ores/platinum-treasure-revealed.mp3');
  }

  /**
   * Play iron ore retrieved sound
   * @returns The Audio object that was played
   */
  playIronCollectibleRetrieved(): HTMLAudioElement | null {
    return this.play('/sounds/ores/iron-treasure-retrieved.mp3');
  }

  /**
   * Play copper ore retrieved sound
   * @returns The Audio object that was played
   */
  playCopperCollectibleRetrieved(): HTMLAudioElement | null {
    return this.play('/sounds/ores/copper-treasure-retrieved.mp3');
  }

  /**
   * Play silver ore retrieved sound
   * @returns The Audio object that was played
   */
  playSilverCollectibleRetrieved(): HTMLAudioElement | null {
    return this.play('/sounds/ores/silver-treasure-retrieved.mp3');
  }

  /**
   * Play gold ore retrieved sound
   * @returns The Audio object that was played
   */
  playGoldCollectibleRetrieved(): HTMLAudioElement | null {
    return this.play('/sounds/ores/gold-treasure-retrieved.mp3');
  }

  /**
   * Play platinum ore retrieved sound
   * @returns The Audio object that was played
   */
  playPlatinumCollectibleRetrieved(): HTMLAudioElement | null {
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
   * @param objectId - Optional ID to associate with the sound
   * @returns The Audio object that was played
   */
  playThrusterForward(objectId: string | null = null): HTMLAudioElement | null {
    return this.play('/sounds/ships/engines/thrusters-forward.mp3', objectId);
  }

  /**
   * Play reverse thruster sound
   * @param objectId - Optional ID to associate with the sound
   * @returns The Audio object that was played
   */
  playThrusterReverse(objectId: string | null = null): HTMLAudioElement | null {
    return this.play('/sounds/ships/engines/thrusters-reverse.mp3', objectId);
  }

  /**
   * Play strafe thruster sound
   * @param objectId - Optional ID to associate with the sound
   * @returns The Audio object that was played
   */
  playThrusterStrafe(objectId: string | null = null): HTMLAudioElement | null {
    return this.play('/sounds/ships/engines/thrusters-left-and-right.mp3', objectId);
  }

  // Note: Any code that previously called playThruster should be updated to call
  // the specific methods directly: playThrusterForward, playThrusterReverse, or playThrusterStrafe

  /**
   * Play asteroid explosion sound
   * @returns The Audio object that was played
   */
  playAsteroidExplosion(): HTMLAudioElement | null {
    return this.play('/sounds/asteroids/asteroid-explosion.mp3');
  }

  /**
   * Play ship explosion sound
   * @returns The Audio object that was played
   */
  playShipExplosion(): HTMLAudioElement | null {
    return this.play('/sounds/ships/explosions/ship-explosion.mp3');
  }

  // Note: Any code that previously called playExplosion should be updated to call
  // the specific methods directly: playAsteroidExplosion, playShipExplosion, playUFOExplosion, or playHunterExplosion

  /**
   * Play Hunter spawn sound
   * @param objectId - Optional ID to associate with the sound (usually the Hunter's ID)
   * @returns The Audio object that was played
   */
  playHunterSpawn(objectId: string | null = null): HTMLAudioElement | null {
    return this.play('/sounds/ships/aliens/hunter/hunter-spawn.mp3', objectId);
  }

  /**
   * Play Hunter explosion sound
   * @param objectId - Optional ID to associate with the sound
   * @returns The Audio object that was played
   */
  playHunterExplosion(objectId: string | null = null): HTMLAudioElement | null {
    return this.play('/sounds/ships/aliens/hunter/hunter-ship-explosion.mp3', objectId);
  }

  /**
   * Play Hunter nearby/trash talk sound
   * @param objectId - Optional ID to associate with the sound
   * @returns The Audio object that was played
   */
  playHunterNearby(objectId: string | null = null): HTMLAudioElement | null {
    return this.play('/sounds/ships/aliens/hunter/hunter-alien-pilot-trash-talk-when-nearby.mp3', objectId);
  }

  // Note: Any code that previously called playHunterSound should be updated to call
  // the specific methods directly: playHunterSpawn, playHunterExplosion, or playHunterNearby

  /**
   * Play UFO engine sound
   * @param objectId - Optional ID to associate with the sound (usually the UFO's ID)
   * @returns The Audio object that was played
   */
  playUFOEngine(objectId: string | null = null): HTMLAudioElement | null {
    return this.play('/sounds/ships/aliens/ufo/alien-ship-engine.mp3', objectId);
  }

  /**
   * Play UFO laser sound
   * @param objectId - Optional ID to associate with the sound
   * @returns The Audio object that was played
   */
  playUFOLaser(objectId: string | null = null): HTMLAudioElement | null {
    return this.play('/sounds/ships/aliens/ufo/ufo-laser-shot.mp3', objectId);
  }

  /**
   * Play UFO explosion sound
   * @param objectId - Optional ID to associate with the sound
   * @returns The Audio object that was played
   */
  playUFOExplosion(objectId: string | null = null): HTMLAudioElement | null {
    // Using ship explosion sound since ufo-explosion.mp3 doesn't exist
    return this.play('/sounds/ships/explosions/ship-explosion.mp3', objectId);
  }

  // Note: Any code that previously called playUFOSound should be updated to call
  // the specific methods directly: playUFOEngine, playUFOLaser, or playUFOExplosion

  /**
   * Play standard bullet fire sound
   * @returns The Audio object that was played
   */
  playBulletFire(): HTMLAudioElement | null {
    return this.play('/sounds/ships/guns/phaser-gun-shot.mp3');
  }

  /**
   * Play phaser shot sound
   * @returns The Audio object that was played
   */
  playPhaserShot(): HTMLAudioElement | null {
    return this.play('/sounds/ships/guns/phaser-gun-shot.mp3');
  }

  /**
   * Play phaser fail sound (when unable to fire)
   * @returns The Audio object that was played
   */
  playPhaserFail(): HTMLAudioElement | null {
    return this.play('/sounds/ships/guns/phaser-gun-shot-fail.mp3');
  }

  // Note: Any code that previously called playWeapon should be updated to call
  // the specific methods directly: playBulletFire, playPhaserShot, or playPhaserFail

  /**
   * Play power-up collection sound
   * @returns The Audio object that was played
   */
  playPowerUpCollect(): HTMLAudioElement | null {
    return this.play('/sounds/powers/power-not-sure-yet.mp3');
  }

  /**
   * Play magnet pull sound
   * @param objectId - Optional ID to associate with the sound
   * @returns The Audio object that was played
   */
  playMagnetPull(objectId: string | null = null): HTMLAudioElement | null {
    return this.play('/sounds/powers/magnet-pull.mp3', objectId);
  }

  /**
   * Legacy method to play powerup sound - kept for backward compatibility
   * @deprecated Use playPowerUpCollect instead
   */
  playPowerUp(): HTMLAudioElement | null {
    return this.playPowerUpCollect();
  }

  /**
   * Play game over sound when player dies
   * @returns The Audio object that was played
   */
  playGameOver(): HTMLAudioElement | null {
    return this.play('/sounds/game/booty-death-game-over.mp3');
  }

  /**
   * Play game complete sound when all levels are finished
   * @returns The Audio object that was played
   */
  playGameComplete(): HTMLAudioElement | null {
    return this.play('/sounds/game/booty-completed-game.mp3');
  }

  /**
   * Play shield hit sound
   * @param objectId - Optional ID to associate with the sound
   * @returns The Audio object that was played
   */
  playShieldHit(objectId: string | null = null): HTMLAudioElement | null {
    return this.play('/sounds/ships/shields/shield-equipped-or-deflected-danger.mp3', objectId);
  }

  /**
   * Play heat seeking mine radio sound
   * @param objectId - Optional ID to associate with the sound
   * @returns The Audio object that was played
   */
  playHeatSeekingMineRadio(objectId: string | null = null): HTMLAudioElement | null {
    return this.play('/sounds/ships/aliens/tetra/heat-seeking-mine-radio.mp3', objectId);
  }

  /**
   * Play sound when Tetra drops a heat-seeking mine
   * @param objectId - Optional ID to associate with the sound
   * @returns The Audio object that was played
   */
  playTetraDropMine(objectId: string | null = null): HTMLAudioElement | null {
    return this.play('/sounds/ships/aliens/tetra/tetra-drop-mine.mp3', objectId);
  }

  /**
   * Play boundary breach sound (debounced to prevent sound spam)
   * @param isWarning - If true, indicates this is just a warning (parameter kept for API compatibility)
   * @returns The Audio object that was played
   */
  playBoundaryBreach(isWarning: boolean = false): HTMLAudioElement | null {
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
   * Play the game theme song
   * @returns The Audio object that was played
   */
  playTheme(): HTMLAudioElement | null {
    return this.play('/sounds/game/theme-songs/booty-theme.mp3', 'game_theme');
  }

  /**
   * Stop the game theme song if it's playing
   */
  stopTheme(): void {
    this.stop('game_theme');
  }

  /**
   * Play boss sphere hit sound
   * @param objectId - Optional ID to associate with the sound
   * @returns The Audio object that was played
   */
  playBossSphereHit(objectId: string | null = null): HTMLAudioElement | null {
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
