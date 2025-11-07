/**
 * CollectibleDisplay.ts - Base class for displaying collectible items in the HUD
 * Provides consistent API for both ore and power-up displays
 */
import * as THREE from 'three';
import GeometryFactory from '../shapes/GeometryFactory';

interface CollectibleDisplayOptions {
    spacing?: number;
    maxItems?: number;
    animationDuration?: number;
    itemSize?: number;
    itemOpacity?: number;
    layout?: 'vertical' | 'horizontal';
    countDisplay?: boolean;
}

interface DisplayElement {
    container: THREE.Group;
    mesh: THREE.Mesh;
    type: string;
    category: 'ore' | 'powerUp';
    data: any;
    background?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    text?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    texture?: THREE.CanvasTexture;
    canvas?: HTMLCanvasElement;
    context?: CanvasRenderingContext2D;
    count?: number;
    timer?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    startTime?: number;
    duration?: number;
}

class CollectibleDisplay {
    private group: THREE.Group;
    private activeItems: DisplayElement[];
    private indicatorElements: Record<string, DisplayElement>;
    private options: Required<CollectibleDisplayOptions>;

    constructor(options: CollectibleDisplayOptions = {}) {
        // Main group containing all display elements
        this.group = new THREE.Group();

        // Active display elements
        this.activeItems = [];
        this.indicatorElements = {};

        // Configuration with defaults
        this.options = {
            spacing: options.spacing || 0.075,
            maxItems: options.maxItems || 5,
            animationDuration: options.animationDuration || 300, // ms
            itemSize: options.itemSize || 0.02,
            itemOpacity: options.itemOpacity || 0.9,
            layout: options.layout || 'vertical', // 'vertical' or 'horizontal'
            countDisplay: options.countDisplay !== undefined ? options.countDisplay : true
        };
    }

    /**
     * Create a display element for a collectible item
     */
    private createItemDisplay(type: string, category: 'ore' | 'powerUp', params: any = {}): DisplayElement {
        console.log(`Creating ${category} display for: ${type}`);

        // Create a container for this item display
        const container = new THREE.Group();

        // Create mesh using the unified GeometryFactory
        let itemMesh: THREE.Mesh;
        try {
            // Use the unified GeometryFactory
            itemMesh = GeometryFactory.createCollectibleMesh(type, category, {
                size: params.size || this.options.itemSize,
                color: params.color,
                transparent: true,
                opacity: params.opacity || this.options.itemOpacity
            });
        } catch (error) {
            console.error(`Error creating ${category} mesh for ${type}:`, error);

            // Create a simple placeholder
            const geometry = new THREE.SphereGeometry(this.options.itemSize, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                wireframe: true,
                transparent: true,
                opacity: this.options.itemOpacity
            });
            itemMesh = new THREE.Mesh(geometry, material);
        }

        // Position the mesh
        itemMesh.position.set(0, 0, 0);

        // Add to container
        container.add(itemMesh);

        const element: DisplayElement = {
            container,
            mesh: itemMesh,
            type,
            category,
            // Additional metadata
            data: params
        };

        // If count display is enabled, add count indicator
        if (this.options.countDisplay && category === 'ore') {
            this.addCountIndicator(element, params.count || 0);
        }

        // If timer display is needed (for power-ups), add it
        if (category === 'powerUp' && params.duration) {
            this.addTimerIndicator(element, params.duration);
        }

