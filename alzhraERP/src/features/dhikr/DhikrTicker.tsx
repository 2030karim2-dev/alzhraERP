/**
 * Dhikr & Prayer Ticker — the visual, non-intrusive ticker bar.
 *  - 26px tall, elegant emerald / gold spiritual styling with theme adaptability.
 *  - Smooth CSS marquee, paused on hover.
 *  - Mobile & desktop responsive.
 *  - Toggleable and resilient.
 */
import React, { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Sparkles, Moon, Clock, X } from 'lucide-react';
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

    // If disabled, show a discreet, beautiful spiritual trigger pill in the header
    if (!enabled) {
        return (
            <button
                type="button"
                onClick={() => setEnabled(true)}
                title="إظهار شريط الذكر وأوقات الصلاة"
                className="no-print h-5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-b border-emerald-500/20 flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all w-full select-none"
            >
                <Moon size={11} className="text-emerald-600 dark:text-emerald-400" />
                <span>إظهار شريط الذكر وأوقات الصلاة 📿</span>
            </button>
        );
    }

    const animationName = dir === 'rtl' ? 'dhikr-ticker-rtl' : 'dhikr-ticker-ltr';

    return (
        <div
            role="marquee"
            aria-label={item.text}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className={cn(
                'relative h-6.5 flex-shrink-0 overflow-hidden no-print select-none transition-colors border-b',
                item.kind === 'prayer'
                    ? 'bg-gradient-to-r from-emerald-600/15 via-teal-500/10 to-emerald-600/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30'
                    : 'bg-gradient-to-r from-emerald-500/10 via-amber-500/5 to-teal-500/10 dark:from-emerald-950/40 dark:via-slate-900/40 dark:to-emerald-950/40 text-slate-800 dark:text-slate-200 border-emerald-200/40 dark:border-emerald-800/30'
            )}
        >
            <style>{MARQUEE_KEYFRAMES}</style>

            {reducedMotion ? (
                // Accessibility: no movement — phrase simply swaps in place.
                <div className="flex items-center justify-center h-full px-4 text-[11px] font-bold truncate gap-2">
                    {item.kind === 'prayer' ? (
                        <Clock size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                        <Sparkles size={12} className="text-amber-500 shrink-0" />
                    )}
                    <span>{item.text}</span>
                </div>
            ) : (
                <div
                    className="flex items-center h-full whitespace-nowrap text-[11px] font-bold"
                    style={{
                        animation: `${animationName} 35s linear infinite`,
                        animationPlayState: paused ? 'paused' : 'running',
                        willChange: 'transform',
                    }}
                >
                    <span className="inline-flex items-center gap-2 px-8">
                        {item.kind === 'prayer' ? (
                            <Clock size={12} className="text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <Sparkles size={12} className="text-amber-500" />
                        )}
                        <span>{item.text}</span>
                    </span>
                    <span aria-hidden="true" className="inline-flex items-center gap-2 px-8">
                        {item.kind === 'prayer' ? (
                            <Clock size={12} className="text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <Sparkles size={12} className="text-amber-500" />
                        )}
                        <span>{item.text}</span>
                    </span>
                    <span aria-hidden="true" className="inline-flex items-center gap-2 px-8">
                        {item.kind === 'prayer' ? (
                            <Clock size={12} className="text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <Sparkles size={12} className="text-amber-500" />
                        )}
                        <span>{item.text}</span>
                    </span>
                </div>
            )}

            {/* Quick-hide button with clean icon */}
            <button
                type="button"
                onClick={() => setEnabled(false)}
                aria-label="إخفاء شريط الذكر وأوقات الصلاة"
                title="إخفاء شريط الذكر (يمكنك إعادة إظهاره في أي وقت)"
                className="absolute top-0 end-0 h-full w-7 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-[var(--app-surface)]/60 backdrop-blur-xs transition-colors"
            >
                <X size={11} />
            </button>
        </div>
    );
};

export default DhikrTicker;
