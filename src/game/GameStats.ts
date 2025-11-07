/**
 * GameStats.ts - Central source of truth for game statistics
 *
 * This class handles all game statistics tracking, score calculations,
 * and Firebase persistence. Other components should read from this class
 * rather than maintaining their own counters.
 */
import firebaseService from '../scripts/firebase-service.js';
import { ENEMY_TYPES } from '../objects/enemies/index.js';
import CollectibleConfig from '../objects/collectibles/CollectibleConfig.js';
import EnemyConfig from '../objects/enemies/EnemyConfig.js';
import gameSessionManager from '../managers/GameSessionManager.js';

interface CollectiblesMined {
  iron: number;
  copper: number;
  silver: number;
  gold: number;
  platinum: number;
}

interface EnemiesByType {
  [key: string]: number;
}

interface CurrentLevel {
  id: number;
  name: string;
}

interface SessionInfo {
  playerId: string;
  gameId: string;
  isCaptain: boolean;
  isCrew: boolean;
}

interface TimerState {
  total: number;
  remaining: number;
  elapsed: number;
}

interface GameStatsData {
  gameId: string | null;
  playerId: string;
  isCaptain: boolean;
  isCrew: boolean;
  crewUrl: string | null;
  score: number;
  asteroidsDestroyed: number;
  enemiesDestroyed: number;
  enemiesByType: EnemiesByType;
  shotsFired: number;
  collectiblesMined: CollectiblesMined;
  totalCollectiblesMined: number;
  level: CurrentLevel;
  gameTime: number;
  levelTimerTotal: number;
  levelTimerRemaining: number;
  currentLevelTime: number;
}

class GameStats {
  private score: number;
  private asteroidsDestroyed: number;
  private enemiesDestroyed: number;
  private shotsFired: number;
  private gameTime: number;
  private totalCollectiblesMined: number;
  private currentLevelTime: number;
  private levelTimerTotal: number;
  private levelTimerRemaining: number;
  private collectiblesMined: CollectiblesMined;
  private enemiesByType: EnemiesByType;
  private currentLevel: CurrentLevel;
  private initialized: boolean;
  private gameId: string | null;
  private fingerprintId!: string;
  private isCaptain!: boolean;
  private isCrew!: boolean;

  constructor() {
    this.score = 0;
    this.asteroidsDestroyed = 0;
    this.enemiesDestroyed = 0;
    this.shotsFired = 0;
    this.gameTime = 0;
    this.totalCollectiblesMined = 0;
    this.currentLevelTime = 0;
    this.levelTimerTotal = 0;
    this.levelTimerRemaining = 0;
    this.collectiblesMined = {
      iron: 0,
      copper: 0,
      silver: 0,
      gold: 0,
      platinum: 0
    };
    this.enemiesByType = {};
    this.currentLevel = { id: 1, name: "Level 1" };
    this.initialized = false;
    this.gameId = null;

    this.reset();
  }

  /**
   * Initialize the stats service
   * @param fingerprintId - The unique fingerprint ID for the player
   */
  async initialize(fingerprintId: string): Promise<any> {
    if (this.initialized) return;

    // Initialize the game session with the fingerprint
    const sessionInfo = gameSessionManager.initialize(fingerprintId) as SessionInfo;

    // Get data from the session manager
    this.fingerprintId = sessionInfo.playerId;
    this.gameId = sessionInfo.gameId;
    this.isCaptain = sessionInfo.isCaptain;
    this.isCrew = sessionInfo.isCrew;

    this.initialized = true;

    // Make stats globally available for debugging
    (window as any).GameStats = this;

    // Initialize Firebase connection
    return firebaseService.initialize();
  }

  /**
   * Reset all game statistics to default values
   */
  reset(): void {
    this.score = 0;
    this.asteroidsDestroyed = 0;
    this.enemiesDestroyed = 0;
    this.shotsFired = 0;
    this.gameTime = 0;
    this.totalCollectiblesMined = 0;

    // Reset timer-related state
    this.currentLevelTime = 0;
    this.levelTimerTotal = 0;
    this.levelTimerRemaining = 0;

    // Track collectibles by type
    this.collectiblesMined = {
      iron: 0,
      copper: 0,
      silver: 0,
      gold: 0,
      platinum: 0
    };

    // Track enemy kills by type using ENEMY_TYPES constants
    this.enemiesByType = {
      [ENEMY_TYPES.UFO]: 0,
      [ENEMY_TYPES.HUNTER]: 0,
      [ENEMY_TYPES.PATROLLER]: 0,
      [ENEMY_TYPES.TETRA]: 0,
      [ENEMY_TYPES.BOMBER]: 0
    };

    this.currentLevel = {
      id: 1,
      name: "Level 1"
    };
  }

