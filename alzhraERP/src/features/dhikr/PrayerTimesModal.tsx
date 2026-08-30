import React, { useState } from 'react';
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
} from 'lucide-react';
import { useDhikrStore, POPULAR_CITIES } from './dhikrStore';
import { usePrayerTimes } from './usePrayerTimes';
import { DHIKR_LIST } from './dhikrList';
import { playAdhanSound } from './playAdhan';
import Modal from '../../ui/base/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PrayerTimesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { city, soundEnabled, setSoundEnabled, setPresetCity, detectGpsLocation } = useDhikrStore();

  const { prayerTimes } = usePrayerTimes();
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'prayers' | 'debt_duas' | 'istighfar' | 'rizq' | 'tasbeeh'
  >('prayers');
  const [tasbeehCount, setTasbeehCount] = useState(0);
  const [selectedDhikr] = useState('سُبْحَانَ اللهِ وَبِحَمْدِهِ ، سُبْحَانَ اللهِ الْعَظِيمِ');

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

  const handleTestAdhan = () => {
    void playAdhanSound(true);
  };

  // Filter adhkar by category
  const debtDuas = DHIKR_LIST.filter(d => d.id.startsWith('dua-debt'));
  const istighfarDuas = DHIKR_LIST.filter(
    d => d.id.includes('astaghfirullah') || d.id.includes('sayyid')
  );
  const rizqDuas = DHIKR_LIST.filter(
    d => d.id.startsWith('rizq') || d.id.includes('market') || d.id.includes('tawakkul')
  );

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="2xl" hideHeader>
      <div className="font-cairo relative overflow-hidden p-4 text-slate-800 dark:text-slate-100 md:p-6">
        {/* Header Strip with Islamic Gradient */}
        <div className="relative z-10 mb-4 flex items-center justify-between border-b border-emerald-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
              <Moon size={20} className="text-amber-200" />
            </div>
            <div>
              <h2 className="bg-gradient-to-l from-emerald-600 to-teal-700 bg-clip-text text-lg font-bold text-transparent dark:from-emerald-400 dark:to-teal-300 md:text-xl">
                الواحة الإيمانية ومواقيت الصلاة
              </h2>
              <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{city || 'الرياض (تلقائي)'}</span>
                <span className="text-emerald-500">•</span>
                <span>تقويم أم القرى</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setActiveTab('prayers');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
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
              setActiveTab('debt_duas');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'debt_duas'
                ? 'scale-102 bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Coins size={14} />
            <span>أدعية قضاء الدين</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('rizq');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'rizq'
                ? 'scale-102 bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-teal-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Sparkles size={14} />
            <span>البركة في الرزق والتجارة</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('istighfar');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'istighfar'
                ? 'scale-102 bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <HeartHandshake size={14} />
            <span>سيد الاستغفار والتوبة</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tasbeeh');
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'tasbeeh'
                ? 'scale-102 bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-100 text-slate-600 hover:bg-purple-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <RotateCcw size={14} />
            <span>السبحة الإلكترونية</span>
          </button>
        </div>

        {/* Tab 1: Prayer Times */}
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
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm transition-all hover:bg-emerald-50 dark:bg-slate-800 dark:text-emerald-300"
                  >
                    <MapPin size={14} className="text-emerald-600" />
                    <span>المدينة: {city || 'شحن - المهرة (اليمن)'}</span>
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
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:bg-emerald-50 active:scale-95 disabled:opacity-50 dark:bg-slate-800 dark:text-emerald-300"
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
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  <span>{soundEnabled ? 'صوت الأذان مفعل' : 'صوت الأذان مكتوم'}</span>
                </button>

                <button
                  onClick={handleTestAdhan}
                  title="تشغيل نغمة أذان تجريبية"
                  className="rounded-xl bg-emerald-100 px-2.5 py-1.5 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200"
                >
                  تجربة الأذان 🔊
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
          </div>
        )}

        {/* Tab 2: Debt Relief Duas */}
        {activeTab === 'debt_duas' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Coins size={16} className="shrink-0 text-amber-600" />
              <span>أدعية نبوية مأثورة لقضاء الديون وتفريج الكروب وتيسير الأمور بإذن الله</span>
            </div>
            <div className="custom-scrollbar grid max-h-[380px] grid-cols-1 gap-3 overflow-y-auto p-1">
              {debtDuas.map((item, idx) => (
                <div
                  key={item.id}
                  className="group relative rounded-2xl border border-amber-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-100">
                      «{item.text}»
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Rizq & Commerce Blessings */}
        {activeTab === 'rizq' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border border-teal-500/20 bg-teal-500/10 p-3 text-xs font-bold text-teal-800 dark:text-teal-300">
              <Sparkles size={16} className="shrink-0 text-teal-600" />
              <span>أدعية استجلاب الرزق والبركة في البيع والشراء والعمل والتجارة</span>
            </div>
            <div className="custom-scrollbar grid max-h-[380px] grid-cols-1 gap-3 overflow-y-auto p-1">
              {rizqDuas.map((item, idx) => (
                <div
                  key={item.id}
                  className="group relative rounded-2xl border border-teal-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-700 dark:text-teal-300">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-100">
                      «{item.text}»
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Istighfar & Repentance */}
        {activeTab === 'istighfar' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs font-bold text-blue-800 dark:text-blue-300">
              <HeartHandshake size={16} className="shrink-0 text-blue-600" />
              <span>سيد الاستغفار وأعظم صيغ التوبة ومحو الذنوب وفتح أبواب الفرج</span>
            </div>
            <div className="custom-scrollbar grid max-h-[380px] grid-cols-1 gap-3 overflow-y-auto p-1">
              {istighfarDuas.map((item, idx) => (
                <div
                  key={item.id}
                  className="group relative rounded-2xl border border-blue-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-700 dark:text-blue-300">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-100">
                      «{item.text}»
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Electronic Tasbeeh Counter */}
        {activeTab === 'tasbeeh' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
            <div className="w-full max-w-md rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
              <span className="mb-1 block text-xs font-bold text-purple-700 dark:text-purple-300">
                الذكر الحالي:
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {selectedDhikr}
              </p>
            </div>

            {/* Interactive Circle Counter Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setTasbeehCount(c => c + 1);
                }}
                className="flex h-36 w-36 cursor-pointer select-none flex-col items-center justify-center rounded-full border-4 border-purple-300/30 bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-500 text-white shadow-2xl shadow-purple-600/40 transition-all hover:scale-105 active:scale-95 md:h-44 md:w-44"
              >
                <span className="font-mono text-3xl font-black md:text-4xl">{tasbeehCount}</span>
                <span className="mt-1 text-xs font-bold text-purple-200">اضغط للتسبيح 📿</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setTasbeehCount(0);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/40"
              >
                <RotateCcw size={14} />
                <span>إعادة تصفير العداد</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PrayerTimesModal;
