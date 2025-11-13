// search-transactions.ts - Entry point for Search Transactions page
import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/styles/globals.css';
import SearchTransactionsPage from './src/pages/SearchTransactionsPage';

// Initialize the search transactions page on DOM load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Loading Search Transactions page...');

  const appContainer = document.getElementById('search-transactions-app');
  if (!appContainer) {
    console.error('Search transactions app container not found');
    return;
  }

  // Create the root and render the Search Transactions page
  const root = ReactDOM.createRoot(appContainer);
  root.render(
    React.createElement(React.StrictMode, null,
      React.createElement(SearchTransactionsPage)
    )
  );

  console.log('Search Transactions page loaded successfully');
});
