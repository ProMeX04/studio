import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  writeBatch,
  serverTimestamp,
  enableNetwork,
  disableNetwork,
  waitForPendingWrites,
  onSnapshot,
  DocumentSnapshot,
  QuerySnapshot,
  Timestamp,
  FieldValue
} from 'firebase/firestore';
import { db, isFirebaseInitialized } from './firebase';
import { DataKey } from './firebase-data-service';

export interface FirestoreDocument {
  id: string;
  userId: string;
  data: any;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  synced?: boolean;
}

export class FirestoreService {
  private static instance: FirestoreService;
  
  static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  // Check if Firebase is ready
  private isReady(): boolean {
    return isFirebaseInitialized() && !!db;
  }

  // Get user's collection reference
  private getUserCollection(userId: string) {
    if (!this.isReady()) throw new Error('Firebase not initialized');
    return collection(db, 'users', userId, 'data');
  }

  // Get document reference
  private getDocRef(userId: string, key: DataKey) {
    if (!this.isReady()) throw new Error('Firebase not initialized');
    return doc(db, 'users', userId, 'data', key);
  }

  // Save data to Firestore
  async saveData(userId: string, key: DataKey, data: any): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Firebase not ready');
    }

    try {
      const docRef = this.getDocRef(userId, key);
      const firestoreDoc: Partial<FirestoreDocument> = {
        userId,
        data,
        updatedAt: serverTimestamp(),
      };

      // Check if document exists
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, firestoreDoc);
      } else {
        await setDoc(docRef, {
          ...firestoreDoc,
          id: key,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error(`Error saving data to Firestore (${key}):`, error);
      throw error;
    }
  }

  // Get data from Firestore
  async getData(userId: string, key: DataKey): Promise<any | null> {
    if (!this.isReady()) {
      throw new Error('Firebase not ready');
    }

    try {
      const docRef = this.getDocRef(userId, key);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const firestoreDoc = docSnap.data() as FirestoreDocument;
        return firestoreDoc.data;
      }
      return null;
    } catch (error) {
      console.error(`Error getting data from Firestore (${key}):`, error);
      throw error;
    }
  }

  // Delete data from Firestore
  async deleteData(userId: string, key: DataKey): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Firebase not ready');
    }

    try {
      const docRef = this.getDocRef(userId, key);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting data from Firestore (${key}):`, error);
      throw error;
    }
  }

  // Get all user data
  async getAllUserData(userId: string): Promise<Record<string, any>> {
    if (!this.isReady()) {
      throw new Error('Firebase not ready');
    }

    try {
      const userCollection = this.getUserCollection(userId);
      const querySnapshot = await getDocs(userCollection);
      
      const userData: Record<string, any> = {};
      querySnapshot.forEach((doc) => {
        const firestoreDoc = doc.data() as FirestoreDocument;
        userData[doc.id] = firestoreDoc.data;
      });
      
      return userData;
    } catch (error) {
      console.error('Error getting all user data from Firestore:', error);
      throw error;
    }
  }

  // Batch save multiple data
  async batchSaveData(userId: string, dataMap: Partial<Record<DataKey, any>>): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Firebase not ready');
    }

    try {
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();

      for (const [key, data] of Object.entries(dataMap)) {
        const docRef = this.getDocRef(userId, key as DataKey);
        const firestoreDoc: Partial<FirestoreDocument> = {
          userId,
          data,
          updatedAt: timestamp,
        };

        // For batch operations, we'll use set with merge
        batch.set(docRef, {
          ...firestoreDoc,
          id: key,
          createdAt: timestamp,
        }, { merge: true });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error batch saving data to Firestore:', error);
      throw error;
    }
  }

  // Listen to real-time updates
  subscribeToUserData(
    userId: string, 
    callback: (data: Record<string, any>) => void
  ): () => void {
    if (!this.isReady()) {
      throw new Error('Firebase not ready');
    }

    const userCollection = this.getUserCollection(userId);
    const q = query(userCollection, orderBy('updatedAt', 'desc'));

    return onSnapshot(q, (querySnapshot: QuerySnapshot) => {
      const userData: Record<string, any> = {};
      querySnapshot.forEach((doc) => {
        const firestoreDoc = doc.data() as FirestoreDocument;
        userData[doc.id] = firestoreDoc.data;
      });
      callback(userData);
    }, (error) => {
      console.error('Error listening to user data:', error);
    });
  }

  // Network management
  async goOffline(): Promise<void> {
    if (!this.isReady()) return;
    
    try {
      await waitForPendingWrites(db);
      await disableNetwork(db);
      console.log('🔌 Firestore offline mode enabled');
    } catch (error) {
      console.error('Error going offline:', error);
    }
  }

  async goOnline(): Promise<void> {
    if (!this.isReady()) return;
    
    try {
      await enableNetwork(db);
      console.log('🌐 Firestore online mode enabled');
    } catch (error) {
      console.error('Error going online:', error);
    }
  }

  async waitForPendingWrites(): Promise<void> {
    if (!this.isReady()) return;
    
    try {
      await waitForPendingWrites(db);
      console.log('✅ All pending writes completed');
    } catch (error) {
      console.error('Error waiting for pending writes:', error);
    }
  }
}

export const firestoreService = FirestoreService.getInstance();
