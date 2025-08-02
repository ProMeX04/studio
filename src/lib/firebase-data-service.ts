import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp,
  enableNetwork,
  disableNetwork,
  waitForPendingWrites,
  type DocumentReference,
  type Unsubscribe
} from 'firebase/firestore';
import { db, isFirebaseInitialized } from './firebase';
import { useAuthContext } from '@/contexts/AuthContext';

export type DataKey =
  | 'flashcards'
  | 'flashcardState'
  | 'quiz'
  | 'quizState'
  | 'theory'
  | 'theoryState'
  | 'topic'
  | 'language'
  | 'model'
  | 'view'
  | 'visibility'
  | 'background'
  | 'uploadedBackgrounds'
  | 'flashcardIndex'
  | 'currentQuestionIndex'
  | 'theoryChapterIndex'
  | 'hasCompletedOnboarding'
  | 'generationJobId';

export interface UserData {
  // Learning data
  flashcards?: any[];
  flashcardState?: any;
  quiz?: any[];
  quizState?: any;
  theory?: any[];
  theoryState?: any;
  
  // Settings
  topic?: string;
  language?: string;
  model?: string;
  view?: string;
  visibility?: any;
  background?: string;
  uploadedBackgrounds?: string[];
  
  // Progress tracking
  flashcardIndex?: number;
  currentQuestionIndex?: number;
  theoryChapterIndex?: number;
  hasCompletedOnboarding?: boolean;
  generationJobId?: string;
  
  // Metadata
  createdAt?: any;
  updatedAt?: any;
  lastSyncedAt?: any;
}

export class FirebaseDataService {
  private static instance: FirebaseDataService;
  private currentUserId: string | null = null;
  private userDocRef: DocumentReference | null = null;
  private unsubscribe: Unsubscribe | null = null;
  
  static getInstance(): FirebaseDataService {
    if (!FirebaseDataService.instance) {
      FirebaseDataService.instance = new FirebaseDataService();
    }
    return FirebaseDataService.instance;
  }

  // Initialize for specific user
  initialize(userId: string): void {
    if (this.currentUserId === userId) return;
    
    // Cleanup previous listener
    this.cleanup();
    
    this.currentUserId = userId;
    this.userDocRef = doc(db, 'users', userId);
  }

