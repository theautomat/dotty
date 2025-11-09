/**
 * InputController.ts - Generic input handler that broadcasts user inputs
 *
 * This controller captures raw keyboard and gamepad inputs and publishes them
 * to the Zustand store. It doesn't contain any game logic - it's purely
 * responsible for input capture and state management.
 *
 * Components that need input (like GridNavigator, HelpMenu, etc.) can subscribe
 * to the input state in the store and react accordingly.
 */

import { gameStore, type InputState } from '../store/gameStore';

interface InputControllerConfig {
  enableKeyboard?: boolean;
  enableGamepad?: boolean;
  enableWheel?: boolean; // Enable mouse wheel zoom
  preventDefaults?: boolean; // Prevent default browser behavior for game keys
}

class InputController {
  private config: InputControllerConfig;
  private keyboardListenersAttached: boolean = false;
  private gamepadListenersAttached: boolean = false;
  private wheelListenersAttached: boolean = false;

  // Keyboard event handlers (stored as class properties so we can remove them)
  private handleKeyDown: (event: KeyboardEvent) => void;
  private handleKeyUp: (event: KeyboardEvent) => void;
  private handleBlur: () => void;
  private handleWheel: (event: WheelEvent) => void;

  constructor(config: InputControllerConfig = {}) {
    this.config = {
      enableKeyboard: config.enableKeyboard ?? true,
      enableGamepad: config.enableGamepad ?? false,
      enableWheel: config.enableWheel ?? true,
      preventDefaults: config.preventDefaults ?? true,
    };

    // Bind event handlers to this instance
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleKeyUp = this.onKeyUp.bind(this);
    this.handleBlur = this.onBlur.bind(this);
    this.handleWheel = this.onWheel.bind(this);
  }

  /**
   * Initialize the input controller and attach event listeners
   */
  init(): void {
    if (this.config.enableKeyboard && !this.keyboardListenersAttached) {
      this.setupKeyboardListeners();
      this.keyboardListenersAttached = true;
    }

    if (this.config.enableGamepad && !this.gamepadListenersAttached) {
      this.setupGamepadListeners();
      this.gamepadListenersAttached = true;
    }

    if (this.config.enableWheel && !this.wheelListenersAttached) {
      this.setupWheelListeners();
      this.wheelListenersAttached = true;
    }

    console.log('InputController initialized', this.config);
  }

  /**
   * Setup keyboard event listeners
   */
  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  /**
   * Handle keydown events and update the store
   */
  private onKeyDown(event: KeyboardEvent): void {
    const inputKey = this.mapKeyCodeToInput(event.code);

    if (inputKey) {
      // Prevent default browser behavior for game keys
      if (this.config.preventDefaults) {
        event.preventDefault();
      }

      const currentState = gameStore.getState().inputs[inputKey];

      // Only update if the state is changing (prevents repeated keydown events)
      if (!currentState) {
        gameStore.getState().setInput(inputKey, true);
      }
    }
  }

  /**
   * Handle keyup events and update the store
   */
  private onKeyUp(event: KeyboardEvent): void {
    const inputKey = this.mapKeyCodeToInput(event.code);

    if (inputKey) {
      gameStore.getState().setInput(inputKey, false);
    }
  }

  /**
   * Handle window blur - reset all inputs when window loses focus
   * This prevents stuck keys when alt-tabbing or switching windows
   */
  private onBlur(): void {
    gameStore.getState().resetInputs();
  }

  /**
   * Setup mouse wheel event listeners
   */
  private setupWheelListeners(): void {
    window.addEventListener('wheel', this.handleWheel, { passive: true });
  }

  /**
   * Handle wheel events and broadcast to store
   */
  private onWheel(event: WheelEvent): void {
    // Broadcast the zoom delta to the store
    gameStore.getState().setZoomDelta(event.deltaY);
  }

  /**
   * Map keyboard codes to input state keys
   * Supports both WASD and arrow keys for directional input
   */
  private mapKeyCodeToInput(code: string): keyof InputState | null {
    switch (code) {
      // Directional inputs - WASD
      case 'KeyW':
      case 'ArrowUp':
        return 'up';
      case 'KeyS':
      case 'ArrowDown':
        return 'down';
      case 'KeyA':
      case 'ArrowLeft':
        return 'left';
      case 'KeyD':
      case 'ArrowRight':
        return 'right';

      // Action keys
      case 'Space':
        return 'space';
      case 'ShiftLeft':
      case 'ShiftRight':
        return 'shift';
      case 'Escape':
        return 'escape';

      // Utility keys
      case 'KeyH':
        return 'h';
      case 'KeyG':
        return 'g';
      case 'KeyL':
        return 'l';
      case 'KeyR':
        return 'r';

      default:
        return null;
    }
  }

  /**
   * Setup gamepad listeners (for future implementation)
   */
  private setupGamepadListeners(): void {
    // TODO: Implement gamepad support
    console.log('Gamepad support not yet implemented');
  }

  /**
   * Update method - call this in the game loop if needed
   * (Useful for gamepad polling or other continuous input processing)
   */
  update(deltaTime: number = 0.016): void {
    if (this.config.enableGamepad) {
      // TODO: Poll gamepad state here
    }
  }

  /**
   * Cleanup - remove event listeners and reset state
   */
  destroy(): void {
    if (this.keyboardListenersAttached) {
      document.removeEventListener('keydown', this.handleKeyDown);
      document.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleBlur);
      this.keyboardListenersAttached = false;
    }

    if (this.wheelListenersAttached) {
      window.removeEventListener('wheel', this.handleWheel);
      this.wheelListenersAttached = false;
    }

    // Reset all inputs
    gameStore.getState().resetInputs();

    console.log('InputController destroyed');
  }

  /**
   * Get the current input state snapshot
   */
  getInputState() {
    return gameStore.getState().inputs;
  }
}

export default InputController;
