import * as THREE from 'three';

/**
 * BaseInstanceManager.ts - Abstract base class for managing THREE.InstancedMesh instances.
 * Provides common functionality for adding, removing, updating, and clearing instances.
 * Designed primarily for managers handling a single category/type of object per InstancedMesh.
 * Managers with more complex structures (like multiple categories) may need to override methods.
 */

/**
 * Shared reusable objects for efficient matrix operations across all instances
 * These variables are used to avoid creating new objects during every update
 * to minimize garbage collection and improve performance.
 *
 * Child classes should use the instance properties (this._reusableMatrix, etc.)
 * in their update methods to avoid creating new objects.
 */
// Reusable Matrix4 for composing transforms
const _reusableMatrix = new THREE.Matrix4();
// Reusable Quaternion for rotation conversion
const _reusableQuaternion = new THREE.Quaternion();
// Reusable Vector3 for position operations
const _reusablePosition = new THREE.Vector3();
// Reusable Vector3 for scale operations
const _reusableScale = new THREE.Vector3(1, 1, 1);

interface InitParams {
  scene?: THREE.Scene | null;
}

/**
 * Interface for objects that can be managed by BaseInstanceManager
 */
interface ManagedInstance {
  instanceId?: number | null;
  manager?: any;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
  transformNeedsUpdate?: boolean;
  lifeRemaining?: number;
  id?: string;
  update?(deltaTime: number): boolean | void;
  getState?(): any;
}

abstract class BaseInstanceManager<T extends ManagedInstance = ManagedInstance> {
  protected scene: THREE.Scene | null;
  protected maxInstances: number;
  protected managerName: string;

  // Properties expected to be initialized by derived classes
  protected instancedMesh?: THREE.InstancedMesh;
  protected material?: THREE.Material;
  protected geometry?: THREE.BufferGeometry;

  // Common internal state
  protected data: (T | null)[];
  protected activeCount: number;

  // Shared reusable objects accessible via instance properties
  protected _reusableMatrix: THREE.Matrix4;
  protected _reusableQuaternion: THREE.Quaternion;
  protected _reusablePosition: THREE.Vector3;
  protected _reusableScale: THREE.Vector3;

  /**
   * @param scene - The main THREE.js scene.
   * @param maxInstances - The maximum number of instances this manager will handle.
   * @param managerName - A name for logging purposes (e.g., 'OreManager').
   */
  constructor(scene: THREE.Scene | null = null, maxInstances: number, managerName: string = 'BaseInstanceManager') {
    if (this.constructor === BaseInstanceManager) {
      throw new Error("Abstract classes can't be instantiated.");
    }
    this.scene = scene;
    this.maxInstances = maxInstances;
    this.managerName = managerName;

    // Holds the logical data objects (e.g., Ore, Explosion instances)
    this.data = new Array(this.maxInstances).fill(null);
    this.activeCount = 0;

    // Make the shared reusable objects accessible via instance properties
    this._reusableMatrix = _reusableMatrix;
    this._reusableQuaternion = _reusableQuaternion;
    this._reusablePosition = _reusablePosition;
    this._reusableScale = _reusableScale;
  }

  /**
   * Initialize the manager with a scene and any additional dependencies.
   * This is for convenience with singleton-pattern derived classes.
   *
   * @param params - Initialization parameters
   * @returns The manager instance for chaining
   */
  init(params: InitParams = {}): this {
    if (params.scene && !this.scene) {
      this.scene = params.scene;
    }

    // Set up geometry and material - derived classes should override this
    if (!this.instancedMesh && this.scene) {
      this._setupGeometryAndMaterial();
      this._initializeMesh();
    }

    return this;
  }

  /**
   * Sets up geometry and material for this manager.
   * Derived classes MUST override this method to create their specific geometry and material.
   * @protected
   */
  protected abstract _setupGeometryAndMaterial(): void;

  /**
   * Initializes the InstancedMesh. Derived classes MUST call this after
   * setting up their specific geometry and material.
   * @protected
   */
  protected _initializeMesh(): void {
    if (!this.scene || !this.geometry || !this.material) {
      console.error(`[${this.managerName}] Cannot initialize mesh: Missing scene, geometry or material`);
      return;
    }

    // Create a new instanced mesh with the provided geometry and material
    this.instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.maxInstances
    );

    // Set dynamic usage for efficient updates
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Set the initial instance count to 0 (no instances yet)
    this.instancedMesh.count = 0;

    // Ensure the mesh is visible
    this.instancedMesh.visible = true;
    this.instancedMesh.frustumCulled = false; // Disable frustum culling for testing

    // Add the instanced mesh to the scene
    this.scene.add(this.instancedMesh);

