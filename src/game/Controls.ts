/**
 * Controls.ts - Handles player input and movement
 *
 * This class encapsulates player input handling, movement physics,
 * and camera control for the game.
 *
 * Features:
 * - Keyboard and mouse input
 * - Mobile touch controls with virtual joysticks
 * - Sound integration
 * - Movement physics
 */

import * as THREE from 'three';
import gameStateMachine, { GAME_STATES } from './GameStateMachine';
import soundManager from '../managers/SoundManager.js';
import { toggleHelpMenu as togglePreactHelpMenu } from '../components/HelpMenu.js';
import GameConfig from './GameConfig';
import bulletManager from '../managers/BulletManager.js';

interface ControlsParams {
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  player?: THREE.Object3D | null;
  shootCallback?: () => void;
  helpToggleCallback?: () => void;
  hudClickCallback?: (() => boolean) | null;
  worldBoundaryToggleCallback?: () => void;
  gameStateMachine: typeof gameStateMachine;
  hud?: any;
  options?: {
    mouseSensitivity?: number;
    maxSpeed?: number;
    acceleration?: number;
    deceleration?: number;
    drag?: number;
    developmentMode?: boolean;
  };
}

declare global {
  interface Window {
    nipplejs?: any;
    gameStats?: any;
    game?: any;
  }
}

class Controls {
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private player: THREE.Object3D | null;
  private helpToggleCallback: () => void;
  private hudClickCallback: (() => boolean) | null;
  private worldBoundaryToggleCallback: () => void;
  private gameStateMachine: typeof gameStateMachine;
  private hud: any;

  public velocity: THREE.Vector3;
  private moveForward: boolean;
  private moveBackward: boolean;
  private strafeLeft: boolean;
  private strafeRight: boolean;

  private wKeyReleased: boolean;
  private sKeyReleased: boolean;
  private aKeyReleased: boolean;
  private dKeyReleased: boolean;

  private isPointerLocked: boolean;
  private mouseSensitivity: number;

  private MAX_SPEED: number;
  private ACCELERATION: number;
  private DECELERATION: number;
  private DRAG: number;
  private DEVELOPMENT_MODE: boolean;

  private helpMenuVisible: boolean;

  private moveJoystick: any;
  private lookJoystick: any;
  private isMobile: boolean;

  constructor(params: ControlsParams) {
    this.camera = params.camera;
    this.renderer = params.renderer;
    this.player = params.player || null;
    this.helpToggleCallback = params.helpToggleCallback || (() => {});
    this.hudClickCallback = params.hudClickCallback || null;
    this.worldBoundaryToggleCallback = params.worldBoundaryToggleCallback || (() => {});
    this.gameStateMachine = params.gameStateMachine;
    this.hud = params.hud || null;

    this.velocity = new THREE.Vector3(0, 0, 0);
    this.moveForward = false;
    this.moveBackward = false;
    this.strafeLeft = false;
    this.strafeRight = false;

    this.wKeyReleased = true;
    this.sKeyReleased = true;
    this.aKeyReleased = true;
    this.dKeyReleased = true;

    this.isPointerLocked = false;
    this.mouseSensitivity = params.options?.mouseSensitivity || 0.002;

    this.MAX_SPEED = params.options?.maxSpeed || GameConfig.ship.maxSpeed;
    this.ACCELERATION = params.options?.acceleration || GameConfig.ship.acceleration;
    this.DECELERATION = params.options?.deceleration || GameConfig.ship.deceleration;
    this.DRAG = params.options?.drag || GameConfig.ship.drag;
    this.DEVELOPMENT_MODE = params.options?.developmentMode || false;

    this.helpMenuVisible = false;

    this.moveJoystick = null;
    this.lookJoystick = null;
    this.isMobile = this.detectMobile();

    if (this.isMobile) {
      this.MAX_SPEED = this.MAX_SPEED * 0.8;
      this.ACCELERATION = this.ACCELERATION * 0.7;
      this.mouseSensitivity = this.mouseSensitivity * 0.7;

      if (this.renderer && this.renderer.getPixelRatio() > 1) {
        this.renderer.setPixelRatio(1);
      }
    }

    this.setupControls();

    if (this.isMobile) {
      this.loadNippleJs().then(() => {
        this.setupMobileControls();
        console.log('Nipple.js loaded and mobile controls initialized');
      }).catch(error => {
        console.error('Failed to load Nipple.js:', error);
      });
    }

    if (this.gameStateMachine) {
      this.gameStateMachine.addListener((newState) => {
        if (newState === GAME_STATES.GAME_OVER || newState === GAME_STATES.COMPLETE) {
          if (document.pointerLockElement === this.renderer.domElement) {
            document.exitPointerLock();
            console.log("[CONTROLS] Releasing pointer lock due to game over");
          }
        }
      });
    }
  }

