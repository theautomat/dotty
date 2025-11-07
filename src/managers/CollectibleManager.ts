/**
 * CollectibleManager.ts - Centralized collectible management system
 *
 * Manages all collectible objects in one place with a clean interface:
 * - Handles spawning, updating, and collecting of collectibles
 * - Provides methods for collectible collection and value calculation
 * - Integrates with level configuration for spawning rules
 */

import * as THREE from 'three';
import CollectibleConfig, { CollectibleType } from '../objects/collectibles/CollectibleConfig';
import LevelConfig from '../game/LevelConfig';
import soundManager from './SoundManager';
import Collectible from '../objects/collectibles/Collectible.js';
import GameConfig from '../game/GameConfig';
import GameStats from '../game/GameStats';
import powerUpManager from './PowerUpManager';

interface CollectibleData {
  type: CollectibleType | string;
  value: number;
  position: THREE.Vector3;
}

class CollectibleManager {
  private collectibles: any[]; // Collectible[] when Collectible is converted
  private scene: THREE.Scene | null;
  private game: any | null;

  constructor(scene?: THREE.Scene) {
    // Array of active Collectible objects in the world
    this.collectibles = [];

    // Scene reference
    this.scene = scene || null;

    // Reference to game (set during initialization)
    this.game = null;
  }

  /**
   * Initialize the collectible manager with a reference to the game
   * @param game - Reference to the main game instance
   */
  init(game: any): this {
    if (!game) {
      console.error('CollectibleManager: No game instance provided to init()');
      return this;
    }

    this.game = game;

    // Ensure we have a valid scene reference
    if (!game.scene) {
      console.error('CollectibleManager: Game instance has no scene reference');
    } else {
      this.scene = game.scene;
    }

    return this;
  }

  /**
   * Spawns a collectible at the given position.
   * @param position - Where to spawn the collectible.
   * @param type - Type identifier (e.g., 'iron', 'copper').
   * @param value - Value of the collectible when collected.
   * @param duration - How long the collectible lasts in milliseconds.
   * @returns The created Collectible instance
   */
  spawnCollectible(position: THREE.Vector3, type: CollectibleType | string, value: number, duration: number = 15000): any | null {
    try {
      // Make a clean copy of the position
      const positionToUse = new THREE.Vector3(
        parseFloat(position.x.toString()),
        parseFloat(position.y.toString()),
        parseFloat(position.z.toString())
      );

      // Get the config for this collectible type
      const collectibleConfig = CollectibleConfig.getCollectibleConfig(type as CollectibleType);
      if (!collectibleConfig) {
        console.warn(`CollectibleManager: No config found for collectible type ${type}`);
      }

      // Add random scatter to position
      // DOTTY: Only randomize X and Z for 2D top-down, keep Y at provided height
      positionToUse.add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          0, // Don't randomize Y - keep collectibles on the ground plane
          (Math.random() - 0.5) * 2
        )
      );

      // Create a new Collectible instance
      const collectible = new Collectible(
        this.scene,
        positionToUse,
        type,
        value,
        {
          lifetime: duration
        }
      );

      // Add to the array of managed collectibles
      this.collectibles.push(collectible);

