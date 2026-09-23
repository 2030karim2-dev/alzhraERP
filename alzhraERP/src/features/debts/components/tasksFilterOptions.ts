/** ثوابت واجهة طابور المهام (خيارات الفلاتر وفئة الحقول المشتركة). */

export const SELECT_CLASS =
  'h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-xs font-bold text-[var(--app-text)]';

export const WINDOW_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: 'اليوم وغداً' },
  { value: 3, label: '3 أيام' },
  { value: 7, label: '7 أيام' },
  { value: 14, label: '14 يوماً' },
  { value: 30, label: '30 يوماً' },
];

export const TYPE_FILTERS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'all', label: 'كل الأنواع' },
  { value: 'due_today', label: 'مستحق اليوم' },
  { value: 'promise_due', label: 'وعود مستحقة' },
  { value: 'broken_promise', label: 'وعود مخلَفة' },
  { value: 'follow_up', label: 'إجراءات مجدولة' },
  { value: 'critical_debt', label: 'ديون حرجة' },
  { value: 'failed_message', label: 'رسائل فاشلة' },
];

export const COLLECTOR_ALL = 'all';
export const COLLECTOR_MINE = 'mine';
export const COLLECTOR_NONE = 'none';