  detectMobile(): boolean {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return isMobileDevice || hasTouchScreen;
  }

  loadNippleJs(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window.nipplejs !== 'undefined') {
        console.log('Nipplejs already loaded');
        resolve();
        return;
      }

      console.log('Loading nipplejs library...');
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/nipplejs@0.10.2/dist/nipplejs.min.js';
      script.onload = () => {
        console.log('Nipplejs library loaded successfully');
        resolve();
      };
      script.onerror = (error) => {
        console.error('Failed to load Nipplejs library:', error);
        reject(new Error('Failed to load Nipplejs library'));
      };
      document.head.appendChild(script);
    });
  }

  setupControls(): void {
    document.addEventListener('keydown', (event) => {
      if (gameStateMachine.shouldLockControls()) {
        if (event.code === 'KeyH' || event.code === 'Escape' || event.code === 'KeyL' || event.code === 'KeyG') {
          // Allow these through
        } else {
          return;
        }
      }

      switch (event.code) {
        case 'KeyW':
          this.moveForward = true;
          if (this.wKeyReleased) {
            soundManager.playThrusterForward();
            this.wKeyReleased = false;
          }
          break;
        case 'KeyS':
          this.moveBackward = true;
          if (this.sKeyReleased) {
            soundManager.playThrusterReverse();
            this.sKeyReleased = false;
          }
          break;
        case 'KeyA':
          this.strafeLeft = true;
          if (this.aKeyReleased) {
            soundManager.playThrusterStrafe();
            this.aKeyReleased = false;
          }
          break;
        case 'KeyD':
          this.strafeRight = true;
          if (this.dKeyReleased) {
            soundManager.playThrusterStrafe();
            this.dKeyReleased = false;
          }
          break;
        case 'Space':
          this.handleShoot();
          break;
        case 'KeyH':
        case 'Escape':
          this.toggleHelpMenu();
          break;
        case 'KeyG':
          this.worldBoundaryToggleCallback();
          break;
        case 'KeyL':
          if (window.gameStats) {
            console.log('=== GAME STATS LOG ===');
            console.log(window.gameStats.getStats());
            console.log('=====================');
          }
          break;
        case 'KeyR':
          if (window.game && typeof window.game.toggleAsciiEffect === 'function') {
            window.game.toggleAsciiEffect();
          }
          break;
      }
    });

    document.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'KeyW':
          this.moveForward = false;
          this.wKeyReleased = true;
          break;
        case 'KeyS':
          this.moveBackward = false;
          this.sKeyReleased = true;
          break;
        case 'KeyA':
          this.strafeLeft = false;
          this.aKeyReleased = true;
          break;
        case 'KeyD':
          this.strafeRight = false;
          this.dKeyReleased = true;
          break;
      }
    });

    document.addEventListener('mousemove', (event) => {
      if (gameStateMachine.shouldLockControls()) {
        return;
      }

      if (document.pointerLockElement === this.renderer.domElement) {
        const xQuat = new THREE.Quaternion();
        const yQuat = new THREE.Quaternion();

        const rightVector = new THREE.Vector3(1, 0, 0);
        rightVector.applyQuaternion((this.camera as THREE.PerspectiveCamera).quaternion);

        const upVector = new THREE.Vector3(0, 1, 0);
        upVector.applyQuaternion((this.camera as THREE.PerspectiveCamera).quaternion);

        yQuat.setFromAxisAngle(upVector, -event.movementX * this.mouseSensitivity);
        xQuat.setFromAxisAngle(rightVector, -event.movementY * this.mouseSensitivity);

        (this.camera as THREE.PerspectiveCamera).quaternion.multiplyQuaternions(yQuat, (this.camera as THREE.PerspectiveCamera).quaternion);
        (this.camera as THREE.PerspectiveCamera).quaternion.multiplyQuaternions(xQuat, (this.camera as THREE.PerspectiveCamera).quaternion);
        (this.camera as THREE.PerspectiveCamera).quaternion.normalize();
      }
    });

    document.addEventListener('click', () => {
      if (this.hudClickCallback) {
        try {
          const hudHandled = this.hudClickCallback();
          if (hudHandled) {
            return;
          }
        } catch (error) {
          console.error("[CONTROLS] Error in HUD click handler:", error);
        }
      }

      if (gameStateMachine.isInState(GAME_STATES.MENU)) {
        console.log("[CONTROLS] In MENU state, checking if waiting for click");
        return;
      }

      if (gameStateMachine.shouldLockControls()) {
        console.log("[CONTROLS] Controls locked, ignoring click");
        return;
      }

      if (!document.pointerLockElement) {
        console.log("[CONTROLS] Requesting pointer lock");
        this.renderer.domElement.requestPointerLock();
        setTimeout(() => {
          if (!gameStateMachine.shouldLockControls()) {
            this.handleShoot();
          }
        }, 50);
      } else {
        this.handleShoot();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      const wasLocked = this.isPointerLocked;
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;

      const crosshair = document.getElementById('crosshair');
      if (crosshair) {
        crosshair.style.display = this.isPointerLocked ? 'block' : 'none';
      }

      if (!wasLocked && this.isPointerLocked) {
        setTimeout(() => this.handleShoot(), 50);
      }
    });
  }

  setupMobileControls(): void {
    console.log('Setting up mobile controls');

    if (typeof window.nipplejs === 'undefined') {
      console.error('Nipplejs library not loaded');
      this.loadNippleJs().then(() => {
        setTimeout(() => this.setupMobileControls(), 100);
      }).catch(error => {
        console.error('Failed to load Nipplejs on retry:', error);
      });
      return;
    }

    this.disposeMobileControls();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isLandscape = viewportWidth > viewportHeight;

    const joystickSize = Math.min(viewportWidth, viewportHeight) * 0.25;
    const joystickMargin = isLandscape ? 30 : 20;

    // Movement joystick (left side)
    const moveContainer = document.createElement('div');
    moveContainer.id = 'move-joystick-container';
    moveContainer.style.cssText = `
      position: fixed;
      bottom: ${joystickMargin}px;
      left: ${joystickMargin}px;
      width: ${joystickSize}px;
      height: ${joystickSize}px;
      z-index: 1000;
      pointer-events: auto;
    `;
    document.body.appendChild(moveContainer);

    this.moveJoystick = window.nipplejs.create({
      zone: moveContainer,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'rgba(255, 255, 255, 0.5)',
      size: joystickSize
    });

    this.moveJoystick.on('move', (evt: any, data: any) => {
      if (gameStateMachine.shouldLockControls()) return;

      const angle = data.angle.radian;
      const force = Math.min(data.force, 2) / 2;

      this.moveForward = false;
      this.moveBackward = false;
      this.strafeLeft = false;
      this.strafeRight = false;

      const forwardComponent = Math.cos(angle);
      const strafeComponent = Math.sin(angle);

      if (Math.abs(forwardComponent) > 0.3) {
        if (forwardComponent > 0) {
          this.moveBackward = true;
        } else {
          this.moveForward = true;
        }
      }

      if (Math.abs(strafeComponent) > 0.3) {
        if (strafeComponent > 0) {
          this.strafeLeft = true;
        } else {
          this.strafeRight = true;
        }
      }
    });

    this.moveJoystick.on('end', () => {
      this.moveForward = false;
      this.moveBackward = false;
      this.strafeLeft = false;
      this.strafeRight = false;
    });

    // Look joystick (right side)
    const lookContainer = document.createElement('div');
    lookContainer.id = 'look-joystick-container';
    lookContainer.style.cssText = `
      position: fixed;
      bottom: ${joystickMargin}px;
      right: ${joystickMargin}px;
      width: ${joystickSize}px;
      height: ${joystickSize}px;
      z-index: 1000;
      pointer-events: auto;
    `;
    document.body.appendChild(lookContainer);

    this.lookJoystick = window.nipplejs.create({
      zone: lookContainer,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'rgba(255, 100, 100, 0.5)',
      size: joystickSize
    });

    const mobileSensitivity = this.mouseSensitivity * 2;

    this.lookJoystick.on('move', (evt: any, data: any) => {
      if (gameStateMachine.shouldLockControls()) return;

      const angle = data.angle.radian;
      const force = Math.min(data.force, 2) / 2;

      const deltaX = Math.sin(angle) * force * mobileSensitivity * 10;
      const deltaY = -Math.cos(angle) * force * mobileSensitivity * 10;

      const xQuat = new THREE.Quaternion();
      const yQuat = new THREE.Quaternion();

      const rightVector = new THREE.Vector3(1, 0, 0);
      rightVector.applyQuaternion((this.camera as THREE.PerspectiveCamera).quaternion);

      const upVector = new THREE.Vector3(0, 1, 0);
      upVector.applyQuaternion((this.camera as THREE.PerspectiveCamera).quaternion);

      yQuat.setFromAxisAngle(upVector, -deltaX);
      xQuat.setFromAxisAngle(rightVector, -deltaY);

      (this.camera as THREE.PerspectiveCamera).quaternion.multiplyQuaternions(yQuat, (this.camera as THREE.PerspectiveCamera).quaternion);
      (this.camera as THREE.PerspectiveCamera).quaternion.multiplyQuaternions(xQuat, (this.camera as THREE.PerspectiveCamera).quaternion);
      (this.camera as THREE.PerspectiveCamera).quaternion.normalize();
    });
  }

  disposeMobileControls(): void {
    if (this.moveJoystick) {
      this.moveJoystick.destroy();
      this.moveJoystick = null;
    }
    if (this.lookJoystick) {
      this.lookJoystick.destroy();
      this.lookJoystick = null;
    }

    const moveContainer = document.getElementById('move-joystick-container');
    if (moveContainer) moveContainer.remove();

    const lookContainer = document.getElementById('look-joystick-container');
    if (lookContainer) lookContainer.remove();
  }

  handleShoot(): void {
    if (gameStateMachine.shouldLockControls()) {
      return;
    }

    if (bulletManager && typeof (bulletManager as any).fireBullet === 'function') {
      (bulletManager as any).fireBullet(this.camera.position, this.camera.quaternion);
    }
  }

  toggleHelpMenu(): void {
    this.helpMenuVisible = !this.helpMenuVisible;

    if (typeof togglePreactHelpMenu === 'function') {
      togglePreactHelpMenu();
    }

    if (this.helpToggleCallback) {
      this.helpToggleCallback();
    }
  }

  update(deltaTime: number): void {
    if (!this.player) return;

    if (gameStateMachine.shouldLockControls()) {
      this.velocity.set(0, 0, 0);
      return;
    }

    const forwardVector = new THREE.Vector3(0, 0, -1);
    forwardVector.applyQuaternion((this.camera as THREE.PerspectiveCamera).quaternion);
    forwardVector.y = 0;
    forwardVector.normalize();

    const rightVector = new THREE.Vector3(1, 0, 0);
    rightVector.applyQuaternion((this.camera as THREE.PerspectiveCamera).quaternion);
    rightVector.y = 0;
    rightVector.normalize();

    const moveDirection = new THREE.Vector3();

    if (this.moveForward) {
      moveDirection.add(forwardVector);
    }
    if (this.moveBackward) {
      moveDirection.sub(forwardVector);
    }
    if (this.strafeLeft) {
      moveDirection.sub(rightVector);
    }
    if (this.strafeRight) {
      moveDirection.add(rightVector);
    }

    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      this.velocity.add(moveDirection.multiplyScalar(this.ACCELERATION));
    } else {
      this.velocity.multiplyScalar(1 - this.DECELERATION);
    }

    this.velocity.multiplyScalar(this.DRAG);

    if (this.velocity.length() > this.MAX_SPEED) {
      this.velocity.normalize().multiplyScalar(this.MAX_SPEED);
    }

    if (this.velocity.length() < 0.001) {
      this.velocity.set(0, 0, 0);
    }

    this.player.position.add(this.velocity);
    this.camera.position.copy(this.player.position);
  }

  dispose(): void {
    this.disposeMobileControls();
  }
}

export default Controls;
