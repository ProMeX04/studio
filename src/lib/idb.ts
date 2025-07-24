
import { openDB, DBSchema, IDBPDatabase } from 'idb';

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
  | 'flashcardIsRandom'
  | 'generationState'; // Track generation progress

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

// Generation State để track progress
interface GenerationState {
  topic: string;
  language: string;
  isGenerating: boolean;
  startTime: number;
  targetFlashcards: number;
  targetQuiz: number;
  currentFlashcards: number;
  currentQuiz: number;
}

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
      },
    });
  }
  return dbInstance;
};

// Save generation state
export const saveGenerationState = async (state: GenerationState): Promise<void> => {
  try {
    const db = await getDb();
    await db.put('data', { id: 'generationState', data: state });
    console.log('💾 Saved generation state:', state);
  } catch (error) {
    console.error('❌ Error saving generation state:', error);
  }
};

// Get generation state  
export const getGenerationState = async (): Promise<GenerationState | null> => {
  try {
    const db = await getDb();
    const result = await db.get('data', 'generationState') as AppData | undefined;
    return result?.data || null;
  } catch (error) {
    console.error('❌ Error getting generation state:', error);
    return null;
  }
};

// Clear generation state
export const clearGenerationState = async (): Promise<void> => {
  try {
    const db = await getDb();
    await db.delete('data', 'generationState');
    console.log('🗑️ Cleared generation state');
  } catch (error) {
    console.error('❌ Error clearing generation state:', error);
  }
};

// Check if generation was interrupted
export const checkInterruptedGeneration = async (currentTopic: string, currentLanguage: string): Promise<boolean> => {
  const state = await getGenerationState();

  if (!state) return false;

  // Check if same topic/language and was generating
  if (state.topic === currentTopic &&
    state.language === currentLanguage &&
    state.isGenerating) {

    // Check if generation is incomplete
    const needsMoreFlashcards = state.currentFlashcards < state.targetFlashcards;
    const needsMoreQuiz = state.currentQuiz < state.targetQuiz;

    if (needsMoreFlashcards || needsMoreQuiz) {
      console.log('🔄 Found interrupted generation:', state);
      return true;
    }
  }
  
  // If the state is old but generation seems complete, clear it to be safe
  await clearGenerationState();
  return false;
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
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.clear();
  await tx.done;
};
