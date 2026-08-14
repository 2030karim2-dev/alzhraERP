/**
 * Dhikr & Prayer Ticker — prayer times hook.
 * Recomputes the schedule every minute and fires the adhan sound exactly
 * once when a prayer time is reached (respecting browser autoplay rules).
 */
import { useEffect, useMemo, useState } from 'react';
import { useDhikrStore } from './dhikrStore';
import { useSoundStore } from '../notifications/store';
import { computePrayerTimes, prayerPlaybackKey } from './prayerTimes';
import { playAdhanSound } from './playAdhan';
import type { PrayerTimesResult } from './types';

export function usePrayerTimes(): { prayerTimes: PrayerTimesResult | null } {
    const latitude = useDhikrStore((s) => s.latitude);
    const longitude = useDhikrStore((s) => s.longitude);
    const method = useDhikrStore((s) => s.calculationMethod);
    const soundEnabled = useDhikrStore((s) => s.soundEnabled);

    const [now, setNow] = useState(() => Date.now());

    // Refresh the clock once per minute (light, no per-second ticking).
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(interval);
    }, []);

    const prayerTimes = useMemo(
        () => computePrayerTimes(latitude, longitude, method, new Date(now)),
        [latitude, longitude, method, now]
    );

    // Adhan firing — runs every minute together with the clock refresh.
    useEffect(() => {
        if (!prayerTimes) return;
        if (!soundEnabled) return;

        const justHit = prayerTimes.today.find((entry) => {
            const diff = now - entry.time;
            return diff >= 0 && diff < 60_000;
        });

        if (!justHit) return;

        const key = prayerPlaybackKey(justHit.name, new Date(now));
        const current = useDhikrStore.getState().lastPrayerPlayed;

        // Deduplicate: never re-play the same adhan twice in one day.
        if (current === key) return;

        useDhikrStore.getState().markPrayerPlayed(key);

        const sound = useSoundStore.getState();
        if (sound.isSoundEnabled && sound.hasUserInteracted) {
            void playAdhanSound();
        }
    }, [prayerTimes, now, soundEnabled]);

    return { prayerTimes };
}
