# Asteroids Game Tasks

## Active Development Tasks

### Scoring and Leaderboard
- [ ] Create persistent leaderboard system
- [ ] Implement score tracking for different actions (asteroid types, enemy types, ores collected)
- [ ] Add player name input for high scores
- [ ] Design leaderboard UI with filtering options
- [ ] Ensure proper data storage and retrieval

### Enemy System Implementation
- [x] Create basic enemy architecture
- [x] Implement enemy behaviors (follow, patrol, attack)
- [x] Add enemy spawning system
- [ ] Create enemy weapons
  - [ ] Implement heat-seeking projectiles for advanced enemies
- [ ] Balance enemy difficulty

### Behavior Framework
- [x] Create targeting/tracking system to follow player
- [x] Implement attack patterns (shooting, charging)
- [ ] Add evasive maneuvers to avoid bullets
- [x] Develop patrol patterns and waypoint system
- [x] Create behavior state machine for enemies
- [x] Add behavior triggers (health percentage, distance to player)

### Asteroid Enhancements
- [x] Implement large asteroid splitting into smaller fragments when destroyed
- [x] Add directional spawning toward player
- [x] Create special "hunter" asteroids that track player
- [x] Implement asteroid field patterns (Level 3 Asteroid Bananza)
- [x] Add FlyByAsteroid type that doesn't wrap around boundaries

### UI/UX Improvements
- [ ] Add enemy health indicators
- [ ] Create minimap or radar system
- [ ] Improve player feedback for damage

## Completed Tasks
- [x] Unified collectible rendering system with GeometryFactory
- [x] Improved ore and power-up displays
- [x] Implemented three enemy types: UFO, Hunter, and Patroller
- [x] Added diverse enemy behaviors with state-based transitions
- [x] Integrated enemy sound effects and explosions
- [x] Fixed ore mining count bug where silver and gold were counting multiple times
- [x] Improved GameStats API with clearer ore tracking methods
- [x] Refactored to use GameStats directly for ore counts, removing redundant local storage
- [x] Enhanced scoring system with multipliers for ores and enemies
- [x] Updated leaderboard to use the new score calculation
