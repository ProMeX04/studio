
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let firebaseInitialized = false;

// Only initialize Firebase if all required environment variables are set
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Enable offline persistence
    enableIndexedDbPersistence(db)
      .catch((err) => {
        if (err.code == 'failed-precondition') {
          console.warn('Firestore offline persistence failed: Multiple tabs open. Persistence will only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
          console.warn('Firestore offline persistence failed: The current browser does not support all of the features required to enable persistence.');
        }
      });

    firebaseInitialized = true;
  } catch (error) {
    console.error("Lỗi khởi tạo Firebase:", error);
  }
} else {
  console.warn("Cấu hình Firebase chưa hoàn tất. Vui lòng kiểm tra các biến môi trường trong file .env.local.");
}

// Export a flag to check if Firebase is initialized
export const isFirebaseInitialized = () => firebaseInitialized;

// Export the initialized services, they might be undefined if not initialized
export { app, db, auth };
