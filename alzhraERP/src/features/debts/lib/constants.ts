/**
 * Display constants for the debts module — labels, colors, tab definitions.
 * Pure UI mapping, no logic.
 */
import type { EscalationStage } from '../types';

export interface BadgeMeta {
  label: string;
  badgeClass: string;
}

export interface ClassificationMeta extends BadgeMeta {
  dotClass: string;
}

export const CLASSIFICATION_META: Record<string, ClassificationMeta> = {
  critical: {
    label: 'حرج',
    badgeClass: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
    dotClass: 'bg-rose-500',
  },
  overdue: {
    label: 'متأخر',
    badgeClass: 'bg-orange-500/10 text-orange-600 border border-orange-500/20',
    dotClass: 'bg-orange-500',
  },
  due_today: {
    label: 'اليوم',
    badgeClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    dotClass: 'bg-amber-500',
  },
  due_soon: {
    label: 'قريب',
    badgeClass: 'bg-sky-500/10 text-sky-600 border border-sky-500/20',
    dotClass: 'bg-sky-500',
  },
  current: {
    label: 'حالي',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
    dotClass: 'bg-emerald-500',
  },
};

export const REMINDER_STATUS_META: Record<string, BadgeMeta> = {
  needs_reminder: {
    label: 'بحاجة تذكير',
    badgeClass: 'bg-sky-500/10 text-sky-600 border border-sky-500/20',
  },
  reminded: {
    label: 'تم تذكيرهم',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  },
};

export const PROMISE_STATUS_META: Record<string, BadgeMeta> = {
  pending: {
    label: 'قائمة',
    badgeClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  },
  completed: {
    label: 'تمت',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  },
  broken: { label: 'مخلَفة', badgeClass: 'bg-rose-500/10 text-rose-600 border border-rose-500/20' },
  cancelled: {
    label: 'ملغاة',
    badgeClass: 'bg-slate-500/10 text-slate-600 border border-slate-500/20',
  },
};

export const MESSAGE_STATUS_META: Record<string, BadgeMeta> = {
  sent: {
    label: 'مرسلة',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  },
  failed: { label: 'فاشلة', badgeClass: 'bg-rose-500/10 text-rose-600 border border-rose-500/20' },
  cancelled: {
    label: 'ملغاة',
    badgeClass: 'bg-slate-500/10 text-slate-600 border border-slate-500/20',
  },
};

export const TASK_TYPE_META: Record<string, { label: string }> = {
  due_today: { label: 'مستحق اليوم' },
  promise_due: { label: 'وعد اليوم' },
  broken_promise: { label: 'وعد مخلَف' },
  failed_message: { label: 'رسالة فاشلة' },
};

/**
 * تسمية عربية آمنة للتصنيف — بلا فهرسة كائن بمفتاح متغيّر
 * (يمنع تنبيه security/detect-object-injection في الملفات الجديدة).
 */
export const classificationLabel = (classification: string): string => {
  switch (classification) {
    case 'critical':
      return CLASSIFICATION_META.critical.label;
    case 'overdue':
      return CLASSIFICATION_META.overdue.label;
    case 'due_today':
      return CLASSIFICATION_META.due_today.label;
    case 'due_soon':
      return CLASSIFICATION_META.due_soon.label;
    case 'current':
      return CLASSIFICATION_META.current.label;
    default:
      return classification;
  }
};

/** تسمية عربية آمنة لحالة التذكير (نفس المنع أعلاه). */
export const reminderStatusLabel = (status: string): string => {
  switch (status) {
    case 'reminded':
      return REMINDER_STATUS_META.reminded.label;
    case 'needs_reminder':
      return REMINDER_STATUS_META.needs_reminder.label;
    default:
      return status;
  }
};

/** وصف مرحلة التصعيد — تسميات موجزة ودلالات لونية ثابتة. */
export const ESCALATION_META: Record<EscalationStage, BadgeMeta> = {
  monitor: {
    label: 'مراقبة',
    badgeClass: 'bg-slate-500/10 text-slate-500 border border-slate-500/20',
  },
  reminder: {
    label: 'تذكير',
    badgeClass: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  },
  call: {
    label: 'اتصال',
    badgeClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  },
  visit: {
    label: 'زيارة',
    badgeClass: 'bg-orange-500/10 text-orange-600 border border-orange-500/20',
  },
  legal: {
    label: 'قانوني',
    badgeClass: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
  },
};

/**
 * ختم (تسمية + فئة) لمرحلة التصعيد — فهرسة آمنة عبر switch (بلا كائن بمفتاح
 * متغيّر، فيُمنع تنبيه security/detect-object-injection). مرحلة غير معروفة
 * أو null تعود بلا فئة مع بقاء النص الخام (null → نص فارغ)، مكافئةً
 * للسلوك السابق `?.` و `??`.
 */
export const escalationBadgeMeta = (stage: string | null): BadgeMeta => {
  switch (stage) {
    case 'monitor':
      return ESCALATION_META.monitor;
    case 'reminder':
      return ESCALATION_META.reminder;
    case 'call':
      return ESCALATION_META.call;
    case 'visit':
      return ESCALATION_META.visit;
    case 'legal':
      return ESCALATION_META.legal;
    default:
      return { label: stage ?? '', badgeClass: '' };
  }
};

/** تسمية مرحلة التصعيد (مختصر لـ escalationBadgeMeta().label). */
export const escalationLabel = (stage: string): string => escalationBadgeMeta(stage).label;

/**
 * ختم التصنيف عبر switch — بلا فهرسة كائن بمفتاح متغيّر (منع
 * security/detect-object-injection في الملفات الجديدة)، مع افتراضي «حالي».
 */
export const classificationMeta = (classification: string): ClassificationMeta => {
  switch (classification) {
    case 'critical':
      return CLASSIFICATION_META.critical;
    case 'overdue':
      return CLASSIFICATION_META.overdue;
    case 'due_today':
      return CLASSIFICATION_META.due_today;
    case 'due_soon':
      return CLASSIFICATION_META.due_soon;
    case 'current':
      return CLASSIFICATION_META.current;
    default:
      return CLASSIFICATION_META.current;
  }
};

/** ختم حالة التذكير عبر switch — مع افتراضي «بحاجة تذكير». */
export const reminderStatusMeta = (status: string): BadgeMeta => {
  switch (status) {
    case 'reminded':
      return REMINDER_STATUS_META.reminded;
    case 'needs_reminder':
      return REMINDER_STATUS_META.needs_reminder;
    default:
      return REMINDER_STATUS_META.needs_reminder;
  }
};
