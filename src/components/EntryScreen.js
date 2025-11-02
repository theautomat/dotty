/**
 * EntryScreen.js - Preact component for the initial game entry screen overlay
 * Provides a two-step entry process with theme music
 */

// Use the same Preact import as the other components
import { html, render } from 'https://esm.sh/htm/preact/standalone';

// Import game dependencies
import gameStateMachine, { GAME_STATES } from '../game/GameStateMachine.js';
import soundManager from '../managers/SoundManager.js';
// Import ore configuration and geometry factory
import OreConfig from '../objects/ores/OreConfig.js';
import GeometryFactory from '../objects/shapes/GeometryFactory.js';
// Import the controls bar
import { showControlsBar, toggleControlsBar } from './ControlsBar.js';

// Component styles as a string for inline injection
const styles = `
  .entry-screen-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.95);
    z-index: 9999; /* Higher z-index to ensure it's above everything */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-family: 'Press Start 2P', monospace;
    color: #fff;
    opacity: 1;
    transition: opacity 0.5s ease;
    pointer-events: auto; /* Ensure it captures all pointer events */
    font-weight: 300;
  }

  .entry-screen-overlay.hidden {
    opacity: 0;
    pointer-events: none;
  }

  .entry-title {
    font-size: 36px;
    margin: 0 0 40px 0;
    color: #ffffff;
    text-shadow: 0 0 10px rgba(0, 100, 255, 0.7);
    font-family: 'Press Start 2P', monospace;
    letter-spacing: 2px;
    font-weight: 300;
    text-transform: lowercase;
  }

  .start-button {
    padding: 15px 40px;
    font-family: 'Press Start 2P', monospace;
    font-size: 16px;
    background-color: transparent;
    color: white;
    border: 2px solid #ffffff;
    border-radius: 0;
    cursor: pointer;
    transition: all 0.2s ease;
    pointer-events: auto; /* Explicit pointer events for button */
    font-weight: 300;
    text-transform: lowercase;
  }

  .start-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  }
  
  /* Add subtle scanlines and CRT effect */
  .scanlines {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, 
      rgba(0,0,0,0.15), 
      rgba(0,0,0,0.15) 1px, 
      transparent 1px, 
      transparent 2px);
    background-size: 100% 4px;
    z-index: 10000;
    pointer-events: none;
    opacity: 0.3;
  }

  /* Theme screen specific styles */
  .theme-screen {
    text-align: center;
  }

  .theme-screen .entry-title {
    font-size: 112px;
    margin-bottom: 40px;
    color: #ffffff;
    text-shadow: 0 0 20px rgba(0, 136, 255, 0.8);
    letter-spacing: 6px;
    font-weight: 300;
  }

  /* Ore display container */
  .ore-display {
    width: 250px;
    height: 250px;
    margin: 0 auto 40px;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: visible;
  }
  
  /* Ensure the 3D canvas is centered properly */
  .ore-display canvas {
    display: block;
    margin: 0 auto;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  /* Make the container responsive on smaller screens */
  @media (max-width: 768px) {
    .ore-display {
      width: 200px;
      height: 200px;
    }
    
    .theme-screen .entry-title {
      font-size: 42px;
      margin-bottom: 20px;
    }
  }
  
  @media (max-width: 480px) {
    .ore-display {
      width: 180px;
      height: 180px;
    }
    
    .theme-screen .entry-title {
      font-size: 36px;
    }
  }

  .theme-screen .start-button {
    padding: 20px 40px;
    font-size: 18px;
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    border: 2px solid #ffffff;
    text-transform: lowercase;
    letter-spacing: 2px;
  }
  
  .theme-screen .start-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  /* Initial screen specific styles */
  .initial-screen .start-button {
    background-color: transparent;
    color: white;
    border: 2px solid #ffffff;
    text-transform: lowercase;
    letter-spacing: 3px;
  }
`;

// Iron ore Three.js instance
let ironOreRenderer = null;
let ironOreScene = null;
let ironOreCamera = null;
let ironOreMesh = null;
let animationFrameId = null;

/**
 * Initialize the 3D ore renderer
 */
function initOreRenderer() {
  if (ironOreRenderer) return; // Already initialized
  
  try {
    // Create a new THREE.js renderer
    ironOreRenderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });
    ironOreRenderer.setSize(200, 200); // Double the size of the renderer area
    
    // Create scene and camera
    ironOreScene = new THREE.Scene();
    ironOreCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 50);
    ironOreCamera.position.z = 20; // Move camera back to accommodate larger object
    
    // Add lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    ironOreScene.add(light);
    
    const ambientLight = new THREE.AmbientLight(0x555555);
    ironOreScene.add(ambientLight);
    
    // Create iron ore mesh
    createIronOreMesh();
    
    // Start animation
    animateOre();
    
    // Add styling to the renderer's canvas for proper centering
    if (ironOreRenderer.domElement) {
      ironOreRenderer.domElement.style.position = 'absolute';
      ironOreRenderer.domElement.style.margin = 'auto';
    }
  } catch (e) {
    console.error("Error creating ore renderer:", e);
  }
}

