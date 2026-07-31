import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  lastChanged: number;
  connectionType?: string;
  isPoorConnection: boolean;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    lastChanged: Date.now(),
    isPoorConnection: false
  });

  useEffect(() => {
    const handleStatusChange = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        lastChanged: Date.now()
      }));
    };

    // Connection quality monitoring (where supported)
    const updateConnectionInfo = () => {
      const conn = (navigator as any).connection;
      if (conn) {
        setStatus(prev => ({
          ...prev,
          connectionType: conn.effectiveType,
          isPoorConnection: conn.saveData || ['slow-2g', '2g'].includes(conn.effectiveType)
        }));
      }
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo();
    }

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      if (conn) {
        conn.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, []);

  return status;
};