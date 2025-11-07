/**
 * Manager interface type definitions
 */

import * as THREE from 'three';
import { IGameObject } from './objects';

// Base manager interface
export interface IManager {
  init(scene: THREE.Scene): void;
  update(deltaTime: number): void;
  reset(): void;
  destroy(): void;
}

// Instance manager interface (for object pooling)
export interface IInstanceManager<T extends IGameObject> extends IManager {
  instances: T[];
  activeCount: number;

  spawn(position: THREE.Vector3, ...args: any[]): T | null;
  despawn(instance: T): void;
  getActive(): T[];
  getInactive(): T[];
  clear(): void;
}

// Sound types
export enum SoundType {
  SHOOT = 'shoot',
  EXPLOSION = 'explosion',
  COLLECT = 'collect',
  POWERUP = 'powerup',
  DAMAGE = 'damage',
  DEATH = 'death',
  LEVEL_UP = 'level_up',
  GAME_OVER = 'game_over',
  THEME = 'theme',
  MENU = 'menu'
}

// Sound manager interface
export interface ISoundManager extends IManager {
  play(sound: SoundType, volume?: number): void;
  stop(sound: SoundType): void;
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unmute(): void;
}

// Level manager interface
export interface ILevelManager extends IManager {
  currentLevel: number;
  maxLevel: number;

  loadLevel(level: number): void;
  nextLevel(): void;
  restartLevel(): void;
  isLevelComplete(): boolean;
}

// Collision manager interface
export interface ICollisionManager extends IManager {
  checkCollision(obj1: IGameObject, obj2: IGameObject): boolean;
  checkSphereCollision(
    pos1: THREE.Vector3,
    radius1: number,
    pos2: THREE.Vector3,
    radius2: number
  ): boolean;
}
