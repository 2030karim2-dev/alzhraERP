import React from 'react';
import { ArrowRightLeft, CheckCircle, Clock, Send, XCircle } from 'lucide-react';
import type { QuotationStatus } from '../../../sales/types/quotation';

export const STATUS_CONFIG: Record<
  QuotationStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: {
    label: 'مسودة',
    color: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
    icon: <Clock size={12} />,
  },
  sent: {
    label: 'مُرسل',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <Send size={12} />,
  },
  pending: {
    label: 'قيد المراجعة',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: <Clock size={12} />,
  },
  submitted: {
    label: 'مُقدم من المورد',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: <Send size={12} />,
  },
  accepted: {
    label: 'مقبول',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: <CheckCircle size={12} />,
  },
  rejected: {
    label: 'مرفوض',
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    icon: <XCircle size={12} />,
  },
  expired: {
    label: 'منتهي',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: <Clock size={12} />,
  },
  converted: {
    label: 'تم التحويل',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    icon: <ArrowRightLeft size={12} />,
  },
};
