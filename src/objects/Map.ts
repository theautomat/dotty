/**
 * Map.ts - Main map class for displaying background and grid system
 * Manages a zoomable map with a 100x100 grid overlay
 */

import * as THREE from 'three';
import GridNavigator from './GridNavigator';

interface MapConfig {
    worldSize: number;
    gridSize: number;
    gridColor: number;
    gridOpacity: number;
    backgroundImage?: string;
    highlightColor?: number;
    highlightOpacity?: number;
    cameraPanSpeed?: number;
    minZoom?: number;
    maxZoom?: number;
    zoomSpeed?: number;
    defaultZoom?: number;
}

class Map {
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private background: THREE.Mesh | null = null;
    private gridGroup: THREE.Group;
    private config: MapConfig;
    private mapWorldSize: number;
    private navigator: GridNavigator | null = null;
    private minZoom: number;
    private maxZoom: number;
    private zoomSpeed: number;
    private defaultZoom: number;

    constructor(
        scene: THREE.Scene,
        camera: THREE.OrthographicCamera,
        config: MapConfig
    ) {
        this.scene = scene;
        this.camera = camera;
        this.config = config;
        this.mapWorldSize = config.worldSize;
        this.gridGroup = new THREE.Group();

        // Initialize zoom configuration with defaults
        this.minZoom = config.minZoom ?? 0.5;
        this.maxZoom = config.maxZoom ?? 3.0;
        this.zoomSpeed = config.zoomSpeed ?? 0.1;
        this.defaultZoom = config.defaultZoom ?? 1.0;
    }

    /**
     * Initialize the map - create background and grid
     */
    async init(): Promise<void> {
        // Set initial camera zoom to maximum zoom for best view
        this.camera.zoom = this.maxZoom;
        this.camera.updateProjectionMatrix();

        await this.createBackground();
        this.createGrid();
        this.initNavigator();

        console.log(`Map initialized: ${this.config.gridSize}x${this.config.gridSize} grid, world size: ${this.mapWorldSize}, initial zoom: ${this.camera.zoom}`);
    }

    /**
     * Initialize the grid navigator for WASD controls
     */
    private initNavigator(): void {
        const cellSize = this.mapWorldSize / this.config.gridSize;

        this.navigator = new GridNavigator(
            this.scene,
            this.camera,
            {
                gridSize: this.config.gridSize,
                cellSize: cellSize,
                worldSize: this.mapWorldSize,
                highlightColor: this.config.highlightColor || 0xffff00, // Yellow by default
                highlightOpacity: this.config.highlightOpacity || 0.5,
                cameraPanSpeed: this.config.cameraPanSpeed || 0.1
            }
        );

        this.navigator.init();
    }

    /**
     * Create the background plane with texture or placeholder
     */
    private async createBackground(): Promise<void> {
        const geometry = new THREE.PlaneGeometry(this.mapWorldSize, this.mapWorldSize);

        if (this.config.backgroundImage) {
            // Load texture from provided image
            const textureLoader = new THREE.TextureLoader();
            const texture = await new Promise<THREE.Texture>((resolve, reject) => {
                textureLoader.load(
                    this.config.backgroundImage!,
                    (tex) => resolve(tex),
                    undefined,
                    (err) => {
                        console.warn('Failed to load background image, using placeholder:', err);
                        resolve(this.createPlaceholderTexture());
                    }
                );
            });

            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide
            });

