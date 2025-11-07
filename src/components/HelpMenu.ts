/**
 * HelpMenu.js - Preact component for the help menu
 * Clean separation of UI rendering and game logic
 */

// Use the same Preact import as the leaderboard
import { html, render } from 'https://esm.sh/htm/preact/standalone';

// Import the SoundManager singleton
import soundManager from '../managers/SoundManager';

/**
 * Help Menu Preact component
 * Renders the help menu UI based on props
 */
function HelpMenu(props) {
  const { 
    fps = 0, 
    score = 0, 
    objects = { asteroids: 0, bullets: 0, ores: 0, powerUps: 0 }, 
    level = { id: 1, name: "Level 1", timeRemaining: 0 }, 
    user = { id: "Initializing..." }, 
    multiplayer = { enabled: false } 
  } = props;
  
  return html`
    <div class="help-menu-content">
      <h3>CONTROLS</h3>
      
      <div class="score-display">
        SCORE: ${score}
      </div>
      
      <div class="help-section">
        <div class="key-command">
          <div class="key">W</div>
          <div>Thrust forward</div>
        </div>
        <div class="key-command">
          <div class="key">S</div>
          <div>Thrust backward</div>
        </div>
        <div class="key-command">
          <div class="key">A/D</div>
          <div>Strafe left/right</div>
        </div>
        <div class="key-command">
          <div class="key">Mouse</div>
          <div>Look around</div>
        </div>
        <div class="key-command">
          <div class="key">Click</div>
          <div>Shoot</div>
        </div>
        <div class="key-command">
          <div class="key">Space</div>
          <div>Alternative shoot</div>
        </div>
        <div class="key-command">
          <div class="key">H</div>
          <div>Show/hide this help</div>
        </div>
        <div class="key-command">
          <div class="key">G</div>
          <div>Show/hide world boundary</div>
        </div>
        <div class="key-command">
          <div class="key">R</div>
          <div>Toggle ASCII rendering</div>
        </div>
        <div class="key-command">
          <div class="key">ESC</div>
          <div>Release mouse pointer</div>
        </div>
      </div>
      
      <div class="volume-container">
        <h3>VOLUME</h3>
        <input type="range" id="volume-slider" min="0" max="100" value="25" />
        <div>Volume: <span id="volume-value">25%</span></div>
        <div class="volume-buttons">
          <button id="mute-button" class="volume-button">Mute</button>
        </div>
      </div>

      <div class="debug-section">
        <h4>DEBUG INFO</h4>
        <div id="debug-fps">FPS: ${fps}</div>
        <div id="debug-objects">
          Asteroids: ${objects.asteroids} | 
          Bullets: ${objects.bullets} | 
          Ores: ${objects.ores} | 
          PowerUps: ${objects.powerUps || 0}
        </div>
        <div id="debug-ascii" style="color: ${props.asciiMode ? '#00ff00' : '#888888'}">
          ASCII Mode: ${props.asciiMode ? 'ENABLED' : 'disabled'}
        </div>
        <div id="debug-level">
          Level ${level.id}: ${level.name} | 
          Timer: ${level.timeRemaining.toFixed(1)}s
        </div>
        <div id="debug-fingerprint">
          User ID: ${user.id}
        </div>
        
        ${multiplayer.isCaptain && multiplayer.crewUrl ? html`
            <div id="debug-crew-url" style="font-size: 10px; word-break: break-all; margin-top: 8px;">
              Crew URL: 
              <a href="${multiplayer.crewUrl}" style="color: #88ff88;" onclick=${(e) => {
                e.preventDefault();
                navigator.clipboard.writeText(multiplayer.crewUrl)
                  .then(() => alert('URL copied to clipboard!'))
                  .catch(err => console.error('Could not copy URL: ', err));
              }}>
                ${multiplayer.crewUrl} (click to copy)
              </a>
            </div>
          ` : ''}
      </div>
    </div>
  `;
}

/**
 * Initialize the help menu and its interactive elements
 * @returns {boolean} Success status
 */
function initHelpMenu() {
  const container = document.getElementById('help-menu');
  if (!container) {
    console.error('Help menu container not found');
    return false;
  }
  
  // Add module script for Preact if it doesn't exist
  if (!document.querySelector('script[src*="preact"]')) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://esm.sh/htm/preact/standalone';
    document.head.appendChild(script);
  }
  
  // Initialize volume controls after ensuring the container exists
  initializeVolumeControls(); 
  
  return true;
}

/**
 * Set up event listeners for volume controls
 */
function initializeVolumeControls() {
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    const muteButton = document.getElementById('mute-button');

    if (!volumeSlider || !volumeValue || !muteButton) {
        console.warn('HelpMenu: Volume control elements not found in DOM. Skipping initialization.');
        return;
    }

    // Set initial values from SoundManager
    const initialVolume = soundManager.getMasterVolume();
    volumeSlider.value = initialVolume * 100;
    volumeValue.textContent = Math.round(initialVolume * 100) + '%';
    muteButton.textContent = soundManager.isMuted() ? 'Unmute' : 'Mute';

    // Slider change event
    volumeSlider.addEventListener('input', () => {
        const newVolume = parseInt(volumeSlider.value) / 100;
        soundManager.setMasterVolume(newVolume);
        volumeValue.textContent = volumeSlider.value + '%';

        // Update mute button text based on volume and mute state
        muteButton.textContent = soundManager.isMuted() ? 'Unmute' : 'Mute'; 
    });

    // Mute button click event
    muteButton.addEventListener('click', () => {
        soundManager.toggleMute();
        const currentVolume = soundManager.getMasterVolume(); // Get volume *after* toggle potentially unmutes
        
        // Update UI based on new mute state
        if (soundManager.isMuted()) {
            volumeSlider.value = 0; // Visually show 0 when muted
            volumeValue.textContent = '0%';
            muteButton.textContent = 'Unmute';
        } else {
            // Restore slider to actual current volume (which might be > 0 if unmuted)
            volumeSlider.value = currentVolume * 100;
            volumeValue.textContent = Math.round(currentVolume * 100) + '%';
            muteButton.textContent = 'Mute';
        }
    });
}

/**
 * Update the help menu with new props
 * @param {Object} props Component props
 */
function updateHelpMenu(props) {
  const container = document.getElementById('help-menu');
  if (!container) return;
  
  render(html`<${HelpMenu} ...${props} />`, container);
}

/**
 * Toggle help menu visibility
 * @param {boolean} visible Visibility state
 * @param {Object} props Component props (optional)
 * @returns {boolean} New visibility state
 */
function toggleHelpMenu(visible, props = null) {
  const container = document.getElementById('help-menu');
  if (!container) return false;
  
  const newVisible = visible !== undefined ? visible : container.style.display !== 'block';
  container.style.display = newVisible ? 'block' : 'none';
  
  if (newVisible && props) {
    updateHelpMenu(props);
  }
  
  return newVisible;
}

export { initHelpMenu, updateHelpMenu, toggleHelpMenu };