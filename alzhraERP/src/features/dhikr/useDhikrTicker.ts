/**
 * Dhikr & Prayer Ticker — rotation hook.
 * Picks what the ticker shows right now:
 *  - when the next prayer is within 30 minutes → show a prayer reminder;
 *  - otherwise → show an adhkar phrase, rotating every 10 seconds.
 */
import { useEffect, useState } from 'react';
import { DHIKR_LIST } from './dhikrList';
import type { PrayerTimesResult } from './types';

export interface TickerItem {
    kind: 'dhikr' | 'prayer';
    text: string;
    /** True when a prayer reminder is urgent (<= 30 min away) */
    isPrayerUrgent?: boolean;
}

const PRAYER_WINDOW_MIN = 30;

export function useDhikrTicker(prayerTimes: PrayerTimesResult | null): TickerItem {
    const [index, setIndex] = useState(0);

    // Rotate adhkar every 10 seconds.
    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((i) => (i + 1) % DHIKR_LIST.length);
        }, 10_000);
        return () => clearInterval(interval);
    }, []);

    const next = prayerTimes?.next;
    const isPrayerUpcoming =
        next != null &&
        prayerTimes?.nextInMinutes != null &&
        prayerTimes.nextInMinutes <= PRAYER_WINDOW_MIN;

    if (isPrayerUpcoming && next && prayerTimes?.nextInMinutes != null) {
        return {
            kind: 'prayer',
            text: `🕌 ${next.label} بعد ${prayerTimes.nextInMinutes} دقيقة`,
            isPrayerUrgent: true,
        };
    }

    const dhikr = DHIKR_LIST[index % DHIKR_LIST.length];
    return { kind: 'dhikr', text: dhikr.text };
}