      return collectible;
    } catch (error) {
      console.error('CollectibleManager: Error creating collectible:', error);
      return null;
    }
  }

  /**
   * Try to spawn a collectible at the given position based on level configuration
   * @param position - The position to spawn the collectible
   * @param levelConfig - Optional level configuration, will use current level if not provided
   */
  trySpawnCollectible(position: THREE.Vector3, levelConfig?: any): any | undefined {
    // If levelConfig not provided, get current level
    const config = levelConfig || LevelConfig.getCurrentLevel();
    if (!config) {
      console.warn('CollectibleManager: No level config available for collectible spawning');
      return;
    }

    // Use allowedCollectibleTypes from the level config as the source of truth
    if (!config.allowedCollectibleTypes || config.allowedCollectibleTypes.length === 0) {
      console.warn('CollectibleManager: No allowed collectible types specified in level config - cannot spawn collectible');
      return;
    }

    // Pick a random collectible type from allowed types
    const randomTypeIndex = Math.floor(Math.random() * config.allowedCollectibleTypes.length);
    const collectibleType = config.allowedCollectibleTypes[randomTypeIndex];

    // Always use value of 1 - multipliers will be applied in GameStats for scoring
    const value = 1;

    // Create the collectible with the selected type
    return this.spawnCollectible(position, collectibleType, value);
  }

  /**
   * Updates all collectibles
   * @param deltaTime - Time since last frame.
   * @param playerPosition - Current position of the player
   */
  update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (!playerPosition) {
      console.warn('CollectibleManager: No player position provided to update()');
      return;
    }

    // Update and remove expired collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const collectible = this.collectibles[i];

      // Update returns false if the collectible is no longer active
      if (!collectible.update(deltaTime)) {
        this.collectibles.splice(i, 1);
        continue;
      }

      // Handle magnet pull effect if active
      if (powerUpManager.isPowerUpActive('magnetPull')) {
        // Calculate direction to player
        const directionToPlayer = new THREE.Vector3()
          .subVectors(playerPosition, collectible.mesh.position)
          .normalize();

        // Apply magnet pull force (stronger than normal movement)
        const magnetSpeed = 5.0; // Increased from 1.0 to 5.0 for much stronger attraction
        collectible.velocity.copy(directionToPlayer).multiplyScalar(magnetSpeed);
      }
    }
  }

  /**
   * Finds the nearest active collectible to a given position within a specified radius,
   * removes it, and returns its data.
   * @param playerPosition - The position to check near (e.g., player position).
   * @returns Data of the collected collectible ({ type, value, position }) or null if no collectible was collected.
   */
  collectNearbyCollectible(playerPosition: THREE.Vector3): CollectibleData | null {
    if (!playerPosition) return null;

    // Find the closest collectible within collection radius
    let closestCollectible: any = null;
    let closestDistance = Infinity;

    for (const collectible of this.collectibles) {
      if (!collectible || !collectible.mesh) continue;

      const distance = playerPosition.distanceTo(collectible.mesh.position);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCollectible = collectible;
      }
    }

    // Check if closest collectible is within collection radius
    if (closestCollectible && closestDistance <= GameConfig.collectibles.collectionRadius) {
      // Get collectible data before removing it
      const collectibleData: CollectibleData = {
        type: closestCollectible.type,
        value: closestCollectible.value,
        position: closestCollectible.mesh.position.clone()
      };

      // Remove from array first
      const index = this.collectibles.indexOf(closestCollectible);
      if (index > -1) {
        this.collectibles.splice(index, 1);
      }

      // Then destroy the collectible
      closestCollectible.destroy();
      // Remove from scene
      if (closestCollectible.mesh && this.scene) {
        this.scene.remove(closestCollectible.mesh);
      }

      // Update game stats through the singleton
      GameStats.collectibleMined(collectibleData.type, collectibleData.value);

      // Update HUD through game instance
      if (this.game && this.game.hud) {
        this.game.hud.updateResources(GameStats.getAllCollectiblesMined());
        this.game.hud.highlightCollectible(collectibleData.type);
      }

      // Play collection sound using the specific collectible type method
      switch (collectibleData.type) {
        case 'iron':
          soundManager.playIronCollectibleRetrieved();
          break;
        case 'copper':
          soundManager.playCopperCollectibleRetrieved();
          break;
        case 'silver':
          soundManager.playSilverCollectibleRetrieved();
          break;
        case 'gold':
          soundManager.playGoldCollectibleRetrieved();
          break;
        case 'platinum':
          soundManager.playPlatinumCollectibleRetrieved();
          break;
        default:
          // If unknown type, fall back to iron
          soundManager.playIronCollectibleRetrieved();
          break;
      }

      return collectibleData;
    }

    return null;
  }

  /**
   * Gets the collectible position from its index
   * @param index - The index in the collectibles array
   * @returns The position or null if invalid
   */
  getCollectiblePosition(index: number): THREE.Vector3 | null {
    if (index >= 0 && index < this.collectibles.length && this.collectibles[index].mesh) {
      return this.collectibles[index].mesh.position;
    }
    return null;
  }

  /**
   * Clears all active collectible instances.
   */
  clearAllCollectibles(): void {
    // Get a copy of the array
    const collectiblesToDestroy = [...this.collectibles];

    // Clear the array first
    this.collectibles = [];

    // Then destroy each collectible
    for (const collectible of collectiblesToDestroy) {
      // remove from scene
      if (collectible.mesh && this.scene) {
        this.scene.remove(collectible.mesh);
      }
      collectible.destroy();
    }
  }

  /**
   * Gets the total count of active collectibles.
   * @returns The number of active collectibles.
   */
  getCollectibleCount(): number {
    return this.collectibles.length;
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use clearAllCollectibles() instead
   */
}

// Create and export a singleton instance
const collectibleManager = new CollectibleManager();
export default collectibleManager;
