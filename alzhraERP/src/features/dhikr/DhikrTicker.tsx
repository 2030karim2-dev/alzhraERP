/**
 * Dhikr & Prayer Ticker — Enhanced Visual Islamic Bar.
 * - Glowing Emerald / Gold / Amber spiritual gradient with subtle micro-animations.
 * - Smooth CSS marquee with paused state on hover.
 * - Next prayer countdown pill with live adhan status.
 * - Interactive GPS and Adhan sound controls.
 * - Direct launcher for the full Islamic Oasis & Prayer modal.
 */
import React, { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
    Sparkles,
    Moon,
    Clock,
    Volume2,
    VolumeX,
    MapPin,
    BookOpen,
    X,
    Coins,
    HeartHandshake
} from 'lucide-react';
import { cn } from '../../core/utils';
import { useI18nStore } from '../../lib/i18nStore';
import { useDhikrStore } from './dhikrStore';
import { usePrayerTimes } from './usePrayerTimes';
import { useDhikrTicker } from './useDhikrTicker';
import { playAdhanSound } from './playAdhan';
import PrayerTimesModal from './PrayerTimesModal';

const MARQUEE_KEYFRAMES = `
@keyframes dhikr-ticker-ltr { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes dhikr-ticker-rtl { from { transform: translateX(0); } to { transform: translateX(50%); } }
`;

