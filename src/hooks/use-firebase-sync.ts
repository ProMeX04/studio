import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNetworkState } from './use-network-state';
import { syncService, SyncState } from '@/lib/sync-service';
import { DataKey } from '@/lib/idb';

export function useFirebaseSync() {
  const { user } = useAuthContext();
  const { isOnline } = useNetworkState();
  const [syncState, setSyncState] = useState<SyncState>(syncService.getSyncState());

  // Update sync state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncState(syncService.getSyncState());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Setup auto sync for authenticated user
  useEffect(() => {
    if (!user?.uid) return;

    const cleanup = syncService.setupAutoSync(user.uid);
    return cleanup;
  }, [user?.uid]);

  // Force sync when coming online
  useEffect(() => {
    if (isOnline && user?.uid) {
      syncService.fullSync(user.uid);
    }
  }, [isOnline, user?.uid]);

  const saveData = useCallback(async (key: DataKey, data: any) => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    await syncService.saveDataLocal(user.uid, key, data);
    setSyncState(syncService.getSyncState());
  }, [user?.uid]);

  const getData = useCallback(async (key: DataKey) => {
    if (!user?.uid) throw new Error('User not authenticated');
    
    return await syncService.getData(user.uid, key);
  }, [user?.uid]);

  const forceSyncNow = useCallback(async () => {
    if (!user?.uid || !isOnline) return;
    
    await syncService.forceSyncNow(user.uid);
    setSyncState(syncService.getSyncState());
  }, [user?.uid, isOnline]);

  return {
    syncState,
    saveData,
    getData,
    forceSyncNow,
    isOnline,
    canSync: isOnline && !!user?.uid,
  };
}
