/**
 * Dhikr & Prayer Ticker — adhkar list.
 * Short phrases that fit comfortably on a single ticker line.
 */
import type { DhikrItem } from './types';

export const DHIKR_LIST: DhikrItem[] = [
    { id: 'subhanallah', text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ' },
    { id: 'alhamdulillah', text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
    { id: 'la-ilaha', text: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ' },
    { id: 'allahu-akbar', text: 'اللهُ أَكْبَرُ كَبِيرًا وَالْحَمْدُ لِلَّهِ كَثِيرًا' },
    { id: 'astaghfirullah', text: 'أَسْتَغْفِرُ اللهَ وَأَتُوبُ إِلَيْهِ' },
    { id: 'hawqala', text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ' },
    { id: 'salat-nabi', text: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ' },
    { id: 'subhanAllah-wa-bihamdih-100', text: 'سُبْحَانَ اللهِ الْعَظِيمِ وَبِحَمْدِهِ' },
    { id: 'dhikr-morning-1', text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ' },
    { id: 'dhikr-morning-2', text: 'رَضِيتُ بِاللهِ رَبًّا وَبِالْإِسْلَامِ دِينًا وَبِمُحَمَّدٍ نَبِيًّا' },
    { id: 'dhikr-morning-3', text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ' },
    { id: 'dhikr-evening-1', text: 'أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ' },
    { id: 'dhikr-evening-2', text: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي' },
];

/** Prayer display labels (Arabic) */
export const PRAYER_LABELS: Record<string, string> = {
    fajr: 'الفجر',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء',
};
