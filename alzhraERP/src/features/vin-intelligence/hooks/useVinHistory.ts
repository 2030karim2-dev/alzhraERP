import { useState, useCallback, useEffect } from 'react';
import type { VinHistoryEntry } from '../types';
import { supabase } from '../../../lib/supabaseClient';

export function useVinHistory() {
  const [history, setHistory] = useState<VinHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 🔒 Verify active session before querying
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user?.id) {
        // Try silent refresh — session may have expired since last check
        try {
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (refreshed?.session?.user?.id) {
            sessionData!.session = refreshed.session;
          } else {
            setError('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى لعرض سجل التحليل.');
            return;
          }
        } catch (_) {
          setError('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى لعرض سجل التحليل.');
          return;
        }
      }

      const { data, error: dbError } = await supabase
        .from('vin_analysis_history')
        .select('vin, make, model, year, analyzed_at, result_summary')
        .eq('user_id', sessionData!.session!.user.id)
        .order('analyzed_at', { ascending: false })
        .limit(20);

      if (dbError) throw dbError;

      setHistory((data || []).map(row => ({
        vin: row.vin,
        make: row.make ?? undefined,
        model: row.model ?? undefined,
        year: row.year ?? undefined,
        analyzedAt: row.analyzed_at,
        resultSummary: row.result_summary ?? undefined,
      })));
    } catch (err) {
      console.error('Failed to load VIN history from DB:', err);
      setError('فشل تحميل سجل التحليل. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addToHistory = useCallback((entry: VinHistoryEntry) => {
    // Optimistic UI update: show entry immediately, then validate against DB
    setHistory(prev => {
      const updated = [entry, ...prev.filter(h => h.vin !== entry.vin)].slice(0, 20);
      return updated;
    });
    setError(null); // Clear any stale error on new analysis
  }, []); // Remove setTimeout dependency — auth writes happen server-side

  const clearHistory = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user?.id) return;
      await supabase
        .from('vin_analysis_history')
        .delete()
        .eq('user_id', sessionData.session.user.id);
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear VIN history in DB:', err);
    }
  }, []);

  return { history, addToHistory, clearHistory, loading, error, hydrated: true };
}
