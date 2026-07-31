import React, { useEffect } from 'react';
import { useOfflineQueueStore } from './offlineQueueStore';
import { logger } from '../utils/logger';

/**
 * OfflineManager component - listens for network events and triggers sync
 */
export const OfflineManager: React.FC = () => {
    const { queue, syncQueue } = useOfflineQueueStore();

    useEffect(() => {
        const handleOnline = () => {
            logger.info('OfflineManager', 'Network is back online. Triggering queue sync...');
            syncQueue();
        };

        window.addEventListener('online', handleOnline);

        // Also try sync on mount if we are already online
        if (navigator.onLine && queue.length > 0) {
            syncQueue();
        }

        return () => window.removeEventListener('online', handleOnline);
    }, [queue.length, syncQueue]);

    return null;
};
