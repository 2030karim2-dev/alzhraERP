import type { FitmentStatus } from '../types';
import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, XCircle } from 'lucide-react';

export const CATEGORY_LABELS: Record<string, string> = {
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
};

interface FitmentConfig {
  icon: React.ReactNode;
  label: string;
  cls: string;
}

export const FITMENT_CONFIG: Record<FitmentStatus, FitmentConfig> = {
  VERIFIED: {
    icon: <CheckCircle2 size={11} className="text-emerald-500" />,
    label: 'VERIFIED',
    cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  },
  INFERRED: {
    icon: <AlertTriangle size={11} className="text-amber-500" />,
    label: 'Inferred',
    cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  },
  UNKNOWN: {
    icon: <HelpCircle size={11} className="text-slate-400" />,
    label: 'Unknown',
    cls: 'bg-slate-50 text-gray-500 dark:bg-slate-800 dark:text-slate-400',
  },
  NOT_COMPATIBLE: {
    icon: <XCircle size={11} className="text-rose-400" />,
    label: 'Not Compatible',
    cls: 'bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400',
  },
};
