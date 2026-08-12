import React from 'react';
import { useConnectionStore } from '../../core/store/connectionStore';
import { cn } from '../../core/utils';

/**
 * RealtimeStatusIndicator
 * ─────────────────────────────────────────────────────────────
 * Always-visible live-sync health dot in the app header.
 * In a financial ERP, "stale data that looks fresh" is worse than
 * an error screen — the user must ALWAYS know whether the numbers
 * on screen are live or being refreshed via 60s fallback polling.
 *
 *  - connected    → emerald pulsing dot  (live sync active)
 *  - connecting   → amber pulsing dot    (establishing channel)
 *  - disconnected → rose dot + label     (60s fallback polling)
 * ─────────────────────────────────────────────────────────────
 */
const RealtimeStatusIndicator: React.FC = () => {
    const realtimeStatus = useConnectionStore((s) => s.realtimeStatus);

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
        <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--app-bg)] border border-[var(--app-border)] select-none"
            title={title}
            role="status"
            aria-live="polite"
            aria-label={title}
        >
            <span className="relative flex h-2 w-2">
                {pulse && (
                    <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-60', dot)} />
                )}
                <span className={cn('relative inline-flex rounded-full h-2 w-2', dot)} />
            </span>
            <span
                className={cn(
                    'text-[9px] font-bold',
                    realtimeStatus === 'disconnected'
                        ? 'text-rose-500'
                        : 'text-[var(--app-text-secondary)] hidden sm:inline'
                )}
            >
                {label}
            </span>
        </div>
    );
};

export default RealtimeStatusIndicator;
