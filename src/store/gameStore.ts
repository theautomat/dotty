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

interface InputState {
  // Directional keys
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;

  // Action keys
  space: boolean;
  shift: boolean;
  escape: boolean;

  // Utility keys
  h: boolean; // Help
  g: boolean; // Grid
  l: boolean; // Log
  r: boolean; // Render toggle
}

interface GameState {
  // Map state
  mapReady: boolean;
  gridPosition: GridPosition;

  // Input state
  inputs: InputState;

  // Actions
  setMapReady: (ready: boolean) => void;
  setGridPosition: (x: number, y: number) => void;
  setInput: (key: keyof InputState, pressed: boolean) => void;
  resetInputs: () => void;
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
  inputs: {
    up: false,
    down: false,
    left: false,
    right: false,
    space: false,
    shift: false,
    escape: false,
    h: false,
    g: false,
    l: false,
    r: false,
  },

  // Actions
  setMapReady: (ready) => set({ mapReady: ready }),
  setGridPosition: (x, y) => set({ gridPosition: { x, y } }),
  setInput: (key, pressed) =>
    set((state) => ({
      inputs: { ...state.inputs, [key]: pressed },
    })),
  resetInputs: () =>
    set({
      inputs: {
        up: false,
        down: false,
        left: false,
        right: false,
        space: false,
        shift: false,
        escape: false,
        h: false,
        g: false,
        l: false,
        r: false,
      },
    }),
}));

// Export a non-hook version for use in non-React code
export const gameStore = useGameStore;

// Export types for use in other modules
export type { InputState, GridPosition };
