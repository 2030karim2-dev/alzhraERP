import React from 'react';
import { ShieldAlert, TrendingUp, Layers } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { formatCurrency } from '../../../../core/utils/currencyUtils';
import type { DebtRiskAnalysis } from '../../services/debtAiService';
import type { FollowUpDashboardRow } from '../../types';

export const RISK_LEVEL_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; iconColor: string }
> = {
  critical: {
    label: 'مخاطرة حرجة جداً',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    iconColor: 'text-rose-500',
  },
  high: {
    label: 'مخاطرة مرتفعة',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    iconColor: 'text-orange-500',
  },
  medium: {
    label: 'مخاطرة متوسطة',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-500',
  },
  low: {
    label: 'مخاطرة منخفضة / آمن',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    iconColor: 'text-emerald-500',
  },
};

interface RiskMetricsGridProps {
  analysis: DebtRiskAnalysis;
  row: FollowUpDashboardRow;
}

export const RiskMetricsGrid: React.FC<RiskMetricsGridProps> = ({ analysis, row }) => {
  const riskConfig = RISK_LEVEL_CONFIG[analysis.riskLevel] || RISK_LEVEL_CONFIG.medium;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Risk Score */}
      <div
        className={cn(
          'flex flex-col justify-between rounded-2xl border p-4',
          riskConfig.bg,
          riskConfig.border
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            مؤشر المخاطرة
          </span>
          <ShieldAlert size={18} className={riskConfig.iconColor} />
        </div>
        <div className="mt-2">
          <span className={cn('font-mono text-2xl font-black', riskConfig.text)}>
            {analysis.riskScore}/100
          </span>
          <span className={cn('mt-0.5 block text-[11px] font-bold', riskConfig.text)}>
            {riskConfig.label}
          </span>
        </div>
      </div>

      {/* Recovery Probability */}
      <div className="flex flex-col justify-between rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            احتمالية التحصيل
          </span>
          <TrendingUp size={18} className="text-blue-500" />
        </div>
        <div className="mt-2">
          <span className="font-mono text-2xl font-black text-blue-950 dark:text-blue-200">
            {analysis.recoveryProbability}%
          </span>
          <span className="mt-0.5 block text-[10px] text-blue-700 dark:text-blue-300">
            بناءً على التفاعل وتاريخ السداد
          </span>
        </div>
      </div>

      {/* Outstanding Balance */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            الرصيد القائم
          </span>
          <Layers size={18} className="text-slate-400" />
        </div>
        <div className="mt-2">
          <span className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(Number(row.outstanding_balance), row.currency_code)}
          </span>
          <span className="mt-0.5 block text-[10px] font-bold text-amber-600 dark:text-amber-400">
            متأخر منذ {row.days_overdue} يوم
          </span>
        </div>
      </div>
    </div>
  );
};
