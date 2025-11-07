/**
 * PowerUpManager.ts - Centralized power-up management system
 *
 * Manages all game power-ups in one place with a clean interface:
 * - Tracks active power-ups and their durations
 * - Provides status checking methods
 * - Handles effects application and removal
 * - Contains special effect logic for each power-up type
 * - Manages the collection of PowerUp objects in the world
 */

import * as THREE from 'three';
import PowerUpConfig, { PowerUpDefinition, PowerUpType } from '../objects/powers/PowerUpConfig';
import soundManager from './SoundManager';
import PowerUp from '../objects/powers/PowerUp.js';
import GameConfig from '../game/GameConfig';
import LevelConfig from '../game/LevelConfig';

interface PowerUpEffect {
  type: PowerUpType;
  config: PowerUpDefinition | undefined;
  startTime: number;
  endTime: number;
  active: boolean;
}

class PowerUpManager {
  private powerUps: any[]; // PowerUp[] when PowerUp is converted
  private activePowerUps: { [key: string]: PowerUpEffect };
  private game: any | null; // Game type when Game.ts is converted
  private scene: THREE.Scene | null;
  private wrapDistance: number;

  constructor() {
    // Array of active PowerUp objects in the world
    this.powerUps = [];

    // Map of active power-up effects, keyed by type
    this.activePowerUps = {};

    // Reference to game (set during initialization)
    this.game = null;

    // Scene reference
    this.scene = null;

    // World size for wraparound
    this.wrapDistance = GameConfig.world.wrapDistance;
  }

  /**
   * Initialize the power-up manager with a reference to the game
   * @param game - Reference to the main game instance
   */
  init(game: any): this {
    if (!game) {
      console.error('PowerUpManager: No game instance provided to init()');
      return this;
    }

    this.game = game;

    // Ensure we have a valid scene reference
    if (!game.scene) {
      console.error('PowerUpManager: Game instance has no scene reference');
    } else {
      this.scene = game.scene;
    }

    this.wrapDistance = GameConfig.world.wrapDistance;

    return this;
  }

  /**
   * Create a power-up at the given position
   * @param position - Position where power-up should be created
   * @param specificType - Optional type of power-up to create
   * @returns The created PowerUp instance
   */
  createPowerUp(position: THREE.Vector3, specificType: PowerUpType | null = null): any | null {
    // Log the incoming position

    try {
      // Make a clean copy of the position
      const positionToUse = new THREE.Vector3(
        parseFloat(position.x.toString()),
        parseFloat(position.y.toString()),
        parseFloat(position.z.toString())
      );

      // Override with specific type or choose a random one
      let powerUpType: PowerUpType;

      if (specificType) {
        powerUpType = specificType;
      } else {
        const powerUpTypes = PowerUpConfig.powerUpTypes;
        const randomTypeIndex = Math.floor(Math.random() * powerUpTypes.length);
        powerUpType = powerUpTypes[randomTypeIndex].type;
      }

      // Get the config for this power-up type
      const powerUpConfig = PowerUpConfig.getPowerUpConfig(powerUpType);
      if (!powerUpConfig) {
        console.warn(`PowerUpManager: No config found for power-up type ${powerUpType}`);
      }

      // Create a new PowerUp instance with minimal parameters
      const powerUp = new PowerUp(
        this.scene,
        positionToUse,
        powerUpType,
        {
          // Just specify color from config
          color: powerUpConfig?.color || 0xffffff
        }
      );

      // Explicitly add the mesh to the scene
      if (powerUp.mesh && this.scene) {
        this.scene.add(powerUp.mesh);
      }

      // Add to the array of managed power-ups
      this.powerUps.push(powerUp);

      // Verify final position of the created power-up
      if (powerUp && powerUp.mesh) {
      }

      return powerUp;
    } catch (error) {
      console.error('PowerUpManager: Error creating power-up:', error);
      return null;
    }
  }

  /**
   * Remove a specific power-up from the world
   * @param powerUp - The power-up to remove
   */
  removePowerUp(powerUp: any): void {
    if (!powerUp) return;

    // Destroy the power-up
    powerUp.destroy();

    // Remove from array
    const index = this.powerUps.indexOf(powerUp);
    if (index !== -1) {
      this.powerUps.splice(index, 1);
    }
  }

  /**
   * Update all power-ups in the world and active effects
   * @param deltaTime - Time since last frame in milliseconds
   */
  update(deltaTime: number): void {
    // Update power-ups in the world
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];

