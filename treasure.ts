// treasure.ts - Entry point for Treasure Gallery page
import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/styles/globals.css';
import { TreasureGalleryPage } from './src/pages/TreasureGalleryPage';
import { Navigation } from './src/components/Navigation';

// Initialize the treasure gallery on DOM load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Loading Treasure Gallery...');

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

  const appContainer = document.getElementById('treasure-app');
  if (!appContainer) {
    console.error('Treasure app container not found');
    return;
  }

  // Create the root and render the Treasure Gallery
  const root = ReactDOM.createRoot(appContainer);
  root.render(
    React.createElement(React.StrictMode, null,
      React.createElement(TreasureGalleryPage)
    )
  );

  console.log('Treasure Gallery loaded successfully');
});
