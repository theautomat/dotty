/**
 * GameOverOverlay.js - Preact component for game over overlay
 * Creates a full-screen HTML overlay on top of the 3D game with game stats and controls
 */

// Import Preact dependencies
import { html, render, useEffect, useRef } from 'https://esm.sh/htm/preact/standalone';

// Import game dependencies
import gameStateMachine, { GAME_STATES } from '../game/GameStateMachine.js';
import gameStats from '../game/GameStats.js';
import CollectibleConfig from '../objects/collectibles/CollectibleConfig.js';
import EnemyConfig from '../objects/enemies/EnemyConfig.js';
import GeometryFactory from '../objects/shapes/GeometryFactory.js';

// Component styles as a string for inline injection
const styles = `
  .game-over-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-family: 'Press Start 2P', monospace;
    color: #fff;
    opacity: 0;
    transition: opacity 0.5s ease;
    pointer-events: all;
    font-weight: 300;
  }

  .game-over-overlay.visible {
    opacity: 1;
  }

  .game-over-container {
    width: 80%;
    max-width: 800px;
    text-align: center;
  }

  .game-over-title {
    font-size: 112px;
    margin: 0 0 40px 0;
    color: #ffffff;
    letter-spacing: 6px;
    font-weight: 300;
    text-transform: lowercase;
  }

  .final-score {
    font-size: 36px;
    color: #ffff00;
    margin: 10px 0 40px 0;
    font-weight: 300;
  }

  .stats-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 20px 0;
  }

  .stats-title {
    font-size: 20px;
    color: #fff;
    margin-bottom: 15px;
    font-weight: 300;
    text-transform: lowercase;
  }

  .stats-items {
    display: flex;
    justify-content: center;
    gap: 15px;
  }

  .ore-item, .enemy-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 50px;
  }

  .canvas-container {
    width: 60px;
    height: 60px;
    margin-bottom: 5px;
    position: relative;
  }

  .canvas-container canvas {
    width: 100%;
    height: 100%;
  }

  .asteroid-canvas {
    width: 60px;
    height: 60px;
  }

  .item-count {
    font-size: 14px;
    color: #ffffff;
    font-weight: 300;
  }

  .extra-stats {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 15px;
    margin: 15px 0;
  }
  
  .stat-item {
    font-size: 14px;
    color: #fff;
    padding: 5px 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 300;
  }
  
  .stat-item .canvas-container {
    width: 40px;
    height: 40px;
  }

  .button-container {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin: 30px 0 10px 0;
  }

  .game-button {
    padding: 15px 40px;
    font-family: 'Press Start 2P', monospace;
    font-size: 16px;
    background-color: transparent;
    color: white;
    border: 2px solid #ffffff;
    border-radius: 0;
    cursor: pointer;
    transition: all 0.2s ease;
    pointer-events: auto;
    font-weight: 300;
    text-transform: lowercase;
    letter-spacing: 3px;
  }

  .game-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  }

  .leaderboard-position {
    margin-top: 15px;
    font-size: 20px;
    color: #fff;
  }
  
  /* Add scanlines and CRT effect */
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
    z-index: 1001;
    pointer-events: none;
    opacity: 0.4;
  }

  /* Make the title responsive on different screen sizes */
  @media (max-width: 1200px) {
    .game-over-title {
      font-size: 90px;
    }
  }
  
  @media (max-width: 768px) {
    .game-over-title {
      font-size: 64px;
      margin-bottom: 20px;
    }
    
    .final-score {
      font-size: 28px;
      margin-bottom: 20px;
    }
  }
  
  @media (max-width: 480px) {
    .game-over-title {
      font-size: 42px;
    }
    
    .final-score {
      font-size: 24px;
    }
  }
`;

// Class to handle Three.js rendering in a canvas
class MiniRenderer {
  constructor(canvas, type, config = {}) {
    this.canvas = canvas;
    this.type = type;
    this.config = config;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.object = null;
    this.animationId = null;
    this.isDestroyed = false;
    
    this.init();
  }
  
  init() {
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas, 
      alpha: true,
      antialias: true 
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);
    
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    this.camera.position.z = 5;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    // Create object based on type
    this.createObject();
    
