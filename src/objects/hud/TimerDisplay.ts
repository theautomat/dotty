/**
 * TimerDisplay.ts - 3D display of level timer for the HUD
 * Displays timer data without tracking time itself
 */
import * as THREE from 'three';
import gameStats from '../../game/GameStats';

interface Timer {
    getPercentRemaining(): number;
}

class TimerDisplay {
    private group: THREE.Group;
    private timer: Timer | null;
    private timerBar: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

    constructor() {
        // Group containing all display elements
        this.group = new THREE.Group();

        // Reference to the game timer (will be set by HUD)
        this.timer = null;

        // Create display elements
        this.createTimerDisplay();
    }

    /**
     * Create the timer display elements - simplified full-width version
     */
    private createTimerDisplay(): void {
        // Make a very thin bar that will appear at the bottom of the screen
        const barHeight = 0.01; // Very thin timer bar

        // The actual bar geometry
        // Width will be set dynamically when positioned in the HUD
        const barGeometry = new THREE.PlaneGeometry(2.0, barHeight);
        const barMaterial = new THREE.MeshBasicMaterial({
            color: 0x33ff33,  // Green progress bar
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });

        this.timerBar = new THREE.Mesh(barGeometry, barMaterial);

        // Add to group
        this.group.add(this.timerBar);

        // The timer bar will be scaled as time passes
        // We'll handle positioning in the HUD system
    }

    /**
     * Set the timer source to display
     * @param timer - Timer instance to display
     */
    setTimer(timer: Timer): void {
        this.timer = timer;
        this.updateDisplay();
    }

    /**
     * Get the group containing all display elements
     * @returns The group
     */
    getGroup(): THREE.Group {
        return this.group;
    }

    /**
     * Update the display based on current timer state
     */
    private updateDisplay(): void {
        // Get timer data from imported gameStats singleton (source of truth)
        if (gameStats) {
            // Access timer data directly from GameStats properties (more reliable)
            const totalTime = gameStats.levelTimerTotal || 0;
            const remainingTime = gameStats.levelTimerRemaining || 0;

            // Calculate percentage
            let percentRemaining = 1.0;
            if (totalTime > 0) {
                percentRemaining = remainingTime / totalTime;
            }

            // Update timer bar scale based on percentage remaining
            this.timerBar.scale.x = percentRemaining;


            // Update bar color based on remaining time
            if (percentRemaining < 0.2) {
                this.timerBar.material.color.set(0xff3333);  // Red
            } else if (percentRemaining < 0.5) {
                this.timerBar.material.color.set(0xffff33);  // Yellow
            } else {
                this.timerBar.material.color.set(0x33ff33);  // Green
            }
            return;
        }

        // Fallback to using timer directly if GameStats isn't available
        if (!this.timer) return;

        // Update timer bar scale based on percentage remaining
        const percentRemaining = this.timer.getPercentRemaining();
        this.timerBar.scale.x = percentRemaining;

        // Update bar color based on remaining time
        if (percentRemaining < 0.2) {
            this.timerBar.material.color.set(0xff3333);  // Red
        } else if (percentRemaining < 0.5) {
            this.timerBar.material.color.set(0xffff33);  // Yellow
        } else {
            this.timerBar.material.color.set(0x33ff33);  // Green
        }
    }

    /**
     * Update the timer display
     * Called each frame
     */
    update(): void {
        // Timer display update
        // Always update display - it will now get data from GameStats
        this.updateDisplay();
    }
}

export default TimerDisplay;
