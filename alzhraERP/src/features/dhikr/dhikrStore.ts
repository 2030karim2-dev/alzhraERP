/**
 * Dhikr & Prayer Ticker — persisted settings store.
 * Independent from the notifications sound store so the adhan toggle
 * never conflicts with the app's notification sounds.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DhikrSettings } from './types';

interface DhikrState extends DhikrSettings {
    /** Master toggle — show/hide the ticker bar */
    setEnabled: (enabled: boolean) => void;
    /** Toggle adhan sound on/off */
    setSoundEnabled: (enabled: boolean) => void;
    /** Save the prayer location */
    setLocation: (latitude: number | null, longitude: number | null, city: string) => void;
    /** Set the calculation method */
    setCalculationMethod: (method: DhikrSettings['calculationMethod']) => void;
    /** Remember that we already played the adhan for a prayer (dedupe) */
    markPrayerPlayed: (key: string) => void;
}

const defaultSettings: DhikrSettings = {
    enabled: true,
    soundEnabled: true,
    latitude: null,
    longitude: null,
    city: '',
    calculationMethod: 'qatar',
    lastPrayerPlayed: '',
};

export const useDhikrStore = create<DhikrState>()(
    persist(
        (set) => ({
            ...defaultSettings,

            setEnabled: (enabled) => set({ enabled }),
            setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
            setLocation: (latitude, longitude, city) => set({ latitude, longitude, city }),
            setCalculationMethod: (calculationMethod) => set({ calculationMethod }),
            markPrayerPlayed: (lastPrayerPlayed) => set({ lastPrayerPlayed }),
        }),
        { name: 'al-zahra-dhikr' }
    )
);
