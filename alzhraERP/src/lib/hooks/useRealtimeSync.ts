import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { invalidateByPreset, type InvalidationPreset } from '../../lib/invalidation';
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
 */
const pollNow = async (
  channelId: string,
  queryClient: QueryClient,
  state: FallbackPollState
): Promise<void> => {
  if (state.running) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  state.running = true;
  try {
    await queryClient.refetchQueries({ type: 'active' });
  } catch {
    // `refetchQueries` resolves even when individual queries fail
  } finally {
    state.running = false;
    clearInterval(state.interval);
    const delay = Math.min(
      FALLBACK_POLL_BASE_MS * 2 ** Math.min(state.failures, 2),
      FALLBACK_POLL_MAX_MS
    );
    state.failures = Math.min(state.failures + 1, 10);
    state.interval = setInterval(() => void pollNow(channelId, queryClient, state), delay);
  }
};

const startFallbackPolling = (channelId: string, queryClient: QueryClient): void => {
  if (fallbackPolls.has(channelId)) return;
  const intervalSec = String(FALLBACK_POLL_BASE_MS / 1000);
  logger.warn(
    'Realtime',
    `⚠️ Channel down — starting fallback polling (every ${intervalSec}s, active queries only)`
  );

  const state: FallbackPollState = {
    interval: setInterval(() => void pollNow(channelId, queryClient, state), FALLBACK_POLL_BASE_MS),
    running: false,
    failures: 0,
  };

  fallbackPolls.set(channelId, state);
  void pollNow(channelId, queryClient, state);
};

const stopFallbackPolling = (channelId: string): void => {
  const state = fallbackPolls.get(channelId);
  if (state !== undefined) {
    clearInterval(state.interval);
    fallbackPolls.delete(channelId);
    logger.info('Realtime', '✅ Channel restored — fallback polling stopped');
  }
};

// Map database tables to invalidation presets.
const TABLE_PRESET_MAP = new Map<string, InvalidationPreset>([
  ['invoices', 'sale'],
  ['invoice_items', 'sale'],
  ['payments', 'bond'],
  ['payment_allocations', 'bond'],
  ['expenses', 'expense'],
  ['journal_entries', 'journal'],
  ['journal_entry_lines', 'journal'],
  ['accounts', 'account'],
  ['products', 'inventory'],
  ['product_stock', 'inventory'],
  ['inv_stock_movements', 'inventory'],
  ['inventory_transactions', 'inventory'],
  ['stock_transfers', 'inventory'],
  ['stock_transfer_items', 'inventory'],
  ['audit_sessions', 'inventory'],
  ['audit_items', 'inventory'],
  ['product_cross_references', 'inventory'],
  ['product_kit_items', 'inventory'],
  ['parties', 'party'],
  ['companies', 'settings'],
  ['product_categories', 'inventory'],
  ['warehouses', 'settings'],
  ['expense_categories', 'expense'],
  ['branches', 'settings'],
  ['fiscal_years', 'settings'],
  ['exchange_rates', 'settings'],
  ['supported_currencies', 'settings'],
  ['incentive_plans', 'commission'],
  ['incentive_periods', 'commission'],
  ['incentive_engineer_links', 'commission'],
  ['incentive_calculations', 'commission'],
  ['debt_followup_config', 'debts'],
  ['debt_payment_promises', 'debts'],
  ['debt_message_templates', 'debts'],
  ['debt_message_log', 'debts'],
  ['party_opening_balances', 'debts'],
]);

const bindChannelListeners = (
  channel: RealtimeChannel,
  queryClient: QueryClient
): RealtimeChannel => {
  let lastInvalidated = 0;
  const THROTTLE_MS = 3000;

  const handleChange = (payload: RealtimeChangePayload): void => {
    useConnectionStore.getState().reportRealtimeEvent();
    const now = Date.now();
    if (now - lastInvalidated < THROTTLE_MS) return;

    const preset = TABLE_PRESET_MAP.get(payload.table);
    if (preset !== undefined) {
      logger.info('Realtime', `🔄 Sync: [${payload.table}] updated, refreshing...`);
      invalidateByPreset(queryClient, preset);
      lastInvalidated = now;
    }
  };

  return channel.on('postgres_changes', { event: '*', schema: 'public' }, handleChange);
};

const setupCompanyRealtimeChannel = (companyId: string, queryClient: QueryClient): void => {
  const channelId = `global-sync-${companyId}`;
  let registry = registryRef.__ALZ_CHANNELS__;
  if (!registry) {
    registry = new Map<string, RealtimeChannel>();
    registryRef.__ALZ_CHANNELS__ = registry;
  }

  if (registry.has(channelId)) return;

  logger.debug('Realtime', `🔌 Initializing semi-persistent channel for company [${companyId}]`);
  useConnectionStore.getState().setRealtimeStatus('connecting');

  const channel = bindChannelListeners(supabase.channel(channelId), queryClient);

  channel.subscribe(status => {
    const { setRealtimeStatus } = useConnectionStore.getState();
    if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
      logger.debug('Realtime', '✅ Realtime Connection Active');
      setRealtimeStatus('connected');
      stopFallbackPolling(channelId);
    } else {
      logger.warn('Realtime', `⚠️ Realtime channel status: ${status}`);
      setRealtimeStatus('disconnected');
      startFallbackPolling(channelId, queryClient);
    }
  });

  registry.set(channelId, channel);
};

export const useRealtimeSync = (): void => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const companyId = user?.company_id;

  useEffect(() => {
    if (typeof companyId !== 'string' || companyId.length === 0) return;
    setupCompanyRealtimeChannel(companyId, queryClient);
  }, [queryClient, companyId]);
};