            this.background = new THREE.Mesh(geometry, material);
        } else {
            // Use placeholder texture
            const texture = this.createPlaceholderTexture();
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide
            });

            this.background = new THREE.Mesh(geometry, material);
        }

        // Rotate to lay flat on XZ plane (horizontal)
        this.background.rotation.x = -Math.PI / 2;
        this.background.position.set(0, 0, 0);

        this.scene.add(this.background);
    }

    /**
     * Create a placeholder texture using canvas
     */
    private createPlaceholderTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d')!;

        // Create ocean-like background with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a4d6d');  // Darker blue-green
        gradient.addColorStop(0.5, '#2a5f7f'); // Medium ocean blue
        gradient.addColorStop(1, '#1a4d6d');  // Darker blue-green

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add some texture/noise for ocean effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2;
            ctx.fillRect(x, y, size, size);
        }

        // Add corner markers for orientation
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 48px Arial';
        ctx.fillText('NW', 20, 60);
        ctx.fillText('NE', canvas.width - 100, 60);
        ctx.fillText('SW', 20, canvas.height - 20);
        ctx.fillText('SE', canvas.width - 100, canvas.height - 20);

        // Add center marker
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = 'bold 36px Arial';
        ctx.fillText('CENTER', canvas.width / 2 - 80, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    /**
     * Create the grid overlay using line segments (100x100 grid)
     */
    private createGrid(): void {
        const gridSize = this.config.gridSize;
        const cellSize = this.mapWorldSize / gridSize;
        const halfSize = this.mapWorldSize / 2;

        const positions: number[] = [];

        // Create vertical lines (101 lines for 100 cells)
        for (let i = 0; i <= gridSize; i++) {
            const x = -halfSize + (i * cellSize);

            // Line from bottom to top
            positions.push(x, 0, -halfSize);  // Start point
            positions.push(x, 0, halfSize);   // End point
        }

        // Create horizontal lines (101 lines for 100 cells)
        for (let i = 0; i <= gridSize; i++) {
            const z = -halfSize + (i * cellSize);

            // Line from left to right
            positions.push(-halfSize, 0, z);  // Start point
            positions.push(halfSize, 0, z);   // End point
        }

        // Create the geometry and material
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: this.config.gridColor,
            opacity: this.config.gridOpacity,
            transparent: true
        });

        const grid = new THREE.LineSegments(geometry, material);
        grid.position.set(0, 0.1, 0); // Slightly above the background to prevent z-fighting

        this.gridGroup.add(grid);
        this.scene.add(this.gridGroup);

        console.log(`Grid created: ${gridSize}x${gridSize} (${positions.length / 6} lines)`);
    }

    /**
     * Handle zoom events
     */
    handleZoom(delta: number): void {
        if (delta < 0) {
            // Zoom in
            this.camera.zoom = Math.min(this.maxZoom, this.camera.zoom + this.zoomSpeed);
        } else {
            // Zoom out
            this.camera.zoom = Math.max(this.minZoom, this.camera.zoom - this.zoomSpeed);
        }

        this.camera.updateProjectionMatrix();
    }

    /**
     * Convert world position to grid coordinates (0-99 for both x and y)
     */
    getGridCoordinates(worldPosition: THREE.Vector3): { x: number; y: number } {
        const halfSize = this.mapWorldSize / 2;
        const cellSize = this.mapWorldSize / this.config.gridSize;

        // Convert world position to grid coordinates
        const gridX = Math.floor((worldPosition.x + halfSize) / cellSize);
        const gridY = Math.floor((worldPosition.z + halfSize) / cellSize);

        // Clamp to valid range (0-99)
        const clampedX = Math.max(0, Math.min(this.config.gridSize - 1, gridX));
        const clampedY = Math.max(0, Math.min(this.config.gridSize - 1, gridY));

        return { x: clampedX, y: clampedY };
    }

    /**
     * Convert grid coordinates to world position (center of the cell)
     */
    getWorldPosition(gridX: number, gridY: number): THREE.Vector3 {
        const halfSize = this.mapWorldSize / 2;
        const cellSize = this.mapWorldSize / this.config.gridSize;

        const worldX = -halfSize + (gridX * cellSize) + (cellSize / 2);
        const worldZ = -halfSize + (gridY * cellSize) + (cellSize / 2);

        return new THREE.Vector3(worldX, 0, worldZ);
    }

    /**
     * Update the map - called every frame
     */
    update(deltaTime: number = 0.016): void {
        if (this.navigator) {
            this.navigator.update(deltaTime);
        }
    }

    /**
     * Get the current grid position from the navigator
     */
    getCurrentGridPosition(): { x: number; y: number } | null {
        return this.navigator ? this.navigator.getCurrentPosition() : null;
    }

    /**
     * Set the navigator position
     */
    setNavigatorPosition(x: number, y: number): void {
        if (this.navigator) {
            this.navigator.setPosition(x, y);
        }
    }

    /**
     * Cleanup and destroy map resources
     */
    destroy(): void {
        if (this.navigator) {
            this.navigator.destroy();
            this.navigator = null;
        }

        if (this.background) {
            this.scene.remove(this.background);
            this.background.geometry.dispose();
            if (this.background.material instanceof THREE.Material) {
                this.background.material.dispose();
            }
        }

        this.gridGroup.traverse((child) => {
            if (child instanceof THREE.LineSegments) {
                child.geometry.dispose();
                if (child.material instanceof THREE.Material) {
                    child.material.dispose();
                }
            }
        });

        this.scene.remove(this.gridGroup);

        console.log('Map destroyed and resources cleaned up');
    }
}

export default Map;
