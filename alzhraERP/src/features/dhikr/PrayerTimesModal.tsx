import React, { useState, useEffect } from 'react';
import {
  Moon,
  Clock,
  Sparkles,
  X,
  RotateCcw,
  HeartHandshake,
  Coins,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { useDhikrStore } from './dhikrStore';
import { usePrayerTimes } from './usePrayerTimes';
import { DHIKR_LIST } from './dhikrList';
import type { DhikrItem } from './types';
import { isAdhanPlaying, subscribeAdhanState } from './playAdhan';
import Modal from '../../ui/base/Modal';
import { TasbeehCounterPanel } from './components/TasbeehCounterPanel';
import { PrayerTimesCards } from './components/PrayerTimesCards';
import { AdhanSettingsBar } from './components/AdhanSettingsBar';
import { DhikrTabContent } from './components/DhikrTabContent';

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
  const [playingAdhan, setPlayingAdhan] = useState(isAdhanPlaying());
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const handleSendToCounter = (item: DhikrItem) => {
    setSelectedDhikr(item.text);
    setTasbeehCount(0);
    setActiveTab('counter');
  };

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
            onClick={() => setActiveTab('prayers')}
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
            onClick={() => setActiveTab('tasbeeh_tahleel')}
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
            onClick={() => setActiveTab('quran_prophet')}
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
            onClick={() => setActiveTab('istighfar')}
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
            onClick={() => setActiveTab('debt_rizq')}
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
            onClick={() => setActiveTab('protection_salawat')}
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
            onClick={() => setActiveTab('counter')}
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

        {/* Tab 1: Prayer Times & Adhan */}
        {activeTab === 'prayers' && (
          <div className="space-y-4">
            <AdhanSettingsBar
              city={city}
              setPresetCity={setPresetCity}
              detectGpsLocation={detectGpsLocation}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              volume={volume}
              setVolume={setVolume}
              adhanReciter={adhanReciter}
              setAdhanReciter={setAdhanReciter}
              playingAdhan={playingAdhan}
            />

            <PrayerTimesCards prayerTimes={prayerTimes} />
          </div>
        )}

        {/* Tabs 2-6: Categorized Dhikr Collections */}
        {activeTab !== 'prayers' && activeTab !== 'counter' && (
          <DhikrTabContent
            activeTab={activeTab}
            copiedId={copiedId}
            onCopy={handleCopyText}
            onSendToCounter={handleSendToCounter}
          />
        )}

        {/* Tab 7: Digital Tasbeeh Counter */}
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
