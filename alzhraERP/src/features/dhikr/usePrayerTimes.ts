/**
 * Dhikr & Prayer Ticker — prayer times hook.
 * Recomputes the schedule every minute and fires the authentic adhan sound
 * once when a prayer time is reached.
 */
import { useEffect, useMemo, useState } from 'react';
import { useDhikrStore } from './dhikrStore';
import { computePrayerTimes, prayerPlaybackKey } from './prayerTimes';
import { playAdhanSound } from './playAdhan';
import type { PrayerTimesResult } from './types';

export function usePrayerTimes(): { prayerTimes: PrayerTimesResult | null } {
  const latitude = useDhikrStore(s => s.latitude);
  const longitude = useDhikrStore(s => s.longitude);
  const method = useDhikrStore(s => s.calculationMethod);
  const soundEnabled = useDhikrStore(s => s.soundEnabled);
  const volume = useDhikrStore(s => s.volume);
  const adhanReciter = useDhikrStore(s => s.adhanReciter);

  const [now, setNow] = useState(() => Date.now());

  // Refresh the clock once per minute (lightweight).
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const prayerTimes = useMemo(
    () => computePrayerTimes(latitude, longitude, method, new Date(now)),
    [latitude, longitude, method, now]
  );

  // Adhan firing — checks every minute when prayer time arrives.
  useEffect(() => {
    if (!prayerTimes) return;
    if (!soundEnabled) return;

    const justHit = prayerTimes.today.find(entry => {
      const diff = now - entry.time;
      return diff >= 0 && diff < 60_000;
    });

    if (!justHit) return;

    const key = prayerPlaybackKey(justHit.name, new Date(now));
    const current = useDhikrStore.getState().lastPrayerPlayed;

    // Deduplicate: never re-play the same adhan twice in one day.
    if (current === key) return;

    useDhikrStore.getState().markPrayerPlayed(key);

    // Play the audible adhan
    void playAdhanSound({ reciterId: adhanReciter, volume });

    // Show native browser notification if granted
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          const currentCity = useDhikrStore.getState().city || '';
          new Notification(`حان الآن موعد أذان ${justHit.label}`, {
            body: `الله أكبر الله أكبر — تقبل الله منا ومنكم صالح الأعمال (${currentCity})`,
            icon: '/pwa-icon-192.png',
          });
        } catch {
          // Ignore notification error
        }
      }
    }
  }, [prayerTimes, now, soundEnabled, adhanReciter, volume]);

  return { prayerTimes };
}
