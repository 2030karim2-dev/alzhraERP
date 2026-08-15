import type { CommissionCalculation, CommissionCalculationMethod, CommissionPeriodState, CommissionPlan } from '../types';

export const periodStateLabels: Record<CommissionPeriodState, string> = {
  open: 'مفتوحة',
  calculating: 'جارٍ الحساب',
  calculated: 'تم الحساب',
  under_review: 'قيد المراجعة',
  approved: 'معتمدة',
  locked: 'مقفلة',
  paid: 'مدفوعة',
};

export const planBasisLabels: Record<CommissionPlan['calculation_basis'], string> = {
  sales: 'المبيعات',
  gross_profit: 'مجمل الربح',
  collected_amount: 'المحصل',
  hybrid: 'مختلط',
};

export const calculationMethodLabels: Record<CommissionCalculationMethod, string> = {
  percentage: 'نسبة مئوية',
  fixed_amount: 'مبلغ ثابت',
  tiered: 'شرائح تصاعدية',
};

export const calculationStatusLabels: Record<CommissionCalculation['status'], string> = {
  draft: 'مسودة',
  calculated: 'محسوب',
  eligible: 'مؤهل',
  approved: 'معتمد',
  partially_paid: 'مدفوع جزئياً',
  paid: 'مدفوع',
  cancelled: 'ملغى',
  reversed: 'معكوس',
};

export function formatCommissionDate(value: string | null): string {
  return value === null || value.length === 0 ? '—' : new Intl.DateTimeFormat('ar-SA-u-nu-latn', { dateStyle: 'medium' }).format(new Date(value));
}

export function formatCommissionMoney(value: number, currency = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA-u-nu-latn', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

export function formatCommissionNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
