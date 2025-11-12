// leaderboard.ts - Entry point for Leaderboard page
import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/styles/globals.css';
import { LeaderboardPage } from './src/pages/LeaderboardPage';
import { Navigation } from './src/components/Navigation';

// Initialize the leaderboard on DOM load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Loading Leaderboard...');

  // Initialize navigation
  const navContainer = document.createElement('div');
  navContainer.id = 'navigation-root';
  document.body.appendChild(navContainer);
  const navRoot = ReactDOM.createRoot(navContainer);
  navRoot.render(
    React.createElement(React.StrictMode, null,
      React.createElement(Navigation)
    )
  );

  const appContainer = document.getElementById('leaderboard-app');
  if (!appContainer) {
    console.error('Leaderboard app container not found');
    return;
  }

  // Create the root and render the Leaderboard
  const root = ReactDOM.createRoot(appContainer);
  root.render(
    React.createElement(React.StrictMode, null,
      React.createElement(LeaderboardPage)
    )
  );

  console.log('Leaderboard loaded successfully');
});
