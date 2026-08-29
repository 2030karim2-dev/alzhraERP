/**
 * Dhikr & Prayer Ticker — persisted settings store with automatic GPS support.
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
    /** Detect location via browser Geolocation GPS */
    detectGpsLocation: () => Promise<{ success: boolean; city?: string; error?: string }>;
}

// Default to Mecca / Riyadh coordinates so prayer times work automatically out-of-the-box
const defaultSettings: DhikrSettings = {
    enabled: true,
    soundEnabled: true,
    latitude: 24.7136, // Riyadh, KSA (Fallback)
    longitude: 46.6753,
    city: 'الرياض (تلقائي)',
    calculationMethod: 'ummAlQura',
    lastPrayerPlayed: '',
};

export const useDhikrStore = create<DhikrState>()(
    persist(
        (set, get) => ({
            ...defaultSettings,

            setEnabled: (enabled) => set({ enabled }),
            setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
            setLocation: (latitude, longitude, city) => set({ latitude, longitude, city }),
            setCalculationMethod: (calculationMethod) => set({ calculationMethod }),
            markPrayerPlayed: (lastPrayerPlayed) => set({ lastPrayerPlayed }),

            detectGpsLocation: async () => {
                if (typeof window === 'undefined' || !navigator.geolocation) {
                    return { success: false, error: 'المتصفح لا يدعم تحديد الموقع GPS' };
                }

                return new Promise((resolve) => {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            let cityName = 'الموقع الحالي (GPS)';

                            try {
                                // Reverse geocoding via OpenStreetMap Nominatim (client-side free lookup)
                                const res = await fetch(
                                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`
                                );
                                if (res.ok) {
                                    const data = await res.json();
                                    const addr = data.address || {};
                                    cityName = addr.city || addr.town || addr.state || addr.country || 'موقعك الحالي';
                                }
                            } catch {
                                // Fallback to generic GPS label if network reverse geocoding is unavailable
                            }

                            set({
                                latitude: lat,
                                longitude: lng,
                                city: cityName,
                            });

                            resolve({ success: true, city: cityName });
                        },
                        (error) => {
                            let msg = 'تعذر الحصول على موقع GPS';
                            if (error.code === error.PERMISSION_DENIED) {
                                msg = 'تم رفض إذن الوصول للموقع، يرجى السماح بالموقع من إعدادات المتصفح';
                            }
                            resolve({ success: false, error: msg });
                        },
                        { timeout: 10000, enableHighAccuracy: true }
                    );
                });
            },
        }),
        { name: 'al-zahra-dhikr-v2' }
    )
);
