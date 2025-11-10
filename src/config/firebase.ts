/**
 * Firebase Client SDK Configuration
 *
 * Initializes Firebase for client-side usage in the React app.
 * This connects to Firestore to fetch treasure data for the UI.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import firebaseConfig from '../scripts/firebase-config';

// Initialize Firebase app
let app: FirebaseApp;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  // Connect to emulator if running locally
  // Check if we're in development mode and emulator is available
  if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    const emulatorHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || 'localhost';
    const emulatorPort = parseInt(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || '8080', 10);

    console.log(`🔧 Connecting to Firestore emulator at ${emulatorHost}:${emulatorPort}`);
    connectFirestoreEmulator(db, emulatorHost, emulatorPort);
  }

  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase:', error);
  throw error;
}

export { app, db };
