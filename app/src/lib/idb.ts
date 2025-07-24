
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { FlashcardSet } from '@/ai/schemas';
import { QuizSet, QuizState } from '@/components/Quiz';
import { ComponentVisibility } from '@/app/page';

const DB_NAME = 'NewTabAI-DB-guest';
const DB_VERSION = 2;
const STORE_NAME = 'data';

export type DataKey =
  | 'flashcards'
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
  | 'flashcardIsRandom';

export type StoredData =
  | LabeledData<FlashcardSet>
  | LabeledData<QuizSet>
  | AppData<QuizState>
  | AppData<string>
  | AppData<number>
  | AppData<boolean>
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

let dbInstance: Promise<IDBPDatabase<MyDB>> | null = null;

export const getDb = (): Promise<IDBPDatabase<MyDB>> => {
    if (!dbInstance) {
        dbInstance = openDB<MyDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            },
        });
    }
    return dbInstance;
};


export const clearAllData = async (db: IDBPDatabase<MyDB>) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.clear();
    await tx.done;
}
