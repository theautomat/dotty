/**
 * Firebase Client SDK Configuration
 *
 * Initializes Firebase for client-side usage in the React app.
 * This connects to Firestore to fetch treasure data for the UI.
 *
 * Environment Detection:
 * - localhost -> Firebase Emulator
 * - staging domain -> Staging Firebase (if configured)
 * - production domain -> Production Firebase
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import firebaseConfig from '../scripts/firebase-config';

/**
 * Detect the current environment based on hostname and configuration
 */
function detectEnvironment(): 'local' | 'staging' | 'production' {
  const hostname = window.location.hostname;

  // Check if running on localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'local';
  }

  // Check for staging domain (customize this to your staging URL)
  if (hostname.includes('staging') || hostname.includes('dev.')) {
    return 'staging';
  }

  // Default to production
  return 'production';
}

/**
 * Check if Firebase emulator should be used
 */
function shouldUseEmulator(): boolean {
  const env = detectEnvironment();

  // Always use emulator on localhost
  if (env === 'local') {
    return true;
  }

  // Respect explicit environment variable override
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    return true;
  }

  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'false') {
    return false;
  }

  // Default: no emulator for staging/production
  return false;
}

// Initialize Firebase app
let app: FirebaseApp;
let db: Firestore;

try {
  const environment = detectEnvironment();
  const useEmulator = shouldUseEmulator();

  console.log(`🌍 Environment detected: ${environment}`);
  console.log(`🔧 Using Firebase ${useEmulator ? 'Emulator' : 'Cloud'}`);

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  // Connect to emulator if needed
  if (useEmulator) {
    const emulatorHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || 'localhost';
    const emulatorPort = parseInt(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || '8080', 10);

    console.log(`📡 Connecting to Firestore emulator at ${emulatorHost}:${emulatorPort}`);
    connectFirestoreEmulator(db, emulatorHost, emulatorPort);
  } else {
    console.log(`☁️  Connected to Firebase Cloud (${environment})`);
  }

  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase:', error);
  throw error;
}

export { app, db };
