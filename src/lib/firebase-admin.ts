import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let adminApp: App;
let adminDb: Firestore;
let adminAuth: Auth;
let adminInitialized = false;

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (adminInitialized) return { adminApp, adminDb, adminAuth };

  try {
    // Import service account key directly from JSON file
    const serviceAccount = require('../../newtab-ai-firebase-adminsdk-fbsvc-dc69e713b6.json');

    // Check if app is already initialized
    if (!getApps().length) {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    } else {
      adminApp = getApps()[0];
    }

    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
    adminInitialized = true;

    console.log('✅ Firebase Admin SDK initialized successfully');
    return { adminApp, adminDb, adminAuth };

  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw new Error('Firebase Admin initialization failed');
  }
}

// Export singleton instances
export function getFirebaseAdmin() {
  if (!adminInitialized) {
    return initializeFirebaseAdmin();
  }
  return { adminApp, adminDb, adminAuth };
}

// Utility function to verify Firebase ID token
export async function verifyIdToken(idToken: string) {
  try {
    const { adminAuth } = getFirebaseAdmin();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

// Utility function to get user by UID
export async function getUserByUid(uid: string) {
  try {
    const { adminAuth } = getFirebaseAdmin();
    const userRecord = await adminAuth.getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('❌ Failed to get user:', error);
    throw new Error('User not found');
  }
}
