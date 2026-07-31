import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { invalidateByPreset, invalidateKeys, InvalidationPreset } from '../../lib/invalidation';
import { useAuthStore } from '../../features/auth/store';
import { logger } from '../../core/utils/logger';

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

// Using 'any' for global to avoid complex typing for this specific fix
const globalAny = window as any;

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

            // ⚡ Throttle invalidations to avoid cascading re-renders
            // 5s is enough since realtime is for collaboration, not millisecond sync
            let lastInvalidated = 0;
            const THROTTLE_MS = 5000;

            const channel = supabase.channel(channelId)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public' },
                    (payload: any) => {
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
                if (status === 'SUBSCRIBED') {
                    logger.debug('Realtime', '✅ Realtime Connection Active');
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
