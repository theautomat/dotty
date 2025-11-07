import * as THREE from 'three';
import BaseInstanceManager from './BaseInstanceManager';
import GameTheme from '../game/GameTheme';
import ExplosionFragment from '../objects/ExplosionFragment';

// Maximum number of particles to support
const MAX_PARTICLES = 3000;

// Type for geometry keys
type GeometryType = 'cube' | 'tetra' | 'sphere' | 'plane';

// Predefine geometries for different types of debris/particles
const GEOMETRIES: Record<GeometryType, THREE.BufferGeometry> = {
    // Default fragment geometry (small cube)
    cube: new THREE.BoxGeometry(0.15, 0.15, 0.15),
    // Tetrahedron for sharper fragments - slightly larger for better visibility
    tetra: new THREE.TetrahedronGeometry(0.25),
    // Sphere for smoother particles (like bubbles, sparks)
    sphere: new THREE.SphereGeometry(0.15, 4, 4),
    // Flat shape for effects like leaves, paper
    plane: new THREE.PlaneGeometry(0.15, 0.15)
};

// Fragment count range interface
interface FragmentCountRange {
    MIN: number;
    MAX: number;
}

// Fragment count ranges for different explosion types
const FRAGMENT_COUNT: Record<string, FragmentCountRange> = {
    // Default explosion fragments
    DEFAULT: {
        MIN: 20,
        MAX: 30
    },
    // Debris field (fewer, longer lasting)
    DEBRIS: {
        MIN: 15,
        MAX: 25
    },
    // Particle burst (many, short-lived)
    BURST: {
        MIN: 10,
        MAX: 20
    }
};

// Reusable objects for particle creation
const _reusableColor = new THREE.Color();
const _reusableVector = new THREE.Vector3();

// Options interface for ExplosionManager constructor
interface ExplosionManagerOptions {
    defaultGeometry?: GeometryType;
    wireframe?: boolean;
}

// Options interface for createExplosion method
interface ExplosionOptions {
    fragmentColor?: number | THREE.Color;
}

/**
 * ExplosionManager - Manages all explosion particles directly
 */
class ExplosionManager extends BaseInstanceManager<ExplosionFragment> {
    private defaultGeometryType: GeometryType;
    private geometries: Record<GeometryType, THREE.BufferGeometry>;
    private options: ExplosionManagerOptions;

    /**
     * Constructor for ExplosionManager
     * @param scene - The scene to add effects to
     * @param options - Optional configuration
     */
    constructor(scene: THREE.Scene | null = null, options: ExplosionManagerOptions = {}) {
        // Call the BaseInstanceManager constructor with scene, max instances, and manager name
        super(scene, MAX_PARTICLES, 'ExplosionManager');

        // Use tetrahedron by default for more chaotic/retro explosion look
        this.defaultGeometryType = options.defaultGeometry || 'tetra';

        // Set available geometries as properties for internal use
        this.geometries = GEOMETRIES;

        // Store options for initialization
        this.options = options;
    }

    /**
     * Sets up geometry and material for explosion manager.
     * This is called by BaseInstanceManager's init() method.
     * @protected
     * @override
     */
    protected _setupGeometryAndMaterial(): void {
        // Use the specified default geometry
        this.geometry = this.geometries[this.defaultGeometryType];

        // Create material that will support instance colors
        this.material = new THREE.MeshBasicMaterial({
            wireframe: this.options.wireframe !== undefined ? this.options.wireframe : true,
            color: 0xffffff,
        });

    }

