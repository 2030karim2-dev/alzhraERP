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
import { Sparkles, Moon, Clock, Volume2, VolumeX, MapPin, BookOpen, X } from 'lucide-react';
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
  const { enabled, setEnabled, soundEnabled, setSoundEnabled, city, detectGpsLocation } =
    useDhikrStore();

  const reducedMotion = useReducedMotion();
  const { dir } = useI18nStore();
  const { prayerTimes } = usePrayerTimes();
  const item = useDhikrTicker(prayerTimes);
  const [paused, setPaused] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Collapsed Quick-Restore Pill
  if (!enabled) {
    return (
      <div className="no-print flex w-full items-center justify-between border-b border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
        <button
          type="button"
          onClick={() => {
            setEnabled(true);
          }}
          className="flex cursor-pointer items-center gap-1.5 transition-all hover:underline"
        >
          <Moon size={12} className="text-emerald-600 dark:text-emerald-400" />
          <span>إظهار شريط الذكر وأوقات الصلاة 📿</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1 rounded-md bg-emerald-600/15 px-2 py-0.5 text-[10px] transition-colors hover:bg-emerald-600/25"
        >
          <BookOpen size={11} />
          <span>مواقيت الصلاة والأدعية</span>
        </button>
        <PrayerTimesModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
          }}
        />
      </div>
    );
  }

  const animationName = dir === 'rtl' ? 'dhikr-ticker-rtl' : 'dhikr-ticker-ltr';

  return (
    <>
      <div
        role="marquee"
        aria-label={item.text}
        onMouseEnter={() => {
          setPaused(true);
        }}
        onMouseLeave={() => {
          setPaused(false);
        }}
        className={cn(
          'no-print relative flex h-7 flex-shrink-0 select-none items-center justify-between overflow-hidden border-b px-2 text-xs font-bold transition-colors',
          item.isPrayerUrgent
            ? 'border-amber-500/40 bg-gradient-to-r from-emerald-600/25 via-amber-500/20 to-emerald-600/25 text-emerald-950 shadow-xs dark:text-emerald-100'
            : 'border-emerald-500/25 bg-gradient-to-r from-emerald-900/10 via-emerald-600/10 to-teal-900/10 text-slate-800 dark:from-emerald-950/60 dark:via-slate-900/60 dark:to-teal-950/60 dark:text-slate-100'
        )}
      >
        <style>{MARQUEE_KEYFRAMES}</style>

        {/* Left side: Next prayer pill & Modal button */}
        <div className="z-10 flex shrink-0 items-center gap-1.5">
          {prayerTimes?.next && (
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(true);
              }}
              className={cn(
                'flex cursor-pointer items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black shadow-xs transition-all',
                item.isPrayerUrgent
                  ? 'animate-pulse bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              )}
              title="عرض تفاصيل مواقيت الصلاة"
            >
              <Clock size={11} />
              <span>
                {prayerTimes.next.label}: بعد {prayerTimes.nextInMinutes} د.
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsModalOpen(true);
            }}
            className="hidden items-center gap-1 rounded-lg border border-emerald-500/20 bg-white/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shadow-xs transition-colors hover:bg-white dark:bg-slate-800/80 dark:text-emerald-300 md:flex"
          >
            <BookOpen size={11} className="text-emerald-600" />
            <span>الأدعية والمواقيت</span>
          </button>
        </div>

        {/* Center: Rotating Dhikr Marquee */}
        <div className="relative mx-2 flex h-full flex-1 items-center overflow-hidden">
          {reducedMotion ? (
            <div className="flex w-full items-center justify-center gap-2 truncate px-4 text-[11px] font-bold">
              <Sparkles size={13} className="shrink-0 text-amber-500" />
              <span>{item.text}</span>
            </div>
          ) : (
            <div
              className="flex h-full items-center whitespace-nowrap text-[11px] font-bold tracking-wide"
              style={{
                animation: `${animationName} 35s linear infinite`,
                animationPlayState: paused ? 'paused' : 'running',
                willChange: 'transform',
              }}
            >
              <span className="inline-flex items-center gap-2 px-8">
                <Sparkles size={13} className="text-amber-500" />
                <span>{item.text}</span>
              </span>
              <span aria-hidden="true" className="inline-flex items-center gap-2 px-8">
                <Sparkles size={13} className="text-emerald-500" />
                <span>{item.text}</span>
              </span>
            </div>
          )}
        </div>

        {/* Right side: Audio, GPS and Dismiss buttons */}
        <div className="z-10 flex shrink-0 items-center gap-1">
          {/* Audio Sound Toggle & Test */}
          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) void playAdhanSound({ previewMode: true });
            }}
            aria-label={soundEnabled ? 'كتم صوت الأذان' : 'تفعيل صوت الأذان'}
            title={
              soundEnabled
                ? 'صوت الأذان مفعل (اضغط للكتم أو اضغط للتجربة)'
                : 'صوت الأذان مكتوم (اضغط للتفعيل)'
            }
            className={cn(
              'h-5.5 flex items-center justify-center gap-1 rounded-md px-1.5 text-[10px] font-bold transition-colors',
              soundEnabled
                ? 'bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/30 dark:text-emerald-300'
                : 'bg-slate-200/50 text-slate-400 hover:text-slate-600 dark:bg-slate-800'
            )}
          >
            {soundEnabled ? (
              <Volume2 size={12} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <VolumeX size={12} />
            )}
            <span className="hidden xl:inline">{soundEnabled ? 'الأذان 🔊' : 'مكتوم 🔇'}</span>
          </button>

          {/* GPS Location Pill */}
          <button
            type="button"
            onClick={() => void detectGpsLocation()}
            title={`الموقع: ${city || 'الرياض'} (اضغط لتحديث GPS)`}
            className="h-5.5 hidden items-center gap-1 rounded-md border border-slate-200 bg-white/60 px-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 sm:flex"
          >
            <MapPin size={10} className="text-emerald-600" />
            <span className="max-w-[75px] truncate">
              {city ? city.replace(' (تلقائي)', '') : 'الرياض'}
            </span>
          </button>

          {/* Quick Dismiss Button */}
          <button
            type="button"
            onClick={() => {
              setEnabled(false);
            }}
            aria-label="إخفاء شريط الذكر"
            title="إخفاء شريط الذكر (يمكنك إعادته بنقرة واحدة في أي وقت)"
            className="h-5.5 w-5.5 flex items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Islamic Oasis Modal */}
      <PrayerTimesModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
      />
    </>
  );
};

export default DhikrTicker;
