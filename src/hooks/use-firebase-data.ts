import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { firebaseDataService, type DataKey, type UserData } from '@/lib/firebase-data-service';
import { useNetworkState } from './use-network-state';

export interface FirebaseDataState {
  data: UserData;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  isSyncing: boolean;
}

export function useFirebaseData() {
  const { user } = useAuthContext();
  const { isOnline } = useNetworkState();
  const [state, setState] = useState<FirebaseDataState>({
    data: {},
    isLoading: true,
    error: null,
    isOnline,
    isSyncing: false,
  });

  // Initialize service when user changes
  useEffect(() => {
    if (user?.uid) {
      firebaseDataService.initialize(user.uid);
      
      // Subscribe to real-time changes
      const unsubscribe = firebaseDataService.subscribeToChanges((data) => {
        setState(prev => ({
          ...prev,
          data,
          isLoading: false,
          error: null,
        }));
      });

      return () => {
        unsubscribe();
        firebaseDataService.cleanup();
      };
    } else {
      setState(prev => ({
        ...prev,
        data: {},
        isLoading: false,
        error: null,
      }));
    }
  }, [user?.uid]);

  // Update online status
  useEffect(() => {
    setState(prev => ({ ...prev, isOnline }));
  }, [isOnline]);

  // Save single data field with offline handling
  const saveData = useCallback(async (key: DataKey, data: any) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      await firebaseDataService.saveData(key, data);
      setState(prev => ({ ...prev, isSyncing: false }));
    } catch (error: any) {
      // Check if it's an offline error
      const isOfflineError = error?.code === 'unavailable' || 
                            error?.message?.includes('offline') ||
                            error?.message?.includes('client is offline');
      
      if (isOfflineError) {
        // For offline errors, don't set error state as data will sync when online
        console.warn('⚠️ Data saved locally, will sync when online');
        setState(prev => ({ ...prev, isSyncing: false }));
        return; // Don't throw, let Firebase handle offline persistence
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isSyncing: false, 
        error: errorMessage 
      }));
      throw error;
    }
  }, [user?.uid]);

  // Get single data field with offline handling
  const getData = useCallback(async (key: DataKey) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      return await firebaseDataService.getData(key);
    } catch (error: any) {
      // Check if it's an offline error
      const isOfflineError = error?.code === 'unavailable' || 
                            error?.message?.includes('offline') ||
                            error?.message?.includes('client is offline');
      
      if (isOfflineError) {
        console.warn('⚠️ Firebase offline, returning null for', key);
        return null; // Return null for offline scenarios
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      return null; // Return null instead of throwing to prevent app crashes
    }
  }, [user?.uid]);

  // Save multiple data fields with offline handling
  const saveMultipleData = useCallback(async (data: Partial<UserData>) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      await firebaseDataService.saveMultipleData(data);
      setState(prev => ({ ...prev, isSyncing: false }));
    } catch (error: any) {
      // Check if it's an offline error
      const isOfflineError = error?.code === 'unavailable' || 
                            error?.message?.includes('offline') ||
                            error?.message?.includes('client is offline');
      
      if (isOfflineError) {
        // For offline errors, don't set error state as data will sync when online
        console.warn('⚠️ Data saved locally, will sync when online');
        setState(prev => ({ ...prev, isSyncing: false }));
        return; // Don't throw, let Firebase handle offline persistence
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isSyncing: false, 
        error: errorMessage 
      }));
      throw error;
    }
  }, [user?.uid]);

  // Clear all data
  const clearAllData = useCallback(async () => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      await firebaseDataService.clearAllData();
      setState(prev => ({ ...prev, isSyncing: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isSyncing: false, 
        error: errorMessage 
      }));
      throw error;
    }
  }, [user?.uid]);

  // Force sync (wait for pending writes)
  const forceSync = useCallback(async () => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      await firebaseDataService.waitForPendingWrites();
      setState(prev => ({ ...prev, isSyncing: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isSyncing: false, 
        error: errorMessage 
      }));
      throw error;
    }
  }, []);

  // Network controls
  const goOffline = useCallback(async () => {
    await firebaseDataService.goOffline();
  }, []);

  const goOnline = useCallback(async () => {
    await firebaseDataService.goOnline();
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    saveData,
    getData,
    saveMultipleData,
    clearAllData,
    forceSync,
    
    // Network controls
    goOffline,
    goOnline,
    
    // Computed values
    isAuthenticated: !!user,
    canSync: !!user && isOnline,
  };
}
