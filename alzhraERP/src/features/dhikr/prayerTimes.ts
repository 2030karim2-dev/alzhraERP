/**
 * Dhikr & Prayer Ticker — astronomical prayer-time calculation.
 * Uses the `adhan` library (local, offline, no network required).
 */
import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan';
import { PRAYER_LABELS } from './dhikrList';
import type { CalculationMethodKey, PrayerName, PrayerTimeEntry, PrayerTimesResult } from './types';

const PRAYER_ORDER: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function resolveMethod(method: CalculationMethodKey) {
    switch (method) {
        case 'ummAlQura':
            return CalculationMethod.UmmAlQura();
        case 'muslimWorldLeague':
            return CalculationMethod.MuslimWorldLeague();
        case 'qatar':
        default:
            // Mathar method (18°/18°) — the common convention across the Gulf.
            return CalculationMethod.Qatar();
    }
}

/**
 * Computes today's five adhan times for the given coordinates/date.
 * Returns `null` when the location is not configured yet.
 */
export function computePrayerTimes(
    latitude: number | null,
    longitude: number | null,
    method: CalculationMethodKey,
    date: Date = new Date()
): PrayerTimesResult | null {
    if (latitude === null || longitude === null) return null;
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    const coordinates = new Coordinates(latitude, longitude);
    const params = resolveMethod(method);
    const times = new PrayerTimes(coordinates, date, params);

    const entries: PrayerTimeEntry[] = PRAYER_ORDER.map((name) => ({
        name,
        label: PRAYER_LABELS[name] ?? name,
        time: times[name].getTime(),
    })).sort((a, b) => a.time - b.time);

    const now = date.getTime();

    // Find the next adhan that is still ahead of "now".
    const next = entries.find((entry) => entry.time > now) ?? null;

    return {
        today: entries,
        next,
        nextInMinutes: next ? Math.max(0, Math.round((next.time - now) / 60_000)) : null,
    };
}

/**
 * Returns the key used to remember "this prayer already sounded today".
 */
export function prayerPlaybackKey(name: PrayerName, date: Date = new Date()): string {
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return `${name}:${day}`;
}
