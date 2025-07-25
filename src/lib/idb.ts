
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'NewTabAI-DB-guest';
const DB_VERSION = 3; // Incremented version
const STORE_NAME = 'data';

export type DataKey =
  | 'flashcards'
  | 'flashcardState'
  | 'quiz'
  | 'quizState'
  | 'topic'
  | 'language'
  | 'view'
  | 'visibility'
  | 'background'
  | 'uploadedBackgrounds'
  | 'flashcardMax'
  | 'quizMax'
  | 'flashcardIndex'
  | 'apiKey';

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
        if (oldVersion < 3) {
            // In v3, we remove old randomization keys.
            // We can do this by just letting the app load without them,
            // as the new loadInitialData doesn't use them.
            // No explicit deletion needed unless we want to clean up.
        }
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
    const apiKey = await store.get('apiKey'); // Preserve API key
    await store.clear();
    if (apiKey) {
      await store.put(apiKey); // Put it back after clearing
    }
    await tx.done;
    console.log('✅ All data cleared successfully (API key preserved)');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw new Error(`Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
