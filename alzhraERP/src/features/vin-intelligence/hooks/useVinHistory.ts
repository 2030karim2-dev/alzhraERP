import { useState, useCallback, useEffect } from 'react';
import type { VinHistoryEntry } from '../types';
import { vinHistoryService } from '../services/vinHistoryService';
import { useAuthStore } from '../../auth/store';

export function useVinHistory() {
  const [history, setHistory] = useState<VinHistoryEntry[]>(() => vinHistoryService.getLocalHistory());
  const [hydrated, setHydrated] = useState(false);
  const user = useAuthStore(s => s.user);

  // Hydrate from remote on mount
  useEffect(() => {
    if (user?.id) {
      vinHistoryService.getHistory(user.id).then(remote => {
        if (remote.length > 0) setHistory(remote);
      }).finally(() => setHydrated(true));
    } else {
      setHydrated(true);
    }
  }, [user?.id]);

  const addToHistory = useCallback((entry: VinHistoryEntry) => {
    if (user?.id) {
      vinHistoryService.addEntry(user.id, user.company_id, entry).then(setHistory);
    } else {
      const updated = vinHistoryService.addLocalEntry(entry);
      setHistory(updated);
    }
  }, [user?.id, user?.company_id]);

  const clearHistory = useCallback(() => {
    if (user?.id) {
      vinHistoryService.clearHistory(user.id).then(() => setHistory([]));
    } else {
      vinHistoryService.clearLocalHistory();
      setHistory([]);
    }
  }, [user?.id]);

  return { history, addToHistory, clearHistory, hydrated };
}

