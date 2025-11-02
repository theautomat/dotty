/**
 * ShieldEffect.js - Visual shield bubble effect for the player's ship
 * 
 * Creates a translucent shield bubble around the player's ship
 * Provides visual feedback when the shield blocks projectiles or asteroids
 */

import GameObject from '../GameObject.js';
import soundManager from '../../managers/SoundManager.js';

class ShieldEffect extends GameObject {
    /**
     * Create a shield effect around the player
     * @param {THREE.Scene} scene - The game scene
     * @param {Object} player - The player ship object
     * @param {number} duration - Duration of the shield effect in ms
     */
    constructor(scene, player, duration = 40000) {
        super(scene);
        
        this.player = player;
        this.duration = duration;
        this.startTime = performance.now();
        this.endTime = this.startTime + duration;
        this.active = true;
        
        // Shield specific properties
        this.shieldRadius = 4.0; // Slightly larger than the ship
        this.opacity = 0.4; // Default shield opacity
        this.pulseSpeed = 1.0; // Speed of the opacity pulsing
        this.color = 0x0066FF; // Blue shield color
        
        // Create the shield mesh
        this.createShieldMesh();
        
        // Add mesh to scene
        if (this.mesh) {
            scene.add(this.mesh);
        }
        
        // Print out all shield mesh parameters for debugging
        this.printShieldParameters();
    }
    
    /**
     * Create the shield mesh using LatheGeometry
     */
    createShieldMesh() {
        // Create a curved profile for lathe geometry (sphere-like)
        const points = [];
        const segments = 12;
        
        // Create a half-circle profile
        for (let i = 0; i <= segments; i++) {
            const angle = (Math.PI * i) / segments;
            points.push(new THREE.Vector2(
                Math.sin(angle) * this.shieldRadius,
                Math.cos(angle) * this.shieldRadius
            ));
        }
        
        // Create lathe geometry by rotating the profile
        const geometry = new THREE.LatheGeometry(
            points,
            24,    // Number of segments around the lathe
            0,     // Start angle
            Math.PI * 2 // End angle (full circle)
        );
        
        // Create material for shield bubble - always wireframe
        const material = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: this.opacity,
            wireframe: true,
            side: THREE.DoubleSide // Render both sides
        });
        
        // Create the mesh
        this.mesh = new THREE.Mesh(geometry, material);
    }
    
    /**
     * Print all shield mesh parameters for debugging
     */
    printShieldParameters() {
        if (!this.mesh) return;
        
        console.log('Shield Effect Parameters:');
        console.log('- Shield Radius:', this.shieldRadius);
        console.log('- Color:', '#' + this.color.toString(16).padStart(6, '0'));
        console.log('- Default Opacity:', this.opacity);
        console.log('- Pulse Speed:', this.pulseSpeed);
        console.log('- Duration:', this.duration + 'ms');
        
        if (this.mesh.geometry) {
            const geo = this.mesh.geometry;
            console.log('Geometry Parameters:');
            console.log('- Type:', geo.type);
            console.log('- Segments:', geo.parameters ? geo.parameters.segments : 'N/A');
            console.log('- phiStart:', geo.parameters ? geo.parameters.phiStart : 'N/A');
            console.log('- phiLength:', geo.parameters ? geo.parameters.phiLength : 'N/A');
        }
        
        if (this.mesh.material) {
            const mat = this.mesh.material;
            console.log('Material Parameters:');
            console.log('- Type:', mat.type);
            console.log('- Color:', '#' + mat.color.getHexString());
            console.log('- Wireframe:', mat.wireframe);
            console.log('- Transparent:', mat.transparent);
            console.log('- Opacity:', mat.opacity);
            console.log('- Side:', mat.side === THREE.DoubleSide ? 'DoubleSide' : 
                       (mat.side === THREE.FrontSide ? 'FrontSide' : 'BackSide'));
        }
    }
    
    /**
     * Update the shield effect
     * @returns {boolean} Whether the shield is still active
     */
    update() {
        // Check if shield has expired
        const now = performance.now();
        if (now > this.endTime) {
            this.active = false;
            return false;
        }
        
        // Update shield position to match player
        if (this.mesh && this.player && this.player.mesh) {
            this.mesh.position.copy(this.player.mesh.position);
        }
        
        // Pulse the shield opacity for visual effect
        if (this.mesh) {
            const elapsedTime = now - this.startTime;
            const pulsingOpacity = this.opacity + (Math.sin(elapsedTime * 0.002 * this.pulseSpeed) * 0.15);
            this.mesh.material.opacity = pulsingOpacity;
        }
        
        // Calculate remaining shield time percentage (0.0 to 1.0)
        const remainingTime = Math.max(0, this.endTime - now);
        const remainingPercentage = remainingTime / this.duration;
        
        // Change color based on remaining time
        // Gradually shift from blue to red as shield depletes
        if (this.mesh && remainingPercentage < 0.3) {
            // Convert blue to red gradually in the final 30% of duration
            const blueComponent = Math.floor(remainingPercentage / 0.3 * 255);
            const redComponent = Math.floor((1 - remainingPercentage / 0.3) * 255);
            const color = (redComponent << 16) | (0 << 8) | blueComponent;
            this.mesh.material.color.setHex(color);
        }
        
        return this.active;
    }
    
    /**
     * Play hit effect when shield blocks something
     */
    playHitEffect() {
        // Flash the shield
        if (this.mesh) {
            // Store original opacity and color
            const originalOpacity = this.mesh.material.opacity;
            const originalColor = this.mesh.material.color.clone();
            
            // Flash to white at full opacity
            this.mesh.material.opacity = 0.8;
            this.mesh.material.color.setHex(0xFFFFFF);
            
            // Restore original appearance after a brief delay
            setTimeout(() => {
                if (this.mesh) {
                    this.mesh.material.opacity = originalOpacity;
                    this.mesh.material.color.copy(originalColor);
                }
            }, 100);
        }
        
        // Play shield hit sound using new implementation
        soundManager.playShieldHit();
    }
    
    /**
     * Set the remaining duration of the shield
     * @param {number} duration - New duration in ms
     */
    setDuration(duration) {
        this.duration = duration;
        this.endTime = performance.now() + duration;
    }
    
    /**
     * Get the remaining shield time in milliseconds
     * @returns {number} Remaining time in ms
     */
    getRemainingTime() {
        return Math.max(0, this.endTime - performance.now());
    }
    
    /**
     * Get the shield percentage remaining (0.0 to 1.0)
     * @returns {number} Shield percentage
     */
    getShieldPercentage() {
        return this.getRemainingTime() / this.duration;
    }
    
    /**
     * Override remove to properly clean up resources
     */
    remove() {
        super.remove();
    }
}

export default ShieldEffect;