    // Start animation
    this.animate();
  }
  
  createObject() {
    switch(this.type) {
      case 'asteroid':
        this.object = GeometryFactory.createAsteroidMesh({
          size: 3.1,
          variation: 0.5,
          detail: 1
        });
        this.object.scale.set(0.6, 0.6, 0.6);
        if (this.object.material) {
          this.object.material.wireframe = true;
          this.object.material.wireframeLinewidth = 1;
        }
        break;
        
      case 'ore':
        // Get ore config to use original colors
        const oreConfig = CollectibleConfig.getCollectibleConfig(this.config.oreType);
        this.object = GeometryFactory.createCollectibleMesh(this.config.oreType, 'ore', {
          size: 0.8,
          transparent: true,
          opacity: 0.9,
          color: oreConfig ? oreConfig.color : undefined
        });
        break;
        
      case 'enemy':
        // Get enemy config to use original colors
        const enemyConfig = EnemyConfig.getEnemyConfig(this.config.enemyType);
        const enemyColor = enemyConfig ? enemyConfig.color : undefined;
        
        // Special case for sphereBoss
        if (this.config.enemyType === 'sphereBoss') {
          // Create a simple sphere for the boss
          const geometry = new THREE.SphereGeometry(1.2, 20, 20);
          const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true
          });
          this.object = new THREE.Mesh(geometry, material);
          this.object.scale.set(0.6, 0.6, 0.6);
          
        } else {
          this.object = GeometryFactory.createEnemyMesh(this.config.enemyType, {
            size: 3.0,
            color: enemyColor
          });
          
          if (this.config.enemyType === 'tetra') {
            this.object.scale.set(0.6, 0.6, 0.6);
            
            if (this.object.userData && this.object.userData.mainMesh) {
              this.object.userData.mainMesh.material.wireframe = true;
            }
          } else {
            this.object.scale.set(0.6, 0.6, 0.6);
            
            if (this.object.material) {
              this.object.material.wireframe = true;
            }
          }
        }
        break;
        
      case 'bullet':
        // Create a simple bullet visualization
        const bulletGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          wireframe: true
        });
        this.object = new THREE.Mesh(bulletGeometry, bulletMaterial);
        this.object.scale.set(0.7, 0.7, 0.7);
        break;
    }
    
    if (this.object) {
      this.scene.add(this.object);
    }
  }
  
  animate() {
    if (this.isDestroyed) return;
    
    this.animationId = requestAnimationFrame(() => this.animate());
    
    if (this.object) {
      // Different rotation patterns based on type
      switch(this.type) {
        case 'asteroid':
          this.object.rotation.x += 0.01;
          this.object.rotation.y += 0.02;
          this.object.rotation.z += 0.005;
          break;
          
        case 'ore':
          this.object.rotation.x += 0.01;
          this.object.rotation.y += 0.02;
          break;
          
        case 'bullet':
          this.object.rotation.x += 0.02;
          this.object.rotation.y += 0.03;
          // Pulse the bullet size slightly
          const pulseFactor = 0.7 + Math.sin(Date.now() * 0.008) * 0.2;
          this.object.scale.set(pulseFactor, pulseFactor, pulseFactor);
          break;
          
        case 'enemy':
          const enemyType = this.config.enemyType;
          
          if (enemyType === 'sphereBoss') {
            // Rotate the boss sphere
            this.object.rotation.x += 0.01;
            this.object.rotation.y += 0.02;
            this.object.rotation.z += 0.01;
            // Pulse the boss size slightly
            const bossPulse = 0.6 + Math.sin(Date.now() * 0.003) * 0.2;
            this.object.scale.set(bossPulse, bossPulse, bossPulse);
          }
          else if (enemyType === 'ufo') {
            this.object.rotation.y += 0.03;
            this.object.position.y = Math.sin(Date.now() * 0.002) * 0.1;
          } else if (enemyType === 'hunter') {
            this.object.rotation.z = Math.sin(Date.now() * 0.003) * 0.15;
            this.object.rotation.x += 0.01;
            this.object.rotation.y += 0.005;
          } else if (enemyType === 'bomber') {
            this.object.rotation.z += 0.005;
            this.object.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
            this.object.rotation.y += 0.01;
          } else if (enemyType === 'patroller') {
            this.object.rotation.y += 0.02;
            this.object.rotation.x = Math.sin(Date.now() * 0.002) * 0.05;
            this.object.position.y = Math.cos(Date.now() * 0.003) * 0.08;
          } else if (enemyType === 'tetra') {
            this.object.rotation.x += 0.01;
            this.object.rotation.y += 0.02;
            this.object.rotation.z += 0.01;
            
            // Pulse the inner sphere if it exists
            if (this.object.userData && this.object.userData.innerSphere) {
              const pulseFactor = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
              this.object.userData.innerSphere.scale.set(pulseFactor, pulseFactor, pulseFactor);
              
              if (this.object.userData.innerSphere.material) {
                this.object.userData.innerSphere.material.emissiveIntensity = 0.3 + Math.abs(Math.sin(Date.now() * 0.002)) * 0.7;
              }
            }
          } else {
            this.object.rotation.y += 0.02;
          }
          break;
      }
    }
    
    this.renderer.render(this.scene, this.camera);
  }
  
  resize() {
    if (this.isDestroyed) return;
    
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    if (this.renderer && this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
  }
  
  destroy() {
    this.isDestroyed = true;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.object) {
      if (this.object.geometry) {
        this.object.geometry.dispose();
      }
      
      if (this.object.material) {
        if (Array.isArray(this.object.material)) {
          this.object.material.forEach(material => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        } else {
          if (this.object.material.map) this.object.material.map.dispose();
          this.object.material.dispose();
        }
      }
      
      // Special case for tetra
      if (this.object.userData) {
        if (this.object.userData.innerSphere) {
          if (this.object.userData.innerSphere.geometry) {
            this.object.userData.innerSphere.geometry.dispose();
          }
          if (this.object.userData.innerSphere.material) {
            if (this.object.userData.innerSphere.material.map) {
              this.object.userData.innerSphere.material.map.dispose();
            }
            this.object.userData.innerSphere.material.dispose();
          }
        }
        
        if (this.object.userData.mainMesh) {
          if (this.object.userData.mainMesh.geometry) {
            this.object.userData.mainMesh.geometry.dispose();
          }
          if (this.object.userData.mainMesh.material) {
            if (this.object.userData.mainMesh.material.map) {
              this.object.userData.mainMesh.material.map.dispose();
            }
            this.object.userData.mainMesh.material.dispose();
          }
        }
      }
      
      this.scene.remove(this.object);
    }
    
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

/**
 * Simple canvas component for 3D objects
 */
function ThreeCanvas({ type, config, className = '' }) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const renderer = new MiniRenderer(canvasRef.current, type, config);
    rendererRef.current = renderer;
    
    // Handle resizing
    const handleResize = () => renderer.resize();
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
    };
  }, []);
  
  return html`<div class="canvas-container ${className}">
    <canvas ref=${canvasRef}></canvas>
  </div>`;
}

