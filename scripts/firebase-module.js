/**
 * Firebase Module - Provides configured Firebase instances
 * 
 * This module centralizes Firebase initialization and exports configured instances
 * for use throughout the application.
 */

// Import Firebase modules properly
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Import Firebase configuration
import firebaseConfig from './firebase-config.js';

// Firebase instances
let firebaseApp = null;
let firestore = null;
let firebaseAnalytics = null;

/**
 * Initialize Firebase modules
 * @returns {Object} Object containing Firebase instances
 */
const initializeFirebase = () => {
  if (firebaseApp) {
    // Return existing instances if already initialized
    return {
      app: firebaseApp,
      db: firestore,
      analytics: firebaseAnalytics
    };
  }

  try {
    // Log Firebase config for debugging (without exposing API key)
    console.log('Firebase config:', { 
      ...firebaseConfig, 
      apiKey: '[REDACTED]'
    });
    
    // Initialize the Firebase app
    firebaseApp = initializeApp(firebaseConfig);
    console.log('Firebase app initialized');
    
    // Initialize Cloud Firestore
    firestore = getFirestore(firebaseApp);
    console.log('Cloud Firestore initialized');
    
    // Initialize Analytics (non-critical)
    try {
      firebaseAnalytics = getAnalytics(firebaseApp);
      console.log('Firebase Analytics initialized');
    } catch (analyticsError) {
      console.warn('Analytics initialization failed (non-critical):', analyticsError);
    }
    
    return {
      app: firebaseApp,
      db: firestore,
      analytics: firebaseAnalytics
    };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
};

// Export the function and configured instances
export {
  initializeFirebase,
  firebaseConfig
};