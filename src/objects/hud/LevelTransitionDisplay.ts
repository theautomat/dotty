/**
 * LevelTransitionDisplay.ts - 3D HUD component for displaying level transitions
 * Shows the next level's primary ore as a visual indicator of progression
 */
import * as THREE from 'three';
import { LevelConfig } from '../../game/index';
import { CollectibleConfig, Collectible } from '../collectibles/index';
import soundManager from '../../managers/SoundManager';
import GeometryFactory from '../shapes/GeometryFactory';

interface LevelTransitionDisplayOptions {
    visible?: boolean;
    backgroundColor?: THREE.Color;
    opacity?: number;
}

interface PendingTransition {
    callback: () => void;
    sound: boolean;
    levelId: number;
}

class LevelTransitionDisplay {
    private options: Required<LevelTransitionDisplayOptions>;
    private group: THREE.Group;
    private container: THREE.Group;
    private oreScene: THREE.Scene | null;
    private oreCamera: THREE.PerspectiveCamera | null;
    private oreRenderer: THREE.WebGLRenderer | null;
    private oreTextureTarget: THREE.WebGLRenderTarget | null;
    private oreMesh: THREE.Mesh | null;
    private ore: any | null;
    private animationId: number | null;
    private transitionCallback: (() => void) | null;
    private transitionTimeout: ReturnType<typeof setTimeout> | null;
    private backgroundPanel: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial> | null;
    private pendingTransition: PendingTransition | null;

    constructor(options: LevelTransitionDisplayOptions = {}) {
        // Default options
        this.options = {
            visible: false,
            backgroundColor: new THREE.Color(0x000000),
            opacity: 0.8,
            ...options
        };

        this.group = new THREE.Group();
        this.group.visible = this.options.visible;

        // Create container for transition elements
        this.container = new THREE.Group();
        this.group.add(this.container);

        // For the ore display
        this.oreScene = null;
        this.oreCamera = null;
        this.oreRenderer = null;
        this.oreTextureTarget = null;
        this.oreMesh = null;
        this.ore = null;
        this.animationId = null;

        // Transition callback and timer
        this.transitionCallback = null;
        this.transitionTimeout = null;
        this.backgroundPanel = null;
        this.pendingTransition = null;

        // Create background panel
        this.createBackgroundPanel();

        // Create ore display area
        this.createOreDisplayArea();
    }

    private createBackgroundPanel(): void {
        // Create a larger panel with rounded corners
        const panelSize = { width: 8, height: 8 };
        const panelRadius = 0.4;

        // Create rounded rectangle shape
        const shape = new THREE.Shape();
        const width = panelSize.width;
        const height = panelSize.height;
        const radius = panelRadius;

        shape.moveTo(-width/2 + radius, -height/2);
        shape.lineTo(width/2 - radius, -height/2);
        shape.quadraticCurveTo(width/2, -height/2, width/2, -height/2 + radius);
        shape.lineTo(width/2, height/2 - radius);
        shape.quadraticCurveTo(width/2, height/2, width/2 - radius, height/2);
        shape.lineTo(-width/2 + radius, height/2);
        shape.quadraticCurveTo(-width/2, height/2, -width/2, height/2 - radius);
        shape.lineTo(-width/2, -height/2 + radius);
        shape.quadraticCurveTo(-width/2, -height/2, -width/2 + radius, -height/2);

        const geometry = new THREE.ShapeGeometry(shape);

        const material = new THREE.MeshBasicMaterial({
            color: this.options.backgroundColor,
            transparent: true,
            opacity: this.options.opacity,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });

        const panel = new THREE.Mesh(geometry, material);
        panel.position.z = -0.8;

        this.backgroundPanel = panel;
        this.group.add(panel);
    }

    private createOreDisplayArea(): void {
        const displaySize = 4;

        this.oreTextureTarget = new THREE.WebGLRenderTarget(1024, 1024, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat
        });

        const planeGeometry = new THREE.PlaneGeometry(displaySize, displaySize);
        const planeMaterial = new THREE.MeshBasicMaterial({
            map: this.oreTextureTarget.texture,
            transparent: true
        });

        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.container.add(plane);

