import React from 'react';
import { Moon, Sun, Clock } from 'lucide-react';
import type { usePrayerTimes } from '../usePrayerTimes';

interface PrayerTimesCardsProps {
  prayerTimes: ReturnType<typeof usePrayerTimes>['prayerTimes'];
}

type TodayPrayer = NonNullable<ReturnType<typeof usePrayerTimes>['prayerTimes']>['today'][number];
type NextPrayer = NonNullable<
  NonNullable<ReturnType<typeof usePrayerTimes>['prayerTimes']>['next']
>;

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ar-SA-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const PrayerCardIcon: React.FC<{ prayerName: string; isNext: boolean }> = ({
  prayerName,
  isNext,
}) => {
  if (prayerName === 'fajr') {
    return <Moon size={18} className={isNext ? 'text-amber-200' : 'text-indigo-400'} />;
  }
  if (prayerName === 'isha') {
    return <Moon size={18} className={isNext ? 'text-amber-200' : 'text-blue-400'} />;
  }
  if (prayerName === 'dhuhr') {
    return <Sun size={18} className={isNext ? 'text-amber-200' : 'text-amber-500'} />;
  }
  if (prayerName === 'asr') {
    return <Sun size={18} className={isNext ? 'text-amber-200' : 'text-orange-400'} />;
  }
  return <Sun size={18} className={isNext ? 'text-amber-200' : 'text-rose-400'} />;
};

interface SinglePrayerCardProps {
  prayer: TodayPrayer;
  isNext: boolean;
}

const SinglePrayerCard: React.FC<SinglePrayerCardProps> = ({ prayer, isNext }) => {
  return (
    <div
      className={`relative rounded-xl border p-2.5 text-center transition-all last:col-span-2 sm:rounded-2xl sm:p-3.5 sm:last:col-span-1 ${
        isNext
          ? 'z-10 scale-[1.02] border-emerald-400 bg-gradient-to-b from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50 sm:scale-105'
          : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100'
      }`}
    >
      {isNext && (
        <span className="absolute -top-2.5 right-1/2 translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900 shadow">
          القادمة
        </span>
      )}
      <div className="mb-1 flex justify-center sm:mb-1.5">
        <PrayerCardIcon prayerName={prayer.name} isNext={isNext} />
      </div>
      <h4 className="mb-0.5 text-[11px] font-bold sm:text-xs">{prayer.label}</h4>
      <p className="font-mono text-xs font-black tracking-tight sm:text-sm" dir="ltr">
        {formatTime(prayer.time)}
      </p>
    </div>
  );
};

const NextPrayerCountdown: React.FC<{ next: NextPrayer; nextInMinutes: number | null }> = ({
  next,
  nextInMinutes,
}) => (
  <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-3 text-white shadow-lg sm:p-4">
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
        <Clock size={22} className="animate-pulse text-amber-200" />
      </div>
      <div>
        <h4 className="text-sm font-bold">المتبقي على {next.label}:</h4>
        <p className="text-xs text-emerald-100">يحين الأذان عند الساعة {formatTime(next.time)}</p>
      </div>
    </div>
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-center">
      <span className="font-mono text-xl font-black text-amber-300 md:text-2xl">
        {nextInMinutes ?? 0}
      </span>
      <span className="block text-xs font-bold text-white/80">دقيقة</span>
    </div>
  </div>
);

export const PrayerTimesCards: React.FC<PrayerTimesCardsProps> = ({ prayerTimes }) => {
  if (!prayerTimes) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {prayerTimes.today.map(prayer => (
          <SinglePrayerCard
            key={prayer.name}
            prayer={prayer}
            isNext={prayerTimes.next?.name === prayer.name}
          />
        ))}
      </div>

      {prayerTimes.next !== null && (
        <NextPrayerCountdown next={prayerTimes.next} nextInMinutes={prayerTimes.nextInMinutes} />
      )}
    </div>
  );
};
