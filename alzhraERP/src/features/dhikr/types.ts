/**
 * Dhikr & Prayer Ticker — shared types
 */

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type CalculationMethodKey = 'qatar' | 'ummAlQura' | 'muslimWorldLeague';

export type AdhanReciterId = 'makkah' | 'madinah' | 'abdulbasit' | 'quds' | 'takbeerat' | 'synth';

export interface DhikrItem {
  id: string;
  text: string;
}

export interface PrayerTimeEntry {
  name: PrayerName;
  label: string;
  /** Milliseconds since epoch for the adhan of this prayer today */
  time: number;
}

export interface PrayerTimesResult {
  /** Today's five adhan times (sorted ascending) */
  today: PrayerTimeEntry[];
  /** The next upcoming adhan */
  next: PrayerTimeEntry | null;
  /** Minutes until the next adhan (null when none today) */
  nextInMinutes: number | null;
}

export interface DhikrSettings {
  /** Master toggle for the whole ticker bar */
  enabled: boolean;
  /** Whether the adhan sound plays when a prayer time is reached */
  soundEnabled: boolean;
  /** Volume of the adhan sound from 0 to 1 (default 0.9) */
  volume?: number | undefined;
  /** Selected reciter / adhan voice */
  adhanReciter?: AdhanReciterId | undefined;
  latitude: number | null;
  longitude: number | null;
  city: string;
  calculationMethod: CalculationMethodKey;
  /** `${prayerName}:${yyyy-mm-dd}` of the last adhan we already sounded */
  lastPrayerPlayed: string;
}