        this.oreScene = new THREE.Scene();
        this.oreCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 50);
        this.oreCamera.position.z = 10;

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(1, 1, 1).normalize();
        this.oreScene.add(light);

        const ambientLight = new THREE.AmbientLight(0x555555);
        this.oreScene.add(ambientLight);
    }

    showNextLevelOre(nextLevelId: number, callback: () => void, duration: number = 3000, waitForClick: boolean = false): void {
        this.transitionCallback = callback;
        this.clearOreDisplay();

        const nextLevelConfig = LevelConfig.getLevelById(nextLevelId);
        if (!nextLevelConfig) return;

        if (waitForClick) {
            this.pendingTransition = {
                callback: callback,
                sound: false,
                levelId: nextLevelId
            };
            return;
        }

        this.createOrePreview(nextLevelConfig.primaryOreType);
        this.playOreRevealSound(nextLevelConfig.primaryOreType);
        this.show();

        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }

        this.transitionTimeout = setTimeout(() => {
            this.completeTransition();
        }, duration);
    }

    completeTransition(): void {
        this.hide();
        this.clearOreDisplay();
        this.playLevelBeginSound();

        if (typeof this.transitionCallback === 'function') {
            this.transitionCallback();
            this.transitionCallback = null;
        } else {
            console.warn("No transition callback found to complete transition");
        }

        this.pendingTransition = null;
    }

    handleClick(): boolean {
        if (!this.pendingTransition) {
            return false;
        }

        const levelId = this.pendingTransition.levelId || "unknown";
        this.completeTransition();
        return true;
    }

    private playLevelBeginSound(): void {
        try {
            soundManager.playLevelBegin();
        } catch (e) {
            console.log('Error playing level begin sound:', e);
        }
    }

    private playOreRevealSound(oreType: string): void {
        if (!oreType) return;

        try {
            switch(oreType) {
                case 'iron':
                    soundManager.playIronOreRevealed();
                    break;
                case 'copper':
                    soundManager.playCopperOreRevealed();
                    break;
                case 'silver':
                    soundManager.playSilverOreRevealed();
                    break;
                case 'gold':
                    soundManager.playGoldOreRevealed();
                    break;
                case 'platinum':
                    soundManager.playPlatinumOreRevealed();
                    break;
                default:
                    console.warn(`Unknown ore type: ${oreType} for level transition`);
            }
        } catch (e) {
            console.log('Error playing ore sound:', e);
        }
    }

    private createOrePreview(oreType: string): void {
        if (!this.oreScene) return;

        const oreConfig = CollectibleConfig.getCollectibleConfig(oreType);
        const originalSize = oreConfig ? oreConfig.size : 1.5;
        const displaySize = originalSize * 0.1;

        this.oreMesh = GeometryFactory.createCollectibleMesh(oreType, 'ore', {
            size: displaySize
        });

        this.oreMesh.position.set(0, 0, 0);
        this.oreScene.add(this.oreMesh);
        this.animateOre();
    }

    private animateOre(): void {
        if (this.oreMesh) {
            this.oreMesh.rotation.x = 0;
            this.oreMesh.rotation.y = 0;
        }
    }

    private clearOreDisplay(): void {
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }

        if (this.oreMesh) {
            if (this.oreMesh.geometry) {
                this.oreMesh.geometry.dispose();
            }
            if (this.oreMesh.material) {
                if (Array.isArray(this.oreMesh.material)) {
                    this.oreMesh.material.forEach(material => material.dispose());
                } else {
                    this.oreMesh.material.dispose();
                }
            }
            if (this.oreScene) {
                this.oreScene.remove(this.oreMesh);
            }
            this.oreMesh = null;
        }

        if (this.ore) {
            this.ore = null;
        }

        if (this.oreScene) {
            while(this.oreScene.children.length > 0) {
                const child = this.oreScene.children[0];
                this.oreScene.remove(child);
            }

            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(1, 1, 1).normalize();
            this.oreScene.add(light);

            const ambientLight = new THREE.AmbientLight(0x555555);
            this.oreScene.add(ambientLight);
        }
    }

    update(renderer: THREE.WebGLRenderer): void {
        if (!this.group.visible || !this.oreMesh || !this.oreScene || !this.oreCamera) {
            return;
        }

        if (this.oreMesh) {
            this.oreMesh.rotation.x += 0.01;
            this.oreMesh.rotation.y += 0.02;
        }

        const currentRenderTarget = renderer.getRenderTarget();
        if (this.oreTextureTarget) {
            renderer.setRenderTarget(this.oreTextureTarget);
            renderer.render(this.oreScene, this.oreCamera);
        }
        renderer.setRenderTarget(currentRenderTarget);
    }

    show(): void {
        this.group.visible = true;
    }

    hide(): void {
        this.group.visible = false;
    }

    getGroup(): THREE.Group {
        return this.group;
    }

    dispose(): void {
        this.clearOreDisplay();

        if (this.oreTextureTarget) {
            this.oreTextureTarget.dispose();
            this.oreTextureTarget = null;
        }

        if (this.backgroundPanel) {
            if (this.backgroundPanel.geometry) {
                this.backgroundPanel.geometry.dispose();
            }
            if (this.backgroundPanel.material) {
                this.backgroundPanel.material.dispose();
            }
        }

        this.transitionCallback = null;
    }
}

export default LevelTransitionDisplay;
