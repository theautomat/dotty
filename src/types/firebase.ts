/**
 * Firebase and database type definitions
 */

// Firebase config
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Game session data stored in Firebase
export interface GameSessionData {
  playerId: string;
  score: number;
  level: number;
  kills: number;
  collectiblesCollected: number;
  timePlayed: number;
  created: number; // timestamp
  version?: string;
}

// Leaderboard entry
export interface LeaderboardEntry {
  id: string;
  playerId: string;
  score: number;
  level: number;
  created: number;
  rank?: number;
}

// Player profile
export interface PlayerProfile {
  id: string;
  walletAddress?: string;
  fingerprint?: string;
  gamesPlayed: number;
  totalScore: number;
  highScore: number;
  totalTime: number;
  lastPlayed: number;
  achievements?: string[];
}

// Firebase service interface
export interface IFirebaseService {
  db: any; // Firestore instance
  initialized: boolean;

  saveGameSession(data: GameSessionData): Promise<string>;
  getLeaderboard(limit?: number): Promise<LeaderboardEntry[]>;
  getPlayerProfile(playerId: string): Promise<PlayerProfile | null>;
  updatePlayerProfile(playerId: string, data: Partial<PlayerProfile>): Promise<void>;
}
