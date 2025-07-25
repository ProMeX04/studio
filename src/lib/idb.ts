
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'NewTabAI-DB-guest';
const DB_VERSION = 2;
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
  | 'flashcardIsRandom'
  | 'quizIsRandom'
  | 'flashcardIndex';

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
         // In version 2, we remove the 'generationState' key if it exists
        if (oldVersion < 2) {
          const store = transaction.objectStore('data');
          store.delete('generationState').catch(() => {
            // Ignore error if key doesn't exist
          });
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

// Legacy functions - now no-ops
export const initBroadcastChannel = () => null;
export const broadcastDataChange = (key: DataKey | string, data: any): void => {
  console.log(`🚫 Data sync disabled for ${key}`);
};
export const onDataChange = (callback: (key: DataKey | string, data: any) => void) => {
  // No-op
};
export const closeBroadcastChannel = () => {
  // No-op
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
