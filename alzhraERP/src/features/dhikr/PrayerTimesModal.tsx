import React, { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  Clock,
  MapPin,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  RotateCcw,
  HeartHandshake,
  Coins,
  Square,
  Radio,
  Bell,
  CheckCircle2,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { useDhikrStore, POPULAR_CITIES } from './dhikrStore';
import { usePrayerTimes } from './usePrayerTimes';
import { DHIKR_LIST } from './dhikrList';
import type { DhikrItem } from './types';
import {
  ADHAN_RECITERS,
  playAdhanSound,
  stopAdhanSound,
  isAdhanPlaying,
  subscribeAdhanState,
} from './playAdhan';
import Modal from '../../ui/base/Modal';
import { DhikrCard } from './components/DhikrCard';
import { TasbeehCounterPanel } from './components/TasbeehCounterPanel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabType =
  | 'prayers'
  | 'tasbeeh_tahleel'
  | 'quran_prophet'
  | 'istighfar'
  | 'debt_rizq'
  | 'protection_salawat'
  | 'counter';

export const PrayerTimesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    city,
    soundEnabled,
    setSoundEnabled,
    volume = 0.9,
    setVolume,
    adhanReciter = 'makkah',
    setAdhanReciter,
    setPresetCity,
    detectGpsLocation,
  } = useDhikrStore();

  const { prayerTimes } = usePrayerTimes();
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [playingAdhan, setPlayingAdhan] = useState(isAdhanPlaying());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const [activeTab, setActiveTab] = useState<TabType>('prayers');

  // Interactive Tasbeeh State
  const [tasbeehCount, setTasbeehCount] = useState(0);
  const [tasbeehGoal, setTasbeehGoal] = useState<33 | 100 | 0>(33);
  const [selectedDhikr, setSelectedDhikr] = useState(
    'سُبْحَانَ اللهِ وَبِحَمْدِهِ ، سُبْحَانَ اللهِ الْعَظِيمِ'
  );

  useEffect(() => {
    return subscribeAdhanState(setPlayingAdhan);
  }, []);

  const handleCopyText = (item: DhikrItem) => {
    if (navigator?.clipboard) {
      void navigator.clipboard.writeText(item.text);
      setCopiedId(item.id);
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    }
  };

  const handleGpsClick = async () => {
    setIsLocating(true);
    setGpsStatus('جاري تحديد الموقع عبر GPS...');
    const result = await detectGpsLocation();
    setIsLocating(false);
    if (result.success) {
      setGpsStatus(`تم التحديد بنجاح: ${result.city}`);
      setTimeout(() => {
        setGpsStatus(null);
      }, 4000);
    } else {
      setGpsStatus(result.error || 'تعذر جلب الموقع');
      setTimeout(() => {
        setGpsStatus(null);
      }, 5000);
    }
  };

  const handleToggleAdhanAudio = () => {
    if (playingAdhan) {
      stopAdhanSound();
    } else {
      void playAdhanSound({ previewMode: true, reciterId: adhanReciter, volume });
    }
  };

  const handleRequestNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
    }
  };

  // Categorized Dhikr Collections
  const tasbeehAndTakbeer = DHIKR_LIST.filter(
    d => d.category === 'tasbeeh' || d.category === 'tahleel' || d.category === 'takbeer'
  );
  const quranAndProphetDuas = DHIKR_LIST.filter(
    d => d.category === 'quran_duas' || d.category === 'prophet_duas'
  );
  const istighfarDuas = DHIKR_LIST.filter(d => d.category === 'istighfar');
  const debtAndRizqDuas = DHIKR_LIST.filter(
    d => d.category === 'debt_relief' || d.category === 'rizq_work'
  );
  const protectionAndSalawat = DHIKR_LIST.filter(
    d => d.category === 'morning_evening' || d.category === 'salawat'
  );

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-SA-u-nu-latn', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSendToCounter = (item: DhikrItem) => {
    setSelectedDhikr(item.text);
    setTasbeehCount(0);
    setActiveTab('counter');
  };

  const renderDhikrCard = (item: DhikrItem, idx: number, themeColor: string) => (
    <DhikrCard
      item={item}
      idx={idx}
      themeColor={themeColor}
      copiedId={copiedId}
      onCopy={handleCopyText}
      onSendToCounter={handleSendToCounter}
    />
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="2xl" hideHeader>
      <div className="font-cairo relative overflow-hidden p-4 text-slate-800 dark:text-slate-100 md:p-6">
        {/* Header Strip with Islamic Gradient */}
        <div className="relative z-10 mb-4 flex items-center justify-between border-b border-emerald-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
              <Moon size={22} className="text-amber-200" />
            </div>
            <div>
              <h2 className="bg-gradient-to-l from-emerald-600 via-teal-600 to-teal-700 bg-clip-text text-lg font-black text-transparent dark:from-emerald-400 dark:via-teal-300 dark:to-teal-200 md:text-xl">
                الواحة الإيمانية ومواقيت الصلاة والأذكار
              </h2>
              <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>{city || 'الرياض (تلقائي)'}</span>
                <span className="text-emerald-500">•</span>
                <span>تقويم أم القرى</span>
                <span className="text-emerald-500">•</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {DHIKR_LIST.length} ذكر ودعاء مأثور
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-5 flex flex-wrap gap-1.5">
          <button
            onClick={() => {
              setActiveTab('prayers');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'prayers'
                ? 'scale-102 bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Clock size={14} />
            <span>مواقيت الصلاة والأذان</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tasbeeh_tahleel');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'tasbeeh_tahleel'
                ? 'scale-102 bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-teal-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Sparkles size={14} />
            <span>التسابيح والتهليل والتكبير</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('quran_prophet');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'quran_prophet'
                ? 'scale-102 bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <BookOpen size={14} />
            <span>أدعية القرآن والسنة</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('istighfar');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'istighfar'
                ? 'scale-102 bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <HeartHandshake size={14} />
            <span>الاستغفار وسيد الاستغفار</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('debt_rizq');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'debt_rizq'
                ? 'scale-102 bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Coins size={14} />
            <span>الرزق وقضاء الدين</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('protection_salawat');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'protection_salawat'
                ? 'scale-102 bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-rose-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <ShieldCheck size={14} />
            <span>الحفظ والصلاة على النبي ﷺ</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('counter');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              activeTab === 'counter'
                ? 'scale-102 bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-purple-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <RotateCcw size={14} />
            <span>السبحة الإلكترونية</span>
          </button>
        </div>

        {/* ── TAB 1: PRAYER TIMES & ADHAN ─────────────────────────────────── */}
        {activeTab === 'prayers' && (
          <div className="space-y-4">
            {/* City & GPS Selector Bar */}
            <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 dark:bg-emerald-950/30 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCityDropdown(!showCityDropdown);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs transition-all hover:bg-emerald-50 dark:bg-slate-800 dark:text-emerald-300"
                  >
                    <MapPin size={14} className="text-emerald-600" />
                    <span>المدينة: {city || 'الرياض'}</span>
                    <span className="py-0.2 rounded bg-emerald-100 px-1.5 text-[10px] text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      تغيير ▼
                    </span>
                  </button>

                  {showCityDropdown && (
                    <div className="custom-scrollbar animate-in zoom-in-95 absolute right-0 top-full z-50 mt-2 max-h-64 w-72 overflow-y-auto rounded-2xl border border-emerald-500/30 bg-white p-2 shadow-2xl duration-200 dark:bg-slate-800">
                      <div className="border-b border-slate-100 p-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-700">
                        اختر المدينة (اليمن والخليج)
                      </div>
                      <div className="py-1">
                        {POPULAR_CITIES.map(c => (
                          <button
                            key={`${c.name}-${c.country}`}
                            type="button"
                            onClick={() => {
                              setPresetCity(c);
                              setShowCityDropdown(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-right text-xs font-bold transition-colors ${
                              city?.includes(c.name)
                                ? 'bg-emerald-600 text-white'
                                : 'text-slate-800 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span>{c.name}</span>
                            <span
                              className={`text-[10px] ${city?.includes(c.name) ? 'text-emerald-100' : 'text-slate-400'}`}
                            >
                              {c.country}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleGpsClick}
                  disabled={isLocating}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-xs transition-all hover:bg-emerald-50 active:scale-95 disabled:opacity-50 dark:bg-slate-800 dark:text-emerald-300"
                >
                  <MapPin
                    size={14}
                    className={isLocating ? 'animate-bounce text-emerald-500' : 'text-emerald-500'}
                  />
                  <span>{isLocating ? 'جاري تحديد GPS...' : 'تحديد الموقع تلقائياً بالـ GPS'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSoundEnabled(!soundEnabled);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                    soundEnabled
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                      : 'border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  <span>{soundEnabled ? 'صوت الأذان مفعل' : 'صوت الأذان مكتوم'}</span>
                </button>
              </div>

              {gpsStatus && (
                <span className="w-full animate-pulse text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {gpsStatus}
                </span>
              )}
            </div>

            {/* Prayer Times 5 Cards Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {prayerTimes?.today.map(prayer => {
                const isNext = prayerTimes.next?.name === prayer.name;
                return (
                  <div
                    key={prayer.name}
                    className={`relative rounded-2xl border p-3.5 text-center transition-all ${
                      isNext
                        ? 'z-10 scale-105 border-emerald-400 bg-gradient-to-b from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100'
                    }`}
                  >
                    {isNext && (
                      <span className="absolute -top-2.5 right-1/2 translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900 shadow">
                        القادمة
                      </span>
                    )}
                    <div className="mb-1.5 flex justify-center">
                      {prayer.name === 'fajr' && (
                        <Moon size={20} className={isNext ? 'text-amber-200' : 'text-indigo-400'} />
                      )}
                      {prayer.name === 'dhuhr' && (
                        <Sun size={20} className={isNext ? 'text-amber-200' : 'text-amber-500'} />
                      )}
                      {prayer.name === 'asr' && (
                        <Sun size={20} className={isNext ? 'text-amber-200' : 'text-orange-400'} />
                      )}
                      {prayer.name === 'maghrib' && (
                        <Sun size={20} className={isNext ? 'text-amber-200' : 'text-rose-400'} />
                      )}
                      {prayer.name === 'isha' && (
                        <Moon size={20} className={isNext ? 'text-amber-200' : 'text-blue-400'} />
                      )}
                    </div>
                    <h4 className="mb-1 text-xs font-bold">{prayer.label}</h4>
                    <p className="font-mono text-sm font-black tracking-tight" dir="ltr">
                      {formatTime(prayer.time)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Next Prayer Countdown Alert */}
            {prayerTimes?.next && (
              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 text-white shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
                    <Clock size={22} className="animate-pulse text-amber-200" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">المتبقي على {prayerTimes.next.label}:</h4>
                    <p className="text-xs text-emerald-100">
                      يحين الأذان عند الساعة {formatTime(prayerTimes.next.time)}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-center">
                  <span className="font-mono text-xl font-black text-amber-300 md:text-2xl">
                    {prayerTimes.nextInMinutes}
                  </span>
                  <span className="block text-xs font-bold text-white/80">دقيقة</span>
                </div>
              </div>
            )}

            {/* Advanced Adhan Audio Center */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Radio size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    مركز التحكم بصوت الأذان والمؤذن
                  </span>
                </div>
                {notifPermission !== 'granted' && (
                  <button
                    type="button"
                    onClick={handleRequestNotification}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300"
                  >
                    <Bell size={12} />
                    تفعيل إشعارات سطح المكتب
                  </button>
                )}
              </div>

              {/* Reciters Selector Grid */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-400">
                  اختر صوت الأذان المفضل:
                </label>
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
                            void playAdhanSound({
                              previewMode: true,
                              reciterId: rec.id,
                              volume,
                            });
                          }
                        }}
                        className={`flex flex-col items-start rounded-xl border p-2.5 text-right transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-xs ring-1 ring-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-xs font-bold">{rec.name}</span>
                          {isSelected && <CheckCircle2 size={14} className="text-emerald-600" />}
                        </div>
                        <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                          {rec.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Volume Slider & Play/Stop Action */}
              <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/80 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setVolume(volume > 0 ? 0 : 0.9);
                    }}
                    className="text-slate-500 hover:text-emerald-600 dark:text-slate-400"
                    title={volume > 0 ? 'كتم الصوت' : 'إعادة تشغيل الصوت'}
                  >
                    {volume > 0 ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </button>
                  <div className="flex items-center gap-2">
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
                </div>

                <button
                  type="button"
                  onClick={handleToggleAdhanAudio}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-md transition-all active:scale-95 ${
                    playingAdhan
                      ? 'bg-rose-600 text-white shadow-rose-600/20 hover:bg-rose-700'
                      : 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
                  }`}
                >
                  {playingAdhan ? (
                    <>
                      <Square size={14} className="fill-current" />
                      <span>إيقاف صوت الأذان</span>
                      <div className="flex items-end gap-0.5">
                        <span className="h-3 w-1 animate-pulse rounded-full bg-white"></span>
                        <span className="h-4 w-1 animate-bounce rounded-full bg-white"></span>
                        <span className="h-2 w-1 animate-pulse rounded-full bg-white"></span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Volume2 size={14} />
                      <span>تجربة وسماع صوت الأذان 🔊</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: TASBEEH, TAHLEEL & TAKBEER ────────────────────────────── */}
        {activeTab === 'tasbeeh_tahleel' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border border-teal-500/20 bg-teal-500/10 p-3 text-xs font-bold text-teal-800 dark:text-teal-300">
              <Sparkles size={16} className="shrink-0 text-teal-600" />
              <span>
                أعظم التسابيح والتهليلات والتكبيرات المأثورة — أحب الكلام إلى الله وغراس الجنة
              </span>
            </div>
            <div className="custom-scrollbar grid max-h-[400px] grid-cols-1 gap-2.5 overflow-y-auto p-1">
              {tasbeehAndTakbeer.map((item, idx) =>
                renderDhikrCard(item, idx, 'bg-teal-500/20 text-teal-700 dark:text-teal-300')
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: QURANIC & PROPHETIC DUAS ──────────────────────────────── */}
        {activeTab === 'quran_prophet' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs font-bold text-indigo-800 dark:text-indigo-300">
              <BookOpen size={16} className="shrink-0 text-indigo-600" />
              <span>أدعية القرآن الكريم العظيمة وجوامع دعاء النبي ﷺ للخير في الدنيا والآخرة</span>
            </div>
            <div className="custom-scrollbar grid max-h-[400px] grid-cols-1 gap-2.5 overflow-y-auto p-1">
              {quranAndProphetDuas.map((item, idx) =>
                renderDhikrCard(item, idx, 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300')
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: ISTIGHFAR & SAYYID AL-ISTIGHFAR ───────────────────────── */}
        {activeTab === 'istighfar' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs font-bold text-blue-800 dark:text-blue-300">
              <HeartHandshake size={16} className="shrink-0 text-blue-600" />
              <span>سيد الاستغفار وأعظم صيغ التوبة ومحو الذنوب وفتح أبواب الفرج والرحمة</span>
            </div>
            <div className="custom-scrollbar grid max-h-[400px] grid-cols-1 gap-2.5 overflow-y-auto p-1">
              {istighfarDuas.map((item, idx) =>
                renderDhikrCard(item, idx, 'bg-blue-500/20 text-blue-700 dark:text-blue-300')
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5: DEBT RELIEF & RIZQ / WORK ────────────────────────────── */}
        {activeTab === 'debt_rizq' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Coins size={16} className="shrink-0 text-amber-600" />
              <span>أدعية قضاء الديون وتفريج الكروب واستجلاب البركة في البيع والعمل والتجارة</span>
            </div>
            <div className="custom-scrollbar grid max-h-[400px] grid-cols-1 gap-2.5 overflow-y-auto p-1">
              {debtAndRizqDuas.map((item, idx) =>
                renderDhikrCard(item, idx, 'bg-amber-500/20 text-amber-700 dark:text-amber-300')
              )}
            </div>
          </div>
        )}

        {/* ── TAB 6: PROTECTION & SALAWAT ─────────────────────────────────── */}
        {activeTab === 'protection_salawat' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-800 dark:text-rose-300">
              <ShieldCheck size={16} className="shrink-0 text-rose-600" />
              <span>أذكار الحفظ والتحصين اليومي والصلاة والسلام على نبينا محمد ﷺ</span>
            </div>
            <div className="custom-scrollbar grid max-h-[400px] grid-cols-1 gap-2.5 overflow-y-auto p-1">
              {protectionAndSalawat.map((item, idx) =>
                renderDhikrCard(item, idx, 'bg-rose-500/20 text-rose-700 dark:text-rose-300')
              )}
            </div>
          </div>
        )}

        {/* ── TAB 7: INTERACTIVE ELECTRONIC TASBEEH COUNTER ───────────────── */}
        {activeTab === 'counter' && (
          <TasbeehCounterPanel
            selectedDhikr={selectedDhikr}
            setSelectedDhikr={setSelectedDhikr}
            tasbeehCount={tasbeehCount}
            setTasbeehCount={setTasbeehCount}
            tasbeehGoal={tasbeehGoal}
            setTasbeehGoal={setTasbeehGoal}
          />
        )}
      </div>
    </Modal>
  );
};

export default PrayerTimesModal;
