/**
 * ASCIIEffect.js - Renders game objects as ASCII characters
 * Provides a retro text-based view of the asteroids game
 * Based on THREE.js AsciiEffect but customized for asteroid-specific rendering
 */
import * as THREE from 'three';
import GameTheme from '../game/GameTheme.js';

class ASCIIEffect {
    /**
     * @param {THREE.WebGLRenderer} renderer - The WebGL renderer
     * @param {string} charSet - Characters to use in ASCII rendering (from darkest to brightest)
     * @param {object} options - Configuration options
     */
    constructor(renderer, charSet = ' .:-=+*#%@', options = {}) {
        // ASCII rendering settings
        this.resolution = options.resolution || 0.15; // Higher for more details
        this.scale = options.scale || 1;
        this.color = options.color !== undefined ? options.color : false; // Use color (slower)
        this.alpha = options.alpha !== undefined ? options.alpha : false; // Transparency
        this.block = options.block !== undefined ? options.block : false; // Blocked characters
        this.invert = options.invert !== undefined ? options.invert : false; // Invert colors
        this.strResolution = options.strResolution || 'low';
        this.backgroundColor = options.backgroundColor || '#000000';
        this.textColor = options.textColor || '#ffffff';
        this.isEnabled = options.enabled !== undefined ? options.enabled : false; // Initially disabled
        
        // Store renderer reference
        this.renderer = renderer;
        this.originalDomElement = renderer.domElement;
        
        // Dimensions
        this.width = 0;
        this.height = 0;
        
        // Create DOM elements for ASCII output
        this.domElement = document.createElement('div');
        this.domElement.style.cursor = 'default';
        this.domElement.style.position = 'absolute';
        this.domElement.style.top = '0';
        this.domElement.style.left = '0';
        this.domElement.style.width = '100%';
        this.domElement.style.height = '100%';
        this.domElement.style.zIndex = '100';
        this.domElement.style.display = this.isEnabled ? 'block' : 'none';
        
        // Create ASCII table
        this.asciiTable = document.createElement('table');
        this.asciiTable.style.backgroundColor = this.backgroundColor;
        this.asciiTable.style.color = this.textColor;
        this.domElement.appendChild(this.asciiTable);
        
        // Canvas for processing
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Characters for ASCII rendering
        this.defaultColorCharList = ' CGO08@'.split('');
        this.defaultCharList = ' .,:;i1tfLCG08@'.split('');
        this.charList = charSet ? charSet.split('') : (this.color ? this.defaultColorCharList : this.defaultCharList);
        this.font = 'courier new, monospace';
        
        // Font size and line height calculations
        this.fontSize = (2 / this.resolution) * this.scale;
        this.lineHeight = (2 / this.resolution) * this.scale;
        
        // Letter spacing adjustments
        this.letterSpacing = this._calculateLetterSpacing();

        // Add to document
        document.body.appendChild(this.domElement);
        
        // Initialize with renderer's current size
        this.setSize(renderer.domElement.width, renderer.domElement.height);
    }
    
    /**
     * Calculate letter spacing based on resolution and scale
     * @private
     * @returns {number} Letter spacing value
     */
    _calculateLetterSpacing() {
        let letterSpacing = 0;
        
        if (this.strResolution === 'low') {
            switch (this.scale) {
                case 1: letterSpacing = -1; break;
                case 2:
                case 3: letterSpacing = -2.1; break;
                case 4: letterSpacing = -3.1; break;
                case 5: letterSpacing = -4.15; break;
            }
        } else if (this.strResolution === 'medium') {
            switch (this.scale) {
                case 1: letterSpacing = 0; break;
                case 2: letterSpacing = -1; break;
                case 3: letterSpacing = -1.04; break;
                case 4:
                case 5: letterSpacing = -2.1; break;
            }
        } else if (this.strResolution === 'high') {
            switch (this.scale) {
                case 1:
                case 2: letterSpacing = 0; break;
                case 3:
                case 4:
                case 5: letterSpacing = -1; break;
            }
        }
        
        return letterSpacing;
    }
    
