

import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'NewTabAI-DB-guest';
const DB_VERSION = 14; // Incremented version for new state
const STORE_NAME = 'data';

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
  | 'theoryChapterIndex'
  | 'apiKeys'
  | 'apiKeyIndex'
  | 'hasCompletedOnboarding'
  | 'generationProgress'; // Added new key

export type LabeledData<T> = {
  id: string;
  topic: string;
  data: T;
};

export type AppData = {
  id: DataKey;
  data: any;
};

export type StoredData = LabeledData<any> | AppData;

interface MyDB extends DBSchema {
  data: {
    key: string;
    value: StoredData;
  };
}

let dbInstance: Promise<IDBPDatabase<MyDB>> | null = null;

export const getDb = (): Promise<IDBPDatabase<MyDB>> => {
  if (!dbInstance) {
    dbInstance = openDB<MyDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        // Migration logic can be added here if needed in the future
      },
    });
  }
  return dbInstance;
};

export const closeDb = async () => {
  if (dbInstance) {
    try {
      const db = await dbInstance;
      db.close();
      dbInstance = null;
      console.log('🗄️ IndexedDB connection đã đóng');
    } catch (error) {
      console.error('Lỗi khi đóng IndexedDB:', error);
    }
  }
};


export const clearAllData = async (db: IDBPDatabase<MyDB>) => {
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    await store.clear();
    
    await tx.done;
    console.log('✅ All data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw new Error(`Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
