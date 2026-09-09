import type React from 'react';
import {
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Package,
  DollarSign,
  Bell,
  Sparkles,
  Wallet,
} from 'lucide-react';

// Type icons mapping
export type NotificationType = 'info' | 'warning' | 'error' | 'success';
export type NotificationCategory = 'inventory' | 'debt' | 'sales' | 'finance' | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export const typeConfig: Record<
  NotificationType,
  {
    icon: React.ElementType;
    bgColor: string;
    borderColor: string;
    iconColor: string;
    dotColor: string;
  }
> = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-500',
    dotColor: 'bg-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-500',
    dotColor: 'bg-amber-500',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-rose-50 dark:bg-rose-900/20',
    borderColor: 'border-rose-200 dark:border-rose-800',
    iconColor: 'text-rose-500',
    dotColor: 'bg-rose-500',
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    iconColor: 'text-emerald-500',
    dotColor: 'bg-emerald-500',
  },
};

export const categoryConfig: Record<
  NotificationCategory,
  {
    label: string;
    icon: React.ElementType;
    badgeBg: string;
    badgeText: string;
    border: string;
  }
> = {
  inventory: {
    label: 'المخزون',
    icon: Package,
    badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    badgeText: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200/60 dark:border-amber-800/40',
  },
  debt: {
    label: 'الديون',
    icon: DollarSign,
    badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    badgeText: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200/60 dark:border-rose-800/40',
  },
  sales: {
    label: 'المبيعات',
    icon: Sparkles,
    badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200/60 dark:border-emerald-800/40',
  },
  finance: {
    label: 'المالية',
    icon: Wallet,
    badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    badgeText: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200/60 dark:border-blue-800/40',
  },
  system: {
    label: 'النظام',
    icon: Bell,
    badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    badgeText: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200/60 dark:border-purple-800/40',
  },
};
