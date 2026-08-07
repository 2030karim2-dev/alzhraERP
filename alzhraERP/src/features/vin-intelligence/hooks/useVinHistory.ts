import { useState, useCallback } from 'react';
import type { VinHistoryEntry } from '../types';
import { mockHistory } from '../mock';

export function useVinHistory() {
  const [history, setHistory] = useState<VinHistoryEntry[]>(mockHistory);

  const addToHistory = useCallback((entry: VinHistoryEntry) => {
    setHistory(prev => [entry, ...prev.filter(h => h.vin !== entry.vin)].slice(0, 50));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  return { history, addToHistory, clearHistory };
}
