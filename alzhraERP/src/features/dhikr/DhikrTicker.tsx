/**
 * Dhikr & Prayer Ticker — the visual, non-intrusive ticker bar.
 *  - 24px tall, uses the app's CSS variables so it adapts to every theme.
 *  - Smooth CSS marquee (transform only), paused on hover.
 *  - Respects `prefers-reduced-motion` (framer-motion) → static text swap.
 *  - Hide button (×) plus a persistent toggle in Settings.
 */
import React, { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../core/utils';
import { useI18nStore } from '../../lib/i18nStore';
import { useDhikrStore } from './dhikrStore';
import { usePrayerTimes } from './usePrayerTimes';
import { useDhikrTicker } from './useDhikrTicker';

const MARQUEE_KEYFRAMES = `
@keyframes dhikr-ticker-ltr { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes dhikr-ticker-rtl { from { transform: translateX(0); } to { transform: translateX(50%); } }
`;

const DhikrTicker: React.FC = () => {
    const enabled = useDhikrStore((s) => s.enabled);
    const setEnabled = useDhikrStore((s) => s.setEnabled);
    const reducedMotion = useReducedMotion();
    const { dir } = useI18nStore();
    const { prayerTimes } = usePrayerTimes();
    const item = useDhikrTicker(prayerTimes);
    const [paused, setPaused] = useState(false);

    if (!enabled) return null;

    const animationName = dir === 'rtl' ? 'dhikr-ticker-rtl' : 'dhikr-ticker-ltr';

    return (
        <div
            role="marquee"
            aria-label={item.text}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className={cn(
                'relative h-6 flex-shrink-0 overflow-hidden no-print select-none',
                'border-b border-[var(--app-border)]',
                item.kind === 'prayer'
                    ? 'bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-[var(--app-surface-hover)]/70 text-[var(--app-text-secondary)]'
            )}
        >
            <style>{MARQUEE_KEYFRAMES}</style>

            {reducedMotion ? (
                // Accessibility: no movement — phrase simply swaps in place.
                <div className="flex items-center h-full px-4 text-[10px] font-semibold truncate">
                    {item.text}
                </div>
            ) : (
                <div
                    className="flex items-center h-full whitespace-nowrap text-[10px] font-semibold"
                    style={{
                        animation: `${animationName} 30s linear infinite`,
                        animationPlayState: paused ? 'paused' : 'running',
                        willChange: 'transform',
                    }}
                >
                    <span className="px-4">{item.text}</span>
                    <span aria-hidden="true" className="px-4">{item.text}</span>
                </div>
            )}

            {/* Quick-hide button (persistent toggle lives in Settings) */}
            <button
                type="button"
                onClick={() => setEnabled(false)}
                aria-label="إخفاء شريط الذكر وأوقات الصلاة"
                title="إخفاء شريط الذكر"
                className="absolute top-0 end-0 h-6 w-6 flex items-center justify-center text-[var(--app-text-secondary)] opacity-60 hover:opacity-100 hover:bg-[var(--app-surface)]/40 transition-opacity"
            >
                <X size={10} />
            </button>
        </div>
    );
};

export default DhikrTicker;