    // Check if the mesh was added to the scene correctly
    if (!this.scene.children.includes(this.instancedMesh)) {
      console.error(`[${this.managerName}] CRITICAL ERROR: InstancedMesh was NOT added to scene!`);
    }
  }

  /**
   * Clears all active instances managed by this manager.
   * Detaches logical objects, resets counts, and updates the mesh.
   */
  clearAll(): void {
    if (!this.instancedMesh) {
      console.warn(`[${this.managerName}] clearAll called but instancedMesh is not initialized.`);
      return;
    }

    // Detach logical objects first
    for (let i = 0; i < this.activeCount; i++) {
      const instanceData = this.data[i];
      if (instanceData) {
        // Assume managed objects have 'manager' and 'instanceId' properties
        if ('manager' in instanceData) instanceData.manager = null;
        if ('instanceId' in instanceData) instanceData.instanceId = null;
        this.data[i] = null; // Clear the data slot
      }
    }

    // Reset counts and update mesh
    this.activeCount = 0;
    this.instancedMesh.count = 0;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Adds a logical data object and updates the corresponding InstancedMesh.
   *
   * @param dataObject - The logical data instance to add. Must have position, rotation, scale properties.
   * @returns The instance ID (index) or null if failed.
   */
  addInstance(dataObject: T): number | null {
    if (!this.instancedMesh) {
      console.error(`[${this.managerName}] Cannot add instance, mesh not initialized.`);
      return null;
    }

    const index = this.activeCount;

    if (index >= this.maxInstances) {
      console.warn(`[${this.managerName}] Max instances (${this.maxInstances}) reached.`);
      return null;
    }

    // Store the logical data
    this.data[index] = dataObject;

    // Assign instanceId and manager back to the object
    if ('instanceId' in dataObject) dataObject.instanceId = index;
    if ('manager' in dataObject) dataObject.manager = this;

    // Update the visual representation (InstancedMesh)
    const position = dataObject.position || this._reusablePosition.set(0, 0, 0);
    const rotation = dataObject.rotation || new THREE.Euler();
    const scale = dataObject.scale || this._reusableScale.set(1, 1, 1);

    // Use the instance properties for reusable objects
    this._reusableQuaternion.setFromEuler(rotation);
    this._reusableMatrix.compose(position, this._reusableQuaternion, scale);

    this.instancedMesh.setMatrixAt(index, this._reusableMatrix);
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    // Increment active count and update mesh count
    this.activeCount++;
    this.instancedMesh.count = this.activeCount;

    return index;
  }

  /**
   * Removes an instance by swapping it with the last active instance.
   *
   * @param indexToRemove - The index of the instance to remove.
   * @returns The data object of the removed instance, or null if the index was invalid.
   */
  removeInstanceByIndex(indexToRemove: number): T | null {
    if (!this.instancedMesh) {
      console.warn(`[${this.managerName}] removeInstance called but instancedMesh is not initialized.`);
      return null;
    }

    if (indexToRemove === null || indexToRemove === undefined || indexToRemove < 0 || indexToRemove >= this.activeCount || !this.data[indexToRemove]) {
      return null;
    }

    const lastActiveIndex = this.activeCount - 1;
    const removedDataObject = this.data[indexToRemove];

    if (indexToRemove === lastActiveIndex) {
      // Removing the last one, just clear its data and hide the instance
      this.data[indexToRemove] = null;

      // Hide the instance at the last slot by scaling it to zero
      const matrix = new THREE.Matrix4();
      matrix.identity().scale(new THREE.Vector3(0, 0, 0));
      this.instancedMesh.setMatrixAt(lastActiveIndex, matrix);
    } else {
      // Swap:
      const matrix = new THREE.Matrix4();
      const lastDataObject = this.data[lastActiveIndex];

      // 1. Copy matrix of the last instance to the slot being removed
      this.instancedMesh.getMatrixAt(lastActiveIndex, matrix);
      this.instancedMesh.setMatrixAt(indexToRemove, matrix);

      // 2. Move the logical data of the last instance to the removed slot
      this.data[indexToRemove] = lastDataObject;
      // Update the moved object's instanceId
      if (lastDataObject && 'instanceId' in lastDataObject) {
        lastDataObject.instanceId = indexToRemove;
      }

      // 3. Clear the data from the last slot
      this.data[lastActiveIndex] = null;

      // 4. Hide the instance at the last slot by scaling its matrix to zero
      matrix.identity().scale(new THREE.Vector3(0, 0, 0));
      this.instancedMesh.setMatrixAt(lastActiveIndex, matrix);
    }

    // Decrement active count and update mesh count
    this.activeCount--;
    this.instancedMesh.count = this.activeCount;
    this.markMatricesForUpdate();

    // Detach the removed object
    if (removedDataObject) {
      if ('manager' in removedDataObject) removedDataObject.manager = null;
      if ('instanceId' in removedDataObject) removedDataObject.instanceId = null;
    }

    return removedDataObject;
  }

  /**
   * Handles the basic lifecycle update for instances, specifically checking
   * for lifetime expiration and removing instances accordingly.
   * @protected
   * @param deltaTime - Time since the last frame.
   */
  protected _baseUpdateLifeCycle(deltaTime: number): void {
    // Commented out in original - placeholder for derived classes
  }

  /**
   * Updates the transform matrix for a specific instance.
   *
   * @param dataObject - The logical data instance whose visual representation needs updating.
   */
  updateInstanceTransform(dataObject: T): void {
    const index = dataObject.instanceId;

    if (!this.instancedMesh) {
      return;
    }

    if (index === null || index === undefined || index >= this.activeCount) {
      return;
    }

    // Update the matrix based on the logical object's current state
    const position = dataObject.position || this._reusablePosition.set(0, 0, 0);
    const rotation = dataObject.rotation || new THREE.Euler();
    const scale = dataObject.scale || this._reusableScale.set(1, 1, 1);

    // Use the instance properties for reusable objects
    this._reusableQuaternion.setFromEuler(rotation);
    this._reusableMatrix.compose(position, this._reusableQuaternion, scale);

    this.instancedMesh.setMatrixAt(index, this._reusableMatrix);

    // Signal that the logical object's transform has been synced
    if ('transformNeedsUpdate' in dataObject) {
      dataObject.transformNeedsUpdate = false;
    }
  }

  protected _updateInstanceTransformInternal(dataObject: T): void {
    const index = dataObject.instanceId;

    if (!this.instancedMesh) {
      return;
    }

    if (index === null || index === undefined || index >= this.activeCount) {
      return;
    }

    // Update the matrix based on the logical object's current state
    const position = dataObject.position || this._reusablePosition.set(0, 0, 0);
    const rotation = dataObject.rotation || new THREE.Euler();
    const scale = dataObject.scale || this._reusableScale.set(1, 1, 1);

    // Use the instance properties for reusable objects
    this._reusableQuaternion.setFromEuler(rotation);
    this._reusableMatrix.compose(position, this._reusableQuaternion, scale);

    this.instancedMesh.setMatrixAt(index, this._reusableMatrix);
  }

  /**
   * Iterates through all active instances and calls a callback function.
   * @param callback - Function to call for each active instance.
   */
  forEachActiveInstance(callback: (instanceData: T, index: number) => void): void {
    for (let i = 0; i < this.activeCount; i++) {
      const instanceData = this.data[i];
      if (instanceData) {
        callback(instanceData, i);
      }
    }
  }

  /**
   * Marks the instance matrix for update. Should be called once per frame
   * after all individual instance updates are done.
   */
  markMatricesForUpdate(): void {
    if (this.instancedMesh) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * Main update loop for the manager.
   * Should be called each frame to update the state of managed objects.
   * @param deltaTime - Time since the last frame.
   */
  update(deltaTime: number): void {
    // Default implementation iterates and calls update on each instance if it exists
    this.forEachActiveInstance(instance => {
      if (typeof instance.update === 'function') {
        instance.update(deltaTime);

        // If the instance flagged its transform needs update, sync it
        if (instance.transformNeedsUpdate) {
          this._updateInstanceTransformInternal(instance);
        }
      }
    });

    // Mark the whole mesh matrix as needing update once after processing all instances
    this.markMatricesForUpdate();
  }

  /**
   * Collects state data for all active instances, typically for networking or saving.
   * @returns An array of state data for active instances.
   */
  getAllInstanceDataForState(): any[] {
    const stateData: any[] = [];
    this.forEachActiveInstance(instanceData => {
      // Default: expects instance to have a 'getState()' method
      if (typeof instanceData.getState === 'function') {
        stateData.push(instanceData.getState());
      } else {
        // Fallback: minimal state
        stateData.push({ id: instanceData.id, position: instanceData.position });
      }
    });
    return stateData;
  }

  dispose(): void {
    console.log(`[${this.managerName}] Disposing...`);
    if (this.instancedMesh && this.scene) {
      this.scene.remove(this.instancedMesh);

      if (this.geometry && typeof this.geometry.dispose === 'function') {
        // Uncomment if geometry is uniquely owned
        // this.geometry.dispose();
      }
      if (this.material && typeof this.material.dispose === 'function') {
        // Uncomment if material is uniquely owned
        // this.material.dispose();
      }
      this.instancedMesh = undefined;
      console.log(`[${this.managerName}] InstancedMesh removed from scene.`);
    }
    this.data = [];
    this.activeCount = 0;
    console.log(`[${this.managerName}] Disposed.`);
  }
}

export default BaseInstanceManager;
export type { ManagedInstance };
