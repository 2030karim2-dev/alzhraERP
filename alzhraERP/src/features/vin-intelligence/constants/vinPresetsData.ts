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

export const POPULAR_ENGINES = [
  '1.3',
  '1.5',
  '1.6',
  '1.8',
  '2.0',
  '2.4',
  '2.5',
  '2.7',
  '3.5',
  '4.0',
  '4.5',
  '5.7',
];

/** Popular models mapped by canonical make for quick contextual picking */
export const POPULAR_MODELS_BY_MAKE: Record<string, Array<{ id: string; label: string }>> = {
  Toyota: [
    { id: 'Corolla', label: 'كورولا' },
    { id: 'Camry', label: 'كامري' },
    { id: 'Hilux', label: 'هايلوكس' },
    { id: 'Land Cruiser 70', label: 'شاص' },
    { id: 'Land Cruiser', label: 'لاندكروزر' },
    { id: 'Prado', label: 'برادو' },
    { id: 'Yaris', label: 'يارس' },
    { id: 'RAV4', label: 'راف فور' },
    { id: 'Fortuner', label: 'فورتشنر' },
    { id: 'Hiace', label: 'هايس' },
    { id: 'Rush', label: 'راش' },
    { id: 'Avalon', label: 'أفالون' },
  ],
  Nissan: [
    { id: 'Sunny', label: 'صني' },
    { id: 'Patrol', label: 'باترول' },
    { id: 'Altima', label: 'ألتيما' },
    { id: 'Maxima', label: 'مكسيما' },
    { id: 'Navara', label: 'نافارا' },
    { id: 'X-Trail', label: 'إكس تريل' },
    { id: 'Pathfinder', label: 'باثفايندر' },
    { id: 'Tiida', label: 'تيدا' },
  ],
  Hyundai: [
    { id: 'Elantra', label: 'إلنترا' },
    { id: 'Sonata', label: 'سوناتا' },
    { id: 'Tucson', label: 'توسان' },
    { id: 'Santa Fe', label: 'سنتافي' },
    { id: 'Accent', label: 'أكسنت' },
    { id: 'Azera', label: 'أزيرا' },
    { id: 'Creta', label: 'كريتا' },
    { id: 'H1', label: 'اتش 1' },
  ],
  Kia: [
    { id: 'Cerato', label: 'سيراتو' },
    { id: 'Sportage', label: 'سبورتاج' },
    { id: 'Sorento', label: 'سورينتو' },
    { id: 'Optima', label: 'أوبتيما / K5' },
    { id: 'Pegas', label: 'بيجاس' },
    { id: 'Rio', label: 'ريو' },
    { id: 'Cadenza', label: 'كادينزا / K8' },
  ],
  Chevrolet: [
    { id: 'Tahoe', label: 'تاهو' },
    { id: 'Suburban', label: 'سوبربان' },
    { id: 'Silverado', label: 'سلفرادو' },
    { id: 'Caprice', label: 'كابريس' },
    { id: 'Malibu', label: 'ماليبو' },
    { id: 'Traverse', label: 'ترافيرس' },
    { id: 'Cruze', label: 'كروز' },
  ],
  GMC: [
    { id: 'Yukon', label: 'يوكون' },
    { id: 'Sierra', label: 'سييرا' },
    { id: 'Acadia', label: 'أكاديا' },
    { id: 'Terrain', label: 'تيرين' },
  ],
  Ford: [
    { id: 'F-150', label: 'اف 150' },
    { id: 'Explorer', label: 'إكسبلورر' },
    { id: 'Expedition', label: 'إكسبديشن' },
    { id: 'Taurus', label: 'تورس' },
    { id: 'Edge', label: 'إيدج' },
    { id: 'Ranger', label: 'رينجر' },
  ],
  Honda: [
    { id: 'Civic', label: 'سيفيك' },
    { id: 'Accord', label: 'أكورد' },
    { id: 'CR-V', label: 'سي ار في' },
    { id: 'Pilot', label: 'بايلوت' },
    { id: 'City', label: 'سيتي' },
  ],
  Isuzu: [
    { id: 'D-Max', label: 'ديماكس' },
    { id: 'MUX', label: 'ام يو اكس' },
    { id: 'NPR', label: 'شاحنة NPR' },
  ],
  Mitsubishi: [
    { id: 'Pajero', label: 'باجيرو' },
    { id: 'Lancer', label: 'لانسر' },
    { id: 'L200', label: 'ال 200' },
    { id: 'Outlander', label: 'أوتلاندر' },
    { id: 'Attrage', label: 'أتراج' },
    { id: 'Canter', label: 'كانتر' },
  ],
  Mazda: [
    { id: 'Mazda 6', label: 'مازدا 6' },
    { id: 'Mazda 3', label: 'مازدا 3' },
    { id: 'CX-9', label: 'سي اكس 9' },
    { id: 'CX-5', label: 'سي اكس 5' },
    { id: 'BT-50', label: 'بي تي 50' },
  ],
  Lexus: [
    { id: 'LX570', label: 'ال اكس 570' },
    { id: 'LX600', label: 'ال اكس 600' },
    { id: 'ES350', label: 'اي اس 350' },
    { id: 'LS460', label: 'ال اس 460' },
    { id: 'RX350', label: 'ار اكس 350' },
    { id: 'GX460', label: 'جي اكس 460' },
  ],
};

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
