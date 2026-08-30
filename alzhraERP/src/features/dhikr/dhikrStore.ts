/**
 * Dhikr & Prayer Ticker — Persisted Settings Store with Yemen (Shahan, Al-Mahrah) & GPS.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DhikrSettings } from './types';

export interface PresetCity {
    name: string;
    country: string;
    lat: number;
    lng: number;
}

export const POPULAR_CITIES: PresetCity[] = [
    // ── اليمن ─────────────────────────────────────────────────────────────
    { name: 'شحن - المهرة', country: 'اليمن', lat: 17.5350, lng: 52.2470 },
    { name: 'الغيضة - المهرة', country: 'اليمن', lat: 16.2078, lng: 52.1764 },
    { name: 'حوف - المهرة', country: 'اليمن', lat: 16.6490, lng: 52.9570 },
    { name: 'سيحوت - المهرة', country: 'اليمن', lat: 15.2070, lng: 51.2450 },
    { name: 'المكلا - حضرموت', country: 'اليمن', lat: 14.5425, lng: 49.1242 },
    { name: 'سيئون - حضرموت', country: 'اليمن', lat: 15.9431, lng: 48.7872 },
    { name: 'عدن', country: 'اليمن', lat: 12.7855, lng: 45.0187 },
    { name: 'صنعاء', country: 'اليمن', lat: 15.3694, lng: 44.1910 },
    { name: 'تعز', country: 'اليمن', lat: 13.5789, lng: 44.0177 },
    { name: 'الحديدة', country: 'اليمن', lat: 14.7978, lng: 42.9545 },
    { name: 'مأرب', country: 'اليمن', lat: 15.4607, lng: 45.3258 },
    { name: 'إب', country: 'اليمن', lat: 13.9667, lng: 44.1667 },
    { name: 'ذمار', country: 'اليمن', lat: 14.5428, lng: 44.4051 },
    { name: 'عتق - شبوة', country: 'اليمن', lat: 14.5377, lng: 46.8319 },
    { name: 'سقطرى (حديبو)', country: 'اليمن', lat: 12.6500, lng: 54.0167 },

    // ── دول الخليج والمنطقة ────────────────────────────────────────────────
    { name: 'الرياض', country: 'السعودية', lat: 24.7136, lng: 46.6753 },
    { name: 'مكة المكرمة', country: 'السعودية', lat: 21.4225, lng: 39.8262 },
    { name: 'المدينة المنورة', country: 'السعودية', lat: 24.5247, lng: 39.5692 },
    { name: 'جدة', country: 'السعودية', lat: 21.4858, lng: 39.1925 },
    { name: 'صلالة', country: 'عمان', lat: 17.0151, lng: 54.0924 },
    { name: 'مسقط', country: 'عمان', lat: 23.5880, lng: 58.3829 },
    { name: 'دبي', country: 'الإمارات', lat: 25.2048, lng: 55.2708 },
    { name: 'الدوحة', country: 'قطر', lat: 25.2854, lng: 51.5310 },
    { name: 'الكويت', country: 'الكويت', lat: 29.3759, lng: 47.9774 },
];

interface DhikrState extends DhikrSettings {
    /** Master toggle — show/hide the ticker bar */
    setEnabled: (enabled: boolean) => void;
    /** Toggle adhan sound on/off */
    setSoundEnabled: (enabled: boolean) => void;
    /** Save the prayer location */
    setLocation: (latitude: number | null, longitude: number | null, city: string) => void;
    /** Set city from preset list */
    setPresetCity: (cityObj: PresetCity) => void;
    /** Set the calculation method */
    setCalculationMethod: (method: DhikrSettings['calculationMethod']) => void;
    /** Remember that we already played the adhan for a prayer (dedupe) */
    markPrayerPlayed: (key: string) => void;
    /** Detect location via browser Geolocation GPS */
    detectGpsLocation: () => Promise<{ success: boolean; city?: string; error?: string }>;
}

// Default to Yemen - Al-Mahrah (Shahan) coordinates
const defaultSettings: DhikrSettings = {
    enabled: true,
    soundEnabled: true,
    latitude: 17.5350, // Shahan, Al-Mahrah, Yemen
    longitude: 52.2470,
    city: 'شحن - المهرة (اليمن)',
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
            setPresetCity: (cityObj) => set({
                latitude: cityObj.lat,
                longitude: cityObj.lng,
                city: `${cityObj.name} (${cityObj.country})`,
            }),
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
                                const res = await fetch(
                                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`
                                );
                                if (res.ok) {
                                    const data = await res.json();
                                    const addr = data.address || {};
                                    cityName = addr.city || addr.town || addr.county || addr.state || addr.country || 'موقعك الحالي';
                                }
                            } catch {
                                // Fallback
                            }

                            set({
                                latitude: lat,
                                longitude: lng,
                                city: cityName,
                            });

                            resolve({ success: true, city: cityName });
                        },
                        (error) => {
                            let msg = 'تعذر جلب موقع GPS';
                            if (error.code === error.PERMISSION_DENIED) {
                                msg = 'تم رفض إذن الوصول للموقع';
                            }
                            resolve({ success: false, error: msg });
                        },
                        { timeout: 10000, enableHighAccuracy: true }
                    );
                });
            },
        }),
        { name: 'al-zahra-dhikr-v3' }
    )
);