        return element;
    }

    /**
     * Add a count indicator to a display element (used for ores)
     */
    private addCountIndicator(element: DisplayElement, count: number = 0): void {
        // Background for the count
        const bgGeometry = new THREE.PlaneGeometry(0.07, 0.04);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: 0x222222,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        const background = new THREE.Mesh(bgGeometry, bgMaterial);
        background.position.set(0.06, 0, 0.01); // Position to the right of the item
        element.container.add(background);

        // Create a text label for the count
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count.toString(), 64, 32);

        const textTexture = new THREE.CanvasTexture(canvas);
        textTexture.minFilter = THREE.LinearFilter;
        const textMaterial = new THREE.MeshBasicMaterial({
            map: textTexture,
            transparent: true,
            opacity: 0.9
        });

        const textGeometry = new THREE.PlaneGeometry(0.06, 0.035);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(0.06, 0, 0.02); // Position over the background
        element.container.add(textMesh);

        // Add count-related properties to the element
        element.background = background;
        element.text = textMesh;
        element.texture = textTexture;
        element.canvas = canvas;
        element.context = ctx;
        element.count = count;
    }

    /**
     * Add a timer indicator to a display element (used for power-ups)
     */
    private addTimerIndicator(element: DisplayElement, duration: number): void {
        // Create timer bar below the icon
        const timerGeometry = new THREE.PlaneGeometry(0.05, 0.005);
        const timerMaterial = new THREE.MeshBasicMaterial({
            color: element.data.color || 0xFFFFFF,
            transparent: true,
            opacity: 0.8
        });

        const timer = new THREE.Mesh(timerGeometry, timerMaterial);
        timer.position.set(0, -0.025, 0); // Below the icon
        element.container.add(timer);

        // Add timer-related properties
        element.timer = timer;
        element.startTime = performance.now();
        element.duration = duration;
    }

    /**
     * Add an item to the display
     */
    addItem(type: string, category: 'ore' | 'powerUp', params: any = {}): void {
        const key = `${category}_${type}`;

        // Check if this item is already in the active list
        const existingIndex = this.activeItems.findIndex(item =>
            item.type === type && item.category === category
        );

        if (existingIndex === -1) {
            console.log(`Adding ${category} to display: ${type}`);

            // Create a new display element if not already existing
            const element = this.indicatorElements[key] ||
                            this.createItemDisplay(type, category, params);

            if (!element) {
                console.error(`Failed to create display for ${category} type: ${type}`);
                return;
            }

            // Add to the group if not already added
            if (!this.group.children.includes(element.container)) {
                this.group.add(element.container);
            }

            // Add to active items
            this.activeItems.push(element);
            this.indicatorElements[key] = element;

            // Start with 0 opacity and off-screen position for animation
            if (this.options.layout === 'vertical') {
                element.container.position.x = 0.3; // Start off-screen to the right
            } else {
                element.container.position.y = 0.3; // Start off-screen to the top
            }

            element.container.scale.set(0.1, 0.1, 0.1); // Start small

            // Make sure the item mesh is visible but starts somewhat transparent
            if (element.mesh && element.mesh.material) {
                element.mesh.material.opacity = 0.2; // Start with low opacity
            }

            // Trigger reposition with animation
            this.positionItems(true);
        } else if (category === 'ore' && 'count' in params) {
            // Update count for existing ore
            this.updateItemCount(type, params.count);
        } else if (category === 'powerUp' && 'duration' in params) {
            // Reset timer for existing power-up
            const element = this.activeItems[existingIndex];
            element.startTime = performance.now();
            element.duration = params.duration;
        }
    }

    /**
     * Remove an item from the display
     */
    removeItem(type: string, category: 'ore' | 'powerUp'): void {
        // Find the item in the active list
        const index = this.activeItems.findIndex(item =>
            item.type === type && item.category === category
        );

        if (index >= 0) {
            const element = this.activeItems[index];

            // Animate out
            if (this.options.layout === 'vertical') {
                element.container.position.x = -0.3; // Animate off-screen to the left
            } else {
                element.container.position.y = -0.3; // Animate off-screen to the bottom
            }

            element.container.scale.set(0.1, 0.1, 0.1); // Shrink

            if (element.mesh && element.mesh.material) {
                element.mesh.material.opacity = 0;
            }

            // Remove from active items
            this.activeItems.splice(index, 1);
            delete this.indicatorElements[`${category}_${type}`];

            // Remove from group after animation
            setTimeout(() => {
                if (this.group.children.includes(element.container)) {
                    this.group.remove(element.container);
                }
            }, this.options.animationDuration);

            // Reposition remaining items
            this.positionItems(true);
        }
    }

    /**
     * Position all active items with proper spacing
     */
    private positionItems(animate: boolean = false): void {
        const totalItems = this.activeItems.length;
        if (totalItems === 0) return;

        console.log(`Positioning ${totalItems} items`);

        // Calculate total size and starting position based on layout
        let totalSize: number, startPos: number;

        if (this.options.layout === 'vertical') {
            totalSize = (totalItems - 1) * this.options.spacing;
            startPos = totalSize / 2; // Center vertically
        } else {
            totalSize = (totalItems - 1) * this.options.spacing;
            startPos = -totalSize / 2; // Center horizontally
        }

        // Position each item
        this.activeItems.forEach((element, index) => {
            if (!element || !element.container) {
                console.error(`Invalid display element at index ${index}`);
                return;
            }

            // Calculate target position
            let targetX = 0, targetY = 0;

            if (this.options.layout === 'vertical') {
                targetX = 0;
                targetY = startPos - (index * this.options.spacing);
            } else {
                targetX = startPos + (index * this.options.spacing);
                targetY = 0;
            }

            if (animate) {
                // Animate to the target position
                const startTime = performance.now();
                const initialPosition = {
                    x: element.container.position.x,
                    y: element.container.position.y,
                    scale: element.container.scale.x
                };
                const targetPosition = {
                    x: targetX,
                    y: targetY,
                    scale: 1
                };

                const animatePosition = () => {
                    const elapsed = performance.now() - startTime;
                    const progress = Math.min(elapsed / this.options.animationDuration, 1);

                    // Use easing function for smoother animation
                    const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

                    // Interpolate position
                    element.container.position.x = initialPosition.x + (targetPosition.x - initialPosition.x) * easedProgress;
                    element.container.position.y = initialPosition.y + (targetPosition.y - initialPosition.y) * easedProgress;

                    // Scale up
                    const scale = initialPosition.scale + (targetPosition.scale - initialPosition.scale) * easedProgress;
                    element.container.scale.set(scale, scale, scale);

                    // Fade in
                    if (element.mesh && element.mesh.material) {
                        element.mesh.material.opacity = 0.3 + (0.7 * easedProgress);
                    }

                    // Fade in text and background for ores
                    if (element.category === 'ore') {
                        if (element.background && element.background.material) {
                            element.background.material.opacity = 0.3 + (0.2 * easedProgress);
                        }

                        if (element.text && element.text.material) {
                            element.text.material.opacity = 0.3 + (0.6 * easedProgress);
                        }
                    }

                    if (progress < 1) {
                        requestAnimationFrame(animatePosition);
                    }
                };

                requestAnimationFrame(animatePosition);
            } else {
                // Instant positioning
                element.container.position.x = targetX;
                element.container.position.y = targetY;
                element.container.scale.set(1, 1, 1);

                // Make sure everything is visible
                if (element.mesh && element.mesh.material) {
                    element.mesh.material.opacity = 1.0;
                }

                if (element.category === 'ore') {
                    if (element.background && element.background.material) {
                        element.background.material.opacity = 0.5;
                    }
                    if (element.text && element.text.material) {
                        element.text.material.opacity = 0.9;
                    }
                }
            }
        });
    }

    /**
     * Update the count for an item
     */
    updateItemCount(type: string, count: number): void {
        const element = this.indicatorElements[`ore_${type}`];

        if (element && element.context && element.canvas && element.texture) {
            // Clear the canvas
            element.context.clearRect(0, 0, element.canvas.width, element.canvas.height);

            // Draw the new count
            element.context.fillStyle = 'white';
            element.context.font = 'bold 48px Arial';
            element.context.textAlign = 'center';
            element.context.textBaseline = 'middle';
            element.context.fillText(count.toString(), 64, 32);

            // Update texture
            element.texture.needsUpdate = true;
            element.count = count;
        }
    }

    /**
     * Highlight an item when collected
     */
    highlightItem(type: string, category: 'ore' | 'powerUp'): void {
        const element = this.indicatorElements[`${category}_${type}`];
        if (!element || !element.mesh) return;

        const mesh = element.mesh;

        // Store original properties
        const originalColor = mesh.material.color.clone();
        const originalScale = element.container.scale.clone();
        const originalOpacity = mesh.material.opacity || 1;

        // Flash effect - briefly turn white and more opaque
        mesh.material.color.set(0xffffff);
        mesh.material.opacity = 1;

        // Very subtle scale increase for the container
        element.container.scale.multiplyScalar(1.2);

        // Try to increase emissive if the material supports it
        let originalEmissive: THREE.Color | null = null;
        if ('emissive' in mesh.material) {
            const mat = mesh.material as any;
            if (mat.emissive) {
                originalEmissive = mat.emissive.clone();
                mat.emissive = new THREE.Color(0x333333);
            }
        }

        // Return to normal after short delay with a smooth transition
        const duration = 400; // ms
        const startTime = Date.now();

        // Create smooth animation
        const animateBack = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            if (progress < 1) {
                // Lerp back to original values with easing
                const t = progress * progress; // Quadratic ease-in

                // Interpolate color
                mesh.material.color.r = originalColor.r + (1 - originalColor.r) * (1 - t);
                mesh.material.color.g = originalColor.g + (1 - originalColor.g) * (1 - t);
                mesh.material.color.b = originalColor.b + (1 - originalColor.b) * (1 - t);

                // Interpolate container scale
                const scaleFactor = 1.2 - (0.2 * t);
                element.container.scale.copy(originalScale).multiplyScalar(scaleFactor);

                // Interpolate opacity
                mesh.material.opacity = 1 - ((1 - originalOpacity) * t);

                // Continue animation
                requestAnimationFrame(animateBack);
            } else {
                // Final restoration
                mesh.material.color.copy(originalColor);
                element.container.scale.copy(originalScale);
                mesh.material.opacity = originalOpacity;

                // Restore emissive if we changed it
                if (originalEmissive && 'emissive' in mesh.material) {
                    const mat = mesh.material as any;
                    if (mat.emissive) {
                        mat.emissive.copy(originalEmissive);
                    }
                }
            }
        };

        // Start the animation
        requestAnimationFrame(animateBack);
    }

    /**
     * Update all timers and animations
     */
    update(deltaTime: number = 16): void {
        const now = performance.now();

        // Update each item
        this.activeItems.forEach(element => {
            // Rotate for visual interest
            if (element.mesh) {
                element.mesh.rotation.x += 0.01;
                element.mesh.rotation.y += 0.02;
            }

            // Update timers for power-ups
            if (element.category === 'powerUp' && element.timer && element.startTime) {
                const elapsed = now - element.startTime;
                const progress = 1 - (elapsed / (element.duration || 1));

                // If expired, remove it
                if (progress <= 0) {
                    this.removeItem(element.type, element.category);
                    return;
                }

                // Update the timer bar
                element.timer.scale.x = progress;

                // Flash the timer when almost expired
                if (progress < 0.2) {
                    const flash = (Math.sin(now * 0.01) + 1) / 2; // 0-1 flashing
                    element.timer.material.opacity = 0.3 + flash * 0.7;
                }
            }
        });
    }

    /**
     * Get the THREE.js group containing this component
     */
    getGroup(): THREE.Group {
        return this.group;
    }
}

export default CollectibleDisplay;
