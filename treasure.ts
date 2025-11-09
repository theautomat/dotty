// treasure.ts - Entry point for Treasure Gallery page
import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/styles/globals.css';
import { TreasureGalleryPage } from './src/pages/TreasureGalleryPage';

// Initialize the treasure gallery on DOM load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Loading Treasure Gallery...');

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
