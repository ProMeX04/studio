
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { 
  getFirestore, 
  type Firestore, 
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence
} from 'firebase/firestore';
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
let persistenceEnabled = false;

// Only initialize Firebase if all required environment variables are set
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Enable offline persistence with enhanced options
    const enablePersistence = async () => {
      try {
        // Try multi-tab persistence first (experimental)
        await enableMultiTabIndexedDbPersistence(db);
        persistenceEnabled = true;
        console.log('✅ Multi-tab Firestore offline persistence enabled');
      } catch (err: any) {
        if (err.code === 'unimplemented') {
          // Fallback to single-tab persistence
          try {
            await enableIndexedDbPersistence(db);
            persistenceEnabled = true;
            console.log('✅ Single-tab Firestore offline persistence enabled');
          } catch (fallbackErr: any) {
            console.warn('⚠️ Firestore offline persistence failed:', fallbackErr.message);
          }
        } else {
          console.warn('⚠️ Multi-tab persistence failed:', err.message);
        }
      }
    };

    // Enable persistence asynchronously
    enablePersistence();

    firebaseInitialized = true;
  } catch (error) {
    console.error("❌ Lỗi khởi tạo Firebase:", error);
  }
} else {
  console.warn("⚠️ Cấu hình Firebase chưa hoàn tất. Vui lòng kiểm tra các biến môi trường trong file .env.local.");
}

// Export additional utilities
export const isFirebaseInitialized = () => firebaseInitialized;
export const isPersistenceEnabled = () => persistenceEnabled;

// Export the initialized services, they might be undefined if not initialized
export { app, db, auth };
