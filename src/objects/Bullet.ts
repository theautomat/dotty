/**
 * Bullet.ts - Handles bullet logical representation
 * Visual representation is handled by BulletManager using instanced rendering
 */
import GameObject from './GameObject';
import * as THREE from 'three';
import GameConfig from '../game/GameConfig';
import BulletConfig from './BulletConfig';
import { isOutsideWorldBoundary } from '../utils/WorldUtils';

interface BulletParams {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  velocity?: THREE.Vector3 | null;
}

class Bullet extends GameObject {
  manager: any; // BulletManager when converted
  id: string;
  timeCreated: number;
  type: string;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  radius: number;
  velocity: THREE.Vector3;
  mesh: THREE.Object3D;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  lifeRemaining: number;
  instanceId: number | null;

  /**
   * Constructor for the logical Bullet object.
   *
   * @param manager - The BulletManager instance
   * @param params - Configuration parameters
   */
  constructor(manager: any, params: BulletParams) {
    super(null); // GameObject constructor with null scene (manager handles visuals)

    this.manager = manager;
    this.id = `bullet_${Math.random().toString(16).slice(2)}`;
    this.timeCreated = Date.now();

    // Set the type for collision detection
    this.type = 'bullet';

    // Position and physics properties
    this.position = params.position.clone();

    // Store direction for rotation
    this.direction = params.direction.clone().normalize();

    // Define bullet radius for collision detection - use the value from BulletConfig
    this.radius = BulletConfig.collisionRadius || 3.0;

    // Calculate bullet velocity by combining:
    // 1. The ship's velocity at the time of firing (inherited momentum)
    // 2. The bullet's own forward velocity based on direction
    this.velocity = new THREE.Vector3();

    // 1. Add the ship's velocity if provided (momentum inheritance)
    if (params.velocity) {
      this.velocity.copy(params.velocity);
    }

    // 2. Add the bullet's own directional velocity
    // Use the full speed from BulletConfig with no cap
    const bulletSpeed = BulletConfig.speed;
    const bulletDirectionalVelocity = this.direction.clone().multiplyScalar(bulletSpeed);
    this.velocity.add(bulletDirectionalVelocity);

    // Create a temporary mesh for backward compatibility
    // This will be a simple Object3D that has the position information but isn't rendered
    this.mesh = new THREE.Object3D();
    this.mesh.position.copy(this.position);

    // Set initial rotation to face the direction of travel
    this.setRotationFromDirection();

    // Bullet scale (use actual scale, not visual scale - will be adjusted per geometry)
    this.scale = new THREE.Vector3(1.0, 1.0, 1.0);

    // Bullet lifetime in seconds - get from config or use default
    this.lifeRemaining = BulletConfig.lifetime || 2.0;

    // Register with the manager
    this.instanceId = this.manager.addInstance(this);
  }

  /**
   * Calculate rotation to face the direction of travel
   */
  setRotationFromDirection(): void {
    // Create a rotation that aligns the bullet with its direction of travel
    // Start with default orientation
    this.rotation = new THREE.Euler();

    // If we have a valid direction
    if (this.direction && this.direction.lengthSq() > 0) {
      // Calculate rotation from default forward vector (0,0,-1) to our direction
      const targetQuaternion = new THREE.Quaternion();
      const defaultForward = new THREE.Vector3(0, 0, -1);

      // Find the rotation that aligns defaultForward with our direction
      const rotationAxis = new THREE.Vector3().crossVectors(defaultForward, this.direction).normalize();
      const angle = Math.acos(defaultForward.dot(this.direction));

      if (rotationAxis.lengthSq() > 0.001) {
        targetQuaternion.setFromAxisAngle(rotationAxis, angle);
        this.rotation.setFromQuaternion(targetQuaternion);
      }
    }
  }

  /**
   * Update bullet position and check if it should be removed
   * @param deltaTime - Time since last frame in seconds
   * @returns True if the bullet position changed
   */
  update(deltaTime: number): boolean {
    if (this.instanceId === null) return false; // Already removed

    // Move bullet forward with full velocity vector
    // The velocity has the full BulletConfig.speed applied in the constructor
    this.position.addScaledVector(this.velocity, deltaTime);

    // Update mesh position for backward compatibility
    if (this.mesh) {
      this.mesh.position.copy(this.position);
    }

    // PRIMARY CHECK: Check if exceeded world cubic boundaries
    // This is the most important check for performance
    if (isOutsideWorldBoundary(this.position)) {
      // Remove the bullet from the manager
      if (this.manager && this.instanceId !== null) {
        this.manager.removeBullet(this);
      }
      return false;
    }

    // SECONDARY CHECK: Decrement lifetime and check if expired
    this.lifeRemaining -= deltaTime;
    if (this.lifeRemaining <= 0) {
      // Remove the bullet from the manager
      if (this.manager && this.instanceId !== null) {
        this.manager.removeBullet(this);
      }
      return false;
    }

    // Bullet position has changed, return true
    return true;
  }

  /**
   * Destroy the bullet when it hits something
   * This follows the pattern where destroy() is for game-logic destruction
   * (like being hit by something) while remove() is for cleanup
   */
  destroy(): void {
    // Implement any special effects here (like particle effects)

    // Remove the bullet from the manager
    if (this.manager && this.instanceId !== null) {
      this.manager.removeBullet(this);
    }
  }

  /**
   * Create a bullet model for display purposes (used for UI)
   * @param isActive - Whether the charge slot is active or depleted
   * @param isHUD - Whether this bullet is for HUD display
   * @returns The bullet model
   */
  static createBulletModel(isActive: boolean = true, isHUD: boolean = false): THREE.Mesh {
    let size: number;
    let material: THREE.MeshBasicMaterial;

    if (isHUD) {
      // Use HUD-specific settings from BulletConfig
      // For HUD bullets, we want a perfect cube with all sides equal
      size = BulletConfig.hudBullet?.size || 3.0;

      // Create material with wireframe for HUD bullets
      material = new THREE.MeshBasicMaterial({
        color: BulletConfig.color || 0x00ff00,
        wireframe: BulletConfig.hudBullet?.wireframe || true,
        transparent: true,
        opacity: isActive ? (BulletConfig.hudBullet?.opacity || 0.8) : 0.1,
        // Ensure lines are visible on wireframe
        wireframeLinewidth: 1
      });
    } else {
      // Use regular bullet settings for non-HUD bullets
      // Use BulletConfig size but scaled down a bit for UI (or hardcoded 2.0 as fallback)
      size = BulletConfig.size ? BulletConfig.size * 0.8 : 2.0;

      // Create material for regular bullets
      material = new THREE.MeshBasicMaterial({
        color: BulletConfig.color || 0x00ff00, // Use bullet config color if available
        wireframe: false,
        transparent: true,
        opacity: isActive ? 0.9 : 0.0 // Almost fully opaque when active
      });
    }

    // Create geometry with appropriate size - perfect cube with equal dimensions
    const geometry = new THREE.BoxGeometry(size, size, size);

    // Create and return the mesh
    return new THREE.Mesh(geometry, material);
  }
}

export default Bullet;
