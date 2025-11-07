/**
 * Global type definitions
 * Extends window object and defines global types
 */

import * as THREE from 'three';
import { Game } from '../game/Game';

declare global {
  interface Window {
    THREE: typeof THREE;
    game?: Game;
    io?: any; // Socket.IO client
    ENABLE_MULTIPLAYER?: boolean;
    GAME_INITIALIZING?: boolean;
    LEADERBOARD_PAGE?: boolean;
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, callback: (args?: any) => void) => void;
      request: (args: any) => Promise<any>;
    };
  }
}

export {};
