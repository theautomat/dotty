# Entry Screen Integration Plan

This document outlines the approach for integrating the new retro arcade cabinet entry screen with the main game. The goal is to create a standalone component that can be developed and tested separately before integrating it with the game.

## Current Implementation

I've created a standalone entry screen that simulates a 1970s arcade cabinet with:

1. **`EntryScreen.js`** - A Preact component that renders the UI
2. **`entry-screen.html`** - A standalone page to preview and test the screen
3. **`EntryScreenManager.js`** - A class to manage integration with the game

## Integration Path

The integration will happen in phases:

### Phase 1: Standalone Development (Current)
- Work on the entry screen UI/UX in isolation
- Test screen functionality via `entry-screen.html`
- Iterate on design without affecting the main game

### Phase 2: Basic Integration
1. Add the entry screen container to `index.html`
2. Import `EntryScreenManager` in `Game.js`
3. Initialize EntryScreenManager during Game.init()
4. Show the entry screen before starting the game
5. Start the game only after selection from entry screen
   
### Phase 3: Full Integration
1. Modify game flow to properly handle single player vs multiplayer
2. Update Game.js to use the entry screen for game start
3. Refactor Game.onTimerComplete to show entry screen at game over
4. Update GameSessionManager to work with EntryScreenManager
5. Test full gameplay loop with entry screen integration

## Technical Integration Details

### Changes to Game.js

```javascript
import EntryScreenManager from './EntryScreenManager.js';

class Game {
  constructor() {
    // Add entryScreenManager property
    this.entryScreenManager = null;
    // Other existing properties...
  }
  
  async init() {
    // Initialize entry screen manager
    this.entryScreenManager = new EntryScreenManager(this);
    await this.entryScreenManager.init();
    
    // Show entry screen instead of starting the game directly
    this.entryScreenManager.show();
    
    // Rest of init() without starting the game...
    // Game will start when player selects from entry screen
  }
  
  // Update level transition and game over flows later...
}
```

### Changes to index.html

```html
<body>
  <div id="game-container">
    <!-- Existing content -->
  </div>
  
  <!-- Add entry screen container -->
  <div id="entry-screen"></div>
</body>
```

### Handling Game Flow

The key changes to the game flow will be:

1. Game no longer starts automatically
2. Entry screen handles game start and multiplayer setup
3. Game.js defers to EntryScreenManager for initial user interaction
4. The cursor is only grabbed when the game starts, not on entry screen

## Testing Strategy

1. Test entry screen in isolation via `entry-screen.html`
2. Test basic integration without changing game mechanics
3. Test multiplayer invite functionality
4. End-to-end testing of full game flow

## Future Improvements

After base integration:

1. Add difficulty selection to entry screen
2. Add volume controls to entry screen
3. Show recent scores from leaderboard
4. Add visual/audio polish to the arcade cabinet experience
5. Consider using the entry screen for level selection in future versions