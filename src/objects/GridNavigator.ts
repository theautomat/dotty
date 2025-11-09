/**
 * GridNavigator.ts - Handles keyboard navigation across the grid
 * WASD keys move the highlight square like a video game
 */

import * as THREE from 'three';
import { gameStore } from '../store/gameStore';

interface GridNavigatorConfig {
    gridSize: number;          // Total grid dimensions (e.g., 100 for 100x100)
    cellSize: number;          // Physical size of each cell in world units
    worldSize: number;         // Total world size
    highlightColor: number;    // Color of the highlight
    highlightOpacity: number;  // Opacity of the highlight
    cameraPanSpeed: number;    // Speed of camera panning (0-1, higher = faster)
}

class GridNavigator {
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private config: GridNavigatorConfig;

    // Current grid position (0-99 for a 100x100 grid)
    private currentX: number;
    private currentY: number;

    // Visual highlight (border/stroke)
    private highlight: THREE.LineLoop | null = null;

    // Previous input state (for edge detection)
    private previousInputs = {
        up: false,
        down: false,
        left: false,
        right: false,
    };

    // For smooth camera panning
    private targetCameraX: number = 0;
    private targetCameraZ: number = 0;

    constructor(
        scene: THREE.Scene,
        camera: THREE.OrthographicCamera,
        config: GridNavigatorConfig
    ) {
        this.scene = scene;
        this.camera = camera;
        this.config = config;

        // Start at center of grid
        this.currentX = Math.floor(config.gridSize / 2);
        this.currentY = Math.floor(config.gridSize / 2);

        // Set initial camera target
        this.updateCameraTarget();
    }

    /**
     * Initialize the navigator - create highlight
     */
    init(): void {
        this.createHighlight();
        this.updateHighlightPosition();

        console.log(`GridNavigator initialized at (${this.currentX}, ${this.currentY})`);
    }

    /**
     * Create the visual highlight mesh for the selected grid cell
     * Uses a border/stroke instead of a filled square to avoid covering content
     */
    private createHighlight(): void {
        const halfSize = this.config.cellSize / 2;

        // Create a square outline using LineLoop
        const points = [
            new THREE.Vector3(-halfSize, 0, -halfSize),
            new THREE.Vector3(halfSize, 0, -halfSize),
            new THREE.Vector3(halfSize, 0, halfSize),
            new THREE.Vector3(-halfSize, 0, halfSize)
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: this.config.highlightColor,
            linewidth: 3, // Thicker border for better visibility
            transparent: false // No transparency needed for a border
        });

        this.highlight = new THREE.LineLoop(geometry, material);
        this.highlight.position.y = 0.2; // Slightly above grid to be visible

        this.scene.add(this.highlight);
    }

    /**
     * Process input state changes from the store
     * Detects rising edge (key press) to move grid position
     */
    private processInputs(): void {
        const inputs = gameStore.getState().inputs;

        // Detect rising edge (key just pressed) for each direction
        // This prevents holding the key from continuously moving
        if (inputs.up && !this.previousInputs.up) {
            this.moveUp();
        }
        if (inputs.down && !this.previousInputs.down) {
            this.moveDown();
        }
        if (inputs.left && !this.previousInputs.left) {
            this.moveLeft();
        }
        if (inputs.right && !this.previousInputs.right) {
            this.moveRight();
        }

        // Update previous state for next frame
        this.previousInputs.up = inputs.up;
        this.previousInputs.down = inputs.down;
        this.previousInputs.left = inputs.left;
        this.previousInputs.right = inputs.right;
    }

    /**
     * Move highlight up (decrease Y, like moving north on a map)
     */
    private moveUp(): void {
        if (this.currentY > 0) {
            this.currentY--;
            this.updateHighlightPosition();
            console.log(`Moved to grid position (${this.currentX}, ${this.currentY})`);
        }
    }

    /**
     * Move highlight down (increase Y, like moving south on a map)
     */
    private moveDown(): void {
        if (this.currentY < this.config.gridSize - 1) {
            this.currentY++;
            this.updateHighlightPosition();
            console.log(`Moved to grid position (${this.currentX}, ${this.currentY})`);
        }
    }

    /**
     * Move highlight left (decrease X, like moving west on a map)
     */
    private moveLeft(): void {
        if (this.currentX > 0) {
            this.currentX--;
            this.updateHighlightPosition();
            console.log(`Moved to grid position (${this.currentX}, ${this.currentY})`);
        }
    }

    /**
     * Move highlight right (increase X, like moving east on a map)
     */
    private moveRight(): void {
        if (this.currentX < this.config.gridSize - 1) {
            this.currentX++;
            this.updateHighlightPosition();
            console.log(`Moved to grid position (${this.currentX}, ${this.currentY})`);
        }
    }

    /**
     * Update the visual highlight position based on current grid coordinates
     */
    private updateHighlightPosition(): void {
        if (!this.highlight) return;

        const worldPos = this.getWorldPosition(this.currentX, this.currentY);
        this.highlight.position.x = worldPos.x;
        this.highlight.position.z = worldPos.z;

        this.updateCameraTarget();

        // Update the store with the new position
        gameStore.getState().setGridPosition(this.currentX, this.currentY);
    }

    /**
     * Update the target camera position to center on current cell
     */
    private updateCameraTarget(): void {
        const worldPos = this.getWorldPosition(this.currentX, this.currentY);
        this.targetCameraX = worldPos.x;
        this.targetCameraZ = worldPos.z;
    }

    /**
     * Convert grid coordinates to world position (center of cell)
     */
    private getWorldPosition(gridX: number, gridY: number): THREE.Vector3 {
        const halfSize = this.config.worldSize / 2;
        const cellSize = this.config.cellSize;

        const worldX = -halfSize + (gridX * cellSize) + (cellSize / 2);
        const worldZ = -halfSize + (gridY * cellSize) + (cellSize / 2);

        return new THREE.Vector3(worldX, 0, worldZ);
    }

    /**
     * Update method - call this in the game loop
     * Processes inputs and updates camera position for smooth panning
     */
    update(deltaTime: number = 0.016): void {
        // Process input state from the store
        this.processInputs();

        // Smooth camera panning using lerp
        const panSpeed = this.config.cameraPanSpeed;

        this.camera.position.x += (this.targetCameraX - this.camera.position.x) * panSpeed;
        this.camera.position.z += (this.targetCameraZ - this.camera.position.z) * panSpeed;
    }

    /**
     * Get the current grid position
     */
    getCurrentPosition(): { x: number; y: number } {
        return { x: this.currentX, y: this.currentY };
    }

    /**
     * Set the grid position (useful for teleporting to specific locations)
     */
    setPosition(x: number, y: number): void {
        // Clamp to valid range
        this.currentX = Math.max(0, Math.min(this.config.gridSize - 1, x));
        this.currentY = Math.max(0, Math.min(this.config.gridSize - 1, y));

        this.updateHighlightPosition();
        console.log(`Set grid position to (${this.currentX}, ${this.currentY})`);
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.highlight) {
            this.scene.remove(this.highlight);
            this.highlight.geometry.dispose();
            if (this.highlight.material instanceof THREE.Material) {
                this.highlight.material.dispose();
            }
            this.highlight = null;
        }

        console.log('GridNavigator destroyed');
    }
}

export default GridNavigator;
