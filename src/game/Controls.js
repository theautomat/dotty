/**
 * Controls.js - Handles player input and movement
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

import gameStateMachine, { GAME_STATES } from './GameStateMachine.js';
import soundManager from '../managers/SoundManager.js';
import { toggleHelpMenu as togglePreactHelpMenu } from '../components/HelpMenu.js';
import GameConfig from './GameConfig.js'; // Import GameConfig for global settings
import bulletManager from '../managers/BulletManager.js'; // Import bulletManager for direct access

class Controls {
    /**
     * Create a new Controls instance
     * @param {Object} params - Configuration parameters
     * @param {THREE.Camera} params.camera - The player camera to control
     * @param {THREE.Renderer} params.renderer - The renderer (for pointer lock)
     * @param {Function} params.shootCallback - Function to call when player shoots
     * @param {Function} params.helpToggleCallback - Function to call when help menu is toggled
     * @param {Function} params.hudClickCallback - Function to call to let HUD handle clicks
     * @param {Object} params.options - Additional options
     */
    constructor(params) {
        // Store references to passed objects
        this.camera = params.camera;
        this.renderer = params.renderer;
        this.helpToggleCallback = params.helpToggleCallback || (() => {});
        this.hudClickCallback = params.hudClickCallback || null;
        this.worldBoundaryToggleCallback = params.worldBoundaryToggleCallback || (() => {});
        
        // Game state references - passed from Game
        this.gameStateMachine = params.gameStateMachine;
        this.hud = params.hud || null;
        
        // Movement state
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.moveForward = false;
        this.moveBackward = false;
        this.strafeLeft = false;
        this.strafeRight = false;
        
        // Track key state for sound triggers
        this.wKeyReleased = true;
        this.sKeyReleased = true;
        this.aKeyReleased = true;
        this.dKeyReleased = true;
        
        // Mouse control
        this.isPointerLocked = false;
        this.mouseSensitivity = params.options?.mouseSensitivity || 0.002;
        
        // Movement parameters - use values from GameConfig or from provided options
        this.MAX_SPEED = params.options?.maxSpeed || GameConfig.ship.maxSpeed;
        this.ACCELERATION = params.options?.acceleration || GameConfig.ship.acceleration;
        this.DECELERATION = params.options?.deceleration || GameConfig.ship.deceleration;
        this.DRAG = params.options?.drag || GameConfig.ship.drag;
        
        // Development mode flag
        this.DEVELOPMENT_MODE = params.options?.developmentMode || false;
        
        // State tracking
        this.helpMenuVisible = false;
        
        // Mobile control references
        this.moveJoystick = null;
        this.lookJoystick = null;
        this.isMobile = this.detectMobile();
        
        // Mobile-specific optimizations
        if (this.isMobile) {
            // Reduce maximum speed and acceleration for better control on mobile
            this.MAX_SPEED = this.MAX_SPEED * 0.8;
            this.ACCELERATION = this.ACCELERATION * 0.7;
            
            // Reduce mouse sensitivity for mobile
            this.mouseSensitivity = this.mouseSensitivity * 0.7;
            
            // Set mobile-optimized renderer settings
            if (this.renderer) {
                // Don't use antialiasing on mobile to improve performance
                if (this.renderer.getPixelRatio() > 1) {
                    this.renderer.setPixelRatio(1);
                }
            }
        }
        
        // Setup appropriate controls
        this.setupControls();
        
        // Set up mobile controls if on a mobile device
        if (this.isMobile) {
            // Load Nipple.js library first, then setup mobile controls
            this.loadNippleJs().then(() => {
                this.setupMobileControls();
                console.log('Nipple.js loaded and mobile controls initialized');
            }).catch(error => {
                console.error('Failed to load Nipple.js:', error);
            });
        }
        
        // Listen for game state changes and release pointer when game is over
        if (this.gameStateMachine) {
            this.gameStateMachine.addListener((newState, oldState) => {
                if (newState === GAME_STATES.GAME_OVER || newState === GAME_STATES.COMPLETE) {
                    // Release pointer lock when game is over
                    if (document.pointerLockElement === this.renderer.domElement) {
                        document.exitPointerLock();
                        console.log("[CONTROLS] Releasing pointer lock due to game over");
                    }
                }
            });
        }
    }
    
    /**
     * Detect if device is mobile
     * @returns {boolean} True if mobile device detected
     */
    detectMobile() {
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
                return isMobileDevice || hasTouchScreen;
    }
    
    /**
     * Load the nipplejs library for mobile joystick controls
     * @returns {Promise} A promise that resolves when the library is loaded
     */
    loadNippleJs() {
        return new Promise((resolve, reject) => {
            // Check if nipplejs is already loaded
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
    
    /**
     * Setup keyboard and mouse controls
     */
    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            // Block gameplay controls if controls should be locked based on game state
            if (gameStateMachine.shouldLockControls()) {
                // Allow only system controls like Help, Menu, Grid, etc. to pass through
                if (event.code === 'KeyH' || event.code === 'Escape' || event.code === 'KeyL' || event.code === 'KeyG') {
                    // Let these controls through even in locked states
                } else {
                    // Block all other controls
                    return;
                }
            }
            
            switch (event.code) {
                case 'KeyW':
                    this.moveForward = true;
                    // Play thruster sound only if the key was previously released
                    if (this.wKeyReleased) {
                        // Use SoundManager for thruster sound - new implementation
                        soundManager.playThrusterForward();
                        this.wKeyReleased = false; // Mark key as not released (pressed)
                    }
                    break;
                case 'KeyS':
                    this.moveBackward = true;
                    // Play reverse thruster sound only if the key was previously released
                    if (this.sKeyReleased) {
                        // Use SoundManager for reverse thruster sound - new implementation
                        soundManager.playThrusterReverse();
                        this.sKeyReleased = false; // Mark key as not released (pressed)
                    }
                    break;
                case 'KeyA':
                    this.strafeLeft = true;
                    // Play strafe thruster sound only if the key was previously released
                    if (this.aKeyReleased) {
                        // Use SoundManager for strafe thruster sound - new implementation
                        soundManager.playThrusterStrafe();
                        this.aKeyReleased = false; // Mark key as not released (pressed)
                    }
                    break;
                case 'KeyD':
                    this.strafeRight = true;
                    // Play strafe thruster sound only if the key was previously released
                    if (this.dKeyReleased) {
                        // Use SoundManager for strafe thruster sound - new implementation
                        soundManager.playThrusterStrafe();
                        this.dKeyReleased = false; // Mark key as not released (pressed)
                    }
                    break;
                case 'Space':
                    this.handleShoot();
                    break;
                case 'KeyH':
                case 'Escape':
                    // Toggle help menu
                    this.toggleHelpMenu();
                    break;
                case 'KeyG':
                    // Toggle world boundary grid
                    this.worldBoundaryToggleCallback();
                    break;
                case 'KeyL':
                    // Log game state - useful for debugging
                    if (window.gameStats) {
                        console.log('=== GAME STATS LOG ===');
                        console.log(window.gameStats.getStats());
                        console.log('=====================');
                    }
                    break;
                case 'KeyR':
                    // Toggle ASCII rendering effect - useful for retro look
                    if (window.game && typeof window.game.toggleAsciiEffect === 'function') {
                        window.game.toggleAsciiEffect();
                    }
                    break;
                // Additional game-specific controls can be handled via callbacks
            }
        });
        
        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.moveForward = false;
                    // Don't stop the sound - let it play through once
                    this.wKeyReleased = true; // Mark the key as released so sound can play again next press
                    break;
                case 'KeyS':
                    this.moveBackward = false;
                    // Don't stop the sound - let it play through once
                    this.sKeyReleased = true; // Mark the key as released so sound can play again next press
                    break;
                case 'KeyA':
                    this.strafeLeft = false;
                    // Don't stop the sound - let it play through once
                    this.aKeyReleased = true; // Mark the key as released so sound can play again next press
                    break;
                case 'KeyD':
                    this.strafeRight = false;
                    // Don't stop the sound - let it play through once
                    this.dKeyReleased = true; // Mark the key as released so sound can play again next press
                    break;
            }
        });
        
        // Mouse movement handler
        document.addEventListener('mousemove', (event) => {
            // Don't process mouse movement if controls should be locked
            if (gameStateMachine.shouldLockControls()) {
                return;
            }
            
            if (document.pointerLockElement === this.renderer.domElement) {
                // Create rotation quaternions for this frame's movement
                const xQuat = new THREE.Quaternion();
                const yQuat = new THREE.Quaternion();
                
                // Create right vector from current camera orientation
                const rightVector = new THREE.Vector3(1, 0, 0);
                rightVector.applyQuaternion(this.camera.quaternion);
                
                // Create up vector from current camera orientation
                const upVector = new THREE.Vector3(0, 1, 0);
                upVector.applyQuaternion(this.camera.quaternion);
                
                // Rotate around the camera's local up axis (for left/right movement)
                yQuat.setFromAxisAngle(upVector, -event.movementX * this.mouseSensitivity);
                
                // Rotate around the camera's local right axis (for up/down movement)
                xQuat.setFromAxisAngle(rightVector, -event.movementY * this.mouseSensitivity);
                
                // Apply rotations to camera - order matters! First yaw, then pitch
                this.camera.quaternion.multiplyQuaternions(yQuat, this.camera.quaternion);
                this.camera.quaternion.multiplyQuaternions(xQuat, this.camera.quaternion);
                
                // Normalize to prevent drift
                this.camera.quaternion.normalize();
            }
        });
        
        // Mouse click for shooting
        document.addEventListener('click', () => {
            // console.log("[CONTROLS] Click detected, game state:", gameStateMachine.getCurrentState());
            
            // Check if HUD needs to handle the click (e.g., for level transitions)
            if (this.hudClickCallback) {
                // console.log("[CONTROLS] Checking if HUD will handle the click");
                try {
                    const hudHandled = this.hudClickCallback();
                    // console.log("[CONTROLS] HUD handled click:", hudHandled);
                    if (hudHandled) {
                        // If HUD handled the click, don't process further
                        return;
                    }
                } catch (error) {
                    console.error("[CONTROLS] Error in HUD click handler:", error);
                }
            }
            
            // Special handling for MENU state - prioritize game start
            if (gameStateMachine.isInState(GAME_STATES.MENU)) {
                console.log("[CONTROLS] In MENU state, checking if waiting for click");
                // Let click pass through to start the game
                return;
            }
            
            // Don't process gameplay clicks if controls should be locked
            if (gameStateMachine.shouldLockControls()) {
                console.log("[CONTROLS] Controls locked, ignoring click");
                return;
            }
            
            // Handle normal game clicks
            if (!document.pointerLockElement) {
                // Request pointer lock on first click
                console.log("[CONTROLS] Requesting pointer lock");
                this.renderer.domElement.requestPointerLock();
                
                // Add a small delay to ensure the shoot happens after the pointer lock request
                setTimeout(() => {
                    if (!gameStateMachine.shouldLockControls()) {
                                                this.handleShoot();
                    }
                }, 50);
            } else {
                this.handleShoot();
            }
        });
        
        // Pointer lock change event handler
        document.addEventListener('pointerlockchange', () => {
            const wasLocked = this.isPointerLocked;
            this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
            
            // Show or hide the crosshair based on pointer lock state
            const crosshair = document.getElementById('crosshair');
            if (crosshair) {
                crosshair.style.display = this.isPointerLocked ? 'block' : 'none';
            }
            
            // If pointer lock was just acquired, trigger a shoot
            if (!wasLocked && this.isPointerLocked) {
                                setTimeout(() => this.handleShoot(), 50);
            }
        });
    }
    
    /**
     * Setup mobile touch controls (virtual joysticks)
     */
    setupMobileControls() {
        console.log('Setting up mobile controls');
        
        // Make sure nipplejs is loaded
        if (typeof window.nipplejs === 'undefined') {
            console.error('Nipplejs library not loaded, cannot set up mobile controls');
            // Try to load it again
            this.loadNippleJs().then(() => {
                // Try again after loading
                setTimeout(() => this.setupMobileControls(), 100);
            }).catch(error => {
                console.error('Failed to load Nipplejs on retry:', error);
            });
            return;
        }
        
        // Remove existing joysticks if they exist
        this.disposeMobileControls();
        
        // Get current viewport dimensions for proper positioning
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isLandscape = viewportWidth > viewportHeight;
        
        // Create left joystick container for movement - adjusted for current orientation
        const leftJoystick = document.createElement('div');
        leftJoystick.id = 'left-joystick';
        leftJoystick.style.cssText = `position:absolute; bottom:${isLandscape ? '60px' : '120px'}; left:${isLandscape ? '60px' : '40px'}; width:120px; height:120px; z-index:1000;`;
        document.body.appendChild(leftJoystick);
        
        // Create right joystick container for aim/look - adjusted for current orientation
        const rightJoystick = document.createElement('div');
        rightJoystick.id = 'right-joystick';
        rightJoystick.style.cssText = `position:absolute; bottom:${isLandscape ? '60px' : '120px'}; right:${isLandscape ? '60px' : '40px'}; width:120px; height:120px; z-index:1000;`;
        document.body.appendChild(rightJoystick);
        
        // Create shoot button
        const shootButton = document.createElement('div');
        shootButton.id = 'shoot-button';
        shootButton.innerText = '🔥';
        // Position the shoot button based on current orientation
        shootButton.style.cssText = `position:absolute; bottom:${isLandscape ? '170px' : '250px'}; right:${isLandscape ? '40px' : '30px'}; width:70px; height:70px; background:rgba(255,50,50,0.7); border-radius:35px; display:flex; align-items:center; justify-content:center; font-size:30px; z-index:1000; box-shadow: 0 0 15px rgba(255,0,0,0.5); transition: transform 0.1s, background 0.1s;`;
        document.body.appendChild(shootButton);
        
        // Add touch event listeners for visual feedback
        shootButton.addEventListener('touchstart', () => {
            shootButton.style.transform = 'scale(1.1)';
            shootButton.style.background = 'rgba(255,100,100,0.8)';
        });
        shootButton.addEventListener('touchend', () => {
            shootButton.style.transform = 'scale(1.0)';
            shootButton.style.background = 'rgba(255,50,50,0.7)';
        });
        
        // Create fullscreen button
        const fullscreenButton = document.createElement('div');
        fullscreenButton.id = 'fullscreen-button';
        fullscreenButton.innerText = '⛶';
        fullscreenButton.style.cssText = 'position:absolute; top:20px; right:20px; width:40px; height:40px; background:rgba(85,170,85,0.7); color:white; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:18px; z-index:1000; box-shadow: 0 0 10px rgba(85,255,85,0.5); transition: transform 0.1s;';
        document.body.appendChild(fullscreenButton);
        
        // Add touch event listeners for visual feedback
        fullscreenButton.addEventListener('touchstart', () => {
            fullscreenButton.style.transform = 'scale(1.1)';
        });
        fullscreenButton.addEventListener('touchend', () => {
            fullscreenButton.style.transform = 'scale(1.0)';
        });
        
        // Initialize joysticks using nipplejs with better options for mobile
        this.moveJoystick = window.nipplejs.create({
            zone: document.getElementById('left-joystick'),
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'rgba(255, 255, 255, 0.5)',
            size: 120, // Increased size for better control
            fadeTime: 0, // Remove fade for better performance
            restOpacity: 0.5, // More visible in rest state
            dynamicPage: true, // Better for page layout changes
            threshold: 0.1 // Increased sensitivity
        });
        
        this.lookJoystick = window.nipplejs.create({
            zone: document.getElementById('right-joystick'),
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'rgba(255, 255, 255, 0.5)',
            size: 120, // Increased size for better control
            fadeTime: 0, // Remove fade for better performance
            restOpacity: 0.5, // More visible in rest state
            dynamicPage: true, // Better for page layout changes
            threshold: 0.1 // Increased sensitivity
        });
        
        // Handle movement joystick with MUCH HIGHER SENSITIVITY
        this.moveJoystick.on('move', (evt, data) => {
            const force = data.force < 1 ? data.force : 1;
            
            // Reset all movement flags
            this.moveForward = false;
            this.moveBackward = false;
            this.strafeLeft = false;
            this.strafeRight = false;
            
            // Use the vector components directly instead of angles for more intuitive control
            // This approach handles diagonal movement naturally and is more resilient to orientation
            // INCREASED SENSITIVITY: Lower threshold to 0.1 (from 0.5) so it responds to smaller movements
            const threshold = 0.1; 
            
            // Forward/backward based on Y vector - REVERSED to match expectations
            // Pushing UP (positive Y) should move FORWARD
            // Pushing DOWN (negative Y) should move BACKWARD
            if (data.vector.y > threshold) {
                this.moveForward = true;
                // Increase acceleration by 10x when using mobile controls (doubled from 5x)
                this.ACCELERATION = GameConfig.ship.acceleration * 10;
                // Play forward thruster sound
                if (this.wKeyReleased) {
                    soundManager.playThrusterForward();
                    this.wKeyReleased = false;
                }
            } else if (data.vector.y < -threshold) {
                this.moveBackward = true;
                // Increase deceleration by 10x when using mobile controls (doubled from 5x)
                this.DECELERATION = GameConfig.ship.deceleration * 10;
                // Play backward thruster sound
                if (this.sKeyReleased) {
                    soundManager.playThrusterReverse();
                    this.sKeyReleased = false;
                }
            }
            
            // Left/right based on X vector
            if (data.vector.x < -threshold) {
                this.strafeLeft = true;
                // Increase acceleration by 10x when using mobile controls (doubled from 5x)
                this.ACCELERATION = GameConfig.ship.acceleration * 10;
                // Play strafe thruster sound
                if (this.aKeyReleased) {
                    soundManager.playThrusterStrafe();
                    this.aKeyReleased = false;
                }
            } else if (data.vector.x > threshold) {
                this.strafeRight = true;
                // Increase acceleration by 10x when using mobile controls (doubled from 5x)
                this.ACCELERATION = GameConfig.ship.acceleration * 10;
                // Play strafe thruster sound
                if (this.dKeyReleased) {
                    soundManager.playThrusterStrafe();
                    this.dKeyReleased = false;
                }
            }
        });
        
        // Reset acceleration/deceleration when joystick is released
        this.moveJoystick.on('end', () => {
            // Reset all movement flags
            this.moveForward = false;
            this.moveBackward = false;
            this.strafeLeft = false;
            this.strafeRight = false;
            
            // Reset acceleration/deceleration to default values
            this.ACCELERATION = GameConfig.ship.acceleration;
            this.DECELERATION = GameConfig.ship.deceleration;
            
            // Reset key released flags for sound
            this.wKeyReleased = true;
            this.sKeyReleased = true;
            this.aKeyReleased = true;
            this.dKeyReleased = true;
        });
        
        // Handle look joystick
        this.lookJoystick.on('move', (evt, data) => {
            // Scale down sensitivity for touch controls
            const touchSensitivity = this.mouseSensitivity * 0.8;
            
            // Calculate rotation amount based on joystick position - use vector directly
            // This makes rotation more consistent regardless of orientation
            const moveX = data.vector.x * touchSensitivity * data.force * 15;
            // REVERSED Y-AXIS: Multiply by positive value so up = look up, down = look down
            const moveY = -data.vector.y * touchSensitivity * data.force * 15;
            
            // Create rotation quaternions
            const xQuat = new THREE.Quaternion();
            const yQuat = new THREE.Quaternion();
            
            // Get right and up vectors
            const rightVector = new THREE.Vector3(1, 0, 0);
            rightVector.applyQuaternion(this.camera.quaternion);
            
            const upVector = new THREE.Vector3(0, 1, 0);
            
            // Set rotation quaternions - Y is already properly inverted in the moveY calculation above
            yQuat.setFromAxisAngle(upVector, -moveX);
            xQuat.setFromAxisAngle(rightVector, -moveY);
            
            // Apply rotations to camera
            this.camera.quaternion.multiplyQuaternions(yQuat, this.camera.quaternion);
            this.camera.quaternion.multiplyQuaternions(xQuat, this.camera.quaternion);
            
            // Normalize quaternion
            this.camera.quaternion.normalize();
        });
        
        // Handle shoot button
        document.getElementById('shoot-button').addEventListener('touchstart', () => {
            // Don't shoot if controls should be locked
            if (!gameStateMachine.shouldLockControls()) {
                this.handleShoot();
            }
        });
        
        // Handle fullscreen button
        document.getElementById('fullscreen-button').addEventListener('touchstart', () => {
            this.toggleFullscreen();
        });
        
        // Add an event listener for orientation change
        window.addEventListener('orientationchange', () => {
            // After orientation change, need to re-setup mobile controls
            this.handleOrientationChange();
        });
        
        console.log('Mobile controls setup complete');
    }
    
    /**
     * Clear all mobile control elements
     */
    disposeMobileControls() {
        // Clean up mobile joysticks if they exist
        if (this.moveJoystick) {
            this.moveJoystick.destroy();
            this.moveJoystick = null;
        }
        if (this.lookJoystick) {
            this.lookJoystick.destroy();
            this.lookJoystick = null;
        }
        
        // Remove mobile UI elements
        const elements = [
            'left-joystick', 
            'right-joystick', 
            'shoot-button', 
            'fullscreen-button'
        ];
        
        elements.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) {
                elem.remove();
            }
        });
    }
    
    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    
    /**
     * Handle player shooting - calls bulletManager directly
     */
    handleShoot() {
        // Don't allow shooting if controls should be locked based on game state
        if (this.gameStateMachine.shouldLockControls()) {
            return;
        }
        
        // Call the bulletManager directly to shoot
        if (bulletManager) {
            const bullet = bulletManager.shootBulletFromCamera({
                camera: this.camera,
                velocity: this.velocity.clone(),
                hud: this.hud,
                gameStateMachine: this.gameStateMachine
            });
        }
    }
    
    /**
     * Toggle help menu visibility
     */
    toggleHelpMenu() {
        // Use the Preact component's toggle function
        this.helpMenuVisible = togglePreactHelpMenu();
        
        // Notify game about help menu toggle
        this.helpToggleCallback(this.helpMenuVisible);
    }
    
    /**
     * Update the camera rotation only (for crew views)
     * This allows crew to look around but not move
     */
    updateRotationOnly() {
        // Skip if controls are locked by game state
        if (gameStateMachine.shouldLockControls()) {
            return;
        }
        
        // Handle mouse/touch input for looking around
        if (this.isPointerLocked) {
            // Apply mouse movement to camera rotation (yaw and pitch)
            const xQuat = new THREE.Quaternion();
            const yQuat = new THREE.Quaternion();
            
            // Calculate rotation vectors
            const rotX = -this.mouseY * this.mouseSensitivity;
            const rotY = -this.mouseX * this.mouseSensitivity;
            
            // Get vectors for rotation
            const rightVector = new THREE.Vector3(1, 0, 0);
            rightVector.applyQuaternion(this.camera.quaternion);
            
            const upVector = new THREE.Vector3(0, 1, 0);
            
            // Set rotation quaternions
            xQuat.setFromAxisAngle(rightVector, rotX);
            yQuat.setFromAxisAngle(upVector, rotY);
            
            // Apply rotations to camera
            this.camera.quaternion.multiplyQuaternions(yQuat, this.camera.quaternion);
            this.camera.quaternion.multiplyQuaternions(xQuat, this.camera.quaternion);
            
            // Normalize quaternion
            this.camera.quaternion.normalize();
            
            // Reset mouse movement for next frame
            this.mouseX = 0;
            this.mouseY = 0;
        }
    }
    
    /**
     * Set velocity directly (used by crew view)
     * @param {THREE.Vector3} newVelocity - The velocity to set
     */
    setVelocity(newVelocity) {
        if (newVelocity instanceof THREE.Vector3) {
            this.velocity.copy(newVelocity);
        }
    }
    
    /**
     * Update player movement based on control state
     * @returns {THREE.Vector3} The updated velocity vector
     */
    update() {
        // Calculate current magnitude of velocity
        const currentSpeed = this.velocity.length();
        
        // Handle thrust and direction changes - get fresh direction vector
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        
        // Create right vector for strafing (perpendicular to direction)
        const rightVector = new THREE.Vector3(1, 0, 0);
        rightVector.applyQuaternion(this.camera.quaternion);
        
        // Apply acceleration based on input
        if (this.moveForward) {
            // Gradually accelerate in the direction we're facing
            this.velocity.add(direction.clone().multiplyScalar(this.ACCELERATION));
        } else if (this.moveBackward) {
            // Brake/reverse more gently than acceleration
            this.velocity.add(direction.clone().multiplyScalar(-this.DECELERATION));
        }
        
        // Apply strafing movement
        if (this.strafeLeft) {
            // Move left (negative on the right vector axis)
            this.velocity.add(rightVector.clone().multiplyScalar(-this.ACCELERATION));
        } else if (this.strafeRight) {
            // Move right (positive on the right vector axis)
            this.velocity.add(rightVector.clone().multiplyScalar(this.ACCELERATION));
        }
        
        // Apply drag regardless of input (minimal in space)
        this.velocity.multiplyScalar(this.DRAG);
        
        // Enforce maximum speed limit
        if (this.velocity.length() > this.MAX_SPEED) {
            this.velocity.normalize().multiplyScalar(this.MAX_SPEED);
        }
        
        // Enforce minimum speed threshold (to prevent never-ending drift)
        if (this.velocity.length() < 0.001 && 
            !this.moveForward && !this.moveBackward && 
            !this.strafeLeft && !this.strafeRight) {
            this.velocity.set(0, 0, 0);
        }
        
        // Update camera position
        this.camera.position.add(this.velocity);
        
        // Return the current velocity for external use
        return this.velocity;
    }
    
    /**
     * Clean up resources and event listeners
     */
    dispose() {
        this.disposeMobileControls();
        
        // Note: We're not removing event listeners here as they're tied to the document
        // In a more complex implementation, we could store references to bound functions
        // and remove them properly
    }
    
    /**
     * Set movement physics parameters
     * @param {Object} params - Physics parameters to update
     */
    setPhysicsParams(params) {
        if (params.maxSpeed !== undefined) this.MAX_SPEED = params.maxSpeed;
        if (params.acceleration !== undefined) this.ACCELERATION = params.acceleration;
        if (params.deceleration !== undefined) this.DECELERATION = params.deceleration;
        if (params.drag !== undefined) this.DRAG = params.drag;
    }
    
    /**
     * Get current velocity
     * @returns {THREE.Vector3} The current velocity vector
     */
    getVelocity() {
        return this.velocity.clone();
    }
    
    /**
     * Reset control state
     */
    reset() {
        this.velocity.set(0, 0, 0);
        this.moveForward = false;
        this.moveBackward = false;
        this.strafeLeft = false;
        this.strafeRight = false;
        this.wKeyReleased = true;
        this.sKeyReleased = true;
        this.aKeyReleased = true;
        this.dKeyReleased = true;
    }
    
    /**
     * Release the pointer lock if it's currently locked
     */
    releasePointerLock() {
        if (document.pointerLockElement === this.renderer.domElement) {
            document.exitPointerLock();
            console.log("[CONTROLS] Manually releasing pointer lock");
        }
    }
    
    /**
     * Handle orientation changes properly
     */
    handleOrientationChange() {
        console.log('Handling orientation change for controls');
        
        // First completely dispose the current controls
        this.disposeMobileControls();
        
        // Wait for the browser to finish orientation change
        setTimeout(() => {
            // Re-setup mobile controls from scratch with the new orientation
            this.setupMobileControls();
            
            // Force a pointer unlock to avoid strange behavior
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
        }, 300);
    }
}

export default Controls;