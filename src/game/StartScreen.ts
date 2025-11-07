/**
 * StartScreen.ts - A 3D click-to-start interface with a retro-style mouse cursor
 * Used to prompt user interaction before starting the game (needed for audio to work)
 */

import * as THREE from 'three';

class StartScreen {
    private scene: THREE.Scene;
    private onStartCallback: () => void;
    private mouseIcon: THREE.Group | null;
    private animationId: number | null;
    private isActive: boolean;
    private leftButton: THREE.Mesh | null;

    /**
     * Create a new start screen
     * @param scene - The scene to add the start screen to
     * @param onStartCallback - Function to call when user clicks to start
     */
    constructor(scene: THREE.Scene, onStartCallback: () => void) {
        this.scene = scene;
        this.onStartCallback = onStartCallback;
        this.mouseIcon = null;
        this.animationId = null;
        this.isActive = true;
        this.leftButton = null;

        // Create the mouse icon
        this.createMouseIcon();

        // Start animation
        this.animate();
    }

    /**
     * Create a retro-style 3D mouse cursor icon
     */
    private createMouseIcon(): void {
        // Create a group for the mouse icon
        this.mouseIcon = new THREE.Group();

        // Create the main mouse body (a rounded rectangle)
        const mouseBodyGeometry = new THREE.BoxGeometry(1, 1.6, 0.4);
        const mouseBodyMaterial = new THREE.MeshBasicMaterial({
            color: 0xCCCCCC,
            wireframe: false
        });
        const mouseBody = new THREE.Mesh(mouseBodyGeometry, mouseBodyMaterial);

        // Create mouse buttons (left and right)
        const buttonGeometry = new THREE.BoxGeometry(0.45, 0.4, 0.15);
        const buttonMaterial = new THREE.MeshBasicMaterial({
            color: 0x55FF55, // Green buttons for visibility
            wireframe: false
        });

        // Left button (will pulse)
        const leftButton = new THREE.Mesh(buttonGeometry, buttonMaterial);
        leftButton.position.set(-0.25, 0.6, 0.275);

        // Right button
        const rightButton = new THREE.Mesh(buttonGeometry, buttonMaterial.clone());
        rightButton.position.set(0.25, 0.6, 0.275);

        // Mouse wire/cable
        const wireGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
        const wireMaterial = new THREE.MeshBasicMaterial({
            color: 0xCCCCCC,
            wireframe: false
        });
        const wire = new THREE.Mesh(wireGeometry, wireMaterial);
        wire.position.set(0, -1.5, 0);
        wire.rotation.x = Math.PI / 2;

        // Add all parts to the mouse group
        this.mouseIcon.add(mouseBody);
        this.mouseIcon.add(leftButton);
        this.mouseIcon.add(rightButton);
        this.mouseIcon.add(wire);

        // Position the mouse icon in front of the camera
        this.mouseIcon.position.set(0, 0, -5);

        // Add to scene
        this.scene.add(this.mouseIcon);

        // Save reference to the left button for pulsing animation
        this.leftButton = leftButton;
    }

    /**
     * Animate the mouse icon with subtle movements and pulsing effect
     */
    private animate(): void {
        if (!this.isActive) return;

        // Create a pulsing animation for the left button
        const pulseIntensity = (Math.sin(Date.now() * 0.005) + 1) / 2; // 0 to 1 value

        if (this.leftButton && this.leftButton.material instanceof THREE.MeshBasicMaterial) {
            // Pulse color from green to bright green
            this.leftButton.material.color.setRGB(
                0.3 + pulseIntensity * 0.3,
                1.0,
                0.3 + pulseIntensity * 0.3
            );

            // Slight scale animation
            const scale = 1 + pulseIntensity * 0.1;
            this.leftButton.scale.set(scale, scale, scale);
        }

        // Subtle mouse movement
        if (this.mouseIcon) {
            this.mouseIcon.rotation.y = Math.sin(Date.now() * 0.001) * 0.2;
            this.mouseIcon.rotation.x = Math.sin(Date.now() * 0.0015) * 0.1;
        }

        // Continue animation
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    /**
     * Handle click event - remove the start screen and call the callback
     */
    handleClick(): void {
        if (!this.isActive) return;

        // Set as inactive
        this.isActive = false;

        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Remove from scene
        if (this.mouseIcon) {
            this.scene.remove(this.mouseIcon);
            this.mouseIcon = null;
        }

        // Call the callback
        if (typeof this.onStartCallback === 'function') {
            this.onStartCallback();
        }
    }

    /**
     * Clean up any resources
     */
    dispose(): void {
        this.isActive = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        if (this.mouseIcon) {
            this.scene.remove(this.mouseIcon);
            this.mouseIcon = null;
        }
    }
}

export default StartScreen;