  /**
   * Get the current score
   * @returns The current score
   */
  getScore(): number {
    return this.score;
  }

  /**
   * Record an asteroid being destroyed
   * @returns The updated count of asteroids destroyed
   */
  asteroidDestroyed(): number {
    this.asteroidsDestroyed++;
    return this.asteroidsDestroyed;
  }

  /**
   * Get the current asteroid destroy count
   * @returns The current count of asteroids destroyed
   */
  getAsteroidDestroyCount(): number {
    return this.asteroidsDestroyed;
  }

  /**
   * Record a shot being fired
   */
  shotFired(): void {
    this.shotsFired++;
  }

  /**
   * Record an enemy being destroyed
   * @param type - The type of enemy from ENEMY_TYPES constants
   */
  enemyDestroyed(type: string = ENEMY_TYPES.UFO): number {
    this.enemiesDestroyed++;

    if (this.enemiesByType[type] !== undefined) {
      this.enemiesByType[type]++;
    } else {
      console.warn(`Unknown enemy type destroyed: ${type}`);
      this.enemiesByType[ENEMY_TYPES.UFO]++;
    }

    return this.enemiesDestroyed;
  }

  /**
   * Get total enemies destroyed of a specific type
   * @param type - Enemy type from ENEMY_TYPES constants
   * @returns Total count of that enemy type destroyed
   */
  getEnemiesDestroyedByType(type: string): number {
    return this.enemiesByType[type] || 0;
  }

  /**
   * Get all enemies destroyed by type
   * @returns Counts of each enemy type destroyed
   */
  getAllEnemiesDestroyedByType(): EnemiesByType {
    return { ...this.enemiesByType };
  }

  /**
   * Get total enemies destroyed (all types)
   * @returns Total enemy count
   */
  getTotalEnemiesDestroyed(): number {
    return this.enemiesDestroyed;
  }

  /**
   * Get enemy score with level multiplier applied
   * @param levelMultiplier - The level's difficulty multiplier
   * @returns Total score value from enemies
   */
  getEnemiesScoreWithMultiplier(levelMultiplier: number = 1): number {
    const baseScore = 100;
    return this.enemiesDestroyed * baseScore * levelMultiplier;
  }

  /**
   * Record a collectible being mined
   * @param type - Type of collectible (iron, copper, silver, gold, platinum)
   * @param value - Value of the collectible mined
   */
  collectibleMined(type: keyof CollectiblesMined, value: number): number {
    if (this.collectiblesMined[type] === undefined) {
      console.warn(`Unknown collectible type: ${type}`);
      return 0;
    }

    this.collectiblesMined[type] += value;
    this.totalCollectiblesMined += value;

    return this.totalCollectiblesMined;
  }

  /**
   * Update the current level information
   * @param levelInfo - Level information object with id and name
   */
  updateLevel(levelInfo: CurrentLevel): void {
    this.currentLevel = {
      id: levelInfo.id,
      name: levelInfo.name
    };
  }

  /**
   * Update the game time
   * @param seconds - Additional game time in seconds to accumulate
   */
  updateGameTime(seconds: number): void {
    this.gameTime += seconds;
  }

  /**
   * Update the current level timer state
   * @param timerState - Current timer state from LevelManager
   */
  updateLevelTimerState(timerState: TimerState): void {
    this.levelTimerTotal = timerState.total;
    this.levelTimerRemaining = timerState.remaining;
    this.currentLevelTime = timerState.elapsed;
  }

  /**
   * Get total collectibles mined of a specific type
   * @param type - Collectible type
   * @returns Total count of that collectible type
   */
  getTotalMined(type: keyof CollectiblesMined): number {
    return this.collectiblesMined[type] || 0;
  }

  /**
   * Get the raw count of all collectibles mined
   * @returns Counts of each collectible type
   */
  getAllCollectiblesMined(): CollectiblesMined {
    return { ...this.collectiblesMined };
  }

  /**
   * Get score value of mined collectibles with level multipliers applied
   * @param levelMultiplier - The level's value multiplier
   * @returns Total score value of all mined collectibles
   */
  getCollectiblesScoreWithMultiplier(levelMultiplier: number = 1): number {
    let totalScore = 0;

    Object.entries(this.collectiblesMined).forEach(([type, count]) => {
      totalScore += count * levelMultiplier;
    });

    return totalScore;
  }

