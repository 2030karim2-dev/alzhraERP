/**
 * Tests for the adhkar list integrity.
 */
import { describe, expect, it } from 'vitest';
import { DHIKR_LIST, PRAYER_LABELS } from './dhikrList';

describe('DHIKR_LIST', () => {
    it('contains non-empty unique phrases with ids', () => {
        const ids = new Set<string>();
        for (const item of DHIKR_LIST) {
            expect(item.id).toBeTruthy();
            expect(item.text.trim().length).toBeGreaterThan(0);
            expect(ids.has(item.id)).toBe(false);
            ids.add(item.id);
        }
    });

    it('has at least a handful of phrases to rotate', () => {
        expect(DHIKR_LIST.length).toBeGreaterThanOrEqual(5);
    });
});

describe('PRAYER_LABELS', () => {
    it('labels all five prayers in Arabic', () => {
        expect(PRAYER_LABELS).toMatchObject({
            fajr: expect.stringMatching(/الفجر/),
            dhuhr: expect.stringMatching(/الظهر/),
            asr: expect.stringMatching(/العصر/),
            maghrib: expect.stringMatching(/المغرب/),
            isha: expect.stringMatching(/العشاء/),
        });
    });
});
