import { logger } from '../../../core/utils/logger';

import { useState, useCallback, useEffect } from 'react';
import type { VinHistoryEntry } from '../types';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthSession } from '../../../core/hooks/useAuthSession';

export function useVinHistory() {
  const { ensureValidSession } = useAuthSession();
  const [history, setHistory] = useState<VinHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { userId } = await ensureValidSession();
      if (!userId) {
        setError('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى لعرض سجل التحليل.');
        return;
      }

      const { data, error: dbError } = await supabase
        .from('vin_analysis_history')
        .select('vin, make, model, year, analyzed_at, result_summary')
        .eq('user_id', userId)
        .order('analyzed_at', { ascending: false })
        .limit(20);

      if (dbError) throw dbError;

      setHistory((data || []).map(row => ({
        vin: row.vin,
        analyzedAt: row.analyzed_at ?? new Date().toISOString(),
        ...(row.make ? { make: row.make } : {}),
        ...(row.model ? { model: row.model } : {}),
        ...(row.year !== null && row.year !== undefined ? { year: row.year } : {}),
        ...(row.result_summary ? { resultSummary: row.result_summary } : {}),
      })));
    } catch (err) {
      logger.error('VIN', 'Failed to load VIN history from DB', err);
      setError('فشل تحميل سجل التحليل. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addToHistory = useCallback(async (entry: VinHistoryEntry) => {
    // Optimistic UI update: show entry immediately
    setHistory(prev => {
      const updated = [entry, ...prev.filter(h => h.vin !== entry.vin)].slice(0, 20);
      return updated;
    });
    setError(null);

    try {
      const { userId } = await ensureValidSession();
      if (!userId) return;

      const { error: insertError } = await supabase
        .from('vin_analysis_history')
        .upsert({
          user_id: userId,
          vin: entry.vin,
          make: entry.make ?? null,
          model: entry.model ?? null,
          year: entry.year ?? null,
          analyzed_at: entry.analyzedAt,
          result_summary: entry.resultSummary ?? null
        }, { onConflict: 'user_id,vin' });

      if (insertError) {
        logger.error('VIN', 'Failed to persist VIN history to DB', insertError);
      }
    } catch (err) {
      logger.error('VIN', 'Error in addToHistory persistence', err);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      const { userId } = await ensureValidSession();
      if (!userId) return;
      await supabase
        .from('vin_analysis_history')
        .delete()
        .eq('user_id', userId);
      setHistory([]);
    } catch (err) {
      logger.error('VIN', 'Failed to clear VIN history in DB', err);
    }
  }, []);

  return { history, addToHistory, clearHistory, loading, error, hydrated: true };
}