/**
 * Game Over Overlay Preact Component
 */
function GameOverOverlay(props) {
  const { 
    stats = {},
    leaderboardPosition = null,
    visible = false,
    onPlayAgain,
    onViewLeaderboard
  } = props;
  
  const renderOreStats = () => {
    const oreTypes = ['iron', 'copper', 'silver', 'gold', 'platinum'];
    return oreTypes.map(type => {
      const count = stats.oresMined?.[type] || 0;
      
      return html`
        <div class="ore-item">
          <${ThreeCanvas} type="ore" config=${{ oreType: type }} />
          <div class="item-count">${count}</div>
        </div>
      `;
    });
  };
  
  const renderEnemyStats = () => {
    // Reordered enemies with asteroid in 3rd position, tetra in 4th, and sphere boss in 5th
    const enemyObjects = [
      { type: 'enemy', config: { enemyType: 'ufo' } },
      { type: 'enemy', config: { enemyType: 'hunter' } },
      { type: 'asteroid' },  // Asteroid in 3rd position
      { type: 'enemy', config: { enemyType: 'tetra' } },
      { type: 'enemy', config: { enemyType: 'sphereBoss' } }  // Added sphere boss
    ];
    
    return enemyObjects.map((obj, index) => {
      let count = 0;
      
      if (obj.type === 'asteroid') {
        count = stats.asteroidsDestroyed || 0;
      } else if (obj.config.enemyType === 'sphereBoss') {
        // Boss is usually one per game, so count as 1 if player reached level 5
        count = (stats.levelReached >= 5) ? 1 : 0;
      } else {
        count = stats.enemiesByType?.[obj.config.enemyType] || 0;
      }
      
      return html`
        <div class="enemy-item">
          <${ThreeCanvas} type=${obj.type} config=${obj.config} />
          <div class="item-count">${count}</div>
        </div>
      `;
    });
  };
  
  return html`
    <style>${styles}</style>
    <div class="scanlines"></div>
    <div class="game-over-overlay ${visible ? 'visible' : ''}">
      <div class="game-over-container">
        <h1 class="game-over-title">game over</h1>
        
        <div class="final-score">
          final score: ${stats.score || 0}
        </div>
        
        <div class="stats-row">
          <h2 class="stats-title">ores collected</h2>
          <div class="stats-items">
            ${renderOreStats()}
          </div>
        </div>
        
        <div class="stats-row">
          <h2 class="stats-title">enemies destroyed</h2>
          <div class="stats-items">
            ${renderEnemyStats()}
          </div>
        </div>
        
        <div class="extra-stats">
          <div class="stat-item">
            <${ThreeCanvas} type="bullet" />
            bullets fired: ${stats.shotsFired || 0}
          </div>
          <div class="stat-item">accuracy: ${stats.shotsFired ? Math.floor((stats.asteroidsDestroyed / stats.shotsFired) * 100) : 0}%</div>
        </div>
        
        ${leaderboardPosition ? html`
          <div class="leaderboard-position">
            your rank: #${leaderboardPosition} on the leaderboard!
          </div>
        ` : ''}
        
        <div class="button-container">
          <button class="game-button play-again-button" onClick=${onPlayAgain}>
            play again
          </button>
          <button class="game-button leaderboard-button" onClick=${onViewLeaderboard}>
            view leaderboard
          </button>
        </div>
      </div>
    </div>
  `;
}

