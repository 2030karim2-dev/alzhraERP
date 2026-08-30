import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useConnectionStore } from '../../core/store/connectionStore';
import { useOfflineQueueStatus } from '../../core/sync/offlineMutationQueue';
import { cn } from '../../core/utils';

/**
 * RealtimeStatusIndicator
 * ─────────────────────────────────────────────────────────────
 * Always-visible live-sync and offline-queue health indicator in the app header.
 *
 *  - connected    → emerald pulsing dot  (live sync active)
 *  - connecting   → amber pulsing dot    (establishing channel)
 *  - disconnected → rose dot + label     (60s fallback polling)
 *  - pending sync → amber badge with counter (offline operations awaiting sync)
 * ─────────────────────────────────────────────────────────────
 */
const RealtimeStatusIndicator: React.FC = () => {
  const realtimeStatus = useConnectionStore(s => s.realtimeStatus);
  const { pendingCount, isSyncing } = useOfflineQueueStatus();

  const config = {
    connected: {
      dot: 'bg-emerald-500',
      pulse: true,
      label: 'مباشر',
      title: 'المزامنة المباشرة متصلة — البيانات تُحدَّث لحظيًا',
    },
    connecting: {
      dot: 'bg-amber-400',
      pulse: true,
      label: 'جارٍ الاتصال',
      title: 'جارٍ الاتصال بقناة المزامنة المباشرة…',
    },
    disconnected: {
      dot: 'bg-rose-500',
      pulse: false,
      label: 'تحديث دوري',
      title: 'المزامنة المباشرة منقطعة — يتم تحديث البيانات كل 60 ثانية تلقائيًا',
    },
  } as const;

  const { dot, pulse, label, title } = config[realtimeStatus];

  return (
    <div className="flex items-center gap-1.5">
      {/* Realtime Live Sync Status */}
      <div
        className="flex select-none items-center gap-1.5 rounded-full border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1 transition-colors"
        title={title}
        role="status"
        aria-live="polite"
        aria-label={title}
      >
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
                dot
              )}
            />
          )}
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', dot)} />
        </span>
        <span
          className={cn(
            'text-[10px] font-bold',
            realtimeStatus === 'disconnected'
              ? 'text-rose-500'
              : 'hidden text-[var(--app-text-secondary)] sm:inline'
          )}
        >
          {label}
        </span>
      </div>

      {/* Offline Pending Operations Indicator */}
      {pendingCount > 0 && (
        <div
          className="animate-in fade-in flex select-none items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400"
          title={`يوجد ${pendingCount} عملية مخزنة محلياً في انتظار المزامنة مع الخادم`}
        >
          <RefreshCw size={10} className={cn('shrink-0', isSyncing && 'animate-spin')} />
          <span>{pendingCount} قيد المزامنة</span>
        </div>
      )}
    </div>
  );
};

export default RealtimeStatusIndicator;
