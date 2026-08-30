import type { VinDecodeMode } from '../types';
import { ScanLine, Sparkles, Database } from 'lucide-react';

export const MODES: Array<{ id: VinDecodeMode; label: string; icon: typeof ScanLine }> = [
  { id: 'hybrid', label: 'تلقائي (vPIC + داخلي + AI)', icon: Sparkles },
  { id: 'db', label: 'بنيوي (قاعدة البيانات)', icon: Database },
  { id: 'ai', label: 'ذكاء اصطناعي فقط', icon: Sparkles },
];

/** Popular manufacturers — CANONICAL English ids persisted, Arabic shown (M1 fix) */
export const POPULAR_MAKE_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'Toyota', label: 'تويوتا' },
  { id: 'Nissan', label: 'نيسان' },
  { id: 'Hyundai', label: 'هيونداي' },
  { id: 'Kia', label: 'كيا' },
  { id: 'Chevrolet', label: 'شفروليه' },
  { id: 'GMC', label: 'جمس' },
  { id: 'Ford', label: 'فورد' },
  { id: 'Honda', label: 'هوندا' },
  { id: 'Isuzu', label: 'إيسوزو' },
  { id: 'Mitsubishi', label: 'ميتسوبيشي' },
  { id: 'Mazda', label: 'مازدا' },
  { id: 'Lexus', label: 'لكزس' },
];

/** Popular markets/specs */
export const POPULAR_MARKETS = ['خليجي', 'وارد أمريكي', 'وارد ياباني', 'سعودي', 'كوري', 'أوروبي'];

/** Quick presets for popular vehicles in Yemen & Gulf market
 *  (make/model stored as CANONICAL English per migration 20260826000002) */
export const QUICK_VEHICLE_PRESETS = [
  {
    label: 'كورولا (2001-2007)',
    make: 'Toyota',
    model: 'Corolla',
    yStart: '2001',
    yEnd: '2007',
    market: 'خليجي',
    engine: '1.8',
    trans: 'تماتيك',
    drive: 'سنجل',
  },
  {
    label: 'هايلوكس (2006-2015)',
    make: 'Toyota',
    model: 'Hilux',
    yStart: '2006',
    yEnd: '2015',
    market: 'خليجي',
    engine: '2.7',
    trans: 'عادي',
    drive: 'دبل',
  },
  {
    label: 'شاص (2007-2022)',
    make: 'Toyota',
    model: 'Land Cruiser 70',
    yStart: '2007',
    yEnd: '2022',
    market: 'خليجي',
    engine: '4.0',
    trans: 'عادي',
    drive: 'دبل',
  },
  {
    label: 'كامري (2003-2006)',
    make: 'Toyota',
    model: 'Camry',
    yStart: '2003',
    yEnd: '2006',
    market: 'خليجي',
    engine: '2.4',
    trans: 'تماتيك',
    drive: 'سنجل',
  },
  {
    label: 'يارس (2006-2013)',
    make: 'Toyota',
    model: 'Yaris',
    yStart: '2006',
    yEnd: '2013',
    market: 'خليجي',
    engine: '1.3',
    trans: 'تماتيك',
    drive: 'سنجل',
  },
  {
    label: 'سنتافي (2013-2018)',
    make: 'Hyundai',
    model: 'Santa Fe',
    yStart: '2013',
    yEnd: '2018',
    market: 'وارد أمريكي',
    engine: '3.3',
    trans: 'تماتيك',
    drive: 'دبل',
  },
  {
    label: 'توسان (2016-2020)',
    make: 'Hyundai',
    model: 'Tucson',
    yStart: '2016',
    yEnd: '2020',
    market: 'خليجي',
    engine: '2.0',
    trans: 'تماتيك',
    drive: 'سنجل',
  },
];

export const SOURCE_LABELS: Record<string, { label: string; cls: string }> = {
  vpic: {
    label: 'vPIC رسمي ✓',
    cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  },
  db: {
    label: 'قاعدة البيانات ✓',
    cls: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
  },
  manual: {
    label: 'إدخال يدوي / كتالوج ✓',
    cls: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
  },
  ai: {
    label: 'ذكاء اصطناعي ⚠',
    cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  },
};

export const CONFIDENCE_LABELS: Record<string, { label: string; cls: string }> = {
  high: {
    label: 'عالية',
    cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  },
  medium: {
    label: 'متوسطة',
    cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  },
  low: {
    label: 'منخفضة',
    cls: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
  },
};