/**
 * Create the iron ore mesh
 */
function createIronOreMesh() {
  if (!ironOreScene) return;
  
  try {
    // Get the ore config for parameters
    const oreConfig = OreConfig.getOreConfig('iron');
    
    // Use a larger size for display - 10x larger than current
    const originalSize = oreConfig ? oreConfig.size : 1.5;
    const displaySize = originalSize; // Was originalSize * 0.1, now full size
    
    ironOreMesh = GeometryFactory.createCollectibleMesh('iron', 'ore', {
      size: displaySize
    });
    
    // Position at center
    ironOreMesh.position.set(0, 0, 0);
    
    // Add to scene
    ironOreScene.add(ironOreMesh);
  } catch (e) {
    console.error("Error creating iron ore mesh:", e);
  }
}

/**
 * Animate the ore rotation
 */
function animateOre() {
  animationFrameId = requestAnimationFrame(animateOre);
  
  if (ironOreMesh) {
    // Adjust rotation speed for a more appealing animation
    ironOreMesh.rotation.x += 0.01;
    ironOreMesh.rotation.y += 0.02;
    
    // Make sure object stays centered
    ironOreMesh.position.set(0, 0, 0);
  }
  
  if (ironOreRenderer && ironOreScene && ironOreCamera) {
    ironOreRenderer.render(ironOreScene, ironOreCamera);
  }
}

/**
 * Clean up ore renderer resources
 */
function cleanupOreRenderer() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  if (ironOreMesh) {
    if (ironOreMesh.geometry) {
      ironOreMesh.geometry.dispose();
    }
    if (ironOreMesh.material) {
      if (Array.isArray(ironOreMesh.material)) {
        ironOreMesh.material.forEach(material => material.dispose());
      } else {
        ironOreMesh.material.dispose();
      }
    }
    ironOreMesh = null;
  }
  
  if (ironOreRenderer) {
    ironOreRenderer.dispose();
    ironOreRenderer = null;
  }
}

// Function to play the theme song
const playThemeSong = () => {
  // Use the SoundManager to play the theme song
  soundManager.playMancerTheme();
};

// Function to stop the theme song
const stopThemeSong = () => {
  // Use the SoundManager to stop the theme song
  soundManager.stopMancerTheme();
};

// Function to ensure Google Font is loaded
const loadGoogleFont = () => {
  if (!document.getElementById('google-font-press-start')) {
        const link = document.createElement('link');
    link.id = 'google-font-press-start';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
    document.head.appendChild(link);
  }
};

/**
 * Entry Screen Preact component
 * Renders the appropriate screen based on the current step
 */
function EntryScreen(props) {
  const {
    onEnter = () => {},
    onStartGame = () => {},
    step = 'initial', // initial or theme
  } = props;
  
  
  // Initialize ore renderer when theme screen is shown
  if (step === 'theme' && props.visible) {
    setTimeout(() => {
      initOreRenderer();
      
      // Attach ore renderer to DOM
      const oreContainer = document.getElementById('ore-display');
      if (oreContainer && ironOreRenderer) {
        // Clear any existing content
        while (oreContainer.firstChild) {
          oreContainer.removeChild(oreContainer.firstChild);
        }
        
        // Add the renderer to the container and ensure it's centered
        oreContainer.appendChild(ironOreRenderer.domElement);
        
        // Ensure the canvas is centered within the container
        if (ironOreRenderer.domElement) {
          // Set canvas in the middle
          ironOreRenderer.domElement.style.position = 'absolute';
          ironOreRenderer.domElement.style.left = '50%';
          ironOreRenderer.domElement.style.top = '50%';
          ironOreRenderer.domElement.style.transform = 'translate(-50%, -50%)';
        }
      }
    }, 0);
  }
  
  // Handle button click with event stopping
  const handleEnterClick = (e) => {
      e.stopPropagation(); // Stop event from propagating down
    e.preventDefault(); // Prevent default behavior
    onEnter();
  };
  
  // Handle start game click with event stopping
  const handleStartGameClick = (e) => {
    console.log("START button clicked - stopping propagation");
    e.stopPropagation(); // Stop event from propagating down
    e.preventDefault(); // Prevent default behavior
    
    // Clean up ore renderer
    cleanupOreRenderer();
    
    // Hide the entry screen first
    hideEntryScreen();
    
    // Stop the theme song
    stopThemeSong();
    
    // Execute the callback after a small delay
    setTimeout(() => {
      if (typeof onStartGame === 'function') {
        onStartGame();
        
        // Add a simulated click on the canvas after a short delay
        // This helps initialize input handling
        setTimeout(() => {
          const canvas = document.querySelector('canvas');
          if (canvas) {
            canvas.dispatchEvent(new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            }));
          }
        }, 100);
      }
    }, 50);
    
    return false; // Ensure the event is completely stopped
  };
  
  // Different render based on the step
  if (step === 'initial') {
    return html`
      <div 
        class="entry-screen-overlay initial-screen ${props.visible ? '' : 'hidden'}"
        onClick=${(e) => {}}
      >
        <div class="scanlines"></div>
        <button 
          class="start-button" 
          onClick=${handleEnterClick}
          style="font-family: 'Press Start 2P', monospace; font-weight: 300;"
        >
          enter
        </button>
      </div>
    `;
  } else if (step === 'theme') {
      return html`
      <div 
        class="entry-screen-overlay theme-screen ${props.visible ? '' : 'hidden'}"
        onClick=${(e) => {}}
      >
        <div class="scanlines"></div>
        <h1 class="entry-title">mancer</h1>
        <div id="ore-display" class="ore-display"></div>
        <button 
          class="start-button" 
          onClick=${handleStartGameClick}
          style="font-family: 'Press Start 2P', monospace; font-weight: 300;"
        >
          start
        </button>
      </div>
    `;
  }
  
  console.warn("Unknown step:", step);
  return null;
}

