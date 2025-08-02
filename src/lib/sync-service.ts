import { getDb, DataKey } from './idb';
import { firestoreService } from './firestore';
import { useNetworkState } from '@/hooks/use-network-state';

export interface SyncState {
  lastSyncTime: number;
  pendingSync: Partial<Record<DataKey, any>>;
  isSyncing: boolean;
}

export class SyncService {
  private static instance: SyncService;
  private syncState: SyncState = {
    lastSyncTime: 0,
    pendingSync: {},
    isSyncing: false
  };
  
  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // Get user-specific key
  private getUserKey(userId: string, key: DataKey): string {
    return `${userId}-${key}`;
  }

  // Save data locally and mark for sync
  async saveDataLocal(userId: string, key: DataKey, data: any): Promise<void> {
    try {
      const db = await getDb();
      const userKey = this.getUserKey(userId, key);
      
      // Save to IndexedDB
      await db.put('data', {
        id: userKey,
        data: {
          ...data,
          _lastModified: Date.now(),
          _needsSync: true
        }
      });

      // Add to pending sync
      this.syncState.pendingSync[key] = data;
      
      console.log(`📱 Data saved locally: ${key}`);
    } catch (error) {
      console.error(`Error saving data locally (${key}):`, error);
      throw error;
    }
  }

  // Get data from local storage first, fallback to Firestore
  async getData(userId: string, key: DataKey): Promise<any | null> {
    try {
      const db = await getDb();
      const userKey = this.getUserKey(userId, key);
      
      // Try to get from IndexedDB first
      const localData = await db.get('data', userKey);
      if (localData?.data) {
        console.log(`📱 Data loaded from local: ${key}`);
        return localData.data;
      }

      // Fallback to Firestore if online
      if (navigator.onLine) {
        try {
          const firestoreData = await firestoreService.getData(userId, key);
          if (firestoreData) {
            // Save to local for future offline use
            await this.saveDataLocal(userId, key, firestoreData);
            console.log(`☁️ Data loaded from Firestore: ${key}`);
            return firestoreData;
          }
        } catch (error) {
          console.warn(`Failed to load from Firestore (${key}):`, error);
        }
      }

      return null;
    } catch (error) {
      console.error(`Error getting data (${key}):`, error);
      throw error;
    }
  }

  // Sync pending changes to Firestore
  async syncToFirestore(userId: string): Promise<void> {
    if (this.syncState.isSyncing || !navigator.onLine) {
      return;
    }

    this.syncState.isSyncing = true;
    console.log('🔄 Starting sync to Firestore...');

    try {
      const db = await getDb();
      const allLocalData = await db.getAll('data');
      
      // Filter data that needs sync for this user
      const userPrefix = `${userId}-`;
      const needsSyncData = allLocalData.filter(item => 
        item.id.startsWith(userPrefix) && 
        item.data._needsSync
      );

      if (needsSyncData.length === 0) {
        console.log('✅ No data needs sync');
        this.syncState.isSyncing = false;
        return;
      }

      // Prepare batch data
      const batchData: Partial<Record<DataKey, any>> = {};
      for (const item of needsSyncData) {
        const key = item.id.replace(userPrefix, '') as DataKey;
        const { _lastModified, _needsSync, ...cleanData } = item.data;
        batchData[key] = cleanData;
      }

      // Batch upload to Firestore
      await firestoreService.batchSaveData(userId, batchData);

      // Mark as synced in local storage
      for (const item of needsSyncData) {
        await db.put('data', {
          id: item.id,
          data: {
            ...item.data,
            _needsSync: false,
            _lastSynced: Date.now()
          }
        });
      }

      this.syncState.lastSyncTime = Date.now();
      this.syncState.pendingSync = {};
      
      console.log(`✅ Sync completed: ${needsSyncData.length} items`);
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      this.syncState.isSyncing = false;
    }
  }

  // Sync from Firestore to local (pull remote changes)
  async syncFromFirestore(userId: string): Promise<void> {
    if (!navigator.onLine) return;

    try {
      console.log('⬇️ Syncing from Firestore...');
      
      const remoteData = await firestoreService.getAllUserData(userId);
      const db = await getDb();

      for (const [key, data] of Object.entries(remoteData)) {
        const userKey = this.getUserKey(userId, key as DataKey);
        
        // Get local version
        const localItem = await db.get('data', userKey);
        const localModified = localItem?.data?._lastModified || 0;
        const remoteModified = data._lastModified || 0;

        // Only update if remote is newer
        if (remoteModified > localModified) {
          await db.put('data', {
            id: userKey,
            data: {
              ...data,
              _needsSync: false,
              _lastSynced: Date.now()
            }
          });
          console.log(`⬇️ Updated local data: ${key}`);
        }
      }

      console.log('✅ Sync from Firestore completed');
      
    } catch (error) {
      console.error('❌ Sync from Firestore failed:', error);
    }
  }

  // Full bidirectional sync
  async fullSync(userId: string): Promise<void> {
    if (!navigator.onLine) {
      console.log('📵 Offline - skipping sync');
      return;
    }

    try {
      // First sync from Firestore (pull)
      await this.syncFromFirestore(userId);
      
      // Then sync to Firestore (push)
      await this.syncToFirestore(userId);
      
      console.log('🔄 Full sync completed');
      
    } catch (error) {
      console.error('❌ Full sync failed:', error);
    }
  }

  // Auto sync when coming online
  setupAutoSync(userId: string): () => void {
    const handleOnline = () => {
      console.log('🌐 Coming online - starting auto sync');
      this.fullSync(userId);
    };

    window.addEventListener('online', handleOnline);
    
    // Periodic sync when online
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncToFirestore(userId);
      }
    }, 30000); // Sync every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(syncInterval);
    };
  }

  // Get sync state for UI
  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  // Force sync now
  async forceSyncNow(userId: string): Promise<void> {
    await this.fullSync(userId);
  }
}

export const syncService = SyncService.getInstance();
