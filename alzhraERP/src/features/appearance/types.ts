
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeCSSVars {
  '--app-bg': string;
  '--app-surface': string;
  '--app-surface-hover': string;
  '--app-border': string;
  '--app-text': string;
  '--app-text-secondary': string;
  '--accent': string;
  '--glass-blur'?: string;
  '--glass-opacity'?: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: string[]; // مصفوفة الألوان التي تظهر في الجانب الأيسر للبطاقة
  previewColor: string; // اللون الرئيسي للمعاينة
  isDark: boolean; // هل الثيم مخصص للوضع الليلي؟
  accent?: string; // لون التمييز الرئيسي
  category?: 'premium' | 'classic' | 'beige' | 'royal' | 'accounting' | 'nature' | 'bold' | 'corporate' | 'night' | 'seasonal' | 'artistic' | 'industry' | 'glass' | 'bento'; // تصنيف الثيم
  emoji?: string; // رمز تعبيري للثيم
  cssVars: ThemeCSSVars; // متغيرات CSS التي تُطبق فعلياً (للتوافق مع الثيمات القديمة)
  light?: ThemeCSSVars; // متغيرات الوضع النهاري للثيمات الاحترافية
  dark?: ThemeCSSVars; // متغيرات الوضع الليلي للثيمات الاحترافية
}

export type AppearanceTab = 'premium' | 'ready' | 'colors' | 'fonts' | 'effects';