    /**
     * Set the size of the ASCII rendering
     * @param {number} width - Width in pixels
     * @param {number} height - Height in pixels
     */
    setSize(width, height) {
        this.width = width;
        this.height = height;
        
        // Set the canvas size for image processing
        const asciiWidth = Math.floor(width * this.resolution);
        const asciiHeight = Math.floor(height * this.resolution);
        this.canvas.width = asciiWidth;
        this.canvas.height = asciiHeight;
        
        // Configure ASCII table styling
        this.asciiTable.cellSpacing = 0;
        this.asciiTable.cellPadding = 0;
        
        const style = this.asciiTable.style;
        style.whiteSpace = 'pre';
        style.margin = '0px';
        style.padding = '0px';
        style.letterSpacing = this.letterSpacing + 'px';
        style.fontFamily = this.font;
        style.fontSize = this.fontSize + 'px';
        style.lineHeight = this.lineHeight + 'px';
        style.textAlign = 'left';
        style.textDecoration = 'none';
        
        // Update the renderer size as well
        this.renderer.setSize(width, height);
    }
    
    /**
     * Render the scene using ASCII characters
     * @param {THREE.Scene} scene - The scene to render
     * @param {THREE.Camera} camera - The camera to use for rendering
     */
    render(scene, camera) {
        // Skip rendering if disabled
        if (!this.isEnabled) {
            this.renderer.render(scene, camera);
            return;
        }
        
        // Render the scene to the renderer's canvas
        this.renderer.render(scene, camera);
        
        // Process the rendered image to create ASCII art
        this._processToAscii();
    }
    
    /**
     * Process the rendered image to ASCII characters
     * @private
     */
    _processToAscii() {
        const rendererCanvas = this.renderer.domElement;
        
        // Clear the processing canvas and draw the renderer output
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(rendererCanvas, 0, 0, this.canvas.width, this.canvas.height);
        
        // Get image data for processing
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        
        // Generate ASCII representation
        let asciiChars = '';
        
        // Process the image data
        for (let y = 0; y < this.canvas.height; y += 2) { // Process every other row for aspect ratio
            for (let x = 0; x < this.canvas.width; x++) {
                const offset = (y * this.canvas.width + x) * 4;
                
                // Extract RGB values
                const red = imageData[offset];
                const green = imageData[offset + 1];
                const blue = imageData[offset + 2];
                const alpha = imageData[offset + 3];
                
                // Calculate brightness (standard luminance formula)
                let brightness = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
                
                // Handle transparency
                if (alpha === 0) {
                    brightness = 1; // Transparent areas show as background
                }
                
                // Map brightness to character index
                let charIndex = Math.floor((1 - brightness) * (this.charList.length - 1));
                
                // Handle inversion if needed
                if (this.invert) {
                    charIndex = this.charList.length - charIndex - 1;
                }
                
                // Get the character and handle spaces
                let char = this.charList[charIndex];
                if (char === undefined || char === ' ') {
                    char = '&nbsp;';
                }
                
                // Add colored span if color mode is enabled
                if (this.color) {
                    asciiChars += `<span style="
                        color: rgb(${red},${green},${blue});
                        ${this.block ? `background-color: rgb(${red},${green},${blue});` : ''}
                        ${this.alpha ? `opacity: ${alpha/255};` : ''}
                    ">${char}</span>`;
                } else {
                    asciiChars += char;
                }
            }
            
            // End of row
            asciiChars += '<br/>';
        }
        
        // Update the ASCII table with the generated characters
        this.asciiTable.innerHTML = `<tr><td style="display:block;width:${this.width}px;height:${this.height}px;overflow:hidden">${asciiChars}</td></tr>`;
    }
    
    /**
     * Toggle the ASCII effect on/off
     * @returns {boolean} New enabled state
     */
    toggle() {
        this.isEnabled = !this.isEnabled;
        this.domElement.style.display = this.isEnabled ? 'block' : 'none';
        return this.isEnabled;
    }
    
    /**
     * Enable the ASCII effect
     */
    enable() {
        this.isEnabled = true;
        this.domElement.style.display = 'block';
    }
    
    /**
     * Disable the ASCII effect
     */
    disable() {
        this.isEnabled = false;
        this.domElement.style.display = 'none';
    }
    
    /**
     * Dispose of resources
     */
    dispose() {
        document.body.removeChild(this.domElement);
        this.domElement = null;
        this.canvas = null;
        this.ctx = null;
    }
}

export default ASCIIEffect;