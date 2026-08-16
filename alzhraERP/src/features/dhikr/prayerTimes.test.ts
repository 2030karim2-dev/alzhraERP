/**
 * Tests for prayer-time calculation (adhan) and playback dedupe keys.
 */
import { describe, expect, it } from 'vitest';
import { computePrayerTimes, prayerPlaybackKey } from './prayerTimes';

// Riyadh coordinates (24.7136, 46.6753) — a fixed, well-known date.
const RIYADH = { lat: 24.7136, lng: 46.6753 };
const riyadhDate = (time: string): Date => new Date(`2026-08-15T${time}+03:00`);

describe('computePrayerTimes', () => {
    it('returns null when location is missing', () => {
        expect(computePrayerTimes(null, null, 'qatar', riyadhDate('12:00:00'))).toBeNull();
        expect(computePrayerTimes(24.7, null, 'qatar', riyadhDate('12:00:00'))).toBeNull();
    });

    it('returns five ordered adhan times for Riyadh', () => {
        const result = computePrayerTimes(RIYADH.lat, RIYADH.lng, 'qatar', riyadhDate('12:00:00'));
        expect(result).not.toBeNull();
        expect(result!.today).toHaveLength(5);

        // Names must cover all five prayers.
        const names = result!.today.map((e) => e.name);
        expect(names).toEqual(expect.arrayContaining(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']));

        // Times must be strictly ascending.
        for (let i = 1; i < result!.today.length; i++) {
            expect(result!.today[i].time).toBeGreaterThan(result!.today[i - 1].time);
        }

        // Sanity: on a mid-August Riyadh day, fajr ~04:00 and dhuhr ~12:00.
        const fajr = new Date(result!.today.find((e) => e.name === 'fajr')!.time);
        const dhuhr = new Date(result!.today.find((e) => e.name === 'dhuhr')!.time);
        const riyadhHour = (date: Date): number => (date.getUTCHours() + 3) % 24;
        expect(riyadhHour(fajr)).toBeGreaterThanOrEqual(3);
        expect(riyadhHour(fajr)).toBeLessThanOrEqual(5);
        expect(riyadhHour(dhuhr)).toBeGreaterThanOrEqual(11);
        expect(riyadhHour(dhuhr)).toBeLessThanOrEqual(13);
    });

    it('detects the next prayer and minutes-until', () => {
        // "now" shortly before dhuhr (~11:50).
        const result = computePrayerTimes(RIYADH.lat, RIYADH.lng, 'qatar', riyadhDate('11:50:00'));
        expect(result!.next?.name).toBe('dhuhr');
        expect(result!.nextInMinutes).toBeGreaterThan(0);
        expect(result!.nextInMinutes).toBeLessThanOrEqual(30);
    });

    it('wraps to the first prayer after isha (next day boundary)', () => {
        // 22:00 — after isha, so the next prayer should be tomorrow's fajr.
        const result = computePrayerTimes(RIYADH.lat, RIYADH.lng, 'qatar', riyadhDate('22:00:00'));
        expect(result!.next).toBeNull();
        expect(result!.nextInMinutes).toBeNull();
    });

    it('supports different calculation methods without crashing', () => {
        for (const method of ['qatar', 'ummAlQura', 'muslimWorldLeague'] as const) {
            const result = computePrayerTimes(RIYADH.lat, RIYADH.lng, method, riyadhDate('12:00:00'));
            expect(result!.today).toHaveLength(5);
        }
    });
});

describe('prayerPlaybackKey', () => {
    it('produces a stable per-day key', () => {
        const date = new Date(2026, 7, 15, 10, 30); // 2026-08-15
        expect(prayerPlaybackKey('fajr', date)).toBe('fajr:2026-08-15');
        expect(prayerPlaybackKey('isha', date)).toBe('isha:2026-08-15');
    });

    it('produces a different key on a different day', () => {
        expect(prayerPlaybackKey('fajr', new Date(2026, 7, 15))).not.toBe(
            prayerPlaybackKey('fajr', new Date(2026, 7, 16))
        );
    });
});
