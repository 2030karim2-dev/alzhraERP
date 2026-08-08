import type { FitmentStatus } from '../types';
import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, XCircle } from 'lucide-react';

export const CATEGORY_LABELS_EN: Record<string, string> = {
  'Braking': 'Braking',
  'Cooling': 'Cooling',
  'Electrical': 'Electrical',
  'Air Conditioning': 'Air Conditioning',
  'Steering': 'Steering',
  'Front Suspension': 'Front Suspension',
  'Rear Suspension': 'Rear Suspension',
  'Engine': 'Engine',
  'Fuel / Intake': 'Fuel / Intake',
  'Drivetrain': 'Drivetrain',
  'Mirrors': 'Mirrors',
  'Body': 'Body',
  'Exhaust': 'Exhaust',
  'Filters': 'Filters',
};

export const CATEGORY_LABELS_AR: Record<string, string> = {
  'Braking': 'الفرامل',
  'Cooling': 'نظام التبريد',
  'Electrical': 'النظام الكهربائي',
  'Air Conditioning': 'نظام التكييف',
  'Steering': 'التوجيه',
  'Front Suspension': 'التعليق الأمامي',
  'Rear Suspension': 'التعليق الخلفي',
  'Engine': 'المحرك',
  'Fuel / Intake': 'الوقود والسحب',
  'Drivetrain': 'نظام الدفع',
  'Mirrors': 'المرايا',
  'Body': 'الهيكل',
  'Exhaust': 'العادم',
  'Filters': 'الفلاتر',
};

export function getCategoryLabel(cat: string, lang?: string): string {
  const isArabic = lang === 'ar' || (!lang && document.documentElement.dir === 'rtl');
  return (isArabic ? CATEGORY_LABELS_AR[cat] : CATEGORY_LABELS_EN[cat]) || cat;
}

interface FitmentConfig {
  icon: React.ReactNode;
  labelKey: string;
  cls: string;
}

/** Translation keys for fitment status labels */
export const FITMENT_LABEL_KEYS: Record<FitmentStatus, string> = {
  VERIFIED: 'vin_fitment_verified',
  INFERRED: 'vin_fitment_inferred',
  UNKNOWN: 'vin_fitment_unknown',
  NOT_COMPATIBLE: 'vin_fitment_not_compatible',
};

export const FITMENT_CONFIG: Record<FitmentStatus, FitmentConfig> = {
  VERIFIED: {
    icon: <CheckCircle2 size={11} className="text-emerald-500" />,
    labelKey: 'vin_fitment_verified',
    cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  },
  INFERRED: {
    icon: <AlertTriangle size={11} className="text-amber-500" />,
    labelKey: 'vin_fitment_inferred',
    cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  },
  UNKNOWN: {
    icon: <HelpCircle size={11} className="text-slate-400" />,
    labelKey: 'vin_fitment_unknown',
    cls: 'bg-slate-50 text-gray-500 dark:bg-slate-800 dark:text-slate-400',
  },
  NOT_COMPATIBLE: {
    icon: <XCircle size={11} className="text-rose-400" />,
    labelKey: 'vin_fitment_not_compatible',
    cls: 'bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400',
  },
};
