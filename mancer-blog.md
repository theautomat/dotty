# MANCER: THE ULTIMATE GUIDE

*A comprehensive guide to playing and understanding the development of Mancer.*

![Mancer Game Logo]

## 1. INTRODUCTION

Welcome to the world of **MANCER**, a 3D space mining adventure that puts you in the cockpit of a specialized mining vessel navigating the treacherous asteroid fields of the outer solar system. Inspired by the classic arcade game Asteroids but evolved into an immersive first-person 3D experience, Mancer challenges you to collect valuable ores while avoiding or destroying the asteroids and hostile entities that stand in your way.

The name "Mancer" draws from the suffix found in words like "necromancer" or "pyromancer" - someone who controls or manipulates a particular element. In our case, you're a spacemancer, manipulating your vessel through the void to harvest the riches of space.

This document serves as both a player's manual and a behind-the-scenes look at the development process. Whether you're here to learn how to play or curious about how the game was built, you'll find what you're looking for in the sections below.

## 2. HOW TO PLAY

### 2.1 Controls

#### Desktop Controls:
- **W** - Move forward
- **S** - Brake/reverse
- **A** - Strafe left
- **D** - Strafe right
- **Mouse** - Look/aim
- **Left Click/Space** - Fire weapon
- **M** - Toggle HUD display
- **H/ESC** - Display help menu

#### Mobile Controls:
- **Left Joystick** - Movement (forward/backward/strafe)
- **Right Joystick** - Look/aim
- **Fire Button** - Shoot
- **Fullscreen Button** - Toggle fullscreen mode

**Pro Tip**: The physics in Mancer include momentum - your ship will continue to drift in the direction you were moving even after releasing the controls. Master this drift for more precise maneuvering around tight asteroid clusters.

### 2.2 Objectives

Your primary objective in Mancer is to collect valuable ores revealed when destroying asteroids. Each level has specific objectives:

1. **Survive** - Avoid collisions with asteroids and enemy ships
2. **Mine** - Collect ores by flying into them after they're revealed
3. **Complete** - Finish all level objectives before the timer runs out

The scoring system rewards both survival and collection:
- Destroying large asteroids: 20 points
- Destroying small asteroids: 10 points
- Collecting ores: 10-50 points depending on type
- Destroying enemies: 30-100 points depending on type

### 2.3 Game Elements

#### Asteroids
Asteroids come in two main sizes:
- **Large Asteroids**: Require more shots to destroy, break into smaller asteroids when hit
- **Small Asteroids**: Move faster but can be destroyed with a single shot

Destroying an asteroid reveals valuable ore that can be collected.

#### Ores
Five types of ores can be found, each with increasing value:

- **Copper** - Common, basic value (10 points)
- **Iron** - Common, moderate value (15 points)
- **Silver** - Uncommon, good value (25 points)
- **Gold** - Rare, excellent value (35 points)
- **Platinum** - Very rare, exceptional value (50 points)

Each level has a primary ore type that appears more frequently.

#### Enemies

As you progress through the levels, you'll encounter different enemy types:

- **UFO**: Basic enemy that moves in predictable patterns and fires occasional shots
- **Hunter**: Advanced enemy that actively pursues your ship and fires more frequently
- **Patroller**: Defensive enemy that guards specific areas of interest
- **Tetra**: Elite enemy with multiple attack patterns and defensive capabilities

#### Power-ups

Occasionally, special power-ups will appear that provide temporary enhancements:

- **Shield**: Temporary protection from collisions
- **Rapid Fire**: Increased firing rate
- **Speed Boost**: Enhanced movement speed
- **Time Extension**: Adds valuable seconds to the level timer

### 2.4 Level Progression

Mancer features progressive levels with increasing difficulty:

- **Level 1**: Basic asteroid field, primarily copper ore
- **Level 2**: Denser asteroid field, introduction of iron ore
- **Level 3**: First enemy appearance (UFO), silver ore introduced
- **Level 4**: Multiple enemies, faster asteroids
- **Level 5**: Introduction of Hunter enemies, gold ore appears
- **Level 6**: Complex asteroid patterns, all ore types available
- **Level 7**: Patroller enemies introduced
- **Level 8**: The Tetra confrontation, platinum ore available

Each level has a time limit. Complete the level objectives before time runs out to advance.

## 3. DEVELOPMENT INSIGHTS

*This section is currently under development and will be expanded in future updates.*

### 3.1 Technical Framework

Mancer is built using Three.js, a powerful JavaScript library for creating 3D graphics in the browser. The game employs various techniques to create its immersive experience:

- **Physics System**: Custom momentum-based movement with drift
- **Collision Detection**: Sphere-based collision system for performance
- **Audio System**: Dynamic sound management with spatial audio effects

### 3.2 Design Decisions

The first-person perspective was chosen to create a more immersive experience compared to the traditional top-down view of classic Asteroids. This perspective shift presented unique challenges and opportunities:

- Players experience the vastness of space more directly
- The sensation of speed and momentum is heightened
- Spotting ores and enemies requires more situational awareness

### 3.3 Mobile Adaptation

Adapting a first-person space shooter for mobile devices presented unique challenges:

- Creating intuitive dual-joystick controls
- Optimizing performance for mobile hardware
- Handling device orientation changes
- Designing touch-friendly UI elements

We implemented a custom virtual joystick system using the nipplejs library, with careful positioning to ensure comfortable thumb reach and prevent accidental inputs.

---

*More sections coming soon as development continues...*

## CONTROLS QUICK REFERENCE

| Action | Desktop | Mobile |
|--------|---------|--------|
| Move | WASD | Left Joystick |
| Look/Aim | Mouse | Right Joystick |
| Fire | Space/Left Click | Fire Button |
| Help | H/ESC | N/A |
| Toggle HUD | M | N/A |

Happy mining, and watch out for that Tetra!