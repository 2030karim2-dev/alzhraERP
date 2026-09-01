import React from 'react';
import { RotateCcw } from 'lucide-react';

interface TasbeehCounterPanelProps {
  selectedDhikr: string;
  setSelectedDhikr: (text: string) => void;
  tasbeehCount: number;
  setTasbeehCount: React.Dispatch<React.SetStateAction<number>>;
  tasbeehGoal: 33 | 100 | 0;
  setTasbeehGoal: (goal: 33 | 100 | 0) => void;
}

/** Interactive electronic tasbeeh counter — extracted from PrayerTimesModal. */
export const TasbeehCounterPanel: React.FC<TasbeehCounterPanelProps> = ({
  selectedDhikr,
  setSelectedDhikr,
  tasbeehCount,
  setTasbeehCount,
  tasbeehGoal,
  setTasbeehGoal,
}) => (
  <div className="flex flex-col items-center justify-center space-y-4 py-2 text-center">
    {/* Quick Dhikr Selector Chips */}
    <div className="w-full">
      <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400">
        اختر صيغة الذكر للتسبيح:
      </span>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {[
          'سُبْحَانَ اللهِ وَبِحَمْدِهِ ، سُبْحَانَ اللهِ الْعَظِيمِ',
          'سُبْحَانَ اللهِ ، وَالْحَمْدُ لِلَّهِ ، وَلَا إِلَهَ إِلَّا اللهُ ، وَاللهُ أَكْبَرُ',
          'أَسْتَغْفِرُ اللهَ وَأَتُوبُ إِلَيْهِ',
          'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
          'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
          'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ الْعَلِيِّ الْعَظِيمِ',
        ].map(dhikrText => (
          <button
            key={dhikrText}
            type="button"
            onClick={() => {
              setSelectedDhikr(dhikrText);
              setTasbeehCount(0);
            }}
            className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
              selectedDhikr === dhikrText
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-purple-50 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {dhikrText.split('،')[0]}...
          </button>
        ))}
      </div>
    </div>

    {/* Current Dhikr Display Box */}
    <div className="w-full max-w-lg rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 shadow-xs">
      <span className="mb-1 block text-xs font-bold text-purple-700 dark:text-purple-300">
        الذكر الحالي:
      </span>
      <p className="text-sm font-black leading-relaxed text-slate-900 dark:text-slate-100">
        «{selectedDhikr}»
      </p>
    </div>

    {/* Goal selector */}
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-slate-500">الهدف:</span>
      {[
        { val: 33, label: '٣٣ مرة' },
        { val: 100, label: '١٠٠ مرة' },
        { val: 0, label: 'مفتوح' },
      ].map(g => (
        <button
          key={g.val}
          type="button"
          onClick={() => setTasbeehGoal(g.val as 33 | 100 | 0)}
          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
            tasbeehGoal === g.val
              ? 'bg-purple-600 text-white'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>

    {/* Interactive Circle Counter Button */}
    <div className="relative my-2">
      <button
        type="button"
        onClick={() => {
          setTasbeehCount(c => c + 1);
        }}
        className="flex h-36 w-36 cursor-pointer select-none flex-col items-center justify-center rounded-full border-4 border-purple-300/30 bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-500 text-white shadow-2xl shadow-purple-600/40 transition-all hover:scale-105 active:scale-95 md:h-44 md:w-44"
      >
        <span className="font-mono text-4xl font-black md:text-5xl">{tasbeehCount}</span>
        <span className="mt-1 text-xs font-bold text-purple-200">اضغط للتسبيح 📿</span>
      </button>
    </div>

    {/* Goal Achieved Indicator */}
    {tasbeehGoal > 0 && tasbeehCount >= tasbeehGoal && (
      <div className="animate-bounce rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-4 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
        🎉 ما شاء الله! اكتمل الهدف ({tasbeehGoal} مرة) تقبل الله طاعتكم
      </div>
    )}

    {/* Reset Counter Button */}
    <div className="flex items-center gap-3">
      <button
        type="button"
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
);
