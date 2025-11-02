/**
 * OreManager.js - Centralized ore management system
 * 
 * Manages all ore objects in one place with a clean interface:
 * - Handles spawning, updating, and collecting of ores
 * - Provides methods for ore collection and value calculation
 * - Integrates with level configuration for spawning rules
 */

import * as THREE from 'three';
import OreConfig from '../objects/ores/OreConfig.js';
import LevelConfig from '../game/LevelConfig.js';
import soundManager from './SoundManager.js';
import Ore from '../objects/ores/Ore.js';
import GameConfig from '../game/GameConfig.js';
import GameStats from '../game/GameStats.js';
import powerUpManager from './PowerUpManager.js';

class OreManager {
    constructor(scene) {
        // Array of active Ore objects in the world
        this.ores = [];
        
        // Scene reference
        this.scene = scene;
        
        // Reference to game (set during initialization)
        this.game = null;
    }

    /**
     * Initialize the ore manager with a reference to the game
     * @param {Game} game - Reference to the main game instance
     */
    init(game) {
        if (!game) {
            console.error('OreManager: No game instance provided to init()');
            return this;
        }
        
        this.game = game;
        
        // Ensure we have a valid scene reference
        if (!game.scene) {
            console.error('OreManager: Game instance has no scene reference');
        } else {
            this.scene = game.scene;
        }
        
        return this;
    }

