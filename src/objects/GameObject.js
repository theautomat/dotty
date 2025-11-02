/**
 * GameObject.js - Base class for all game objects
 * 
 * Provides a consistent interface for object lifecycle management:
 * - Creation
 * - Updates
 * - Removal and memory cleanup
 */
import { isOutsideWorldBoundary } from '../utils/WorldUtils.js';

class GameObject {
    constructor(scene) {
        if (this.constructor === GameObject) {
            throw new Error("GameObject is an abstract class and cannot be instantiated directly");
        }
        
        this.scene = scene;
        this.mesh = null;
        
        // Generate a unique ID for this game object
        this.id = this.generateId();
    }
    
    /**
     * Generate a unique ID for this object
     * @returns {string} A unique identifier
     */
    generateId() {
        const prefix = this.constructor.name.toLowerCase();
        return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }
    
    /**
     * Update the object's state for the current frame
     * @returns {boolean} - Whether the object should remain in the game
     */
    update(deltaTime) {
        // Base implementation returns true (keep the object)
        // Should be overridden by subclasses
        return true;
    }
    
    /**
     * Check if this object is outside the world boundary
     * @param {number} [extraMargin=0] - Optional extra margin to apply
     * @returns {boolean} True if the object is outside the boundary
     */
    checkBoundaries(extraMargin = 0) {
        if (!this.mesh) return;
        
        if (isOutsideWorldBoundary(this.mesh.position, extraMargin)) {
            this.destroy();
        }
    }
    
    /**
     * Destroy the object and clean up resources without removing from scene
     * Scene removal is now handled by the manager classes
     */
    destroy() {
        // Clean up resources but don't remove from scene
        if (this.mesh) {
            // Clean up geometry
            if (this.mesh.geometry) {
                this.mesh.geometry.dispose();
            }
            
            // Clean up materials (handling both single and array cases)
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(material => material.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
            
            // Clear any references in userData
            if (this.mesh.userData) {
                this.mesh.userData = {};
            }
            
            // Note: We no longer remove from scene here
            // this.scene.remove(this.mesh) is handled by managers
        }
    }
    
    /**
     * Remove the object from the scene
     * This is called by manager classes, not by the object itself
     */
    // removeFromScene() {
    //     if (this.mesh && this.scene) {
    //         this.scene.remove(this.mesh);
    //     }
    // }
    
    /**
     * Get the mesh for collision detection or rendering
     * @returns {THREE.Mesh|null} - The object's mesh
     */
    getMesh() {
        return this.mesh;
    }
    
    /**
     * Get the position of the game object
     * @returns {THREE.Vector3} - The object's position
     */
    getPosition() {
        return this.mesh ? this.mesh.position.clone() : new THREE.Vector3();
    }
    
    // isActive method removed - no longer needed
    
    /**
     * Utility method to dispose all resources in an array of objects
     * @param {Array} objects - Array of objects with geometry and material
     */
    static disposeObjects(objects) {
        if (!objects || !Array.isArray(objects)) return;
        
        for (const obj of objects) {
            if (!obj) continue;
            
            // Remove from scene if it has a parent
            if (obj.parent) {
                obj.parent.remove(obj);
            }
            
            // Dispose geometry
            if (obj.geometry) {
                obj.geometry.dispose();
            }
            
            // Dispose material(s)
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(material => material.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        }
    }
}

export default GameObject;