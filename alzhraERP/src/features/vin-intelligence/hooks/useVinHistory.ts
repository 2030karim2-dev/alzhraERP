import { useState, useCallback } from 'react';
import type { VinHistoryEntry } from '../types';
import { vinAnalysisService } from '../services/vinAnalysisService';
import { mockHistory } from '../mock';

export function useVinHistory() {
  const [history, setHistory] = useState<VinHistoryEntry[]>(mockHistory);
  const [isLoading, setIsLoading] = useState(false);

  const refreshHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await vinAnalysisService.getVinHistory();
      setHistory(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addToHistory = useCallback((entry: VinHistoryEntry) => {
    setHistory(prev => [entry, ...prev.filter(h => h.vin !== entry.vin)].slice(0, 50));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, isLoading, refreshHistory, addToHistory, clearHistory };
}
