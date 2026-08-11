import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

export function useAuthSession() {
  const ensureValidSession = useCallback(async (): Promise<{ userId: string | null; token: string | null }> => {
    try {
      const { data: s } = await supabase.auth.getSession();
      if (s?.session?.access_token && s?.session?.user?.id) {
        return { userId: s.session.user.id, token: s.session.access_token };
      }
      
      // Session missing or expired, try refresh
      const { data: ref, error: re } = await supabase.auth.refreshSession();
      if (ref?.session?.access_token && ref?.session?.user?.id) {
        return { userId: ref.session.user.id, token: ref.session.access_token };
      }
      
      return { userId: null, token: null };
    } catch (err) {
      console.error('[AuthSession] Critical error during session check:', err);
      return { userId: null, token: null };
    }
  }, []);

  return { ensureValidSession };
}
