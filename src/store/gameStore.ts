/**
 * gameStore.ts - Centralized Zustand store for game state management
 *
 * This store replaces the event-based system with a clean, scalable state management solution.
 * Components can subscribe to specific state changes, and classes can update state directly.
 */

import { create } from 'zustand';

interface GridPosition {
  x: number;
  y: number;
}

interface GameState {
  // Map state
  mapReady: boolean;
  gridPosition: GridPosition;

  // Actions
  setMapReady: (ready: boolean) => void;
  setGridPosition: (x: number, y: number) => void;
}

/**
 * Main game store using Zustand
 *
 * Usage in React components:
 *   const gridPosition = useGameStore((state) => state.gridPosition);
 *
 * Usage in vanilla JS/TS:
 *   useGameStore.getState().setGridPosition(10, 20);
 */
export const useGameStore = create<GameState>((set) => ({
  // Initial state
  mapReady: false,
  gridPosition: { x: 50, y: 50 }, // Start at center of 100x100 grid

  // Actions
  setMapReady: (ready) => set({ mapReady: ready }),
  setGridPosition: (x, y) => set({ gridPosition: { x, y } }),
}));

// Export a non-hook version for use in non-React code
export const gameStore = useGameStore;
