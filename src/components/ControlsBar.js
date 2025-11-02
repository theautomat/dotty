/**
 * ControlsBar.js - Preact component for the fixed controls bar at the bottom of the screen
 * Displays essential controls in a retro computer terminal style
 */

// Use the same Preact import as other components
import { html, render } from 'https://esm.sh/htm/preact/standalone';

// Component styles as a string for inline injection
const styles = `
  .controls-bar {
    position: fixed;
    bottom: 20px;
    left: 0;
    width: 100%;
    background-color: rgba(0, 0, 0, 0.4);
    color: #33ff33;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    padding: 10px 8px;
    z-index: 10000; /* Make sure it's above other entry screen elements */
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    letter-spacing: 1px;
    text-transform: lowercase;
    border-top: 1px solid rgba(51, 255, 51, 0.3);
    border-bottom: 1px solid rgba(51, 255, 51, 0.3);
    text-shadow: 0 0 8px rgba(51, 255, 51, 0.7);
  }

  .controls-bar .key-item {
    margin: 5px 10px;
    display: flex;
    align-items: center;
    white-space: nowrap;
  }

  .controls-bar .key {
    font-weight: bold;
    color: #ffffff;
    padding-right: 2px;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.7);
  }

  .controls-bar .equals {
    padding: 0 2px;
    opacity: 0.8;
  }

  .controls-bar .action {
    font-weight: 300;
  }

  /* Add subtle CRT flicker effect */
  @keyframes flicker {
    0% { opacity: 1.0; }
    50% { opacity: 0.95; }
    100% { opacity: 1.0; }
  }

  .controls-bar {
    animation: flicker 0.3s infinite;
  }
`;

/**
 * ControlsBar component
 * Renders a fixed bar at the bottom with key controls in retro style
 */
function ControlsBar() {
  return html`
    <div class="controls-bar">
      <div class="key-item"><span class="key">W</span><span class="equals">=</span><span class="action">forward</span></div>
      <div class="key-item"><span class="key">S</span><span class="equals">=</span><span class="action">backward</span></div>
      <div class="key-item"><span class="key">A</span><span class="equals">=</span><span class="action">left</span></div>
      <div class="key-item"><span class="key">D</span><span class="equals">=</span><span class="action">right</span></div>
      <div class="key-item"><span class="key">MOUSE</span><span class="equals">=</span><span class="action">aim</span></div>
      <div class="key-item"><span class="key">CLICK</span><span class="equals">=</span><span class="action">shoot</span></div>
      <div class="key-item"><span class="key">SPACE</span><span class="equals">=</span><span class="action">alt-shoot</span></div>
      <div class="key-item"><span class="key">H</span><span class="equals">=</span><span class="action">help</span></div>
      <div class="key-item"><span class="key">G</span><span class="equals">=</span><span class="action">grid</span></div>
      <div class="key-item"><span class="key">ESC</span><span class="equals">=</span><span class="action">release</span></div>
    </div>
  `;
}

/**
 * Initialize the controls bar
 */
function initControlsBar() {
  // Create container if it doesn't exist
  let container = document.getElementById('controls-bar');
  if (!container) {
    container = document.createElement('div');
    container.id = 'controls-bar';
    document.body.appendChild(container);
  }
  
  // Inject styles
  if (!document.getElementById('controls-bar-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'controls-bar-styles';
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
  
  // Render the component
  render(html`<${ControlsBar} />`, container);
  
  // Initially hide the controls bar
  toggleControlsBar(false);
  
  return true;
}

/**
 * Show the controls bar
 */
function showControlsBar() {
  return toggleControlsBar(true);
}

/**
 * Toggle controls bar visibility
 * @param {boolean} visible Visibility state
 * @returns {boolean} New visibility state
 */
function toggleControlsBar(visible) {
  const container = document.getElementById('controls-bar');
  if (!container) return false;
  
  const newVisible = visible !== undefined ? visible : container.style.display !== 'block';
  container.style.display = newVisible ? 'block' : 'none';
  
  return newVisible;
}

// Export functions
export { initControlsBar, toggleControlsBar, showControlsBar }; 