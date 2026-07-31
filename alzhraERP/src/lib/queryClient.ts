
import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { persister } from './persister';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚡ 5 minutes stale time — realtime sync handles live updates
      staleTime: 1000 * 60 * 5,
      // Keep in cache for 24 hours (persister handles longer storage)
      gcTime: 1000 * 60 * 60 * 24,
      retry: (failureCount, error: Error & { code?: number | string; status?: number }) => {
        // ⚡ عدم إعادة المحاولة لأخطاء المصادقة - توجيه فوري للواجهة
        const code = error?.code || error?.status || '';
        const msg = (error?.message || '').toLowerCase();
        if (
          code === 401 || code === 403 ||
          code === 'PGRST301' ||
          msg.includes('jwt expired') ||
          msg.includes('refresh token') ||
          msg.includes('not authenticated')
        ) {
          return false; // لا تعيد المحاولة
        }
        return failureCount < 1; // محاولة واحدة فقط للأخطاء الأخرى
      },
      // ⚡ DISABLED — useRealtimeSync handles live updates via Supabase WebSocket
      // Enabling these causes ALL queries to fire on every page navigation = slow
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
    mutations: {
      networkMode: 'always',
    },
  },
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: Infinity,
});
