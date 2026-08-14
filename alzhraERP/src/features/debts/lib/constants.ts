/**
 * Display constants for the debts module — labels, colors, tab definitions.
 * Pure UI mapping, no logic.
 */

export interface BadgeMeta {
  label: string;
  badgeClass: string;
}

export interface ClassificationMeta extends BadgeMeta {
  dotClass: string;
}

export const CLASSIFICATION_META: Record<string, ClassificationMeta> = {
  critical: { label: 'حرج', badgeClass: 'bg-rose-500/10 text-rose-600 border border-rose-500/20', dotClass: 'bg-rose-500' },
  overdue: { label: 'متأخر', badgeClass: 'bg-orange-500/10 text-orange-600 border border-orange-500/20', dotClass: 'bg-orange-500' },
  due_today: { label: 'اليوم', badgeClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/20', dotClass: 'bg-amber-500' },
  due_soon: { label: 'قريب', badgeClass: 'bg-sky-500/10 text-sky-600 border border-sky-500/20', dotClass: 'bg-sky-500' },
  current: { label: 'حالي', badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20', dotClass: 'bg-emerald-500' },
};

export const REMINDER_STATUS_META: Record<string, BadgeMeta> = {
  needs_reminder: { label: 'بحاجة تذكير', badgeClass: 'bg-sky-500/10 text-sky-600 border border-sky-500/20' },
  reminded: { label: 'تم تذكيرهم', badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' },
};

export const PROMISE_STATUS_META: Record<string, BadgeMeta> = {
  pending: { label: 'قائمة', badgeClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/20' },
  completed: { label: 'تمت', badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' },
  broken: { label: 'مخلَفة', badgeClass: 'bg-rose-500/10 text-rose-600 border border-rose-500/20' },
  cancelled: { label: 'ملغاة', badgeClass: 'bg-slate-500/10 text-slate-600 border border-slate-500/20' },
};

export const MESSAGE_STATUS_META: Record<string, BadgeMeta> = {
  sent: { label: 'مرسلة', badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' },
  failed: { label: 'فاشلة', badgeClass: 'bg-rose-500/10 text-rose-600 border border-rose-500/20' },
  cancelled: { label: 'ملغاة', badgeClass: 'bg-slate-500/10 text-slate-600 border border-slate-500/20' },
};

export const TASK_TYPE_META: Record<string, { label: string }> = {
  due_today: { label: 'مستحق اليوم' },
  promise_due: { label: 'وعد اليوم' },
  broken_promise: { label: 'وعد مخلَف' },
  failed_message: { label: 'رسالة فاشلة' },
};