    /**
     * Override _initializeMesh to add color attribute
     * @protected
     * @override
     */
    protected _initializeMesh(): void {
        // Call parent method to create the basic instanced mesh
        super._initializeMesh();

        // Add color attribute to the instancedMesh
        if (this.instancedMesh) {
            this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
                new Float32Array(MAX_PARTICLES * 3), // RGB values for each instance
                3
            );
        }
    }

    /**
     * Creates an explosion by directly generating and adding multiple fragments
     * @param position - The position to create the explosion at
     * @param size - The size of the explosion
     * @param options - Optional customization for the explosion
     * @returns The IDs of the created fragment particles
     */
    createExplosion(position: THREE.Vector3, size: number, options: ExplosionOptions = {}): string[] {

        // Get fragment color (only required option)
        const fragmentColor = options.fragmentColor || 0xffffff; // Bright orange-red default


        // Convert color to THREE.Color if needed
        const color = fragmentColor instanceof THREE.Color ?
            fragmentColor : _reusableColor.set(fragmentColor);

        // Determine random fragment count within range
        const fragmentCount = Math.floor(
            FRAGMENT_COUNT.DEFAULT.MIN +
            Math.random() * (FRAGMENT_COUNT.DEFAULT.MAX - FRAGMENT_COUNT.DEFAULT.MIN)
        );

        // Array to track the fragment IDs
        const fragmentIds: string[] = [];


        // Generate fragments
        for (let i = 0; i < fragmentCount; i++) {
            // Create fragment using the factory with minimal parameters
            const fragment = ExplosionFragment.create(position, size, {
                color: color
            });

            // Add fragment to the instance manager using parent's method
            const instanceId = this.addInstance(fragment);

            // If successfully added, update color and add to tracking
            if (instanceId !== null) {
                // Set color on the instanced mesh
                if (this.instancedMesh && this.instancedMesh.instanceColor) {
                    this.instancedMesh.setColorAt(instanceId, color);
                    this.instancedMesh.instanceColor.needsUpdate = true;
                }

                // Store fragment ID for return
                fragmentIds.push(fragment.id);
            }
        }

        return fragmentIds;
    }

    /**
     * Creates a debris field effect with custom parameters
     * @param position - Center position of the debris field
     * @param size - Overall size/radius of the debris field
     * @param options - Configuration options
     * @returns The IDs of the created fragment particles
     */
    /*
    createDebrisField(position: THREE.Vector3, size: number, options: ExplosionOptions = {}): number[] {
        // Only need color option
        const fragmentColor = options.color || 0xaaaaaa;

        // Determine random fragment count within debris range
        const fragmentCount = Math.floor(
            FRAGMENT_COUNT.DEBRIS.MIN +
            Math.random() * (FRAGMENT_COUNT.DEBRIS.MAX - FRAGMENT_COUNT.DEBRIS.MIN)
        );

        // Array to track fragments
        const fragmentIds: number[] = [];

        // Convert color
        const color = fragmentColor instanceof THREE.Color ?
            fragmentColor : _reusableColor.set(fragmentColor);

        // Generate fragments
        for (let i = 0; i < fragmentCount; i++) {
            // Create fragment
            const fragment = ExplosionFragment.create(position, size, {
                color: color
            });

            // Add to manager
            const instanceId = this.addInstance(fragment);

            // Track if successfully added
            if (instanceId !== null) {
                if (this.instancedMesh && this.instancedMesh.instanceColor) {
                    this.instancedMesh.setColorAt(instanceId, color);
                    this.instancedMesh.instanceColor.needsUpdate = true;
                }
                fragmentIds.push(instanceId);
            }
        }

        return fragmentIds;
    }
    */

    /**
     * Creates a particle burst with custom parameters
     * @param position - The center of the burst
     * @param options - Configuration options
     * @returns The IDs of the created particles
     */
    /*
    createParticleBurst(position: THREE.Vector3, options: ExplosionOptions = {}): number[] {
        // Only need color and size options
        const fragmentColor = options.color || 0xffffff;
        const burstSize = options.size || 0.5;

        // Determine random fragment count within burst range
        const fragmentCount = Math.floor(
            FRAGMENT_COUNT.BURST.MIN +
            Math.random() * (FRAGMENT_COUNT.BURST.MAX - FRAGMENT_COUNT.BURST.MIN)
        );

        // Array to track fragments
        const fragmentIds: number[] = [];

        // Convert color
        const color = fragmentColor instanceof THREE.Color ?
            fragmentColor : _reusableColor.set(fragmentColor);

        // Generate fragments
        for (let i = 0; i < fragmentCount; i++) {
            // Create fragment
            const fragment = ExplosionFragment.create(position, burstSize, {
                color: color
            });

            // Add to manager
            const instanceId = this.addInstance(fragment);

            // Track if successfully added
            if (instanceId !== null) {
                if (this.instancedMesh && this.instancedMesh.instanceColor) {
                    this.instancedMesh.setColorAt(instanceId, color);
                    this.instancedMesh.instanceColor.needsUpdate = true;
                }
                fragmentIds.push(instanceId);
            }
        }

        return fragmentIds;
    }
    */

    /**
     * Updates all particles managed by this manager
     * @param deltaTime - Time elapsed since last frame
     * @override
     */
    update(deltaTime: number): void {
        // Track fragments that need to be removed
        const deadFragmentIds: number[] = [];

        // Use the parent class's forEach method to iterate through all instances
        this.forEachActiveInstance((fragment, index) => {
            if (!fragment) return;

            // Update fragment physics and lifecycle
            const isAlive = fragment.update(deltaTime);

            if (!isAlive) {
                // If fragment has expired, mark for removal
                deadFragmentIds.push(index);
            } else if (fragment.transformNeedsUpdate) {
                // If transform needs update, update the instanced mesh
                this._updateInstanceTransformInternal(fragment);
                fragment.transformNeedsUpdate = false;
            }
        });

        // Remove dead fragments (in reverse order to avoid index issues)
        for (let i = deadFragmentIds.length - 1; i >= 0; i--) {
            const index = deadFragmentIds[i];
            // Use parent's method to remove instance by index
            this.removeInstanceByIndex(index);
        }

        // Let parent update the matrices
        this.markMatricesForUpdate();

        // Update instance color buffer if needed
        if (this.instancedMesh && this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }
    }

    /**
     * Disposes of all resources
     * @override
     */
    dispose(): void {
        // Call the parent dispose method first
        super.dispose();

        // Clear geometries
        Object.values(this.geometries).forEach(geometry => {
            geometry.dispose();
        });

        this.geometries = {} as Record<GeometryType, THREE.BufferGeometry>;
    }
}

// Create and export a singleton instance
const explosionManager = new ExplosionManager();
export default explosionManager;
