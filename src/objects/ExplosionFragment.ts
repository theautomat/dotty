import * as THREE from 'three';

/**
 * Default ranges for randomizing explosion parameters
 */
const EXPLOSION_PARAMS = {
  // Lifespan range in seconds
  LIFESPAN: {
    MIN: 1.5,
    MAX: 2.5
  },
  // Explosion speed range - much wider range for dramatic difference between particles
  SPEED: {
    MIN: 4.0,   // Slower fragments
    MAX: 40.0   // Much faster fragments (up to 5x faster than before)
  },
  // Rotation speed multiplier - varied rotation speeds
  ROTATION_SPEED: {
    MIN: 4.0,  // Slower rotation
    MAX: 20.0  // Faster rotation
  },
  // Size variation for fragments
  SIZE: {
    MIN: 0.625,   // 25% larger than before (was 0.5)
    MAX: 18.75   // 25% larger than before (was 15.0)
  }
};

interface ExplosionFragmentOptions {
  color: THREE.Color;
}

/**
 * ExplosionFragment - Represents a single fragment in an explosion
 */
class ExplosionFragment {
  id: string;
  manager: any | null;
  instanceId: number | null;
  color: THREE.Color;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  originalSize: number;
  initialLifespan: number;
  lifeRemaining: number;
  explosionCenter: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  transformNeedsUpdate: boolean;

  /**
   * Creates a new explosion fragment instance
   * @param position - Start position for the fragment
   * @param size - Size scaling factor
   * @param options - Fragment configuration options (only color is required)
   */
  constructor(position: THREE.Vector3, size: number, options: ExplosionFragmentOptions) {
    const { color } = options;

    // Generate unique ID for this fragment
    this.id = `frag_${Math.random().toString(16).slice(2)}`;

    // Store reference to manager and instanceId (set by manager)
    this.manager = null;
    this.instanceId = null;

    // Store color data
    this.color = color.clone();

    // Set position, rotation, scale for the fragment
    this.position = position.clone();
    this.rotation = new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    // Create highly varied sizes - use non-linear distribution for more variety
    // Some fragments will be tiny, others medium sized
    const sizeRandom = Math.random();
    // Non-linear distribution favoring smaller fragments but allowing some larger ones
    const sizeFactor = Math.pow(sizeRandom, 3) + (sizeRandom * 0.4);

    const fragmentSize = EXPLOSION_PARAMS.SIZE.MIN +
        sizeFactor * (EXPLOSION_PARAMS.SIZE.MAX - EXPLOSION_PARAMS.SIZE.MIN);

    // Apply the size multiplier (passed from createExplosion)
    this.scale = new THREE.Vector3(
      fragmentSize * size,
      fragmentSize * size,
      fragmentSize * size
    );

    // Store original size for scale calculations
    this.originalSize = size;

    // Generate random lifespan within range
    this.initialLifespan = EXPLOSION_PARAMS.LIFESPAN.MIN +
        Math.random() * (EXPLOSION_PARAMS.LIFESPAN.MAX - EXPLOSION_PARAMS.LIFESPAN.MIN);
    this.lifeRemaining = this.initialLifespan;

    // Store initial position as explosion center point
    this.explosionCenter = position.clone();

    // Generate random explosion speed and direction
    this._initializePhysics();

    // Flag to indicate transformation needs update
    this.transformNeedsUpdate = true;
  }

  /**
   * Initialize physics properties (velocity, rotation speed)
   * @private
   */
  _initializePhysics(): void {
    // Generate more dramatically random explosion speed within a wider range
    // Apply an exponential distribution to favor some very fast particles
    const speedRandom = Math.random();
    const speedFactor = Math.pow(speedRandom, 2) + speedRandom; // Creates more variation

    const explosionSpeed = EXPLOSION_PARAMS.SPEED.MIN +
        speedFactor * (EXPLOSION_PARAMS.SPEED.MAX - EXPLOSION_PARAMS.SPEED.MIN);

    // Calculate direction vector FROM center point (this ensures outward movement)
    // Add some randomness to make trajectories more chaotic
    const randomDirection = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();

    // Apply the speed to the direction
    this.velocity = randomDirection.multiplyScalar(explosionSpeed);

    // Randomized rotation speed using the predefined range
    const rotationRandomX = EXPLOSION_PARAMS.ROTATION_SPEED.MIN +
        Math.random() * (EXPLOSION_PARAMS.ROTATION_SPEED.MAX - EXPLOSION_PARAMS.ROTATION_SPEED.MIN);
    const rotationRandomY = EXPLOSION_PARAMS.ROTATION_SPEED.MIN +
        Math.random() * (EXPLOSION_PARAMS.ROTATION_SPEED.MAX - EXPLOSION_PARAMS.ROTATION_SPEED.MIN);
    const rotationRandomZ = EXPLOSION_PARAMS.ROTATION_SPEED.MIN +
        Math.random() * (EXPLOSION_PARAMS.ROTATION_SPEED.MAX - EXPLOSION_PARAMS.ROTATION_SPEED.MIN);

    this.rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * rotationRandomX,
      (Math.random() - 0.5) * rotationRandomY,
      (Math.random() - 0.5) * rotationRandomZ
    );
  }

  /**
   * Update method for this fragment - called each frame
   * @param deltaTime - Time elapsed since last frame in seconds
   * @returns True if the fragment is still alive, false if it should be removed
   */
  update(deltaTime: number): boolean {
    // Add a safeguard for excessive deltaTime values
    const clampedDelta = Math.min(deltaTime, 0.1);

    // Decrease remaining lifetime
    this.lifeRemaining -= clampedDelta;

    // Check if fragment is dead
    if (this.lifeRemaining <= 0) {
      return false;
    }

    // Move fragment based on velocity
    this.position.x += this.velocity.x * clampedDelta;
    this.position.y += this.velocity.y * clampedDelta;
    this.position.z += this.velocity.z * clampedDelta;

    // Update rotation
    this.rotation.x += this.rotationSpeed.x * clampedDelta;
    this.rotation.y += this.rotationSpeed.y * clampedDelta;
    this.rotation.z += this.rotationSpeed.z * clampedDelta;

    // DISABLED size reduction - keep consistent size throughout lifetime
    // No scale changes during lifetime

    // Flag for transform update
    this.transformNeedsUpdate = true;

    // Return true while still alive
    return true;
  }

  /**
   * Factory method to create a new fragment instance
   * @param position - Start position for the fragment
   * @param size - Size scaling factor
   * @param options - Fragment configuration options
   * @returns A new explosion fragment instance
   */
  static create(position: THREE.Vector3, size: number, options: ExplosionFragmentOptions): ExplosionFragment {
    return new ExplosionFragment(position, size, options);
  }
}

export default ExplosionFragment;
