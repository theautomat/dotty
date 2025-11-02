/**
 * WorldUtils.js - Utility functions for world boundary and spatial operations
 * 
 * These functions provide common spatial operations that can be used
 * by any game object to check boundaries, distances, and other
 * world-related calculations.
 */

import GameConfig from '../game/GameConfig.js';

/**
 * Checks if a position is outside the world boundary
 * 
 * @param {THREE.Vector3} position - The position to check
 * @param {number} [extraMargin=0] - Optional additional margin beyond the default boundary margin
 * @returns {boolean} True if the position is outside the boundary
 */
export function isOutsideWorldBoundary(position, extraMargin = 0) {
  // Get world size and margin from GameConfig
  const halfWorldSize = GameConfig.world.size / 2;
  const margin = GameConfig.world.boundaryMargin + extraMargin;
  
  // Check if position exceeds boundaries on any axis
  // Using Math.abs to check both positive and negative directions
  return (
    Math.abs(position.x) > halfWorldSize + margin ||
    Math.abs(position.y) > halfWorldSize + margin ||
    Math.abs(position.z) > halfWorldSize + margin
  );
}

/**
 * Gets the distance from the position to the nearest world boundary
 * 
 * @param {THREE.Vector3} position - The position to check
 * @returns {number} The distance to the nearest boundary
 */
export function distanceToBoundary(position) {
  const halfWorldSize = GameConfig.world.size / 2;
  
  // Find the shortest distance to any boundary
  const distanceX = halfWorldSize - Math.abs(position.x);
  const distanceY = halfWorldSize - Math.abs(position.y);
  const distanceZ = halfWorldSize - Math.abs(position.z);
  
  // Return the minimum distance (closest boundary)
  return Math.min(distanceX, distanceY, distanceZ);
}

/**
 * Calculates what percentage of the world size the object has traversed
 * Useful for progressive effects as objects approach boundaries
 * 
 * @param {THREE.Vector3} position - The position to check
 * @returns {number} Value from 0-1 representing percentage to boundary (1 = at boundary)
 */
export function boundaryPercentage(position) {
  const halfWorldSize = GameConfig.world.size / 2;
  
  // Get the maximum percentage on any axis
  const percentX = Math.abs(position.x) / halfWorldSize;
  const percentY = Math.abs(position.y) / halfWorldSize;
  const percentZ = Math.abs(position.z) / halfWorldSize;
  
  // Return the maximum percentage (closest boundary)
  return Math.max(percentX, percentY, percentZ);
}

export default {
  isOutsideWorldBoundary,
  distanceToBoundary,
  boundaryPercentage
}; 