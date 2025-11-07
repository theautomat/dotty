/**
 * Game-specific type definitions
 */

import * as THREE from 'three';

// Game states
export enum GameState {
  LOADING = 'LOADING',
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  LEVEL_TRANSITION = 'LEVEL_TRANSITION',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GAME_COMPLETE = 'GAME_COMPLETE'
}

// Player state
export interface PlayerState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  lives: number;
  score: number;
  level: number;
}

// Game configuration
export interface GameConfig {
  world: {
    size: number;
    boundaryType: 'cube' | 'sphere';
  };
  player: {
    speed: number;
    rotationSpeed: number;
    maxHealth: number;
    maxShield: number;
    startingLives: number;
  };
  camera: {
    fov: number;
    near: number;
    far: number;
    followDistance: number;
  };
  physics: {
    gravity: number;
    friction: number;
  };
}

// Level configuration
export interface LevelConfig {
  level: number;
  name: string;
  asteroidCount: number;
  enemyCount: number;
  collectibleCount: number;
  bossType?: string;
  difficulty: number;
  timeLimit?: number;
}

// Game statistics
export interface GameStats {
  score: number;
  level: number;
  kills: number;
  collectiblesCollected: number;
  shotsFired: number;
  shotsHit: number;
  timePlayed: number;
  highScore: number;
}

// Power-up types
export enum PowerUpType {
  SHIELD = 'SHIELD',
  RAPID_FIRE = 'RAPID_FIRE',
  SPREAD_SHOT = 'SPREAD_SHOT',
  EXTRA_LIFE = 'EXTRA_LIFE',
  INVINCIBILITY = 'INVINCIBILITY'
}

// Power-up configuration
export interface PowerUpConfig {
  type: PowerUpType;
  duration: number;
  color: number;
  size: number;
  effect: string;
}

// Collectible types
export enum CollectibleType {
  GOLDEN_FRAGMENT = 'golden-fragment',
  CRYSTAL_SHARD = 'crystal-shard',
  ALIEN_ARTIFACT = 'alien-artifact'
}

// Collectible configuration
export interface CollectibleConfig {
  type: CollectibleType;
  name: string;
  points: number;
  color: number;
  size: number;
  rarity: 'common' | 'rare' | 'legendary';
}
