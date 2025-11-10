import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin SDK Configuration
 *
 * This module initializes the Firebase Admin SDK for server-side operations.
 * It supports two authentication methods:
 *
 * 1. Service Account Key File (recommended for local development)
 *    - Set FIREBASE_SERVICE_ACCOUNT_PATH to the path of your service account JSON file
 *
 * 2. Environment Variables (recommended for production/CI)
 *    - Set individual FIREBASE_* environment variables
 *
 * For local testing with Firebase emulator:
 *    - Set FIRESTORE_EMULATOR_HOST=localhost:8080
 */

class FirebaseAdmin {
  private app: admin.app.App | null = null;
  private db: Firestore | null = null;
  private initialized = false;

  /**
   * Initialize Firebase Admin SDK
   * @returns True if initialization was successful
   */
  initialize(): boolean {
    if (this.initialized) {
      console.log('Firebase Admin already initialized');
      return true;
    }

    try {
      // Check if we're using Firebase emulator
      const isEmulator = process.env.FIRESTORE_EMULATOR_HOST;

      if (isEmulator) {
        console.log(`🔧 Using Firebase Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
        // For emulator, we can use a dummy project ID
        this.app = admin.initializeApp({
          projectId: 'demo-project'
        });
        console.log('✅ Firebase Admin initialized for emulator (no credentials needed)');

        // Get Firestore instance
        this.db = admin.firestore();
        this.db.settings({
          ignoreUndefinedProperties: true
        });
        this.initialized = true;
        return true;
      }

      // Method 1: Service Account Key File (preferred for local dev)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH) as ServiceAccount;

        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.projectId
        });

        console.log('✅ Firebase Admin initialized with service account key file');
      }
      // Method 2: Environment Variables
      else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Handle escaped newlines in private key
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          }),
          projectId: process.env.FIREBASE_PROJECT_ID
        });

        console.log('✅ Firebase Admin initialized with environment variables');
      }
      // Method 3: Default credentials (for Google Cloud environments)
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        this.app = admin.initializeApp();
        console.log('✅ Firebase Admin initialized with default credentials');
      }
      else {
        console.warn('⚠️  Firebase Admin credentials not configured. Set one of:');
        console.warn('   - FIREBASE_SERVICE_ACCOUNT_PATH (path to service account JSON)');
        console.warn('   - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
        console.warn('   - GOOGLE_APPLICATION_CREDENTIALS');
        return false;
      }

      // Get Firestore instance
      this.db = admin.firestore();

      // Configure Firestore settings
      this.db.settings({
        ignoreUndefinedProperties: true
      });

      this.initialized = true;
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to initialize Firebase Admin:', errorMessage);
      return false;
    }
  }

  /**
   * Get Firestore instance
   * @returns Firestore instance or null if not initialized
   */
  getFirestore(): Firestore | null {
    if (!this.initialized) {
      console.warn('Firebase Admin not initialized. Call initialize() first.');
      return null;
    }
    return this.db;
  }

  /**
   * Check if Firebase Admin is ready
   * @returns True if initialized
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get the project ID
   * @returns Project ID or null
   */
  getProjectId(): string | null {
    if (!this.app) return null;
    return (this.app.options.projectId as string) || null;
  }
}

// Export singleton instance
export const firebaseAdmin = new FirebaseAdmin();
export { admin }; // Export admin for advanced usage
