/**
 * GameObject.ts - Base class for all game objects
 *
 * Provides a consistent interface for object lifecycle management:
 * - Creation
 * - Updates
 * - Removal and memory cleanup
 */
import * as THREE from 'three';
import { isOutsideWorldBoundary } from '../utils/WorldUtils';

abstract class GameObject {
  protected scene: THREE.Scene;
  public mesh: THREE.Mesh | THREE.Group | null;
  public id: string;

  constructor(scene: THREE.Scene) {
    if (this.constructor === GameObject) {
      throw new Error("GameObject is an abstract class and cannot be instantiated directly");
    }

    this.scene = scene;
    this.mesh = null;

    // Generate a unique ID for this game object
    this.id = this.generateId();
  }

  /**
   * Generate a unique ID for this object
   * @returns A unique identifier
   */
  protected generateId(): string {
    const prefix = this.constructor.name.toLowerCase();
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Update the object's state for the current frame
   * @returns Whether the object should remain in the game
   */
  update(deltaTime: number): boolean {
    // Base implementation returns true (keep the object)
    // Should be overridden by subclasses
    return true;
  }

  /**
   * Check if this object is outside the world boundary
   * @param extraMargin - Optional extra margin to apply
   * @returns True if the object is outside the boundary
   */
  checkBoundaries(extraMargin: number = 0): void {
    if (!this.mesh) return;

    if (isOutsideWorldBoundary(this.mesh.position, extraMargin)) {
      this.destroy();
    }
  }

  /**
   * Destroy the object and clean up resources without removing from scene
   * Scene removal is now handled by the manager classes
   */
  destroy(): void {
    // Clean up resources but don't remove from scene
    if (this.mesh) {
      // Clean up geometry
      if ('geometry' in this.mesh && this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }

      // Clean up materials (handling both single and array cases)
      if ('material' in this.mesh && this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(material => material.dispose());
        } else {
          this.mesh.material.dispose();
        }
      }

      // Clear any references in userData
      if (this.mesh.userData) {
        this.mesh.userData = {};
      }

      // Note: We no longer remove from scene here
      // this.scene.remove(this.mesh) is handled by managers
    }
  }

  /**
   * Get the mesh for collision detection or rendering
   * @returns The object's mesh
   */
  getMesh(): THREE.Mesh | THREE.Group | null {
    return this.mesh;
  }

  /**
   * Get the position of the game object
   * @returns The object's position
   */
  getPosition(): THREE.Vector3 {
    return this.mesh ? this.mesh.position.clone() : new THREE.Vector3();
  }

  /**
   * Utility method to dispose all resources in an array of objects
   * @param objects - Array of objects with geometry and material
   */
  static disposeObjects(objects: THREE.Object3D[]): void {
    if (!objects || !Array.isArray(objects)) return;

    for (const obj of objects) {
      if (!obj) continue;

      // Remove from scene if it has a parent
      if (obj.parent) {
        obj.parent.remove(obj);
      }

      // Dispose geometry
      if ('geometry' in obj && obj.geometry) {
        (obj.geometry as THREE.BufferGeometry).dispose();
      }

      // Dispose material(s)
      if ('material' in obj && obj.material) {
        const material = obj.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) {
          material.forEach(mat => mat.dispose());
        } else {
          material.dispose();
        }
      }
    }
  }
}

export default GameObject;
