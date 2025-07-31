

import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'NewTabAI-DB-v2';
const DB_VERSION = 1; 
const STORE_NAME = 'data';

// These keys will be prefixed with the user's UID
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
  | 'hasCompletedOnboarding'
  | 'generationProgress';

export type AppData = {
  id: string; // Will be in the format `uid-key` e.g., `_HqV...-topic`
  data: any;
};

interface MyDB extends DBSchema {
  data: {
    key: string;
    value: AppData;
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
