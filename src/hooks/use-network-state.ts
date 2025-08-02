import { useState, useEffect } from 'react';

interface NetworkState {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
}

export function useNetworkState(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: 'unknown'
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateNetworkState = () => {
      const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
      
      setNetworkState({
        isOnline: navigator.onLine,
        isSlowConnection: connection ? 
          (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') : 
          false,
        connectionType: connection?.effectiveType || 'unknown'
      });
    };

    const handleOnline = () => {
      console.log('🌐 Network: Online');
      updateNetworkState();
    };

    const handleOffline = () => {
      console.log('🔌 Network: Offline');
      updateNetworkState();
    };

    const handleConnectionChange = () => {
      console.log('📡 Network: Connection changed');
      updateNetworkState();
    };

    // Initial update
    updateNetworkState();

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen to connection changes (if supported)
    const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkState;
}
