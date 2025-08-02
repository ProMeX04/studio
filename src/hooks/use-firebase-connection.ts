import { useEffect, useState } from 'react';
import { onSnapshot, doc, enableNetwork, disableNetwork } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FirebaseConnectionState {
  isConnected: boolean;
  isInitialized: boolean;
  lastConnectionError: string | null;
}

export function useFirebaseConnection(): FirebaseConnectionState {
  const [connectionState, setConnectionState] = useState<FirebaseConnectionState>({
    isConnected: true,
    isInitialized: false,
    lastConnectionError: null,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeConnection = async () => {
      try {
        // Create a test document reference to monitor connection
        const testDocRef = doc(db, '_connection_test_', 'status');
        
        // Listen to connection state changes
        unsubscribe = onSnapshot(
          testDocRef,
          () => {
            // Successfully received data - we're connected
            setConnectionState(prev => ({
              ...prev,
              isConnected: true,
              isInitialized: true,
              lastConnectionError: null,
            }));
          },
          (error) => {
            // Error receiving data - check if it's connection related
            const isConnectionError = 
              error.code === 'unavailable' ||
              error.message.includes('offline') ||
              error.message.includes('network');

            setConnectionState(prev => ({
              ...prev,
              isConnected: !isConnectionError,
              isInitialized: true,
              lastConnectionError: isConnectionError ? error.message : null,
            }));
          }
        );

        setConnectionState(prev => ({ ...prev, isInitialized: true }));
      } catch (error) {
        console.error('Failed to initialize Firebase connection monitoring:', error);
        setConnectionState(prev => ({
          ...prev,
          isInitialized: true,
          lastConnectionError: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    initializeConnection();

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Monitor browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setConnectionState(prev => ({ ...prev, isConnected: true, lastConnectionError: null }));
      // Re-enable Firebase network when browser comes online
      enableNetwork(db).catch(console.warn);
    };

    const handleOffline = () => {
      setConnectionState(prev => ({ 
        ...prev, 
        isConnected: false, 
        lastConnectionError: 'Browser offline' 
      }));
      // Disable Firebase network when browser goes offline
      disableNetwork(db).catch(console.warn);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state based on navigator.onLine
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return connectionState;
}
