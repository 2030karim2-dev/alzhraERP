import { useState, useCallback, useEffect } from 'react';
import type { VinHistoryEntry } from '../types';

const STORAGE_KEY = 'alzhra_vin_history';
const MAX_ENTRIES = 50;

function loadHistory(): VinHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: VinHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function useVinHistory() {
  const [history, setHistory] = useState<VinHistoryEntry[]>(loadHistory);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const addToHistory = useCallback((entry: VinHistoryEntry) => {
    setHistory(prev => {
      const updated = [entry, ...prev.filter(h => h.vin !== entry.vin)].slice(0, MAX_ENTRIES);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addToHistory, clearHistory, hydrated };
}


