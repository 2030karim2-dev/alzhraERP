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
const FALLBACK_POLL_BASE_MS = 60_000;
const FALLBACK_POLL_MAX_MS = 240_000;

interface FallbackPollState {
    interval: ReturnType<typeof setInterval>;
    /** Guards against overlapping polls during slow/degraded networks. */
    running: boolean;
    /** Consecutive poll cycles while the channel stays down (drives backoff). */
    failures: number;
}

type RealtimeChannel = ReturnType<typeof supabase.channel>;

/** Minimal shape of the postgres_changes payload this hook consumes. */
interface RealtimeChangePayload {
    table: string;
    eventType: string;
    new?: Record<string, unknown>;
    old?: Record<string, unknown>;
}

interface AlZahraGlobalRegistry {
    __ALZ_FALLBACK_INTERVALS__?: Map<string, FallbackPollState>;
    __ALZ_CHANNELS__?: Map<string, RealtimeChannel>;
}

// Registry lives on `window` (like __ALZ_CHANNELS__) so a Vite HMR module
// swap does not orphan a running interval that the new module cannot stop.
const registryRef = window as unknown as AlZahraGlobalRegistry;
let fallbackPolls = registryRef.__ALZ_FALLBACK_INTERVALS__;
if (!fallbackPolls) {
    fallbackPolls = new Map<string, FallbackPollState>();
    registryRef.__ALZ_FALLBACK_INTERVALS__ = fallbackPolls;
}

/**
 * One fallback-poll cycle while the Realtime channel is down.
 *
 * The previous implementation called `queryClient.invalidateQueries()` (ALL keys,
 * every 60s) — a thundering herd that re-fired products(10000), quotations,
 * parties, permissions and 6 dashboard RPCs at once. This poll instead:
 *   - refetches ONLY queries mounted on screen (`type: 'active'`),
 *   - never overlaps itself (skips a tick while the previous poll is in flight),
 *   - skips entirely while the tab is hidden or the browser is offline,
 *   - backs off 60s → 120s → 240s while the channel stays down.
 */
const pollNow = async (channelId: string, queryClient: QueryClient, state: FallbackPollState) => {
    if (state.running) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    state.running = true;
    try {
        await queryClient.refetchQueries({ type: 'active' });
    } catch {
        // `refetchQueries` resolves even when individual queries fail; this only
        // guards against synchronous throws.
    } finally {
        state.running = false;
        // Adaptive backoff while the outage persists (reset when the channel restores).
        clearInterval(state.interval);
        const delay = Math.min(
            FALLBACK_POLL_BASE_MS * 2 ** Math.min(state.failures, 2),
            FALLBACK_POLL_MAX_MS
        );
        state.failures = Math.min(state.failures + 1, 10);
        state.interval = setInterval(() => void pollNow(channelId, queryClient, state), delay);
    }
};

const startFallbackPolling = (channelId: string, queryClient: QueryClient) => {
    if (fallbackPolls.has(channelId)) return;
    logger.warn('Realtime', `⚠️ Channel down — starting fallback polling (every ${FALLBACK_POLL_BASE_MS / 1000}s, active queries only)`);

    const state: FallbackPollState = {
        interval: setInterval(() => void pollNow(channelId, queryClient, state), FALLBACK_POLL_BASE_MS),
        running: false,
        failures: 0,
    };

    fallbackPolls.set(channelId, state);
    // Kick off an immediate first poll so users aren't stuck with stale data
    // for up to 60s.
    void pollNow(channelId, queryClient, state);
};

const stopFallbackPolling = (channelId: string) => {
    const state = fallbackPolls.get(channelId);
    if (state) {
        clearInterval(state.interval);
        fallbackPolls.delete(channelId);
        logger.info('Realtime', '✅ Channel restored — fallback polling stopped');
    }
};

// Map database tables to invalidation presets.
// NOTE: postgres_changes respects RLS, so cross-company data is never leaked;
// this map only decides WHICH cached queries to refresh (throttled to 5s).
const TABLE_PRESET_MAP: Record<string, InvalidationPreset> = {
    'invoices': 'sale',
    'invoice_items': 'sale',
    'payments': 'account',
    'expenses': 'expense',
    'journal_entries': 'journal',
    'journal_entry_lines': 'journal',      // direct line fixes must refresh journals
    'accounts': 'account',
    'products': 'inventory',
    'product_stock': 'inventory',
    'stock_movements': 'inventory',
    'inventory_transactions': 'inventory',
    'stock_transfers': 'inventory',
    'stock_transfer_items': 'inventory',
    'audit_sessions': 'inventory',
    'audit_items': 'inventory',
    'product_cross_references': 'inventory',
    'product_kit_items': 'inventory',
    'parties': 'party',
    'companies': 'settings',
    'product_categories': 'inventory',
    'warehouses': 'settings',
    'expense_categories': 'expense',
    'branches': 'settings',
    'fiscal_years': 'settings',
    'exchange_rates': 'settings',
    'supported_currencies': 'settings',
    // Commission / incentive engine tables
    'incentive_plans': 'commission',
    'incentive_periods': 'commission',
    'incentive_engineer_links': 'commission',
    'incentive_calculations': 'commission',
    // Debts & collection tables
    'debt_followup_config': 'debts',
    'debt_payment_promises': 'debts',
    'debt_message_templates': 'debts',
    'debt_message_log': 'debts',
    'party_opening_balances': 'debts',
};

export const useRealtimeSync = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user?.company_id) return;

        const companyId = user.company_id;
        const channelId = `global-sync-${companyId}`;

        // Initialize global registry if not exists
        let registry = registryRef.__ALZ_CHANNELS__;
        if (!registry) {
            registry = new Map<string, RealtimeChannel>();
            registryRef.__ALZ_CHANNELS__ = registry;
        }

        if (!registry.has(channelId)) {
            logger.debug('Realtime', `🔌 Initializing semi-persistent channel for company [${companyId}]`);
            useConnectionStore.getState().setRealtimeStatus('connecting');

            // ⚡ Throttle invalidations to avoid cascading re-renders
            // 5s is enough since realtime is for collaboration, not millisecond sync
            let lastInvalidated = 0;
            const THROTTLE_MS = 5000;

            // Subscribe PER-TABLE (instead of a schema-wide wildcard) so the client
            // only receives events for tables we actually map. Tables outside the
            // publication never fire, and other tenants' rows are still filtered by
            // RLS on the realtime layer.
            const handleChange = (payload: RealtimeChangePayload) => {
                useConnectionStore.getState().reportRealtimeEvent();

                const now = Date.now();
                if (now - lastInvalidated < THROTTLE_MS) return;

                const table = payload.table;
                const preset = TABLE_PRESET_MAP[table];
                if (preset) {
                    logger.info('Realtime', `🔄 Sync: [${table}] updated, refreshing...`);
                    invalidateByPreset(queryClient, preset);
                    lastInvalidated = now;
                } else if (table === 'dashboard_data') {
                    invalidateKeys(queryClient, ['dashboard_data', 'dashboard']);
                    lastInvalidated = now;
                }
            };

            const subscribedTables = [...Object.keys(TABLE_PRESET_MAP), 'dashboard_data'];
            let channel = supabase.channel(channelId);
            for (const table of subscribedTables) {
                channel = channel.on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table },
                    handleChange
                );
            }

            channel.subscribe((status) => {
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