// Container reference for the overlay
let overlayContainer = null;
let isVisible = false;
let showTimeout = null;

// Function to ensure Google Font is loaded
const loadPressStartFont = () => {
  if (!document.getElementById('google-font-press-start')) {
    console.log('Loading Google Font: Press Start 2P');
    const link = document.createElement('link');
    link.id = 'google-font-press-start';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
    document.head.appendChild(link);
  }
};

/**
 * Initialize the game over overlay
 */
function initGameOverOverlay() {
  // Ensure the font is loaded
  loadPressStartFont();
  
  // Create container if it doesn't exist
  if (!overlayContainer) {
    overlayContainer = document.createElement('div');
    overlayContainer.id = 'game-over-overlay-container';
    document.body.appendChild(overlayContainer);
  }
  
  // Initial render with hidden state
  updateGameOverOverlay({ visible: false });
  
  // Set up state machine listener to show overlay after game over
  gameStateMachine.addListener((newState, oldState) => {
    if (newState === GAME_STATES.GAME_OVER) {
      // Show HTML overlay immediately without delay
      const stats = gameStats.getStats();
      showGameOverOverlay(stats);
    } else if (oldState === GAME_STATES.GAME_OVER) {
      // Hide overlay when leaving game over state
      hideGameOverOverlay();
    }
  });
  
  return true;
}

/**
 * Show the game over overlay with the given stats
 * @param {Object} stats Game statistics to display
 * @param {number} leaderboardPosition Optional leaderboard position
 */
function showGameOverOverlay(stats, leaderboardPosition = null) {
  isVisible = true;
  
  // Calculate additional stats for accuracy
  stats.levelReached = stats.level ? stats.level.id : 1;
  
  // Update overlay with simplified stats
  updateGameOverOverlay({ 
    stats, 
    leaderboardPosition, 
    visible: true,
    onPlayAgain: () => {
      // Navigate to the root of the site to get a fresh game instance
      window.location.href = '/';
    },
    onViewLeaderboard: () => {
      // Navigate to the leaderboard using the original path-based approach
      window.location.href = '/leaderboard';
    }
  });
}

/**
 * Hide the game over overlay
 */
function hideGameOverOverlay() {
  isVisible = false;
  updateGameOverOverlay({ visible: false });
}

/**
 * Update the game over overlay with new props
 * @param {Object} props Component props
 */
function updateGameOverOverlay(props) {
  if (!overlayContainer) return;
  
  render(html`<${GameOverOverlay} ...${props} />`, overlayContainer);
}

/**
 * Check if the overlay is currently visible
 * @returns {boolean} Visibility state
 */
function isGameOverOverlayVisible() {
  return isVisible;
}

export { 
  initGameOverOverlay, 
  showGameOverOverlay, 
  hideGameOverOverlay, 
  updateGameOverOverlay,
  isGameOverOverlayVisible 
}; 