    /**
     * Spawns an ore at the given position.
     * @param {THREE.Vector3} position - Where to spawn the ore.
     * @param {string} type - Type identifier (e.g., 'iron', 'copper').
     * @param {number} value - Value of the ore when collected.
     * @param {number} [duration=15000] - How long the ore lasts in milliseconds.
     * @returns {Ore} The created Ore instance
     */
    spawnOre(position, type, value, duration = 15000) {
        try {
            // Make a clean copy of the position
            const positionToUse = new THREE.Vector3(
                parseFloat(position.x),
                parseFloat(position.y),
                parseFloat(position.z)
            );

            // Get the config for this ore type
            const oreConfig = OreConfig.getOreConfig(type);
            if (!oreConfig) {
                console.warn(`OreManager: No config found for ore type ${type}`);
            }

            // Add random scatter to position
            // DOTTY: Only randomize X and Z for 2D top-down, keep Y at provided height
            positionToUse.add(
                new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    0, // Don't randomize Y - keep ores on the ground plane
                    (Math.random() - 0.5) * 2
                )
            );

            // Create a new Ore instance
            const ore = new Ore(
                this.scene,
                positionToUse,
                type,
                value,
                {
                    lifetime: duration
                }
            );
            
            // Add to the array of managed ores
            this.ores.push(ore);
            
            return ore;
        } catch (error) {
            console.error('OreManager: Error creating ore:', error);
            return null;
        }
    }

    /**
     * Try to spawn an ore at the given position based on level configuration
     * @param {THREE.Vector3} position - The position to spawn the ore
     * @param {Object} [levelConfig] - Optional level configuration, will use current level if not provided
     */
    trySpawnOre(position, levelConfig) {
        // If levelConfig not provided, get current level
        const config = levelConfig || LevelConfig.getCurrentLevel();
        if (!config) {
            console.warn('OreManager: No level config available for ore spawning');
            return;
        }

        // Use allowedOreTypes from the level config as the source of truth
        if (!config.allowedOreTypes || config.allowedOreTypes.length === 0) {
            console.warn('OreManager: No allowed ore types specified in level config - cannot spawn ore');
            return;
        }

        // Pick a random ore type from allowed types
        const randomTypeIndex = Math.floor(Math.random() * config.allowedOreTypes.length);
        const oreType = config.allowedOreTypes[randomTypeIndex];
        
        // Always use value of 1 - multipliers will be applied in GameStats for scoring
        const value = 1;
        
        // Create the ore with the selected type
        return this.spawnOre(position, oreType, value);
    }

    /**
     * Updates all ores
     * @param {number} deltaTime - Time since last frame.
     * @param {THREE.Vector3} playerPosition - Current position of the player
     */
    update(deltaTime, playerPosition) {
        if (!playerPosition) {
            console.warn('OreManager: No player position provided to update()');
            return;
        }

        // Update and remove expired ores
        for (let i = this.ores.length - 1; i >= 0; i--) {
            const ore = this.ores[i];
            
            // Update returns false if the ore is no longer active
            if (!ore.update(deltaTime)) {
                this.ores.splice(i, 1);
                continue;
            }

            // Handle magnet pull effect if active
            if (powerUpManager.isPowerUpActive('magnetPull')) {
                // Calculate direction to player
                const directionToPlayer = new THREE.Vector3()
                    .subVectors(playerPosition, ore.mesh.position)
                    .normalize();
                
                // Apply magnet pull force (stronger than normal movement)
                const magnetSpeed = 5.0; // Increased from 1.0 to 5.0 for much stronger attraction
                ore.velocity.copy(directionToPlayer).multiplyScalar(magnetSpeed);
            }
        }
    }

    /**
     * Finds the nearest active ore to a given position within a specified radius,
     * removes it, and returns its data.
     * @param {THREE.Vector3} playerPosition - The position to check near (e.g., player position).
     * @returns {Object|null} Data of the collected ore ({ type, value, position }) or null if no ore was collected.
     */
    collectNearbyOre(playerPosition) {
        if (!playerPosition) return null;
        
        // Find the closest ore within collection radius
        let closestOre = null;
        let closestDistance = Infinity;
        
        for (const ore of this.ores) {
            if (!ore || !ore.mesh) continue;
            
            const distance = playerPosition.distanceTo(ore.mesh.position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestOre = ore;
            }
        }
        
        // Check if closest ore is within collection radius
        if (closestOre && closestDistance <= GameConfig.ores.collectionRadius) {
            // Get ore data before removing it
            const oreData = {
                type: closestOre.type,
                value: closestOre.value,
                position: closestOre.mesh.position.clone()
            };
            
            // Remove from array first
            const index = this.ores.indexOf(closestOre);
            if (index > -1) {
                this.ores.splice(index, 1);
            }
            
            // Then destroy the ore
            closestOre.destroy();
            // Remove from scene
            //closestOre.removeFromScene();
            if (closestOre.mesh) {  
                this.scene.remove(closestOre.mesh);
            }
            
            // Update game stats through the singleton
            GameStats.oreMined(oreData.type, oreData.value);
            
            // Update HUD through game instance
            if (this.game && this.game.hud) {
                this.game.hud.updateResources(GameStats.getAllOresMined());
                this.game.hud.highlightOre(oreData.type);
            }
            
            // Play collection sound using the specific ore type method
            switch(oreData.type) {
                case 'iron':
                    soundManager.playIronOreRetrieved();
                    break;
                case 'copper':
                    soundManager.playCopperOreRetrieved();
                    break;
                case 'silver':
                    soundManager.playSilverOreRetrieved();
                    break;
                case 'gold':
                    soundManager.playGoldOreRetrieved();
                    break;
                case 'platinum':
                    soundManager.playPlatinumOreRetrieved();
                    break;
                default:
                    // If unknown type, fall back to iron
                    soundManager.playIronOreRetrieved();
                    break;
            }
            
            return oreData;
        }
        
        return null;
    }

    /**
     * Gets the ore position from its index
     * @param {number} index - The index in the ores array
     * @returns {THREE.Vector3|null} - The position or null if invalid
     */
    getOrePosition(index) {
        if (index >= 0 && index < this.ores.length && this.ores[index].mesh) {
            return this.ores[index].mesh.position;
        }
        return null;
    }

    /**
     * Clears all active ore instances.
     */
    clearAllOres() {
        // Get a copy of the array
        const oresToDestroy = [...this.ores];
        
        // Clear the array first
        this.ores = [];
        
        // Then destroy each ore
        for (const ore of oresToDestroy) {
            // remove from scene
            if (ore.mesh) {
                this.scene.remove(ore.mesh);
            }
            // remove from array
            this.ores.splice(this.ores.indexOf(ore), 1);
            ore.destroy();
        }
    }

    /**
     * Gets the total count of active ores.
     * @returns {number} The number of active ores.
     */
    getOreCount() {
        return this.ores.length;
    }

    /**
     * Legacy method for backward compatibility
     * @deprecated Use clearAllOres() instead
     */
}

// Create and export a singleton instance
const oreManager = new OreManager();
export default oreManager;
