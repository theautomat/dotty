# Man Sir Entry Screen

This is a retro arcade cabinet style entry screen for the game, designed to mimic the appearance of a 1970s arcade machine. It provides options for single player and multiplayer modes.

## Files

- `src/components/EntryScreen.js` - The main Preact component
- `src/game/EntryScreenManager.js` - Integration manager for the game
- `entry-screen.html` - Standalone test page
- `entry-screen-integration-plan.md` - Integration plan document
- `game-integration-example.js` - Example code for future integration

## How to Test

1. Open `entry-screen.html` in your browser to see the standalone version
2. The standalone version simulates both single player and multiplayer functionality

## Design Decisions

- Using Preact for UI rendering (same as leaderboard and help menu)
- Arcade cabinet design with retro styling
- Minimal initial integration with game (standalone development first)
- Clean separation between UI component and game integration

## Upcoming Features

- Full integration with game flow
- Difficulty selection
- Volume controls
- Visual polish (animations, effects)
- Game settings

## Integration Plan

See `entry-screen-integration-plan.md` for the detailed integration plan.

## Usage

To use in development:

```javascript
// In your JavaScript file
import { initEntryScreen, updateEntryScreen, toggleEntryScreen } from './src/components/EntryScreen.js';

// Initialize
initEntryScreen();

// Update with props
updateEntryScreen({
  onStart: () => console.log('Single player selected'),
  onMultiplayer: () => console.log('Multiplayer selected'),
  // Other props...
});

// Show/hide
toggleEntryScreen(true); // Show
toggleEntryScreen(false); // Hide
```

For integration with the game, use `EntryScreenManager` instead of direct component usage.