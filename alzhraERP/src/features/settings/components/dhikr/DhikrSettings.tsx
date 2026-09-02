/**
 * Dhikr & Prayer Ticker — Settings panel.
 * Master toggle, adhan sound toggle, location (latitude/longitude),
 * calculation method, and a live preview of today's prayer times.
 */
import React, { useState, useEffect } from 'react';
import { Moon, MapPin, Volume2, VolumeX, BellOff, Square, CheckCircle2, Radio } from 'lucide-react';
import Card from '@/ui/base/Card';
import { useDhikrStore } from '../../../dhikr/dhikrStore';
import { computePrayerTimes } from '../../../dhikr/prayerTimes';
import { PRAYER_LABELS } from '../../../dhikr/dhikrList';
import {
  ADHAN_RECITERS,
  playAdhanSound,
  stopAdhanSound,
  isAdhanPlaying,
  subscribeAdhanState,
} from '../../../dhikr/playAdhan';
import type { CalculationMethodKey } from '../../../dhikr/types';
import { cn } from '../../../../core/utils';

const METHODS: Array<{ key: CalculationMethodKey; label: string; desc: string }> = [
  { key: 'qatar', label: 'قطر / ماثر', desc: '18° / 18° — الشائع في الخليج' },
  { key: 'ummAlQura', label: 'أم القرى', desc: 'منهج المملكة العربية السعودية' },
  { key: 'muslimWorldLeague', label: 'رابطة العالم الإسلامي', desc: '18° / 17° — شائع عالمياً' },
];