  // Cleanup listeners
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.currentUserId = null;
    this.userDocRef = null;
  }

  // Get user document reference
  private getUserDocRef(): DocumentReference {
    if (!this.userDocRef) {
      throw new Error('FirebaseDataService not initialized. Call initialize(userId) first.');
    }
    if (!isFirebaseInitialized()) {
      throw new Error('Firebase not initialized');
    }
    return this.userDocRef;
  }

  // Save single data field with offline handling
  async saveData(key: DataKey, data: any): Promise<void> {
    try {
      const docRef = this.getUserDocRef();
      
      await updateDoc(docRef, {
        [key]: data,
        updatedAt: serverTimestamp(),
        [`lastModified_${key}`]: serverTimestamp(),
      });

      console.log(`✅ Saved ${key} to Firebase`);
    } catch (error: any) {
      // If document doesn't exist, create it
      if (error?.code === 'not-found') {
        try {
          await this.createUserDocument({ [key]: data });
        } catch (createError: any) {
          // Handle offline during document creation
          if (createError.code === 'unavailable' || createError.message?.includes('offline')) {
            console.warn(`⚠️ Firebase offline, data will sync when online: ${key}`);
            return; // Firebase will handle offline persistence
          }
          throw createError;
        }
      } else if (error.code === 'unavailable' || error.message?.includes('offline')) {
        // Handle offline scenarios - Firebase will handle local caching
        console.warn(`⚠️ Firebase offline, data will sync when online: ${key}`);
        return;
      } else {
        console.error(`❌ Error saving ${key}:`, error);
        throw error;
      }
    }
  }

  // Get single data field with offline handling
  async getData(key: DataKey): Promise<any | null> {
    try {
      const docRef = this.getUserDocRef();
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data[key] || null;
      }
      
      return null;
    } catch (error: any) {
      // Handle offline scenarios gracefully
      if (error.code === 'unavailable' || error.message?.includes('offline')) {
        console.warn(`⚠️ Firebase offline, returning null for ${key}`);
        return null;
      }
      
      console.error(`❌ Error getting ${key}:`, error);
      
      // For other errors, return null instead of throwing to prevent app crashes
      return null;
    }
  }

  // Get all user data with offline handling
  async getAllData(): Promise<UserData> {
    try {
      const docRef = this.getUserDocRef();
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const { createdAt, updatedAt, lastSyncedAt, ...userData } = docSnap.data();
        return userData as UserData;
      }
      
      return {};
    } catch (error: any) {
      // Handle offline scenarios gracefully
      if (error.code === 'unavailable' || error.message?.includes('offline')) {
        console.warn('⚠️ Firebase offline, returning empty data');
        return {};
      }
      
      console.error('❌ Error getting all data:', error);
      return {}; // Return empty object instead of throwing to prevent app crashes
    }
  }

  // Save multiple data fields with offline handling
  async saveMultipleData(data: Partial<UserData>): Promise<void> {
    try {
      const docRef = this.getUserDocRef();
      
      const updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      // Add lastModified timestamp for each field
      Object.keys(data).forEach(key => {
        updateData[`lastModified_${key}`] = serverTimestamp();
      });

      await updateDoc(docRef, updateData);
      console.log(`✅ Saved multiple fields to Firebase:`, Object.keys(data));
    } catch (error: any) {
      // If document doesn't exist, create it
      if (error?.code === 'not-found') {
        try {
          await this.createUserDocument(data);
        } catch (createError: any) {
          // Handle offline during document creation
          if (createError.code === 'unavailable' || createError.message?.includes('offline')) {
            console.warn(`⚠️ Firebase offline, data will sync when online:`, Object.keys(data));
            return;
          }
          throw createError;
        }
      } else if (error.code === 'unavailable' || error.message?.includes('offline')) {
        // Handle offline scenarios
        console.warn(`⚠️ Firebase offline, data will sync when online:`, Object.keys(data));
        return;
      } else {
        console.error('❌ Error saving multiple data:', error);
        throw error;
      }
    }
  }

  // Create user document
  async createUserDocument(initialData: Partial<UserData> = {}): Promise<void> {
    try {
      const docRef = this.getUserDocRef();
      
      const userData = {
        ...initialData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(docRef, userData, { merge: true });
      console.log('✅ Created user document in Firebase');
    } catch (error) {
      console.error('❌ Error creating user document:', error);
      throw error;
    }
  }

  // Listen to real-time changes
  subscribeToChanges(callback: (data: UserData) => void): Unsubscribe {
    const docRef = this.getUserDocRef();
    
    this.unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const { createdAt, updatedAt, lastSyncedAt, ...userData } = doc.data();
        callback(userData as UserData);
      } else {
        callback({});
      }
    }, (error) => {
      console.error('❌ Error listening to changes:', error);
    });

    return this.unsubscribe;
  }

  // Clear all user data
  async clearAllData(): Promise<void> {
    try {
      const docRef = this.getUserDocRef();
      
      await setDoc(docRef, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Cleared all user data');
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      throw error;
    }
  }

  // Network management
  async goOffline(): Promise<void> {
    try {
      await waitForPendingWrites(db);
      await disableNetwork(db);
      console.log('🔌 Firebase offline mode enabled');
    } catch (error) {
      console.error('❌ Error going offline:', error);
    }
  }

  async goOnline(): Promise<void> {
    try {
      await enableNetwork(db);
      console.log('🌐 Firebase online mode enabled');
    } catch (error) {
      console.error('❌ Error going online:', error);
    }
  }

  async waitForPendingWrites(): Promise<void> {
    try {
      await waitForPendingWrites(db);
      console.log('✅ All pending writes completed');
    } catch (error) {
      console.error('❌ Error waiting for pending writes:', error);
    }
  }

  // Check if online
  isOnline(): boolean {
    return navigator.onLine;
  }
}

// Singleton instance
export const firebaseDataService = FirebaseDataService.getInstance();
