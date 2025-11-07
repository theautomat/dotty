/**
 * GameCompletionDisplay.ts - 3D component for game completion visual
 * Displays when the player completes all levels
 */
import * as THREE from 'three';
import GeometryFactory from '../shapes/GeometryFactory';

interface GameCompletionDisplayOptions {
    color?: number;
    symbolSize?: number;
    rotationSpeed?: number;
    pulseSpeed?: number;
    transitionDelay?: number;
}

class GameCompletionDisplay {
    private options: Required<GameCompletionDisplayOptions>;
    private group: THREE.Group;
    private active: boolean;
    private creationTime: number | null;
    private onGameCompletionStatsReady: (() => void) | null;
    private star: THREE.Mesh<THREE.DodecahedronGeometry, THREE.MeshBasicMaterial>;
    private ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
    private overlay: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

    constructor(options: GameCompletionDisplayOptions = {}) {
        // Default options
        this.options = {
            color: 0x55ff55, // Green success color
            symbolSize: 1.5,
            rotationSpeed: 0.03,
            pulseSpeed: 0.01,
            transitionDelay: 3000, // ms before transitioning to stats
            ...options
        };

        // Group containing all display elements
        this.group = new THREE.Group();
        this.group.visible = false;

        // State tracking
        this.active = false;
        this.creationTime = null;
        this.onGameCompletionStatsReady = null;

        // Create the success symbol (star)
        this.createSuccessSymbol();

        // Create success overlay (green tint to the whole view)
        this.createOverlay();
    }

    private createSuccessSymbol(): void {
        const size = this.options.symbolSize;

        // Create a trophy-like shape using a modified dodecahedron from GeometryFactory
        const geometry = new THREE.DodecahedronGeometry(size * 0.7, 1);

        // Create a bright green material
        const material = new THREE.MeshBasicMaterial({
            color: this.options.color,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });

        // Create the mesh
        this.star = new THREE.Mesh(geometry, material);

        // Position it centrally
        this.star.position.set(0, 0, -1);

        // Add to group
        this.group.add(this.star);

        // Create a surrounding ring for enhanced visual effect
        const ringGeometry = new THREE.TorusGeometry(
            size * 1.1,       // radius
            size * 0.08,      // tube thickness
            16,               // radialSegments
            64                // tubularSegments
        );

        const ringMaterial = new THREE.MeshBasicMaterial({
            color: this.options.color,
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });

        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.position.set(0, 0, -1.1); // Position slightly behind the star

        // Add to group
        this.group.add(this.ring);
    }

    private createOverlay(): void {
        // Create a large plane that will be positioned extremely close to the camera
        const overlayGeometry = new THREE.PlaneGeometry(10, 10);
        const overlayMaterial = new THREE.MeshBasicMaterial({
            color: this.options.color,
            transparent: true,
            opacity: 0.15, // Slightly more subtle than death overlay
            side: THREE.DoubleSide,
            depthTest: false
        });

        this.overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);

        // Position very close to camera (will be repositioned in update)
        this.overlay.position.set(0, 0, -0.1);

        // Add to group
        this.group.add(this.overlay);
    }

    show(onComplete?: () => void): void {
        this.active = true;
        this.creationTime = Date.now();
        this.group.visible = true;
        this.onGameCompletionStatsReady = onComplete || null;
    }

    hide(): void {
        this.active = false;
        this.group.visible = false;
    }

    update(renderer?: THREE.WebGLRenderer): boolean {
        if (!this.active || !this.group.visible || this.creationTime === null) return false;

        // Calculate elapsed time since creation
        const elapsed = Date.now() - this.creationTime;

        // Rotate the star
        this.star.rotation.x += this.options.rotationSpeed * 0.7;
        this.star.rotation.y += this.options.rotationSpeed * 1.3;
        this.star.rotation.z += this.options.rotationSpeed * 0.5;

        // Rotate the ring in the opposite direction for cool effect
        if (this.ring) {
            this.ring.rotation.x += this.options.rotationSpeed * 0.2;
            this.ring.rotation.y += this.options.rotationSpeed * -0.3;
        }

        // Pulse the star opacity
        const basePulse = 0.7 + Math.sin(elapsed * 0.005) * 0.3;
        this.star.material.opacity = basePulse;

        // Pulse the ring opacity in counter-phase
        if (this.ring) {
            this.ring.material.opacity = 0.7 + Math.sin(elapsed * 0.005 + Math.PI) * 0.3;
        }

        // Scale the star with a pulse effect
        const scale = 1 + 0.2 * Math.sin(elapsed * 0.003);
        this.star.scale.set(scale, scale, scale);

        // Scale the ring with opposite pulse
        if (this.ring) {
            const ringScale = 1 + 0.2 * Math.sin(elapsed * 0.003 + Math.PI);
            this.ring.scale.set(ringScale, ringScale, ringScale);
        }

        // Check if we should transition to stats screen
        if (elapsed > this.options.transitionDelay && this.onGameCompletionStatsReady) {
            const callback = this.onGameCompletionStatsReady;
            this.onGameCompletionStatsReady = null; // Clear to prevent multiple calls
            callback();
            return true;
        }

        return false;
    }

    getGroup(): THREE.Group {
        return this.group;
    }

    dispose(): void {
        // Dispose of geometries and materials
        if (this.star) {
            this.star.geometry.dispose();
            this.star.material.dispose();
        }

        if (this.ring) {
            this.ring.geometry.dispose();
            this.ring.material.dispose();
        }

        if (this.overlay) {
            this.overlay.geometry.dispose();
            this.overlay.material.dispose();
        }
    }
}

export default GameCompletionDisplay;
