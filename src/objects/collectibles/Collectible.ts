/**
 * Collectible.ts - Handles the behavior of collectibles in the game
 */
import * as THREE from 'three';
import GameObject from '../GameObject';
import GeometryFactory from '../shapes/GeometryFactory.js';
import CollectibleConfig from './CollectibleConfig';
import GameConfig from '../../game/GameConfig';

interface CollectibleParams {
  size?: number;
  color?: number;
  lifetime?: number;
  wrapDistance?: number;
  rotationSpeed?: number;
}

class Collectible extends GameObject {
  type: string;
  value: number;
  position: THREE.Vector3;
  params: {
    size: number;
    color: number;
    lifetime: number;
    wrapDistance: number;
    rotationSpeed: number;
  };
  age: number;
  collected: boolean;
  lastLogTime: number;
  logInterval: number;
  velocity: THREE.Vector3;

  /**
   * Create a new collectible
   * @param scene - The THREE.js scene
   * @param position - Position to spawn the collectible
   * @param type - Type of collectible (determines appearance and value)
   * @param value - Value of the collectible
   * @param params - Additional parameters
   */
  constructor(scene: THREE.Scene | null, position: THREE.Vector3, type: string = 'common', value: number = 1, params: CollectibleParams = {}) {
    super(scene);

    // Store the type and value
    this.type = type;
    this.value = value;

    // Store the position (clone to avoid reference issues)
    this.position = position.clone();

    // Get configuration for this collectible type
    const config = CollectibleConfig.getCollectibleConfig(type);

    // Default parameters with overrides from config and params
    this.params = {
      size: params.size || (config ? config.size : 1.0),
      color: params.color || (config ? config.color : 0xCCCCCC),
      lifetime: params.lifetime || 10000, // 10 seconds by default
      wrapDistance: params.wrapDistance || GameConfig.world.wrapDistance,
      rotationSpeed: params.rotationSpeed || 0.01
    };

    // Set up the initial state
    this.age = 0;
    this.collected = false;

    // Add throttled logging properties
    this.lastLogTime = 0;
    this.logInterval = 250 + (Math.random() * 25); // 250ms + random 0-25ms

    // Set up velocity for movement
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05
    );

    // Create the visual representation
    this.createCollectibleMesh();
  }

  /**
   * Create the collectible's visual representation
   */
  createCollectibleMesh(): void {
    // Get collectible options based on type
    const options = CollectibleConfig.getCollectibleConfig(this.type);

    // Create the mesh using the factory
    this.mesh = GeometryFactory.createCollectibleMesh(this.type, 'collectible', {
      size: this.params.size,
      color: this.params.color
    });

    // Apply position
    this.mesh.position.copy(this.position);

    // Reference back to this instance
    this.mesh.userData.collectibleInstance = this;

    // Add to scene
    if (this.scene) {
      this.scene.add(this.mesh);
    }
  }

  /**
   * Update the collectible's state
   * @param deltaTime - Delta time in milliseconds
   * @returns Whether the collectible is still active
   */
  update(deltaTime: number): boolean {
    if (this.collected || !this.mesh) return false;

    // Update age and check if expired
    this.age += deltaTime;
    if (this.age > this.params.lifetime) {
      this.remove();
      return false;
    }

    // DOTTY: Disable collectible movement for top-down 2D game
    // this.mesh.position.add(this.velocity);

    // Apply rotation for visual appeal
    this.mesh.rotation.x += this.params.rotationSpeed;
    this.mesh.rotation.y += this.params.rotationSpeed * 0.7;

    // Check if collectible has gone beyond wrap distance
    if (this.mesh.position.length() > this.params.wrapDistance) {
      // Wrap it back around
      const direction = this.mesh.position.clone().normalize();
      const newPosition = direction.multiplyScalar(-this.params.wrapDistance * 0.9);
      this.mesh.position.copy(newPosition);
    }

    // Make collectible fade out as it ages
    if (this.age > this.params.lifetime * 0.7) {
      const opacity = 1 - ((this.age - (this.params.lifetime * 0.7)) / (this.params.lifetime * 0.3));

      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach((mat: THREE.Material) => {
            if (mat instanceof THREE.MeshBasicMaterial || mat instanceof THREE.MeshStandardMaterial) {
              mat.opacity = opacity;
              mat.transparent = true;
            }
          });
        } else {
          const material = this.mesh.material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
          material.opacity = opacity;
          material.transparent = true;
        }
      }
    }

    return true;
  }

  /**
   * Check if the collectible is collectible
   * @returns Whether the collectible can be collected
   */
  checkCollection(): boolean {
    return !this.collected && this.mesh !== null;
  }

  /**
   * Collect this collectible
   */
  collect(): void {
    if (this.collected) return;

    this.collected = true;
    this.destroy();
  }

  /**
   * Destroy this collectible and clean up resources
   */
  destroy(): void {
    // Call parent destroy for common cleanup
    super.destroy();
  }

  /**
   * Get the collectible's value
   * @returns Collectible value
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Get the collectible's type
   * @returns Collectible type
   */
  getType(): string {
    return this.type;
  }

  /**
   * Create a collectible at the given position
   * @param scene - THREE.js scene
   * @param position - Position to create the collectible
   * @param type - Collectible type
   * @param value - Collectible value
   * @param params - Additional parameters
   * @returns Created collectible instance
   */
  static create(scene: THREE.Scene | null, position: THREE.Vector3, type: string = 'common', value: number = 1, params: CollectibleParams = {}): Collectible {
    return new Collectible(scene, position, type, value, {
      ...params,
      wrapDistance: GameConfig.world.wrapDistance,
      size: params.size || 0.8,
      lifetime: params.lifetime || 5000 // 5 seconds by default
    });
  }
}

export default Collectible;
