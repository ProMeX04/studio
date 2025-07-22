import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { FlashcardSet } from '@/components/Flashcards';
import { QuizSet } from '@/components/Quiz';

const DB_NAME = 'NewTabAI-DB';
const DB_VERSION = 1;
const STORE_NAME = 'data';

export interface LabeledData<T> {
    id: 'flashcards' | 'quiz';
    topic: string;
    data: T;
}

interface MyDB extends DBSchema {
  [STORE_NAME]: {
    key: 'flashcards' | 'quiz';
    value: LabeledData<FlashcardSet | QuizSet>;
  };
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

export const getDb = (): Promise<IDBPDatabase<MyDB>> => {
    if (!dbPromise) {
        dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            },
        });
    }
    return dbPromise;
};

export const clearAllData = async (db: IDBPDatabase<MyDB>) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.clear();
    await tx.done;
}
