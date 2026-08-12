import { useEffect } from 'react';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { invalidateByPreset, invalidateKeys, InvalidationPreset } from '../../lib/invalidation';
import { useAuthStore } from '../../features/auth/store';
import { useConnectionStore } from '../../core/store/connectionStore';
import { logger } from '../../core/utils/logger';

/**
 * Fallback polling: when the Realtime WebSocket drops silently, cached
 * financial data would otherwise go stale FOREVER (staleTime=5min,
 * refetchOnMount=false). While the channel is down we invalidate all
 * active queries every 60s so users keep seeing fresh data.
 */
const FALLBACK_POLL_MS = 60_000;

// Using 'any' for global to avoid complex typing for this specific fix
const globalAny = window as any;

// Registry lives on `window` (like __ALZ_CHANNELS__) so a Vite HMR module
// swap does not orphan a running interval that the new module cannot stop.
if (!globalAny.__ALZ_FALLBACK_INTERVALS__) {
    globalAny.__ALZ_FALLBACK_INTERVALS__ = new Map<string, ReturnType<typeof setInterval>>();
}
const fallbackIntervals: Map<string, ReturnType<typeof setInterval>> = globalAny.__ALZ_FALLBACK_INTERVALS__;

const startFallbackPolling = (channelId: string, queryClient: QueryClient) => {
    if (fallbackIntervals.has(channelId)) return;
    logger.warn('Realtime', `⚠️ Channel down — starting ${FALLBACK_POLL_MS / 1000}s fallback polling`);
    fallbackIntervals.set(channelId, setInterval(() => {
        queryClient.invalidateQueries();
    }, FALLBACK_POLL_MS));
};

const stopFallbackPolling = (channelId: string) => {
    const handle = fallbackIntervals.get(channelId);
    if (handle) {
        clearInterval(handle);
        fallbackIntervals.delete(channelId);
        logger.info('Realtime', '✅ Channel restored — fallback polling stopped');
    }
};

// Map database tables to invalidation presets
const TABLE_PRESET_MAP: Record<string, InvalidationPreset> = {
    'invoices': 'sale',
    'invoice_items': 'sale',
    'payments': 'account',
    'expenses': 'expense',
    'journal_entries': 'journal',
    'products': 'inventory',
    'parties': 'party',
    'companies': 'settings',
    'product_categories': 'inventory',
    'warehouses': 'settings',
    'expense_categories': 'expense'
};

export const useRealtimeSync = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user?.company_id) return;

        const companyId = user.company_id;
        const channelId = `global-sync-${companyId}`;

        // Initialize global registry if not exists
        if (!globalAny.__ALZ_CHANNELS__) {
            globalAny.__ALZ_CHANNELS__ = new Map<string, any>();
        }

        const registry = globalAny.__ALZ_CHANNELS__;

        if (!registry.has(channelId)) {
            logger.debug('Realtime', `🔌 Initializing semi-persistent channel for company [${companyId}]`);
            useConnectionStore.getState().setRealtimeStatus('connecting');

            // ⚡ Throttle invalidations to avoid cascading re-renders
            // 5s is enough since realtime is for collaboration, not millisecond sync
            let lastInvalidated = 0;
            const THROTTLE_MS = 5000;

            const channel = supabase.channel(channelId)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public' },
                    (payload: any) => {
                        useConnectionStore.getState().reportRealtimeEvent();

                        const now = Date.now();
                        if (now - lastInvalidated < THROTTLE_MS) return;

                        const table = payload.table;
                        const preset = (TABLE_PRESET_MAP as any)[table];
                        if (preset) {
                            logger.info('Realtime', `🔄 Sync: [${table}] updated, refreshing...`);
                            invalidateByPreset(queryClient, preset);
                            lastInvalidated = now;
                        } else if (table === 'dashboard_data') {
                            invalidateKeys(queryClient, ['dashboard_data', 'dashboard']);
                            lastInvalidated = now;
                        }
                    }
                );

            channel.subscribe((status: any) => {
                const { setRealtimeStatus } = useConnectionStore.getState();
                if (status === 'SUBSCRIBED') {
                    logger.debug('Realtime', '✅ Realtime Connection Active');
                    setRealtimeStatus('connected');
                    stopFallbackPolling(channelId);
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    logger.warn('Realtime', `⚠️ Realtime channel status: ${status}`);
                    setRealtimeStatus('disconnected');
                    startFallbackPolling(channelId, queryClient);
                }
            });

            registry.set(channelId, channel);
        }

        // We specifically DO NOT remove the channel on unmount in this global sync hook.
        // This prevents the WebSocket race condition during HMR and StrictMode.
        // The connection will naturally close when the tab is closed or a hard refresh occurs.
        return () => {
            // No-op for stability
        };
    }, [queryClient, user?.company_id]);
};