  /**
   * Calculate a total score based on game performance and multipliers from config
   * @returns Total score based on game performance
   */
  calculateTotalScore(): number {
    let totalScore = 0;

    // 1. Add asteroid count (each asteroid is worth 1 point)
    totalScore += this.asteroidsDestroyed || 0;

    // 2. Add collectible scores with their respective multipliers
    if (this.collectiblesMined) {
      Object.entries(this.collectiblesMined).forEach(([collectibleType, count]) => {
        if (count && typeof count === 'number') {
          const collectibleConfig = (CollectibleConfig as any).getCollectibleConfig(collectibleType);
          const multiplier = collectibleConfig?.multiplier || 1;
          totalScore += count * multiplier;
        }
      });
    }

    // 3. Add enemy scores with their respective multipliers
    if (this.enemiesByType) {
      Object.entries(this.enemiesByType).forEach(([enemyType, count]) => {
        if (count && typeof count === 'number') {
          const enemyConfig = (EnemyConfig as any).getEnemyConfig(enemyType);
          const multiplier = enemyConfig?.multiplier || 1;
          totalScore += count * multiplier;
        }
      });
    }

    return Math.round(totalScore);
  }

  /**
   * Get the current game statistics
   * @returns The current game statistics
   */
  getStats(): GameStatsData {
    const totalScore = this.calculateTotalScore();

    let crewUrl = null;
    if (this.isCaptain && gameSessionManager) {
      crewUrl = (gameSessionManager as any).getCrewUrl();
    }

    return {
      gameId: this.gameId,
      playerId: this.fingerprintId,
      isCaptain: this.isCaptain || false,
      isCrew: this.isCrew || false,
      crewUrl: crewUrl,
      score: totalScore,
      asteroidsDestroyed: this.asteroidsDestroyed || 0,
      enemiesDestroyed: this.enemiesDestroyed || 0,
      enemiesByType: this.enemiesByType ? { ...this.enemiesByType } : {},
      shotsFired: this.shotsFired || 0,
      collectiblesMined: this.collectiblesMined ? { ...this.collectiblesMined } : {
        iron: 0, copper: 0, silver: 0, gold: 0, platinum: 0
      },
      totalCollectiblesMined: this.totalCollectiblesMined || 0,
      level: this.currentLevel ? { ...this.currentLevel } : { id: 1, name: "Level 1" },
      gameTime: this.gameTime || 0,
      levelTimerTotal: this.levelTimerTotal || 0,
      levelTimerRemaining: this.levelTimerRemaining || 0,
      currentLevelTime: this.currentLevelTime || 0
    };
  }

  /**
   * Save the current game statistics to Firebase
   * @param eventType - The type of event that triggered the save
   * @returns A promise that resolves when the save is complete
   */
  async saveToFirebase(eventType: string = 'game_stats_update'): Promise<boolean> {
    try {
      if (!this.initialized || !this.fingerprintId) {
        console.warn('Cannot save game stats: GameStats not properly initialized');
        return false;
      }

      const stats = {
        ...this.getStats(),
        eventType: eventType
      };
      console.log('Saving game stats to Firebase:', stats);

      try {
        const totalScore = this.calculateTotalScore();
        await (firebaseService as any).trackEvent(eventType, {
          level_id: this.currentLevel?.id || 1,
          score: totalScore,
          asteroids_destroyed: this.asteroidsDestroyed,
          enemies_destroyed: this.enemiesDestroyed,
          enemies_ufo: this.enemiesByType[ENEMY_TYPES.UFO],
          enemies_hunter: this.enemiesByType[ENEMY_TYPES.HUNTER],
          enemies_patroller: this.enemiesByType[ENEMY_TYPES.PATROLLER],
          enemies_tetra: this.enemiesByType[ENEMY_TYPES.TETRA],
          shots_fired: this.shotsFired,
          total_collectibles_mined: this.totalCollectiblesMined,
          game_time_seconds: this.gameTime
        });
      } catch (analyticsError) {
        console.warn('Failed to track analytics event:', analyticsError);
      }

      const result = await (firebaseService as any).saveGameStats(this.fingerprintId, stats);
      return result;
    } catch (error) {
      console.error('Error saving game stats to Firebase:', error);
      return false;
    }
  }

  /**
   * Track game event - safely wrapped to prevent game crashes
   * @param eventName - Name of the event to track
   * @param additionalParams - Additional parameters to include
   */
  trackEvent(eventName: string, additionalParams: Record<string, any> = {}): boolean {
    try {
      if (!this.initialized) {
        console.warn('Cannot track event: GameStats not initialized');
        return false;
      }

      const eventParams = {
        level_id: this.currentLevel?.id || 1,
        score: this.calculateTotalScore(),
        ...additionalParams
      };

      (firebaseService as any).trackEvent(eventName, eventParams)
        .catch((error: any) => {
          console.warn(`Failed to track event '${eventName}':`, error);
        });

      return true;
    } catch (error) {
      console.warn(`Error in trackEvent '${eventName}':`, error);
      return false;
    }
  }
}

// Export a singleton instance
const gameStats = new GameStats();
export default gameStats;