      // Update and check if still active
      const isActive = powerUp.update(deltaTime);
      if (!isActive) {
        // Remove expired power-up
        this.powerUps.splice(i, 1);
        continue;
      }

    }

    // Update active power-up effects
    this.updateActiveEffects();
  }

  /**
   * Clear all power-ups from the world
   */
  clearAllPowerUps(): void {
    // Remove all power-up objects
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      this.powerUps[i].remove();
    }

    // Clear the array
    this.powerUps = [];
  }

  /**
   * Get the count of active power-ups in the world
   * @returns Number of power-ups
   */
  getPowerUpCount(): number {
    return this.powerUps.length;
  }

  /**
   * Try to spawn a power-up at the given position based on level configuration
   * @param position - The position to spawn the power-up
   * @param levelConfig - Optional level configuration, will use current level if not provided
   */
  trySpawnPowerUp(position: THREE.Vector3, levelConfig?: any): any | undefined {
    // Log the incoming position

    // If levelConfig not provided, get current level
    const config = levelConfig || LevelConfig.getCurrentLevel();
    if (!config) {
      console.warn('PowerUpManager: No level config available for power-up spawning');
      return;
    }

    // Log the full level config we're using

    // Check if level has power-up configuration
    if (!config.powerUpConfig) {
      console.warn('PowerUpManager: Level has no power-up configuration');
      return;
    }

    // Log the spawn probability check
    const randomValue = Math.random();

    if (randomValue > config.powerUpConfig.spawnProbability) {
      return;
    }

    // Get allowed power-up types for this level
    const allowedTypes = config.powerUpConfig.types ||
      PowerUpConfig.powerUpTypes.map(p => p.type);

    if (!allowedTypes || allowedTypes.length === 0) {
      console.warn('PowerUpManager: No power-up types specified - cannot spawn power-up');
      return;
    }

    // Pick a random power-up type from allowed types
    const randomTypeIndex = Math.floor(Math.random() * allowedTypes.length);
    const powerUpType = allowedTypes[randomTypeIndex];

    console.log(`PowerUpManager: Spawning power-up of type ${powerUpType} at ${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}`);

    // IMPORTANT FIX: Create a completely fresh copy of the position with explicit values
    // This ensures no reference issues when passing to createPowerUp
    const positionForPowerUp = new THREE.Vector3(
      parseFloat(position.x.toString()),
      parseFloat(position.y.toString()),
      parseFloat(position.z.toString())
    );

    console.log('Position being passed to createPowerUp with explicit values:', {
      x: positionForPowerUp.x.toFixed(2),
      y: positionForPowerUp.y.toFixed(2),
      z: positionForPowerUp.z.toFixed(2),
      originalValues: {
        x: position.x,
        y: position.y,
        z: position.z
      }
    });

    // Create the power-up with the selected type
    return this.createPowerUp(positionForPowerUp, powerUpType);
  }

  /**
   * Apply a power-up effect
   * @param powerUp - The power-up to apply
   */
  applyPowerUp(powerUp: any): void {
    const type = powerUp.getType();
    const duration = powerUp.getDuration();

    // Create effect data
    const effect: PowerUpEffect = {
      type: type,
      config: PowerUpConfig.getPowerUpConfig(type),
      startTime: performance.now(),
      endTime: performance.now() + duration,
      active: true
    };

    // Add to active effects (replacing any existing one of same type)
    this.activePowerUps[type] = effect;

    // Add the power-up to the HUD
    if (this.game && this.game.hud) {
      this.game.hud.addPowerUp(powerUp);
    }

    // Apply specific power-up effects
    this._applySpecificEffect(type, effect, true);

    // Play power-up collection sound
    soundManager.playPowerUp();

    console.log(`Applied ${type} power-up effect for ${duration / 1000} seconds`);
  }

  /**
   * Check if a specific power-up is active
   * @param type - The power-up type to check
   * @returns True if the power-up is active
   */
  isPowerUpActive(type: PowerUpType | string): boolean {
    return this.activePowerUps[type] !== undefined && this.activePowerUps[type].active;
  }

  /**
   * Get the active power-up effect data
   * @param type - The power-up type
   * @returns The power-up effect data or null if not active
   */
  getPowerUp(type: PowerUpType | string): PowerUpEffect | null {
    return this.isPowerUpActive(type) ? this.activePowerUps[type] : null;
  }

  /**
   * Get all active power-ups
   * @returns Map of active power-ups
   */
  getAllActivePowerUps(): { [key: string]: PowerUpEffect } {
    return this.activePowerUps;
  }

  /**
   * Update all power-up effects
   * Checks durations and removes expired effects
   */
  updateActiveEffects(): void {
    const now = performance.now();

    // Check each power-up for expiration
    Object.keys(this.activePowerUps).forEach(type => {
      const effect = this.activePowerUps[type];

      // Check if effect has expired
      if (now > effect.endTime) {
        this.removePowerUpEffect(type);
      }
    });
  }

  /**
   * Remove a power-up effect when it expires
   * @param type - The power-up type to remove
   */
  removePowerUpEffect(type: string): void {
    if (!this.activePowerUps[type] || !this.activePowerUps[type].active) return;

    console.log(`Power-up ${type} expired`);

    // Mark effect as inactive
    this.activePowerUps[type].active = false;

    // Apply specific removal effects
    this._applySpecificEffect(type, this.activePowerUps[type], false);

    // Remove from HUD
    if (this.game && this.game.hud) {
      this.game.hud.removePowerUp(type);
    }

    // Remove from active effects
    delete this.activePowerUps[type];
  }

  /**
   * Clears all active power-up effects.
   * Typically used when resetting a level or game.
   */
  clearActiveEffects(): void {
    // Create a copy of the keys to avoid issues while iterating and modifying the object
    const activeTypes = Object.keys(this.activePowerUps);
    activeTypes.forEach(type => {
      this.removePowerUpEffect(type); // Use removePowerUp to handle deactivation logic
    });

    // Ensure the map is empty after removal
    this.activePowerUps = {};
  }

  /**
   * Play shield hit effect - called when shield blocks an attack
   * @returns void
   */
  playShieldHitEffect(): void {
    // Play shield hit sound - soundManager will apply master volume
    soundManager.playShieldHit();
  }

  /**
   * Apply specific effects for different power-up types
   * @param type - The power-up type
   * @param effect - The effect data
   * @param isActivation - True if activating, false if deactivating
   * @private
   */
  private _applySpecificEffect(type: string, effect: PowerUpEffect, isActivation: boolean): void {
    if (!this.game) return;

    switch (type) {
      case 'shield':
        // Shield activation/deactivation sound
        if (isActivation) {
          // Use default volume from SoundManager
          soundManager.playShieldHit();
        }
        break;

      case 'magnetPull':
        // Magnet pull activation sound
        if (isActivation) {
          // Play magnet pull sound
          soundManager.playMagnetPull();
          console.log('MagnetPull activated - ores will be attracted to the player');
        } else {
          console.log('MagnetPull deactivated');
        }
        break;

      case 'weaponBoost':
        // Nothing to do here - weaponBoost is checked during bullet creation
        break;

      case 'multiShot':
        // Nothing to do here - multiShot is checked during shooting
        break;
    }
  }

  /**
   * Legacy method for backward compatibility - redirects to clearAllPowerUps and clearActiveEffects
   * @deprecated Use clearAllPowerUps() and clearActiveEffects() instead
   */
  remove(): void {
    console.warn('PowerUpManager.remove() is deprecated. Use clearAllPowerUps() and clearActiveEffects() instead.');
    this.clearAllPowerUps();
    this.clearActiveEffects();
  }

  /**
   * Checks if a power-up is near the given position and collects it if close enough
   * @param playerPosition - The player's current position
   * @param collectionRadius - How close the player needs to be to collect the power-up
   * @returns The collected power-up or null if none was collected
   */
  collectNearbyPowerUp(playerPosition: THREE.Vector3, collectionRadius: number = GameConfig.powerUps.collectionRadius): any | null {
    if (!playerPosition) return null;

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];

      // Check if player collected this power-up - direct distance check since checkCollection was removed
      if (powerUp.mesh && playerPosition.distanceTo(powerUp.mesh.position) < collectionRadius) {
        // Apply the power-up effect
        this.applyPowerUp(powerUp);

        // Remove from array first
        this.powerUps.splice(i, 1);

        // Then destroy the power-up
        powerUp.destroy();
        // Remove from scene
        if (this.scene) {
          this.scene.remove(powerUp.mesh);
        }
        //powerUp.removeFromScene();

        return powerUp;
      }
    }

    return null;
  }
}

// Create and export a singleton instance
const powerUpManager = new PowerUpManager();
export default powerUpManager;
