
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { FlashcardSet } from '@/components/Flashcards';
import { QuizSet } from '@/components/Quiz';
import { ComponentVisibility } from '@/app/page';

const DB_NAME = 'NewTabAI-DB';
const DB_VERSION = 2; // Incremented version
const STORE_NAME = 'data';

export type DataKey =
  | 'flashcards'
  | 'quiz'
  | 'topic'
  | 'count'
  | 'language'
  | 'view'
  | 'visibility'
  | 'background'
  | 'uploadedBackgrounds';

export type StoredData =
  | LabeledData<FlashcardSet>
  | LabeledData<QuizSet>
  | AppData<string>
  | AppData<number>
  | AppData<'flashcards' | 'quiz'>
  | AppData<ComponentVisibility>
  | AppData<string[]>

export interface LabeledData<T> {
    id: 'flashcards' | 'quiz';
    topic: string;
    data: T;
}

export interface AppData<T> {
    id: DataKey;
    data: T;
}

interface MyDB extends DBSchema {
  [STORE_NAME]: {
    key: DataKey;
    value: StoredData;
  };
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

export const getDb = (): Promise<IDBPDatabase<MyDB>> => {
    if (!dbPromise) {
        dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
                // Future migrations can go here
                // if (oldVersion < 2) { ... }
            },
        });
    }
    return dbPromise;
};

export const clearAllData = async (db: IDBPDatabase<MyDB>) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    // Keep settings data
    const keys = await store.getAllKeys();
    for (const key of keys) {
        if (key !== 'topic' && key !== 'count' && key !== 'language' && key !== 'view' && key !== 'visibility' && key !== 'background' && key !== 'uploadedBackgrounds') {
            await store.delete(key);
        }
    }
    await tx.done;
}

    