export const DhikrSettings: React.FC = () => {
  const {
    enabled,
    setEnabled,
    soundEnabled,
    setSoundEnabled,
    volume = 0.9,
    setVolume,
    adhanReciter = 'makkah',
    setAdhanReciter,
    latitude,
    longitude,
    city,
    setLocation,
    calculationMethod,
    setCalculationMethod,
  } = useDhikrStore();

  const [latInput, setLatInput] = useState(latitude?.toString() ?? '');
  const [lngInput, setLngInput] = useState(longitude?.toString() ?? '');
  const [cityInput, setCityInput] = useState(city);
  const [saved, setSaved] = useState(false);
  const [playingAdhan, setPlayingAdhan] = useState(isAdhanPlaying());

  useEffect(() => {
    return subscribeAdhanState(setPlayingAdhan);
  }, []);

  const handleToggleAudio = () => {
    if (playingAdhan) {
      stopAdhanSound();
    } else {
      void playAdhanSound({ previewMode: true, reciterId: adhanReciter, volume });
    }
  };

  const parsedLat = Number.parseFloat(latInput);
  const parsedLng = Number.parseFloat(lngInput);
  const hasLocation = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);

  const preview = computePrayerTimes(
    hasLocation ? parsedLat : null,
    hasLocation ? parsedLng : null,
    calculationMethod
  );

  const handleSave = () => {
    setLocation(
      Number.isFinite(parsedLat) ? parsedLat : null,
      Number.isFinite(parsedLng) ? parsedLng : null,
      cityInput.trim()
    );
    setSaved(true);
    window.setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 p-6 max-md:p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 max-md:gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <Moon className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              شريط الذكر وأوقات الصلاة
            </h2>
            <p className="text-sm text-slate-500">
              تذكير هادئ بذكر الله وأوقات الصلاة — صوت أذان واضح ونقي
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 max-md:gap-2"
        >
          {saved ? 'تم الحفظ ✓' : 'حفظ'}
        </button>
      </div>

      {/* Toggles */}
      <Card className="space-y-5 p-6 max-md:p-3">
        <div className="flex items-center justify-between gap-4 max-md:gap-4">
          <div className="flex items-center gap-3 max-md:gap-3">
            <Moon className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">إظهار الشريط</p>
              <p className="text-xs text-slate-500">
                شريط رفيع أعلى الصفحة يتناوب الأذكار وأوقات الصلاة
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEnabled(!enabled);
            }}
            role="switch"
            aria-checked={enabled}
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-full transition-colors',
              enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            )}
          >
            <span
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all',
                enabled ? 'left-6' : 'left-1'
              )}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 max-md:gap-4">
          <div className="flex items-center gap-3 max-md:gap-3">
            {soundEnabled ? (
              <Volume2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <VolumeX className="h-5 w-5 text-slate-400" />
            )}
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                صوت الأذان التلقائي
              </p>
              <p className="text-xs text-slate-500">
                يُشغَّل صوت الأذان المسموع لحظة دخول وقت الصلاة تلقائياً
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
            }}
            role="switch"
            aria-checked={soundEnabled}
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-full transition-colors',
              soundEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            )}
          >
            <span
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all',
                soundEnabled ? 'left-6' : 'left-1'
              )}
            />
          </button>
        </div>

        {/* Adhan Customization Options */}
        {soundEnabled && (
          <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-950/60 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                تخصيص صوت الأذان والمؤذن ومستوى الصوت
              </span>
            </div>

            {/* Reciter Grid */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ADHAN_RECITERS.map(rec => {
                const isSelected = (adhanReciter || 'makkah') === rec.id;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => {
                      setAdhanReciter(rec.id);
                      if (playingAdhan) {
                        void playAdhanSound({ previewMode: true, reciterId: rec.id, volume });
                      }
                    }}
                    className={cn(
                      'flex flex-col items-start rounded-xl border p-2.5 text-right transition-all',
                      isSelected
                        ? 'border-emerald-600 bg-white text-emerald-950 shadow-sm ring-1 ring-emerald-500/30 dark:bg-slate-800 dark:text-emerald-100'
                        : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 dark:bg-slate-800/70 dark:text-slate-300'
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-bold">{rec.name}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                    </div>
                    <span className="mt-0.5 text-[10px] text-slate-500">{rec.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Volume and Test Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-200/40 pt-2 dark:border-emerald-900/40">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  مستوى الصوت:
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={e => {
                    setVolume(parseFloat(e.target.value));
                  }}
                  className="h-2 w-28 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-emerald-600 dark:bg-slate-700"
                />
                <span className="w-10 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  {Math.round(volume * 100)}%
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleAudio}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95',
                  playingAdhan
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                )}
              >
                {playingAdhan ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>إيقاف الأذان</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>تجربة وسماع الصوت 🔊</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-6 max-md:p-3">
        <div className="flex items-center gap-2 max-md:gap-2">
          <MapPin className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            الموقع لحساب أوقات الصلاة
          </h3>
        </div>
        <p className="-mt-2 text-xs text-slate-500">
          أدخل إحداثيات موقعك (تُحسب الأوقات محلياً دون إنترنت). يمكنك إيجادها من خرائط جوجل — أيمن
          الفأرة على موقعك.
        </p>
        <div className="grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              المدينة (اختياري)
            </label>
            <input
              value={cityInput}
              onChange={e => {
                setCityInput(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-200 bg-[var(--app-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              خط العرض (Latitude)
            </label>
            <input
              dir="ltr"
              value={latInput}
              onChange={e => {
                setLatInput(e.target.value);
              }}
              inputMode="decimal"
              className="w-full rounded-lg border border-slate-200 bg-[var(--app-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
              خط الطول (Longitude)
            </label>
            <input
              dir="ltr"
              value={lngInput}
              onChange={e => {
                setLngInput(e.target.value);
              }}
              inputMode="decimal"
              className="w-full rounded-lg border border-slate-200 bg-[var(--app-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
            منهج الحساب
          </label>
          <div className="grid grid-cols-1 gap-2 max-md:gap-2 md:grid-cols-3">
            {METHODS.map(m => (
              <button
                key={m.key}
                onClick={() => {
                  setCalculationMethod(m.key);
                }}
                className={cn(
                  'rounded-xl border-2 p-3 text-right transition-all max-md:p-3',
                  calculationMethod === m.key
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-200 hover:border-emerald-300 dark:border-slate-700'
                )}
              >
                <p className="text-sm font-bold text-slate-800 dark:text-white">{m.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {preview && (
        <Card className="p-6 max-md:p-3">
          <div className="mb-4 flex items-center gap-2 max-md:gap-2">
            <BellOff className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              أوقات اليوم (معاينة)
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 max-md:gap-3 md:grid-cols-5">
            {preview.today.map(entry => (
              <div
                key={entry.name}
                className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900 max-md:p-3"
              >
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {PRAYER_LABELS[entry.name] ?? entry.name}
                </p>
                <p className="mt-1 text-sm font-black text-slate-800 dark:text-white" dir="ltr">
                  {new Date(entry.time).toLocaleTimeString('ar-SA-u-nu-latn', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
          {preview.next && preview.nextInMinutes != null && (
            <p className="mt-4 text-sm font-bold text-emerald-700 dark:text-emerald-300">
              الصلاة القادمة: {PRAYER_LABELS[preview.next.name]} بعد {preview.nextInMinutes} دقيقة
            </p>
          )}
        </Card>
      )}

      {!hasLocation && (
        <p className="text-xs text-slate-400">أدخل خط العرض وخط الطول أعلاه لعرض أوقات الصلاة.</p>
      )}
    </div>
  );
};

export default DhikrSettings;
