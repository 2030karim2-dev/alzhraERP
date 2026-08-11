import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

interface UseVinCountsReturn {
  vehicleCount: number;
  vinsAnalyzedCount: number;
  refreshCounts: () => void;
}

/**
 * Hook: Fetch aggregate counts from the database.
 * Separated from VINPage to follow the Component → Hook → Service architecture.
 */
export function useVinCounts(): UseVinCountsReturn {
  const [vehicleCount, setVehicleCount] = useState(0);
  const [vinsAnalyzedCount, setVinsAnalyzedCount] = useState(0);

  const refreshCounts = useCallback(async () => {
    // 🔒 Verify active session before querying — RLS enforces tenant isolation,
    // so unauthenticated queries silently return 0 rows but waste bandwidth.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      // Session missing — counts will show 0, which is safe.
      // A full session refresh is delegated to the parent page's auth flow.
      return;
    }

    supabase
      .from('vehicle_knowledge_base')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setVehicleCount(count ?? 0))
      .catch(() => setVehicleCount(0));

    supabase
      .from('vin_analysis_history')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setVinsAnalyzedCount(count ?? 0))
      .catch(() => setVinsAnalyzedCount(0));
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  return { vehicleCount, vinsAnalyzedCount, refreshCounts };
}
