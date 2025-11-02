/**
 * GeometryFactory.js - Unified factory for creating geometric shapes
 * Centralizes all shape creation logic to separate rendering from functionality
 * Handles ores, power-ups, asteroids, and enemies with a consistent API
 */
import * as THREE from 'three';
import CollectibleConfig from '../collectibles/CollectibleConfig.js';
import PowerUpConfig from '../powers/PowerUpConfig.js';
import EnemyConfig from '../enemies/EnemyConfig.js';

// Cache for standard asteroid geometries - now just a single geometry
const asteroidGeometryCache = {
    standard: null
};

class GeometryFactory {
    /**
     * Create a boss mesh based on type
     * @param {string} type - The boss type ('sphere', etc.)
     * @param {Object} params - Boss mesh parameters
     * @returns {THREE.Mesh} The boss mesh
     */
    static createBossMesh(type, params = {}) {
        // Default parameters
        const size = params.size || 20;
        const color = params.color || 0xff0000;
        const position = params.position || new THREE.Vector3(0, 0, 0);
        
        // Create geometry based on type
        let geometry;
        switch (type) {
            case 'sphere':
                geometry = new THREE.SphereGeometry(size, 32, 32);
                break;
            default:
                // Default to sphere if unknown type
                geometry = new THREE.SphereGeometry(size, 32, 32);
        }
        
        // Create material with emissive properties for glow
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: new THREE.Color(color).multiplyScalar(0.5),
            wireframe: false, // Set to false to make it solid
            specular: 0xffffff,
            shininess: 100,
            transparent: true,
            opacity: 0.8 // Slight transparency to see through it
        });
        
        // Create and position mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        
        return mesh;
    }
    
    /**
     * Create spikes for a boss
     * @param {Object} params - Spike parameters
     * @returns {Array} Array of spike meshes
     */
    static createBossSpikes(params = {}) {
        const parentMesh = params.parentMesh;
        if (!parentMesh) {
            console.error('Parent mesh required for createBossSpikes');
            return [];
        }
        
        const count = params.count || 15;
        const length = params.length || 5;
        const radius = params.radius || 1;
        const color = params.color || 0xff0000;
        const baseSize = params.baseSize || 20;
        
        // Material for spikes
        const spikeMaterial = new THREE.MeshPhongMaterial({
            color: color,
            emissive: new THREE.Color(color).multiplyScalar(0.5),
            wireframe: false, // Set to false to make them solid
            transparent: true,
            opacity: 0.9,
            specular: 0xffffff,
            shininess: 80
        });
        
        const spikes = [];
        
        for (let i = 0; i < count; i++) {
            // Create cone geometry for spike
            const spikeGeometry = new THREE.ConeGeometry(radius, length, 8);
            const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
            
            // Position randomly on sphere surface
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            
            // Convert spherical to cartesian coordinates
            const x = baseSize * Math.sin(theta) * Math.cos(phi);
            const y = baseSize * Math.sin(theta) * Math.sin(phi);
            const z = baseSize * Math.cos(theta);
            
            spike.position.set(x, y, z);
            
            // Orient spike to point outward
            spike.lookAt(spike.position.clone().multiplyScalar(2));
            
            // Add to parent mesh
            parentMesh.add(spike);
            spikes.push(spike);
        }
        
        return spikes;
    }
    /**
     * Create geometry for any collectible item (collectible or power-up)
     * @param {string} type - The item type
     * @param {string} category - Either 'collectible' (or 'ore' for backward compatibility) or 'powerUp'
     * @param {Object} params - Additional parameters
     * @returns {THREE.Geometry} The created geometry
     */
    static createCollectibleGeometry(type, category, params = {}) {
        if (category === 'collectible' || category === 'ore') {
            return this.createOreGeometry(type, params);
        } else if (category === 'powerUp') {
            return this.createPowerGeometry(type, params);
        } else {
            console.error(`Unknown collectible category: ${category}`);
            // Default to simple sphere
            return new THREE.SphereGeometry(params.size || 1.5, 16, 16);
        }
    }

    /**
     * Create a complete mesh for any collectible item
     * @param {string} type - The item type
     * @param {string} category - Either 'collectible' (or 'ore' for backward compatibility) or 'powerUp'
     * @param {Object} params - Additional parameters
     * @returns {THREE.Mesh} The complete mesh
     */
    static createCollectibleMesh(type, category, params = {}) {
        if (category === 'collectible' || category === 'ore') {
            return this.createOreMesh(type, params);
        } else if (category === 'powerUp') {
            return this.createPowerMesh(type, params);
        } else {
            console.error(`Unknown collectible category: ${category}`);
            // Create a default mesh
            const geometry = new THREE.SphereGeometry(params.size || 1.5, 16, 16);
            const material = new THREE.MeshBasicMaterial({
                color: params.color || 0xaaaaaa,
                wireframe: true
            });
            return new THREE.Mesh(geometry, material);
        }
    }
    
    /**
     * Create a basic ore shape
     * @param {Object|string} params - Shape parameters or ore type string
     * @returns {THREE.Geometry} The created geometry
     */
    static createOreGeometry(params, extraParams = {}) {
        // Check if params is just a type string
        if (typeof params === 'string') {
            const oreConfig = CollectibleConfig.getCollectibleConfig(params);
            if (oreConfig) {
                // Use ore config as params
                params = {
                    geometryType: oreConfig.geometryType,
                    size: extraParams.size || oreConfig.size,
                    detail: oreConfig.detail,
                    distortion: oreConfig.distortion
                };
            } else {
                // Default params if not found
                params = {
                    geometryType: 'tetrahedron',
                    size: extraParams.size || 1.5,
                    detail: 0,
                    distortion: 0
                };
            }
        }

        // Create geometry based on type
        let geometry;
        
        switch (params.geometryType) {
            case 'tetrahedron':
                geometry = new THREE.TetrahedronGeometry(params.size, params.detail);
                break;
            case 'box':
                geometry = new THREE.BoxGeometry(
                    params.size, 
                    params.size, 
                    params.size
                );
                break;
            case 'octahedron':
                geometry = new THREE.OctahedronGeometry(params.size, params.detail);
                break;
            case 'dodecahedron':
                geometry = new THREE.DodecahedronGeometry(params.size, params.detail);
                break;
            case 'icosahedron':
                geometry = new THREE.IcosahedronGeometry(params.size, params.detail);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(
                    params.size,
                    params.detail || 16, // width segments
                    params.detail || 16  // height segments
                );
                break;
            case 'torus':
                geometry = new THREE.TorusGeometry(
                    params.size * 0.7,    // radius
                    params.size * 0.3,    // tube
                    params.detail || 16,  // radial segments
                    params.detail * 4 || 64 // tubular segments
                );
                break;
            case 'torusKnot':
                geometry = new THREE.TorusKnotGeometry(
                    params.size * 0.6,    // radius
                    params.size * 0.2,    // tube
                    params.detail || 64,  // tubularSegments
                    params.detail/8 || 8, // radialSegments
                    2,                    // p
                    3                     // q
                );
                break;
            default:
                geometry = new THREE.TetrahedronGeometry(params.size, 0);
        }
        
        // Apply vertex distortion if configured
        if (params.distortion > 0) {
            const vertices = geometry.attributes.position.array;
            
            for (let i = 0; i < vertices.length; i += 3) {
                const displacement = params.distortion * params.size;
                vertices[i] += (Math.random() - 0.5) * displacement;     // x
                vertices[i+1] += (Math.random() - 0.5) * displacement;   // y
                vertices[i+2] += (Math.random() - 0.5) * displacement;   // z
            }
            
            geometry.attributes.position.needsUpdate = true;
            geometry.computeVertexNormals();
        }
        
        return geometry;
    }
    
    /**
     * Create a complete ore mesh
     * @param {string} type - Ore type
     * @param {Object} params - Additional parameters
     * @returns {THREE.Mesh} The complete mesh
     */
    static createOreMesh(type, params = {}) {
        // Get collectible config for this type
        const oreConfig = CollectibleConfig.getCollectibleConfig(type);
        
        if (!oreConfig) {
            console.warn(`No ore config found for type: ${type}, using defaults`);
        }
        
        // Set color from ore config
        const color = params.color || (oreConfig ? oreConfig.color : 0xaaaaaa);
        
        // Create geometry
        const geometry = this.createOreGeometry({
            geometryType: oreConfig ? oreConfig.geometryType : 'tetrahedron',
            size: params.size || (oreConfig ? oreConfig.size : 1.5),
            detail: oreConfig ? oreConfig.detail : 0,
            distortion: params.distortion || (oreConfig ? oreConfig.distortion : 0)
        });

        // Create material
        // DOTTY: Temporarily make ores solid instead of wireframe for visibility testing
        const material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: false, // Changed from true to false for testing
            side: THREE.DoubleSide, // DOTTY: Render both sides to test if it's a face culling issue
            transparent: params.transparent !== undefined ? params.transparent : false,
            opacity: params.opacity !== undefined ? params.opacity : 1.0
        });
        
        // Create and return the mesh
        return new THREE.Mesh(geometry, material);
    }
    
    /**
     * Create a power-up shape
     * @param {string} type - The power-up type
     * @param {Object} params - Additional parameters
     * @returns {THREE.Geometry} The created geometry
     */
    static createPowerGeometry(type, params = {}) {
        // Get config for this power-up type
        const powerConfig = PowerUpConfig.getPowerUpConfig(type);
        const size = params.size || (powerConfig ? powerConfig.size : 2.0);
        
        let geometry;
        
        switch (type) {
            case 'timeWarp':
                // Torus knot (twisted ring shape)
                geometry = new THREE.TorusKnotGeometry(
                    size * 0.8,       // radius
                    size * 0.2,       // tube
                    64,               // tubularSegments
                    8,                // radialSegments
                    2,                // p
                    3                 // q
                );
                break;
                
            case 'shield': {
                // Shield bubble using LatheGeometry
                // Create a curved profile for lathe geometry (half circle + flattened edges)
                const points = [];
                const segments = 12;
                const shieldRadius = size * 0.8;
                
                // Create a half-circle profile
                for (let i = 0; i <= segments; i++) {
                    const angle = (Math.PI * i) / segments;
                    points.push(new THREE.Vector2(
                        Math.sin(angle) * shieldRadius,
                        Math.cos(angle) * shieldRadius
                    ));
                }
                
                // Create lathe geometry by rotating the profile
                geometry = new THREE.LatheGeometry(
                    points,
                    24,    // Number of segments around the lathe
                    0,     // Start angle
                    Math.PI * 2 // End angle (full circle)
                );
                
                break;
            }
                
            case 'weaponBoost':
                // Truncated icosahedron (soccer ball shape)
                // Since THREE.js doesn't have this directly, use a sphere with icosahedron detail
                geometry = new THREE.IcosahedronGeometry(size, 1);
                break;
                
            case 'magnetPull':
                // Torus (donut shape)
                geometry = new THREE.TorusGeometry(
                    size * 0.7,       // radius
                    size * 0.3,       // tube
                    16,               // radialSegments
                    64                // tubularSegments
                );
                break;
                
            case 'multiShot': {
                // Gyroelongated square dipyramid (two pyramids with prism)
                // Create a custom geometry
                geometry = new THREE.BufferGeometry();
                
                // Define vertices for this complex shape
                const multiShotVertices = [
                    // Top pyramid
                    0, size, 0,              // Top point
                    size/2, size/2, size/2,  // Top pyramid base
                    -size/2, size/2, size/2,
                    -size/2, size/2, -size/2,
                    size/2, size/2, -size/2,
                    
                    // Middle prism
                    size/2, size/2, size/2,  // Top of prism
                    -size/2, size/2, size/2,
                    -size/2, size/2, -size/2,
                    size/2, size/2, -size/2,
                    size/2, -size/2, size/2, // Bottom of prism
                    -size/2, -size/2, size/2,
                    -size/2, -size/2, -size/2,
                    size/2, -size/2, -size/2,
                    
                    // Bottom pyramid
                    0, -size, 0,             // Bottom point
                    size/2, -size/2, size/2, // Bottom pyramid base
                    -size/2, -size/2, size/2,
                    -size/2, -size/2, -size/2,
                    size/2, -size/2, -size/2
                ];
                
                // Define faces as triangles (indices to vertices)
                const indices = [
                    // Top pyramid
                    0, 1, 2,
                    0, 2, 3,
                    0, 3, 4,
                    0, 4, 1,
                    
                    // Middle prism - top face
                    5, 6, 7,
                    5, 7, 8,
                    
                    // Prism sides
                    5, 9, 6, 
                    6, 9, 10,
                    6, 10, 7,
                    7, 10, 11,
                    7, 11, 8,
                    8, 11, 12,
                    8, 12, 5,
                    5, 12, 9,
                    
                    // Middle prism - bottom face
                    9, 10, 11,
                    9, 11, 12,
                    
                    // Bottom pyramid
                    13, 14, 15,
                    13, 15, 16,
                    13, 16, 17,
                    13, 17, 14
                ];
                
                geometry.setIndex(indices);
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(multiShotVertices, 3));
                geometry.computeVertexNormals();
                break;
            }
                
            case 'hyperdrive': {
                // Twisted star prism
                geometry = new THREE.CylinderGeometry(
                    size * 0.8,       // radiusTop
                    size * 0.8,       // radiusBottom
                    size * 1.5,       // height
                    5,                // radialSegments (5 for star shape)
                    1,                // heightSegments
                    false             // openEnded
                );
                
                // Create a star shape by pushing vertices outward alternately
                const hyperdriveVertices = geometry.attributes.position.array;
                const topStart = 0;
                const bottomStart = 5 * 3; // 5 points * 3 coordinates
                
                // Modify top vertices to create points
                for (let i = 0; i < 5; i++) {
                    const idx = topStart + i * 3;
                    const x = hyperdriveVertices[idx];
                    const y = hyperdriveVertices[idx + 1];
                    const z = hyperdriveVertices[idx + 2];
                    
                    const length = Math.sqrt(x*x + z*z); // Ignore y for this calculation
                    if (i % 2 === 0) {
                        // Push outward to create points
                        hyperdriveVertices[idx] = x * 1.5;
                        hyperdriveVertices[idx + 2] = z * 1.5;
                    } else {
                        // Push inward to create valleys
                        hyperdriveVertices[idx] = x * 0.6;
                        hyperdriveVertices[idx + 2] = z * 0.6;
                    }
                }
                
                // Modify bottom vertices similarly but rotated slightly
                for (let i = 0; i < 5; i++) {
                    const idx = bottomStart + i * 3;
                    const x = hyperdriveVertices[idx];
                    const y = hyperdriveVertices[idx + 1];
                    const z = hyperdriveVertices[idx + 2];
                    
                    const length = Math.sqrt(x*x + z*z);
                    if ((i + 2) % 2 === 0) { // Offset by 2 to create twist
                        hyperdriveVertices[idx] = x * 1.5;
                        hyperdriveVertices[idx + 2] = z * 1.5;
                    } else {
                        hyperdriveVertices[idx] = x * 0.6;
                        hyperdriveVertices[idx + 2] = z * 0.6;
                    }
                }
                
                geometry.attributes.position.needsUpdate = true;
                geometry.computeVertexNormals();
                break;
            }
                
            case 'oreScanner': {
                // Twisted hexagon
                geometry = new THREE.CylinderGeometry(
                    size * 0.8,       // radiusTop
                    size * 0.8,       // radiusBottom
                    size * 0.4,       // height
                    6,                // radialSegments (6 for hexagon)
                    4,                // heightSegments
                    false             // openEnded
                );
                
                // Twist the hexagon
                const scannerVertices = geometry.attributes.position.array;
                const segmentCount = 6;
                const heightSegments = 4;
                const totalVertices = (segmentCount + 1) * (heightSegments + 1);
                
                // Apply twist
                for (let i = 0; i < totalVertices; i++) {
                    const idx = i * 3;
                    const x = scannerVertices[idx];
                    const y = scannerVertices[idx + 1];
                    const z = scannerVertices[idx + 2];
                    
                    // Calculate twist based on height
                    const twistFactor = (y + size * 0.2) / (size * 0.4); // Normalize to 0-1
                    const angle = twistFactor * Math.PI * 0.5; // Twist by 90 degrees total
                    
                    // Apply rotation around Y axis
                    const newX = x * Math.cos(angle) - z * Math.sin(angle);
                    const newZ = x * Math.sin(angle) + z * Math.cos(angle);
                    
                    scannerVertices[idx] = newX;
                    scannerVertices[idx + 2] = newZ;
                }
                
                geometry.attributes.position.needsUpdate = true;
                geometry.computeVertexNormals();
                break;
            }
                
            default:
                // Default to a sphere if type not recognized
                geometry = new THREE.SphereGeometry(size, 16, 16);
        }
        
        return geometry;
    }
    
    /**
     * Create a material for a power-up
     * @param {string} type - Power-up type
     * @param {Object} params - Additional parameters
     * @returns {THREE.Material} The created material
     */
    static createPowerMaterial(type, params = {}) {
        // Get config for this power-up type
        const powerConfig = PowerUpConfig.getPowerUpConfig(type);
        const color = params.color || (powerConfig ? powerConfig.color : 0xFFFFFF);
        
        // For all power-ups, always create a wireframe material
        const material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true, // Always wireframe
            opacity: params.opacity !== undefined ? params.opacity : 0.8,
            transparent: true
        });
        
        // Special case for shield - double-sided for shield bubble
        if (type === 'shield') {
            material.side = THREE.DoubleSide;
            material.opacity = params.opacity !== undefined ? params.opacity : 0.6;
        }
        
        return material;
    }
    
    /**
     * Create a complete mesh for a power-up
     * @param {string} type - Power-up type
     * @param {Object} params - Additional parameters
     * @returns {THREE.Mesh} The complete mesh
     */
    static createPowerMesh(type, params = {}) {
        const geometry = this.createPowerGeometry(type, params);
        const material = this.createPowerMaterial(type, params);
        
        return new THREE.Mesh(geometry, material);
    }
    
    /**
     * Create a heat-seeking mine mesh - a simple sphere with wireframe for Tetra enemy
     * @param {Object} params - Parameters for the mine
     * @returns {THREE.Mesh} Simple wireframe mine mesh
     */
    static createHeatSeekingMineMesh(params = {}) {
        const size = params.size || 15.0;
        const color = params.color || 0xff0000;
        
        // Create a simple sphere geometry with low poly count for performance
        const geometry = new THREE.SphereGeometry(size, 8, 6);
        
        // Create wireframe material for better performance and consistent aesthetic
        const material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true,
            transparent: true,
            opacity: 0.9
        });
        
        // Create the mesh
        const mineMesh = new THREE.Mesh(geometry, material);
        
        // Store original size in userData for collision detection reference
        mineMesh.userData.size = size;
        
        console.log(`GeometryFactory: Created heat-seeking mine mesh with size ${size}`);
        
        return mineMesh;
    }
    
    /**
     * Create a heat-seeking mine mesh with spikes
     * @param {Object} params - Parameters for the mine
     * @returns {THREE.Object3D} The complete mine mesh with spikes
     */
    static createMineMesh(params = {}) {
        const size = params.size || 1.2;
        const color = params.color || 0xff1100;
        
        // Create the mine geometry - dodecahedron for distinctive look
        const geometry = new THREE.DodecahedronGeometry(size * 0.7, 0);
        
        // Create material with emissive properties for glowing effect
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.7,
            specular: 0xffffff,
            shininess: 30,
            transparent: true,
            opacity: 0.9
        });
        
        // Create main mesh
        const mineMesh = new THREE.Mesh(geometry, material);
        
        // Add spikes to make it look like a mine
        this.addMineSpikesMesh(mineMesh, params);
        
        return mineMesh;
    }
    
    /**
     * Add spikes to a mine mesh
     * @param {THREE.Mesh} mineMesh - The mine mesh to add spikes to
     * @param {Object} params - Parameters for the spikes
     */
    static addMineSpikesMesh(mineMesh, params = {}) {
        const size = params.size || 1.2;
        const spikeCount = params.spikeCount || 12; // Number of spikes
        const spikeLength = size * 0.6; // Length of each spike
        const spikeRadius = size * 0.15; // Radius at base of spike
        
        // Material for spikes - slightly different color for contrast
        const spikeMaterial = new THREE.MeshPhongMaterial({
            color: 0xdd0000, // Slightly darker than main body
            emissive: 0xff3300,
            emissiveIntensity: 0.5,
            specular: 0xffffff,
            shininess: 30
        });
        
        // Store spikes in userData for animation access
        mineMesh.userData.spikes = [];
        
        // Create spikes in a regular pattern around the mine
        for (let i = 0; i < spikeCount; i++) {
            // Create cone geometry for spike
            const spikeGeometry = new THREE.ConeGeometry(
                spikeRadius, // Radius
                spikeLength, // Height
                6, // radialSegments
                1, // heightSegments
                false // openEnded
            );
            
            // Create mesh
            const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
            
            // Position spike on surface of dodecahedron
            // Using spherical coordinates for even distribution
            const phi = Math.acos(-1 + (2 * i) / spikeCount); // Polar angle
            const theta = Math.sqrt(spikeCount * Math.PI) * phi; // Azimuthal angle
            
            // Convert to Cartesian coordinates
            const x = Math.sin(phi) * Math.cos(theta);
            const y = Math.sin(phi) * Math.sin(theta);
            const z = Math.cos(phi);
            
            // Position spike slightly outside sphere surface
            const direction = new THREE.Vector3(x, y, z).normalize();
            spike.position.copy(direction.multiplyScalar(size * 0.7));
            
            // Orient spike to point outward
            spike.lookAt(direction.multiplyScalar(2));
            
            // Add spike to mine mesh
            mineMesh.add(spike);
            
            // Store reference for animation
            mineMesh.userData.spikes.push(spike);
        }
    }
    
    /**
     * Get a single standard asteroid geometry that can be scaled via instanced mesh.
     * This creates one consistent geometry that's cached for reuse across all asteroids,
     * which is essential for instance mesh performance.
     * 
     * @returns {THREE.BufferGeometry} The standard asteroid geometry
     */
    static getStandardAsteroidGeometry() {
        // Create the geometry only once and cache it
        if (!asteroidGeometryCache.standard) {
            // Use a consistent number of vertices and irregularity to ensure
            // all asteroids use exactly the same base geometry for optimal instancing
            const params = { 
                baseSize: 1.0,     // Unit size (will be scaled by the Asteroid class)
                vertices: 8,        // Number of polygon vertices
                irregularity: 0.35  // How irregular the shape is
            };
            
            asteroidGeometryCache.standard = this.createAsteroidGeometry(params);
        }
        
        return asteroidGeometryCache.standard;
    }

    /**
     * Create an asteroid geometry with a 3D polyhedron structure.
     * Uses a dodecahedron base with vertex displacement for an irregular shape.
     * 
     * @param {Object} params - Asteroid parameters
     * @param {number} params.baseSize - Base size of the asteroid (usually 1.0)
     * @param {number} params.vertices - Number of vertices for underlying structure
     * @param {number} params.irregularity - How irregular the shape is (0-0.5 recommended):
     *    - 0.0: perfect regular polygon
     *    - 0.2: slightly irregular polygon (minor variations)
     *    - 0.35: medium irregularity (recommended for asteroid feel)
     *    - 0.5: highly irregular polygon (very jagged shape)
     * @returns {THREE.BufferGeometry} The created asteroid geometry
     */
    static createAsteroidGeometry(params) {
        const { baseSize, vertices, irregularity } = params;
        
        // Start with a dodecahedron as the base shape - more interesting than a sphere
        // but still has good uniformity for retro look
        const baseGeometry = new THREE.DodecahedronGeometry(baseSize, 0);
        
        // Get vertices and modify them for asteroid-like irregularity
        const positions = baseGeometry.attributes.position.array;
        
        // Randomly displace vertices to create irregular asteroid shapes
        // This creates a true 3D irregular shape while maintaining the base structure
        for (let i = 0; i < positions.length; i += 3) {
            // Create a normalized direction vector from center to this vertex
            const x = positions[i];
            const y = positions[i+1];
            const z = positions[i+2];
            
            // Get normalized direction from center
            const length = Math.sqrt(x*x + y*y + z*z);
            const nx = x / length;
            const ny = y / length;
            const nz = z / length;
            
            // Apply random displacement along the normal vector
            // This ensures the shape stays roughly symmetrical while being irregular
            const displacement = baseSize * irregularity * (0.5 + Math.random());
            
            positions[i] = x + nx * displacement;
            positions[i+1] = y + ny * displacement;
            positions[i+2] = z + nz * displacement;
        }
        
        // Update geometry after modifying vertices
        baseGeometry.attributes.position.needsUpdate = true;
        baseGeometry.computeVertexNormals();
        
        return baseGeometry;
    }

    /**
     * UNUSED - Legacy asteroid functions
     */
    /*
    static createBaseAsteroidGeometry(params) {
        // This method is kept for backward compatibility
        console.warn("createBaseAsteroidGeometry is deprecated. Use createAsteroidGeometry instead.");
        const { size, detail, variation, jaggedness } = params;
        
        // Always use Icosahedron as base for more rock-like structure
        const baseGeometry = new THREE.IcosahedronGeometry(size * 0.5, detail);
        
        // Get vertices and make them irregular
        const vertices = baseGeometry.attributes.position.array;
        
        // Randomly displace vertices
        for (let i = 0; i < vertices.length; i += 3) {
            const displacement = variation * size * jaggedness;
            const v = new THREE.Vector3(vertices[i], vertices[i+1], vertices[i+2]);
            // Displace along the vertex normal for a more "rocky" look than pure random
            v.normalize();
            vertices[i]   += v.x * (Math.random() - 0.5) * displacement * 2;
            vertices[i+1] += v.y * (Math.random() - 0.5) * displacement * 2;
            vertices[i+2] += v.z * (Math.random() - 0.5) * displacement * 2;
        }
        
        // Update the geometry
        baseGeometry.attributes.position.needsUpdate = true;
        baseGeometry.computeVertexNormals();
        
        return baseGeometry;
    }
    
    static createRetroAsteroidGeometry(params = {}) {
        // Alias for createAsteroidGeometry - kept for backward compatibility
        console.warn("createRetroAsteroidGeometry is deprecated. Use createAsteroidGeometry instead.");
        return this.createAsteroidGeometry(params);
    }
    */
    
    /**
     * Create a complete asteroid mesh - Used for debugging/preview
     * @param {Object} params - Asteroid parameters
     * @returns {THREE.Mesh} The complete asteroid mesh
     */
    static createAsteroidMesh(params = {}) {
        // Create geometry
        const geometry = this.createAsteroidGeometry({
            baseSize: params.size || 1.0,
            vertices: params.vertices || 8,
            irregularity: params.irregularity || params.jaggedness || 0.35
        });
        
        // Create material
        const material = new THREE.MeshBasicMaterial({
            color: params.color || 0xaaaaaa,
            wireframe: true,
            transparent: params.transparent !== undefined ? params.transparent : false,
            opacity: params.opacity !== undefined ? params.opacity : 1.0
        });
        
        // Create and return the mesh
        return new THREE.Mesh(geometry, material);
    }
    
    /**
     * Create geometry for any enemy type
     * @param {string} type - The enemy type
     * @param {Object} params - Additional parameters
     * @returns {THREE.BufferGeometry} The created geometry
     */
    static createEnemyGeometry(type, params = {}) {
        // Get enemy config
        const enemyConfig = EnemyConfig.getEnemyConfig(type);
        
        if (!enemyConfig) {
            console.warn(`No enemy config found for type: ${type}, using defaults`);
        }
        
        // Set parameters from config and overrides
        const size = params.size || (enemyConfig ? enemyConfig.size : 3.0);
        const geometryType = params.geometryType || (enemyConfig ? enemyConfig.geometryType : 'ufo');
        
        // Create geometry based on type
        switch (geometryType) {
            case 'ufo':
                return this.createUFOGeometry(size, params);
            case 'hunter':
                return this.createHunterGeometry(size, params);
            case 'bomber':
                return this.createBomberGeometry(size, params);
            case 'patroller':
                return this.createPatrollerGeometry(size, params);
            case 'tetra':
                return this.createTetraGeometry(size, params);
            default:
                console.warn(`Unknown enemy geometry type: ${geometryType}, using UFO`);
                return this.createUFOGeometry(size, params);
        }
    }
    
    /**
     * Create a complete enemy mesh
     * @param {string} type - Enemy type
     * @param {Object} params - Additional parameters
     * @returns {THREE.Mesh} The complete mesh
     */
    static createEnemyMesh(type, params = {}) {
        // Get enemy config for this type
        const enemyConfig = EnemyConfig.getEnemyConfig(type);
        
        if (!enemyConfig) {
            console.warn(`No enemy config found for type: ${type}, using defaults`);
        }
        
        // Set color from enemy config
        const color = params.color || (enemyConfig ? enemyConfig.color : 0xff4400);
        
        // Special case for Tetra which requires custom materials and inner sphere
        if (type === 'tetra') {
            return this.createTetraMesh(params);
        }
        
        // Special case for Bomber to add colored bombs
        if (type === 'bomber') {
            return this.createBomberMesh(params);
        }
        
        // Create geometry
        const geometry = this.createEnemyGeometry(type, params);
        
        // Create material
        const material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true,
            transparent: params.transparent !== undefined ? params.transparent : false,
            opacity: params.opacity !== undefined ? params.opacity : 1.0
        });
        
        // Create and return the mesh
        return new THREE.Mesh(geometry, material);
    }
    
    /**
     * Create a complete bomber enemy mesh with colored bombs
     * @param {Object} params - Additional parameters
     * @returns {THREE.Mesh} The bomber mesh
     */
    static createBomberMesh(params = {}) {
        const enemyConfig = EnemyConfig.getEnemyConfig('bomber');
        const color = params.color || (enemyConfig ? enemyConfig.color : 0xff8800);
        const size = params.size || (enemyConfig ? enemyConfig.size : 3.5);
        
        // Create the geometry
        const geometry = this.createBomberGeometry(size, params);
        
        // Create material - using a standard material for the ship
        const material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true,
            transparent: params.transparent !== undefined ? params.transparent : false,
            opacity: params.opacity !== undefined ? params.opacity : 1.0
        });
        
        // Create and return the mesh
        return new THREE.Mesh(geometry, material);
    }
    
    /**
     * Create a complete Tetra enemy mesh with inner sphere and highlighted edges
     * @param {Object} params - Tetra parameters
     * @returns {THREE.Object3D} The complete Tetra object with outlined edges
     */
    static createTetraMesh(params = {}) {
        const size = params.size || 200.0;
        
        // Create a group to hold our tetrahedron components
        const tetraGroup = new THREE.Group();
        
        // Create the outer tetrahedron geometry
        const tetraGeometry = this.createTetraGeometry(size, params);
        
        // Create the glossy black material with transparency
        const tetraMaterial = new THREE.MeshPhongMaterial({
            color: 0x000000,
            specular: 0x333333,
            shininess: 100,
            transparent: true,
            opacity: 0.6, // Slightly more transparent to make the edges more visible
            side: THREE.DoubleSide
        });
        
        // Create the tetrahedron mesh for the faces
        const tetraMesh = new THREE.Mesh(tetraGeometry, tetraMaterial);
        tetraGroup.add(tetraMesh);
        
        // Create an edges geometry to highlight the edges of the tetrahedron
        const edgesGeometry = new THREE.EdgesGeometry(tetraGeometry);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff, // Bright white for contrast
            linewidth: 2     // Thicker lines (note: not supported in all browsers)
        });
        
        // Create line segments for the edges
        const tetraEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        tetraGroup.add(tetraEdges);
        
        // Create the inner red sphere ("mind")
        const sphereSize = size * 0.4; // 40% of tetrahedron size
        const sphereGeometry = new THREE.SphereGeometry(sphereSize, 16, 16);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000, // Bright red
            emissive: 0x330000, // Slight glow
            specular: 0xffffff,
            shininess: 100
        });
        
        const innerSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        tetraGroup.add(innerSphere);
        
        // Store a reference to the inner sphere in user data for easy access
        tetraGroup.userData.innerSphere = innerSphere;
        
        // Store a reference to the main mesh for collision detection
        tetraGroup.userData.mainMesh = tetraMesh;
        
        return tetraGroup;
    }
    
    /**
     * Create UFO-specific geometry
     * @param {number} size - UFO size
     * @param {Object} params - Additional parameters
     * @returns {THREE.BufferGeometry} UFO geometry
     */
    static createUFOGeometry(size = 3.0, params = {}) {
        // Parameters
        const height = size * 0.4;
        const detail = params.detail || 16; // Number of segments
        
        // Create a combined geometry for the UFO
        const geometry = new THREE.BufferGeometry();
        
        // Create vertices for the UFO shape
        const vertices = [];
        const indices = [];
        
        // Top center point
        vertices.push(0, height / 2, 0);
        const topCenterIndex = 0;
        
        // Bottom center point
        vertices.push(0, -height / 2, 0);
        const bottomCenterIndex = 1;
        
        // Top ring points
        const topRingStartIndex = 2;
        for (let i = 0; i < detail; i++) {
            const angle = (i / detail) * Math.PI * 2;
            const x = Math.cos(angle) * size * 0.5;
            const z = Math.sin(angle) * size * 0.5;
            vertices.push(x, height / 2, z);
        }
        
        // Middle ring points (widest part)
        const middleRingStartIndex = topRingStartIndex + detail;
        for (let i = 0; i < detail; i++) {
            const angle = (i / detail) * Math.PI * 2;
            const x = Math.cos(angle) * size;
            const z = Math.sin(angle) * size;
            vertices.push(x, 0, z);
        }
        
        // Bottom ring points
        const bottomRingStartIndex = middleRingStartIndex + detail;
        for (let i = 0; i < detail; i++) {
            const angle = (i / detail) * Math.PI * 2;
            const x = Math.cos(angle) * size * 0.5;
            const z = Math.sin(angle) * size * 0.5;
            vertices.push(x, -height / 2, z);
        }
        
        // Create faces (triangles)
        
        // Top cone faces
        for (let i = 0; i < detail; i++) {
            const nextI = (i + 1) % detail;
            indices.push(
                topCenterIndex,
                topRingStartIndex + i,
                topRingStartIndex + nextI
            );
        }
        
        // Side faces - top to middle
        for (let i = 0; i < detail; i++) {
            const nextI = (i + 1) % detail;
            indices.push(
                topRingStartIndex + i,
                middleRingStartIndex + i,
                middleRingStartIndex + nextI
            );
            indices.push(
                topRingStartIndex + i,
                middleRingStartIndex + nextI,
                topRingStartIndex + nextI
            );
        }
        
        // Side faces - middle to bottom
        for (let i = 0; i < detail; i++) {
            const nextI = (i + 1) % detail;
            indices.push(
                middleRingStartIndex + i,
                bottomRingStartIndex + i,
                bottomRingStartIndex + nextI
            );
            indices.push(
                middleRingStartIndex + i,
                bottomRingStartIndex + nextI,
                middleRingStartIndex + nextI
            );
        }
        
        // Bottom cone faces
        for (let i = 0; i < detail; i++) {
            const nextI = (i + 1) % detail;
            indices.push(
                bottomCenterIndex,
                bottomRingStartIndex + nextI,
                bottomRingStartIndex + i
            );
        }
        
        // Create buffer geometry
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        
        return geometry;
    }
    
    /**
     * Create Hunter enemy geometry
     * @param {number} size - Hunter size
     * @param {Object} params - Additional parameters
     * @returns {THREE.BufferGeometry} Hunter geometry
     */
    static createHunterGeometry(size = 4.0, params = {}) {
        // Create a more aggressive looking ship
        const geometry = new THREE.BufferGeometry();
        
        // Length and width proportions
        const length = size * 1.5;
        const width = size;
        const height = size * 0.3;
        
        // Define vertices for hunter ship
        const vertices = [
            // Top vertices
            0, height/2, -length/2,             // 0: nose
            width/2, height/2, 0,               // 1: right wing tip
            -width/2, height/2, 0,              // 2: left wing tip
            width/4, height/2, length/4,        // 3: right rear
            -width/4, height/2, length/4,       // 4: left rear
            0, height/2, length/3,              // 5: rear center
            
            // Bottom vertices
            0, -height/2, -length/2,            // 6: nose
            width/2, -height/2, 0,              // 7: right wing tip
            -width/2, -height/2, 0,             // 8: left wing tip
            width/4, -height/2, length/4,       // 9: right rear
            -width/4, -height/2, length/4,      // 10: left rear
            0, -height/2, length/3              // 11: rear center
        ];
        
        // Define faces
        const indices = [
            // Top face
            0, 1, 3,
            0, 3, 5,
            0, 5, 4,
            0, 4, 2,
            3, 4, 5,
            
            // Bottom face
            6, 9, 7,
            6, 11, 9,
            6, 10, 11,
            6, 8, 10,
            9, 11, 10,
            
            // Sides
            0, 1, 7,
            0, 7, 6,
            1, 3, 9,
            1, 9, 7,
            3, 5, 11,
            3, 11, 9,
            5, 4, 10,
            5, 10, 11,
            4, 2, 8,
            4, 8, 10,
            2, 0, 6,
            2, 6, 8
        ];
        
        // Set geometry attributes
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        
        return geometry;
    }
    
    /**
     * Create Patroller enemy geometry
     * @param {number} size - Patroller size
     * @param {Object} params - Additional parameters
     * @returns {THREE.BufferGeometry} Patroller geometry
     */
    static createPatrollerGeometry(size = 2.5, params = {}) {
        // Create a drone-like shape with rotors
        const baseGeometry = new THREE.CylinderGeometry(
            size * 0.4,       // radiusTop
            size * 0.4,       // radiusBottom
            size * 0.2,       // height
            8,                // radialSegments
            1,                // heightSegments
            false             // openEnded
        );
        
        // Create 4 rotors at the corners
        const rotorSize = size * 0.15;
        const rotorHeight = size * 0.05;
        const rotorDistance = size * 0.6;
        
        // We'll create a composite geometry by manually setting vertices
        const vertices = [];
        const indices = [];
        
        // First, add the base cylinder vertices
        const baseVertices = baseGeometry.attributes.position.array;
        const baseIndices = baseGeometry.index.array;
        
        // Copy base vertices
        for (let i = 0; i < baseVertices.length; i += 3) {
            vertices.push(baseVertices[i], baseVertices[i+1], baseVertices[i+2]);
        }
        
        // Copy base indices
        for (let i = 0; i < baseIndices.length; i++) {
            indices.push(baseIndices[i]);
        }
        
        // Next, add the rotors
        const baseVertexCount = baseVertices.length / 3;
        const rotorPositions = [
            [rotorDistance, 0, rotorDistance],  // Front right
            [rotorDistance, 0, -rotorDistance], // Back right
            [-rotorDistance, 0, -rotorDistance], // Back left
            [-rotorDistance, 0, rotorDistance]  // Front left
        ];
        
        // For each rotor position
        for (let r = 0; r < rotorPositions.length; r++) {
            const [rx, ry, rz] = rotorPositions[r];
            const vertexOffset = baseVertexCount + r * 16; // 16 vertices per rotor (8 top, 8 bottom)
            
            // Create rotor cylinder
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const x = Math.cos(angle) * rotorSize;
                const z = Math.sin(angle) * rotorSize;
                
                // Top ring
                vertices.push(rx + x, ry + rotorHeight, rz + z);
                // Bottom ring
                vertices.push(rx + x, ry - rotorHeight, rz + z);
            }
            
            // Create rotor faces
            for (let i = 0; i < 8; i++) {
                const nextI = (i + 1) % 8;
                const topCurrent = vertexOffset + i * 2;
                const bottomCurrent = vertexOffset + i * 2 + 1;
                const topNext = vertexOffset + nextI * 2;
                const bottomNext = vertexOffset + nextI * 2 + 1;
                
                // Side faces
                indices.push(topCurrent, bottomCurrent, bottomNext);
                indices.push(topCurrent, bottomNext, topNext);
                
                // If it's the first rotor, also create top and bottom faces
                if (r === 0) {
                    // Create connecting rods to the base
                    const baseY = ry - rotorHeight - 0.05;
                    vertices.push(rx, ry - rotorHeight, rz); // Rotor center bottom
                    vertices.push(rx, baseY, rz); // Connection to base
                    vertices.push(0, baseY, 0);   // Base center at same height
                    
                    // Add connecting rod indices
                    const rodBaseIndex = vertices.length / 3 - 3;
                    indices.push(rodBaseIndex, rodBaseIndex + 1, rodBaseIndex + 2);
                }
            }
        }
        
        // Create the geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        
        return geometry;
    }
    
    /**
     * Create Bomber enemy geometry - a flying saucer with bomb attachments
     * @param {number} size - Bomber size
     * @param {Object} params - Additional parameters
     * @returns {THREE.BufferGeometry} Bomber geometry
     */
    static createBomberGeometry(size = 3.5, params = {}) {
        // We'll create a compound geometry for the bomber
        // Start with a buffered geometry to hold all vertices
        const geometry = new THREE.BufferGeometry();
        
        // Create main body similar to a flying saucer but wider
        const bodyVertices = [];
        const bodyIndices = [];
        
        // Parameters
        const detail = params.detail || 16; // Number of segments around
        const width = size;
        const height = size * 0.3;
        
        // Top dome vertices
        bodyVertices.push(0, height/2, 0); // Top center point
        const topCenterIndex = 0;
        
        // Bottom dome vertices
        bodyVertices.push(0, -height/2, 0); // Bottom center point
        const bottomCenterIndex = 1;
        
        // Middle wide ring (widest part)
        const middleRingStartIndex = 2;
        for (let i = 0; i < detail; i++) {
            const angle = (i / detail) * Math.PI * 2;
            const x = Math.cos(angle) * width;
            const z = Math.sin(angle) * width;
            bodyVertices.push(x, 0, z);
        }
        
        // Top ring
        const topRingStartIndex = middleRingStartIndex + detail;
        for (let i = 0; i < detail; i++) {
            const angle = (i / detail) * Math.PI * 2;
            const x = Math.cos(angle) * width * 0.6;
            const z = Math.sin(angle) * width * 0.6;
            bodyVertices.push(x, height * 0.4, z);
        }
        
        // Bottom ring
        const bottomRingStartIndex = topRingStartIndex + detail;
        for (let i = 0; i < detail; i++) {
            const angle = (i / detail) * Math.PI * 2;
            const x = Math.cos(angle) * width * 0.6;
            const z = Math.sin(angle) * width * 0.6;
            bodyVertices.push(x, -height * 0.4, z);
        }
        
        // Create the faces
        
        // Top dome faces
        for (let i = 0; i < detail; i++) {
            const nextI = (i + 1) % detail;
            bodyIndices.push(
                topCenterIndex,
                topRingStartIndex + i,
                topRingStartIndex + nextI
            );
        }
        
        // Upper side faces
        for (let i = 0; i < detail; i++) {
            const nextI = (i + 1) % detail;
            bodyIndices.push(
                topRingStartIndex + i,
                middleRingStartIndex + i,
                middleRingStartIndex + nextI
            );
            bodyIndices.push(
                topRingStartIndex + i,
                middleRingStartIndex + nextI,
                topRingStartIndex + nextI
            );
        }
        
        // Lower side faces
        for (let i = 0; i < detail; i++) {
            const nextI = (i + 1) % detail;
            bodyIndices.push(
                middleRingStartIndex + i,
                bottomRingStartIndex + i,
                bottomRingStartIndex + nextI
            );
            bodyIndices.push(
                middleRingStartIndex + i,
                bottomRingStartIndex + nextI,
                middleRingStartIndex + nextI
            );
        }
        
        // Bottom dome faces
        for (let i = 0; i < detail; i++) {
            const nextI = (i + 1) % detail;
            bodyIndices.push(
                bottomCenterIndex,
                bottomRingStartIndex + nextI,
                bottomRingStartIndex + i
            );
        }
        
        // Create bombs hanging from bottom
        const numBombs = 3;
        const bombVertexStart = bodyVertices.length / 3;
        
        for (let b = 0; b < numBombs; b++) {
            // Calculate bomb position
            const bombAngle = (b / numBombs) * Math.PI * 2;
            const bombX = Math.cos(bombAngle) * width * 0.4;
            const bombZ = Math.sin(bombAngle) * width * 0.4;
            const bombY = -height * 0.8; // Below the ship
            
            // Create bomb vertices (sphere approximation)
            const bombRadius = size * 0.15;
            const bombSegments = 5; // Low poly for wireframe aesthetic
            
            // Create the bomb top vertex
            bodyVertices.push(bombX, bombY - bombRadius, bombZ);
            const bombTop = bombVertexStart + b * (bombSegments * bombSegments + 2);
            
            // Create the bomb bottom vertex
            bodyVertices.push(bombX, bombY + bombRadius, bombZ);
            const bombBottom = bombTop + 1;
            
            // Create ring vertices
            const bombRingStart = bombBottom + 1;
            for (let i = 0; i < bombSegments; i++) {
                const phi = Math.PI * (i + 0.5) / bombSegments;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                
                for (let j = 0; j < bombSegments; j++) {
                    const theta = 2 * Math.PI * j / bombSegments;
                    const sinTheta = Math.sin(theta);
                    const cosTheta = Math.cos(theta);
                    
                    const x = bombX + bombRadius * sinPhi * cosTheta;
                    const y = bombY + bombRadius * cosPhi;
                    const z = bombZ + bombRadius * sinPhi * sinTheta;
                    
                    bodyVertices.push(x, y, z);
                }
            }
            
            // Add faces
            for (let i = 0; i < bombSegments; i++) {
                for (let j = 0; j < bombSegments; j++) {
                    const index = bombRingStart + i * bombSegments + j;
                    const nextRowIndex = bombRingStart + ((i + 1) % bombSegments) * bombSegments + j;
                    const nextColIndex = bombRingStart + i * bombSegments + ((j + 1) % bombSegments);
                    const nextRowNextColIndex = bombRingStart + ((i + 1) % bombSegments) * bombSegments + ((j + 1) % bombSegments);
                    
                    // Connect to the top for first row
                    if (i === 0) {
                        bodyIndices.push(bombTop, index, nextColIndex);
                    }
                    
                    // Connect to the bottom for last row
                    if (i === bombSegments - 1) {
                        bodyIndices.push(bombBottom, nextColIndex, index);
                    }
                    
                    // Connect the middle sections
                    bodyIndices.push(index, nextRowIndex, nextColIndex);
                    bodyIndices.push(nextRowIndex, nextRowNextColIndex, nextColIndex);
                }
            }
        }
        
        // Add struts connecting the bombs to the ship
        const strutVertexStart = bodyVertices.length / 3;
        
        for (let b = 0; b < numBombs; b++) {
            // Calculate strut positions
            const bombAngle = (b / numBombs) * Math.PI * 2;
            const bombX = Math.cos(bombAngle) * width * 0.4;
            const bombZ = Math.sin(bombAngle) * width * 0.4;
            const bombY = -height * 0.8; // Below the ship
            
            // Create strut vertices (4 points for a thin box)
            bodyVertices.push(bombX, -height/2, bombZ); // Top center
            bodyVertices.push(bombX - 0.05 * size, -height/2, bombZ - 0.05 * size); // Top left
            bodyVertices.push(bombX + 0.05 * size, -height/2, bombZ + 0.05 * size); // Top right
            bodyVertices.push(bombX, bombY - size * 0.15, bombZ); // Bottom center
            
            // Add strut faces
            const strutBase = strutVertexStart + b * 4;
            bodyIndices.push(strutBase, strutBase + 1, strutBase + 3);
            bodyIndices.push(strutBase, strutBase + 3, strutBase + 2);
        }
        
        // Set the geometry attributes
        geometry.setIndex(bodyIndices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(bodyVertices, 3));
        geometry.computeVertexNormals();
        
        return geometry;
    }
    
    /**
     * Create Tetra enemy geometry - a tetrahedron with an inner sphere
     * @param {number} size - Tetra size
     * @param {Object} params - Additional parameters
     * @returns {THREE.BufferGeometry} Tetra geometry
     */
    static createTetraGeometry(size = 200.0, params = {}) {
        // We'll return just the tetrahedron geometry here
        // The inner sphere will be added during mesh creation
        const tetraGeometry = new THREE.TetrahedronGeometry(size, 0);
        return tetraGeometry;
    }

}

export default GeometryFactory;