const DhikrTicker: React.FC = () => {
    const {
        enabled,
        setEnabled,
        soundEnabled,
        setSoundEnabled,
        city,
        detectGpsLocation
    } = useDhikrStore();

    const reducedMotion = useReducedMotion();
    const { dir } = useI18nStore();
    const { prayerTimes } = usePrayerTimes();
    const item = useDhikrTicker(prayerTimes);
    const [paused, setPaused] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Collapsed Quick-Restore Pill
    if (!enabled) {
        return (
            <div className="no-print w-full bg-emerald-500/10 dark:bg-emerald-950/30 border-b border-emerald-500/20 py-0.5 px-3 flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                <button
                    type="button"
                    onClick={() => setEnabled(true)}
                    className="flex items-center gap-1.5 hover:underline transition-all cursor-pointer"
                >
                    <Moon size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span>إظهار شريط الذكر وأوقات الصلاة 📿</span>
                </button>

                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1 text-[10px] bg-emerald-600/15 px-2 py-0.5 rounded-md hover:bg-emerald-600/25 transition-colors"
                >
                    <BookOpen size={11} />
                    <span>مواقيت الصلاة والأدعية</span>
                </button>
                <PrayerTimesModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </div>
        );
    }

    const animationName = dir === 'rtl' ? 'dhikr-ticker-rtl' : 'dhikr-ticker-ltr';

    return (
        <>
            <div
                role="marquee"
                aria-label={item.text}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                className={cn(
                    'relative h-7 flex-shrink-0 overflow-hidden no-print select-none transition-colors border-b flex items-center justify-between px-2 text-xs font-bold',
                    item.isPrayerUrgent
                        ? 'bg-gradient-to-r from-emerald-600/25 via-amber-500/20 to-emerald-600/25 text-emerald-950 dark:text-emerald-100 border-amber-500/40 shadow-xs'
                        : 'bg-gradient-to-r from-emerald-900/10 via-emerald-600/10 to-teal-900/10 dark:from-emerald-950/60 dark:via-slate-900/60 dark:to-teal-950/60 text-slate-800 dark:text-slate-100 border-emerald-500/25'
                )}
            >
                <style>{MARQUEE_KEYFRAMES}</style>

                {/* Left side: Next prayer pill & Modal button */}
                <div className="flex items-center gap-1.5 shrink-0 z-10">
                    {prayerTimes?.next && (
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className={cn(
                                'flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs',
                                item.isPrayerUrgent
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 animate-pulse'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            )}
                            title="عرض تفاصيل مواقيت الصلاة"
                        >
                            <Clock size={11} />
                            <span>{prayerTimes.next.label}: بعد {prayerTimes.nextInMinutes} د.</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/70 dark:bg-slate-800/80 text-emerald-800 dark:text-emerald-300 hover:bg-white border border-emerald-500/20 transition-colors shadow-xs"
                    >
                        <BookOpen size={11} className="text-emerald-600" />
                        <span>الأدعية والمواقيت</span>
                    </button>
                </div>

                {/* Center: Rotating Dhikr Marquee */}
                <div className="flex-1 overflow-hidden mx-2 relative h-full flex items-center">
                    {reducedMotion ? (
                        <div className="flex items-center justify-center w-full px-4 text-[11px] font-bold truncate gap-2">
                            <Sparkles size={13} className="text-amber-500 shrink-0" />
                            <span>{item.text}</span>
                        </div>
                    ) : (
                        <div
                            className="flex items-center h-full whitespace-nowrap text-[11px] font-bold tracking-wide"
                            style={{
                                animation: `${animationName} 35s linear infinite`,
                                animationPlayState: paused ? 'paused' : 'running',
                                willChange: 'transform',
                            }}
                        >
                            <span className="inline-flex items-center gap-2 px-10">
                                <Sparkles size={13} className="text-amber-500 animate-spin-slow" />
                                <span>{item.text}</span>
                            </span>
                            <span aria-hidden="true" className="inline-flex items-center gap-2 px-10">
                                <Sparkles size={13} className="text-emerald-500" />
                                <span>{item.text}</span>
                            </span>
                            <span aria-hidden="true" className="inline-flex items-center gap-2 px-10">
                                <Sparkles size={13} className="text-amber-500" />
                                <span>{item.text}</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Right side: Audio, GPS and Dismiss buttons */}
                <div className="flex items-center gap-1 shrink-0 z-10">
                    {/* Audio Sound Toggle & Test */}
                    <button
                        type="button"
                        onClick={() => {
                            const next = !soundEnabled;
                            setSoundEnabled(next);
                            if (next) void playAdhanSound(true);
                        }}
                        aria-label={soundEnabled ? 'كتم صوت الأذان' : 'تفعيل صوت الأذان'}
                        title={soundEnabled ? 'صوت الأذان مفعل (اضغط للكتم أو اضغط للتجربة)' : 'صوت الأذان مكتوم (اضغط للتفعيل)'}
                        className={cn(
                            'h-5.5 px-1.5 rounded-md flex items-center justify-center transition-colors text-[10px] font-bold gap-1',
                            soundEnabled
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30'
                                : 'bg-slate-200/50 dark:bg-slate-800 text-slate-400 hover:text-slate-600'
                        )}
                    >
                        {soundEnabled ? <Volume2 size={12} className="text-emerald-600 dark:text-emerald-400" /> : <VolumeX size={12} />}
                        <span className="hidden xl:inline">{soundEnabled ? 'الأذان 🔊' : 'مكتوم 🔇'}</span>
                    </button>

                    {/* GPS Location Pill */}
                    <button
                        type="button"
                        onClick={() => void detectGpsLocation()}
                        title={`الموقع: ${city || 'الرياض'} (اضغط لتحديث GPS)`}
                        className="hidden sm:flex items-center gap-1 h-5.5 px-1.5 rounded-md bg-white/60 dark:bg-slate-800/80 hover:bg-white text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                        <MapPin size={10} className="text-emerald-600" />
                        <span className="max-w-[75px] truncate">{city ? city.replace(' (تلقائي)', '') : 'الرياض'}</span>
                    </button>

                    {/* Quick Dismiss Button */}
                    <button
                        type="button"
                        onClick={() => setEnabled(false)}
                        aria-label="إخفاء شريط الذكر"
                        title="إخفاء شريط الذكر (يمكنك إعادته بنقرة واحدة في أي وقت)"
                        className="h-5.5 w-5.5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Islamic Oasis Modal */}
            <PrayerTimesModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};

export default DhikrTicker;
