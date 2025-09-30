'use client';

import { useState, useEffect } from 'react';

interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

/**
 * Hook to monitor online/offline status and connection quality
 * Provides real-time network status for PWA functionality
 */
export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [connectionInfo, setConnectionInfo] = useState<{
    type: string | null;
    effectiveType: string | null;
    downlink: number | null;
    rtt: number | null;
  }>({
    type: null,
    effectiveType: null,
    downlink: null,
    rtt: null,
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Initial status
    setIsOnline(navigator.onLine);

    // Get connection info if available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    const updateConnectionInfo = () => {
      if (connection) {
        setConnectionInfo({
          type: connection.type || null,
          effectiveType: connection.effectiveType || null,
          downlink: connection.downlink || null,
          rtt: connection.rtt || null,
        });
      }
    };

    updateConnectionInfo();

    // Event listeners for status changes
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 [OFFLINE-STATUS] Back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('🔌 [OFFLINE-STATUS] Gone offline');
    };

    const handleConnectionChange = () => {
      updateConnectionInfo();
      console.log('📶 [OFFLINE-STATUS] Connection changed:', {
        type: connection?.type,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
      });
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    connectionType: connectionInfo.type,
    effectiveType: connectionInfo.effectiveType,
    downlink: connectionInfo.downlink,
    rtt: connectionInfo.rtt,
  };
}
