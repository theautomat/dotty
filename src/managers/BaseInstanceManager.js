import * as THREE from 'three';

/**
 * BaseInstanceManager.js - Abstract base class for managing THREE.InstancedMesh instances.
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

class BaseInstanceManager {
    /**
     * @param {THREE.Scene} scene - The main THREE.js scene.
     * @param {number} maxInstances - The maximum number of instances this manager will handle.
     * @param {string} managerName - A name for logging purposes (e.g., 'OreManager').
     */
    constructor(scene = null, maxInstances, managerName = 'BaseInstanceManager') {
        if (this.constructor === BaseInstanceManager) {
            throw new Error("Abstract classes can't be instantiated.");
        }
        this.scene = scene;
        this.maxInstances = maxInstances;
        this.managerName = managerName; // For logging

        // --- Properties expected to be initialized by derived classes ---
        // this.instancedMesh = null; // The THREE.InstancedMesh object
        // this.material = null;      // The THREE.Material used for the mesh
        // this.geometry = null;      // The THREE.BufferGeometry used for the mesh

        // --- Common internal state ---
        // Holds the logical data objects (e.g., Ore, Explosion instances)
        // Derived classes might use different structures (e.g., object for categories)
        this.data = new Array(this.maxInstances).fill(null);
        this.activeCount = 0;
        
        // Make the shared reusable objects accessible via instance properties
        // This provides a way for derived classes to access them
        this._reusableMatrix = _reusableMatrix;
        this._reusableQuaternion = _reusableQuaternion;
        this._reusablePosition = _reusablePosition;
        this._reusableScale = _reusableScale;

        // console.log(`[${this.managerName}] Initialized with maxInstances: ${this.maxInstances}`);
    }

    /**
     * Initialize the manager with a scene and any additional dependencies.
     * This is for convenience with singleton-pattern derived classes.
     * BaseInstanceManager itself is NOT a singleton - it's an abstract base class.
     * 
     * @param {Object} params - Initialization parameters
     * @param {THREE.Scene} params.scene - The scene to use if not already set
     * @returns {this} - The manager instance for chaining
     */
    init(params = {}) {
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
    _setupGeometryAndMaterial() {
        // This is just a placeholder - derived classes must implement this
        console.warn(`[${this.managerName}] _setupGeometryAndMaterial() not implemented by derived class`);
    }

    /**
     * Initializes the InstancedMesh. Derived classes MUST call this after
     * setting up their specific geometry and material.
     * @protected
     */
    _initializeMesh() {
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
        
        // console.log(`[${this.managerName}] Initialized InstancedMesh: visible=${this.instancedMesh.visible}, count=${this.instancedMesh.count}, maxInstances=${this.maxInstances}`);
        
        // Color might not be accessible if material doesn't have a color property
        let colorStr = "N/A";
        try {
            if (this.material && this.material.color) {
                colorStr = this.material.color.getHexString();
            }
        } catch (e) { /* Ignore errors accessing color */ }
        
        // console.log(`[${this.managerName}] Material details: color=${colorStr}, transparent=${this.material.transparent}, wireframe=${this.material.wireframe || false}`);
        
        // Check if the mesh was added to the scene correctly
        if (!this.scene.children.includes(this.instancedMesh)) {
            console.error(`[${this.managerName}] CRITICAL ERROR: InstancedMesh was NOT added to scene!`);
        }
    }

    /**
     * Clears all active instances managed by this manager.
     * Detaches logical objects, resets counts, and updates the mesh.
     * Derived classes managing complex structures (e.g., categories)
     * may need to override this method.
     */
    clearAll() {
        // console.log(`[${this.managerName}] Clearing all ${this.activeCount} instances...`);

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

        // console.log(`[${this.managerName}] Finished clearing instances.`);
    }

    /**
     * Adds a logical data object and updates the corresponding InstancedMesh.
     * Basic implementation using swap-with-last.
     * Derived classes might override for specific logic (e.g., categories).
     *
     * @param {object} dataObject - The logical data instance to add (e.g., Ore, Bullet). Must have position, rotation, scale properties.
     * @returns {number|null} The instance ID (index) or null if failed.
     */
    addInstance(dataObject) {
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
        // Ensure the object has position, rotation (Euler), and scale (Vector3)
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
        //console.log(`[${this.managerName}] Added instance ${index} (count: ${this.activeCount})`);
        return index;
    }

     /**
     * Removes an instance by swapping it with the last active instance.
     * Handles data swap, matrix swap, instance ID updates, and mesh updates.
     *
     * @param {number} indexToRemove - The index of the instance to remove.
     * @returns {object|null} The data object of the removed instance, or null if the index was invalid.
     */
    removeInstanceByIndex(indexToRemove) {
        if (!this.instancedMesh) {
            console.warn(`[${this.managerName}] removeInstance called but instancedMesh is not initialized.`);
            return null;
        }

        if (indexToRemove === null || indexToRemove === undefined || indexToRemove < 0 || indexToRemove >= this.activeCount || !this.data[indexToRemove]) {
            // console.warn(`[${this.managerName}] Instance (ID: ${dataObject.id || 'N/A'}) not found or already removed at index ${indexToRemove}.`);
            return null;
        }

        const lastActiveIndex = this.activeCount - 1;
        const removedDataObject = this.data[indexToRemove]; // Store the data before overwriting/clearing

        if (indexToRemove === lastActiveIndex) {
            // Removing the last one, just clear its data and hide the instance
            this.data[indexToRemove] = null;

            // Hide the instance at the last slot by scaling it to zero
            // Note: This might be unnecessary if mesh.count is strictly enforced, but safer.
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
        this.markMatricesForUpdate(); // Use the helper to mark matrix for update

        // Detach the removed object
        if (removedDataObject) {
        if ('manager' in removedDataObject) removedDataObject.manager = null;
        if ('instanceId' in removedDataObject) removedDataObject.instanceId = null;
        }

        //console.log(`[${this.managerName}] Removed instance from index ${indexToRemove}. Active count: ${this.activeCount}`);

        return removedDataObject; // Return the data of the instance that was removed
    }

    /**
     * Handles the basic lifecycle update for instances, specifically checking
     * for lifetime expiration and removing instances accordingly.
     * Iterates backwards for safe removal.
     * @protected 
     * @param {number} deltaTime - Time since the last frame.
     */
    _baseUpdateLifeCycle(deltaTime) {
        // let removed = false;
        // for (let i = this.activeCount - 1; i >= 0; i--) {
        //     const instanceData = this.data[i];
        //     if (instanceData && typeof instanceData.lifeRemaining === 'number') {
        //         instanceData.lifeRemaining -= deltaTime;
        //         if (instanceData.lifeRemaining <= 0) {
        //             this.removeInstanceByIndex(i);
        //             removed = true;
        //         }
        //     }
        // }
        // // Mark matrices for update if any instance was removed by lifetime check
        // if (removed) {
        //     this.markMatricesForUpdate();
        // }
    }

    /**
     * Updates the transform matrix for a specific instance.
     * Basic implementation. Derived classes might override.
     *
     * @param {object} dataObject - The logical data instance whose visual representation needs updating. Must have instanceId, position, rotation, scale.
     */
    updateInstanceTransform(dataObject) {
        const index = dataObject.instanceId;

         if (!this.instancedMesh) {
             // console.warn(`[${this.managerName}] updateInstanceTransform called but instancedMesh is not initialized.`);
             return;
         }

        if (index === null || index === undefined || index >= this.activeCount) {
            // Object might have been removed or not properly added
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

        // IMPORTANT: Flagging needsUpdate here is inefficient if called for many instances.
        // It's better to call this once per frame after all updates.
        // Consider adding a separate method like `finalizeUpdates()` to do this.
        // this.instancedMesh.instanceMatrix.needsUpdate = true;
        // We also need to signal that the logical object's transform has been synced
        if ('transformNeedsUpdate' in dataObject) {
             dataObject.transformNeedsUpdate = false;
        }
    }

    _updateInstanceTransformInternal(dataObject) {
        const index = dataObject.instanceId;

        if (!this.instancedMesh) {
            // console.warn(`[${this.managerName}] updateInstanceTransform called but instancedMesh is not initialized.`);
            return;
        }

        if (index === null || index === undefined || index >= this.activeCount) {
            // Object might have been removed or not properly added
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
      * @param {function(object, number):void} callback - Function to call for each active instance. Receives (instanceData, index).
      */
     forEachActiveInstance(callback) {
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
     markMatricesForUpdate() {
         if (this.instancedMesh) {
            this.instancedMesh.instanceMatrix.needsUpdate = true;
         }
     }


    /**
     * Main update loop for the manager.
     * Should be called each frame to update the state of managed objects.
     * @param {number} deltaTime - Time since the last frame.
     */
    update(deltaTime) {
        // Default implementation iterates and calls update on each instance if it exists
        this.forEachActiveInstance(instance => {
             if (typeof instance.update === 'function') {
                 instance.update(deltaTime);
                 
                 // If the instance flagged its transform needs update, sync it
                 if (instance.transformNeedsUpdate) {
                    // Call updateInstanceTransform but avoid redundant matrix flag
                    this._updateInstanceTransformInternal(instance);
                 }
             }
         });
         
        // Mark the whole mesh matrix as needing update once after processing all instances
        this.markMatricesForUpdate();
    }

    /**
     * Collects state data for all active instances, typically for networking or saving.
     * Derived classes should override this to return data in the desired format.
     * @returns {Array} An array of state data for active instances.
     */
    getAllInstanceDataForState() {
        const stateData = [];
        this.forEachActiveInstance(instanceData => {
             // Default: expects instance to have a 'getState()' method
             if (typeof instanceData.getState === 'function') {
                 stateData.push(instanceData.getState());
             } else {
                // Fallback: try to push the raw data object (might be too much)
                // console.warn(`[${this.managerName}] Instance missing getState() method.`);
                stateData.push({ id: instanceData.id, position: instanceData.position }); // Example minimal state
             }
        });
        return stateData;
    }

     dispose() {
         console.log(`[${this.managerName}] Disposing...`);
         if (this.instancedMesh) {
             this.scene.remove(this.instancedMesh);
             // Dispose geometry and material only if they are uniquely owned by this manager instance
             // If shared, disposal should happen elsewhere.
             // this.geometry.dispose(); // Be cautious with shared resources
             // this.material.dispose(); // Be cautious with shared resources
             if (this.geometry && typeof this.geometry.dispose === 'function') {
                // console.log(`[${this.managerName}] Disposing geometry...`);
                // this.geometry.dispose(); // Example: Only dispose if owned
             }
             if (this.material && typeof this.material.dispose === 'function') {
                // console.log(`[${this.managerName}] Disposing material...`);
                // this.material.dispose(); // Example: Only dispose if owned
             }
             this.instancedMesh = null;
             console.log(`[${this.managerName}] InstancedMesh removed from scene.`);
         }
         this.data = []; // Clear data array
         this.activeCount = 0;
         console.log(`[${this.managerName}] Disposed.`);
     }

}

export default BaseInstanceManager;
