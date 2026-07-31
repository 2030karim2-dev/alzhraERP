import React from 'react';
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// Type icons mapping
export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export const typeConfig: Record<NotificationType, {
    icon: React.ElementType;
    bgColor: string;
    borderColor: string;
    iconColor: string;
    dotColor: string;
}> = {
    info: {
        icon: Info,
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        iconColor: 'text-blue-500',
        dotColor: 'bg-blue-500'
    },
    warning: {
        icon: AlertTriangle,
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800',
        iconColor: 'text-amber-500',
        dotColor: 'bg-amber-500'
    },
    error: {
        icon: XCircle,
        bgColor: 'bg-rose-50 dark:bg-rose-900/20',
        borderColor: 'border-rose-200 dark:border-rose-800',
        iconColor: 'text-rose-500',
        dotColor: 'bg-rose-500'
    },
    success: {
        icon: CheckCircle,
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        iconColor: 'text-emerald-500',
        dotColor: 'bg-emerald-500'
    },
};