/**
 * Initialize the entry screen
 * @returns {boolean} Success status
 */
function initEntryScreen() {
  // Ensure Google Font is loaded first
  loadGoogleFont();
  
  const container = document.getElementById('entry-screen');
  if (!container) {
    console.error('Entry screen container not found');
    return false;
  }
  
  // Add debug click handler to container
  container.addEventListener('click', (e) => {
  });
  
  // Make sure container has the right styles for event capturing
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.zIndex = '9999';
  container.style.pointerEvents = 'auto';
  
  // Inject styles
  if (!document.getElementById('entry-screen-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'entry-screen-styles';
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
  
  // Initial render with hidden state
  render(html`<${EntryScreen} visible=${false} step="initial" />`, container);
  return true;
}

/**
 * Show the initial entry screen with an onEnter callback
 * @param {Function} onStartGameCallback - Callback when Start Game button is clicked
 */
function showEntryScreen(onStartGameCallback) {
  const container = document.getElementById('entry-screen');
  if (!container) {
    console.error("Entry screen container not found");
    return;
  }
  
  
  // Make container visible and ensure it captures events
  container.style.display = 'block';
  container.style.pointerEvents = 'auto';
  
  // Render with visible state - initial enter screen
  render(html`
    <${EntryScreen} 
      visible=${true}
      step="initial" 
      onEnter=${() => {
        // When Enter is clicked, move to the theme screen
        showThemeScreen(onStartGameCallback);
      }} 
    />
  `, container);
}

/**
 * Set up a document click handler to get pointer lock if needed
 */
function setupPointerLockFallback() {
  // Remove any existing handler first
  document.removeEventListener('click', handleDocumentClick);
  
  // Add the click handler
  document.addEventListener('click', handleDocumentClick);
  
}

/**
 * Document click handler to request pointer lock
 */
function handleDocumentClick() {
  
  // Try to find and lock the canvas
  const canvas = document.querySelector('canvas');
  if (canvas && !document.pointerLockElement) {
    canvas.requestPointerLock();
    
    // Remove this handler after it's been used once
    document.removeEventListener('click', handleDocumentClick);
  }
}

/**
 * Show the theme screen with the theme song
 * @param {Function} onStartGameCallback - Callback when Start Game button is clicked
 */
function showThemeScreen(onStartGameCallback) {
    const container = document.getElementById('entry-screen');
  if (!container) {
    console.error("Entry screen container not found when showing theme screen");
    return;
  }
  
  // Play the theme song first
  playThemeSong();
  
  // Show the controls bar during the theme screen
  showControlsBar();
  
  // Ensure container is visible and capturing events
  container.style.display = 'block';
  container.style.pointerEvents = 'auto';
  
  // Render the theme screen with a short timeout to ensure clean state
  setTimeout(() => {
    render(html`
      <${EntryScreen} 
        visible=${true}
        step="theme" 
        onStartGame=${() => {
          
          // Try to request pointer lock from within EntryScreen
          try {
            // Find the canvas element
            const gameCanvas = document.querySelector('canvas');
            if (gameCanvas) {
              gameCanvas.requestPointerLock();
            } else {
              console.warn("Could not find game canvas for pointer lock");
            }
          } catch (e) {
            console.error("Error requesting pointer lock:", e);
          }
          
          // Set up the fallback click handler in case the pointer lock fails
          setupPointerLockFallback();
          
          // Execute the callback that was passed to showEntryScreen
          if (typeof onStartGameCallback === 'function') {
            onStartGameCallback();
          }
        }} 
      />
    `, container);
  }, 10);
}

/**
 * Hide the entry screen
 */
function hideEntryScreen() {
  const container = document.getElementById('entry-screen');
  if (!container) return;
  
  // Stop theme song if it's still playing
  stopThemeSong();
  
  // Hide the controls bar when the game is about to start
  toggleControlsBar(false);
  
  // First set component to hidden state (for fade out animation)
  render(html`<${EntryScreen} visible=${false} step="theme" />`, container);
  
  // Then actually hide the container after animation completes
  setTimeout(() => {
    container.style.display = 'none';
  }, 500); // Match the transition duration from CSS
}

export { initEntryScreen, showEntryScreen, hideEntryScreen };
