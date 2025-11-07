/**
 * Game object type definitions
 */

import * as THREE from 'three';

// Base game object interface
export interface IGameObject {
  mesh: THREE.Mesh | THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  health: number;
  maxHealth: number;
  active: boolean;

  update(deltaTime: number): void;
  takeDamage(damage: number): void;
  destroy(): void;
}

// Enemy types
export enum EnemyType {
  HUNTER = 'HUNTER',
  PATROLLER = 'PATROLLER',
  TETRA = 'TETRA',
  UFO = 'UFO',
  HEAT_SEEKING_MINE = 'HEAT_SEEKING_MINE',
  BOSS = 'BOSS',
  SPHERE_BOSS = 'SPHERE_BOSS'
}

// Enemy configuration
export interface EnemyConfig {
  type: EnemyType;
  health: number;
  speed: number;
  damage: number;
  points: number;
  color: number;
  size: number;
  attackRange?: number;
  fireRate?: number;
}

// Bullet configuration
export interface BulletConfig {
  speed: number;
  damage: number;
  lifetime: number;
  size: number;
  color: number;
  trail?: boolean;
}

// Asteroid types
export interface AsteroidConfig {
  size: 'small' | 'medium' | 'large';
  health: number;
  speed: number;
  points: number;
  color: number;
  radius: number;
}

// Collision data
export interface CollisionData {
  object1: IGameObject;
  object2: IGameObject;
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

// Explosion data
export interface ExplosionData {
  position: THREE.Vector3;
  size: number;
  color: number;
  fragmentCount: number;
  duration: number;
}
