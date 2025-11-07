/**
 * WorldBoundary.js
 * Creates a 3D grid cube to represent the boundary of the game world
 * Also handles out-of-bounds detection and warnings
 */
import soundManager from '../managers/SoundManager';
import GameConfig from '../game/GameConfig'; // Import GameConfig for global settings

class WorldBoundary {
    constructor(scene, size = GameConfig.world.size) {
        this.scene = scene;
        this.size = size;
        this.visible = false;
        this.boundaryGroup = null;
        
        // Out-of-bounds tracking
        this.safeDistance = size / 2; // Safe playing area is half the size
        this.warningDistance = 50; // Start warning when within 50 units of boundary
        this.outOfBoundsTime = 0;
        this.outOfBoundsWarningActive = false;
        this.outOfBoundsDeathTimer = 10000; // 10 seconds outside boundary = death
        this.outOfBoundsLastFlash = 0;
        this.outOfBoundsFlashInterval = 500; // Flash every 500ms
        
        this.create();
    }
    
    create() {
        // Create a group to hold all boundary lines
        this.boundaryGroup = new THREE.Group();
        
        // Line material with light blue color for visibility
        const material = new THREE.LineBasicMaterial({ 
            color: 0x00aaff, 
            transparent: true, 
            opacity: 0.3 
        });
        
        // Define the grid spacing - sparse to avoid performance issues
        const gridStep = this.size / 10; // More sparse lines for larger world
        const halfSize = this.size / 2;
        
        // Create grid lines ONLY on the six faces of the cube
        for (let i = -halfSize; i <= halfSize; i += gridStep) {
            // Only draw lines when we're exactly on a face
            
            // Lines on bottom face (y = -halfSize)
            this.addLine(
                new THREE.Vector3(i, -halfSize, -halfSize), 
                new THREE.Vector3(i, -halfSize, halfSize), 
                material
            );
            this.addLine(
                new THREE.Vector3(-halfSize, -halfSize, i), 
                new THREE.Vector3(halfSize, -halfSize, i), 
                material
            );
            
            // Lines on top face (y = halfSize)
            this.addLine(
                new THREE.Vector3(i, halfSize, -halfSize), 
                new THREE.Vector3(i, halfSize, halfSize), 
                material
            );
            this.addLine(
                new THREE.Vector3(-halfSize, halfSize, i), 
                new THREE.Vector3(halfSize, halfSize, i), 
                material
            );
            
            // Lines on left face (x = -halfSize)
            this.addLine(
                new THREE.Vector3(-halfSize, i, -halfSize), 
                new THREE.Vector3(-halfSize, i, halfSize), 
                material
            );
            this.addLine(
                new THREE.Vector3(-halfSize, -halfSize, i), 
                new THREE.Vector3(-halfSize, halfSize, i), 
                material
            );
            
            // Lines on right face (x = halfSize)
            this.addLine(
                new THREE.Vector3(halfSize, i, -halfSize), 
                new THREE.Vector3(halfSize, i, halfSize), 
                material
            );
            this.addLine(
                new THREE.Vector3(halfSize, -halfSize, i), 
                new THREE.Vector3(halfSize, halfSize, i), 
                material
            );
            
            // Lines on back face (z = -halfSize)
            this.addLine(
                new THREE.Vector3(-halfSize, i, -halfSize), 
                new THREE.Vector3(halfSize, i, -halfSize), 
                material
            );
            this.addLine(
                new THREE.Vector3(i, -halfSize, -halfSize), 
                new THREE.Vector3(i, halfSize, -halfSize), 
                material
            );
            
            // Lines on front face (z = halfSize)
            this.addLine(
                new THREE.Vector3(-halfSize, i, halfSize), 
                new THREE.Vector3(halfSize, i, halfSize), 
                material
            );
            this.addLine(
                new THREE.Vector3(i, -halfSize, halfSize), 
                new THREE.Vector3(i, halfSize, halfSize), 
                material
            );
        }
        
        // Add additional lines for the cube edges with a different color
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xff3300 });
        
        // Bottom face edges
        this.addLine(
            new THREE.Vector3(-this.size/2, -this.size/2, -this.size/2), 
            new THREE.Vector3(this.size/2, -this.size/2, -this.size/2), 
            edgeMaterial
        );
        this.addLine(
            new THREE.Vector3(this.size/2, -this.size/2, -this.size/2), 
            new THREE.Vector3(this.size/2, -this.size/2, this.size/2), 
            edgeMaterial
        );
        this.addLine(
            new THREE.Vector3(this.size/2, -this.size/2, this.size/2), 
            new THREE.Vector3(-this.size/2, -this.size/2, this.size/2), 
            edgeMaterial
        );
        this.addLine(
            new THREE.Vector3(-this.size/2, -this.size/2, this.size/2), 
            new THREE.Vector3(-this.size/2, -this.size/2, -this.size/2), 
            edgeMaterial
        );
        
        // Top face edges
        this.addLine(
            new THREE.Vector3(-this.size/2, this.size/2, -this.size/2), 
            new THREE.Vector3(this.size/2, this.size/2, -this.size/2), 
            edgeMaterial
        );
        this.addLine(
            new THREE.Vector3(this.size/2, this.size/2, -this.size/2), 
            new THREE.Vector3(this.size/2, this.size/2, this.size/2), 
            edgeMaterial
        );
        this.addLine(
            new THREE.Vector3(this.size/2, this.size/2, this.size/2), 
            new THREE.Vector3(-this.size/2, this.size/2, this.size/2), 
            edgeMaterial
        );
        this.addLine(
            new THREE.Vector3(-this.size/2, this.size/2, this.size/2), 
            new THREE.Vector3(-this.size/2, this.size/2, -this.size/2), 
            edgeMaterial
        );
        
        // Vertical edges
        this.addLine(
            new THREE.Vector3(-this.size/2, -this.size/2, -this.size/2), 
            new THREE.Vector3(-this.size/2, this.size/2, -this.size/2), 
            edgeMaterial
        );
        this.addLine(
            new THREE.Vector3(this.size/2, -this.size/2, -this.size/2), 
            new THREE.Vector3(this.size/2, this.size/2, -this.size/2), 
            edgeMaterial
        );
        this.addLine(
            new THREE.Vector3(this.size/2, -this.size/2, this.size/2), 
            new THREE.Vector3(this.size/2, this.size/2, this.size/2), 
            edgeMaterial
        );
        this.addLine(
            new THREE.Vector3(-this.size/2, -this.size/2, this.size/2), 
            new THREE.Vector3(-this.size/2, this.size/2, this.size/2), 
            edgeMaterial
        );
        
        // Add the boundary group to the scene but make it invisible initially
        this.scene.add(this.boundaryGroup);
        this.boundaryGroup.visible = this.visible;
    }
    
    // Helper function to create a line and add it to the boundaryGroup
    addLine(start, end, material) {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const line = new THREE.Line(geometry, material);
        this.boundaryGroup.add(line);
    }
    
    // Toggle world boundary visibility
    toggle() {
        this.visible = !this.visible;
        this.boundaryGroup.visible = this.visible;
        return this.visible;
    }
    
    // Set world boundary visibility
    setVisible(isVisible) {
        this.visible = isVisible;
        this.boundaryGroup.visible = this.visible;
    }
    
    // Remove from scene
    remove() {
        if (this.boundaryGroup) {
            this.scene.remove(this.boundaryGroup);
            // Clean up geometries and materials
            this.boundaryGroup.children.forEach(line => {
                line.geometry.dispose();
                if (line.material) {
                    line.material.dispose();
                }
            });
        }
    }
    
    /**
     * Check if player is out of bounds and handle warning/death
     * @param {THREE.Vector3} playerPosition - The player's current position
     * @param {HUD} hud - Reference to the HUD for flashing the screen
     * @returns {boolean} - True if player is outside boundary and should die
     */
    checkOutOfBounds(playerPosition, hud) {
        // Skip if no HUD is provided
        if (!hud) return false;
        
        // Calculate distance from origin (center of playable area)
        const distanceFromOrigin = playerPosition.length();
        const now = Date.now();
        let shouldDie = false;
        
        // Check if outside boundary
        if (distanceFromOrigin > this.safeDistance) {
            // Player is outside boundary
            if (!this.outOfBoundsWarningActive) {
                // First time outside boundary - start tracking
                this.outOfBoundsWarningActive = true;
                this.outOfBoundsTime = now;
                this.outOfBoundsLastFlash = now;
                
                // Initial warning flash
                hud.flash(0xff0000, 0.3, 300);
                
                // Play boundary breach sound
                soundManager.playBoundaryBreach();
                
                // Make boundary visible when outside bounds
                if (!this.visible) {
                    this.setVisible(true);
                }
            } else {
                // Already outside boundary - update timer
                const timeOutside = now - this.outOfBoundsTime;
                
                // Flash warning at interval
                if (now - this.outOfBoundsLastFlash > this.outOfBoundsFlashInterval) {
                    // Increase opacity as time goes on for visual effect only
                    // This doesn't affect sound volume, just the visual flash opacity
                    const opacity = Math.min(0.7, 0.3 + (timeOutside / this.outOfBoundsDeathTimer) * 0.4);
                    hud.flash(0xff0000, opacity, 300);
                    
                    // Play the boundary breach sound
                    soundManager.playBoundaryBreach();
                    
                    this.outOfBoundsLastFlash = now;
                }
                
                // Check if player has been outside too long
                if (timeOutside > this.outOfBoundsDeathTimer) {
                    console.log("Player outside boundary too long - triggering death");
                    shouldDie = true;
                }
            }
        } else if (distanceFromOrigin > this.safeDistance - this.warningDistance) {
            // Player is approaching boundary - show light warning
            if (!this.outOfBoundsWarningActive || now - this.outOfBoundsLastFlash > 1000) {
                hud.flash(0xffa500, 0.2, 300); // Orange warning
                this.outOfBoundsLastFlash = now;
                
                // Play boundary warning sound at lower volume
                soundManager.playBoundaryBreach(true);
                
                // Make boundary visible when near bounds
                if (!this.visible) {
                    this.setVisible(true);
                }
            }
        } else if (this.outOfBoundsWarningActive) {
            // Player returned to safe area - reset warning
            this.outOfBoundsWarningActive = false;
            this.outOfBoundsTime = 0;
            
            // Hide boundary when back in safe zone
            if (this.visible) {
                this.setVisible(false);
            }
        }
        
        return shouldDie;
    }
    
    /**
     * Reset out of bounds tracking (e.g., after player death)
     */
    resetOutOfBounds() {
        this.outOfBoundsWarningActive = false;
        this.outOfBoundsTime = 0;
    }
}

export default WorldBoundary;