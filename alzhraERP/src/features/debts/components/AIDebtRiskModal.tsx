import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  X,
  Send,
  Lightbulb,
  Layers,
} from 'lucide-react';
import Button from '../../../ui/base/Button';
import { cn } from '../../../core/utils';
import { formatCurrency } from '../../../core/utils/currencyUtils';
import { useAuthStore } from '../../auth/store';
import { debtAiService, DebtRiskAnalysis } from '../services/debtAiService';
import type { FollowUpDashboardRow } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  row: FollowUpDashboardRow | null;
  onOpenReminder?: (row: FollowUpDashboardRow) => void;
}

const RISK_LEVEL_CONFIG: Record<
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

export const AIDebtRiskModal: React.FC<Props> = ({
  isOpen,
  onClose,
  row,
  onOpenReminder,
}) => {
  const { user } = useAuthStore();
  const [analysis, setAnalysis] = useState<DebtRiskAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && row) {
      setIsLoading(true);
      debtAiService
        .analyzeDebtRisk(row, user?.company_name)
        .then((res) => {
          setAnalysis(res);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setAnalysis(null);
    }
  }, [isOpen, row, user?.company_name]);

  if (!isOpen || !row) return null;

  const riskConfig = analysis
    ? RISK_LEVEL_CONFIG[analysis.riskLevel] || RISK_LEVEL_CONFIG.medium
    : RISK_LEVEL_CONFIG.medium;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/20">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                التحليل الذكي للعميل: {row.party_name}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                تقييم سلوك السداد، مؤشر المخاطر، واستراتيجية التحصيل المقترحة بالذكاء الاصطناعي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 animate-pulse">
                جاري تحليل سجل الفواتير وسلوك السداد للعميل عبر الذكاء الاصطناعي...
              </p>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              {/* Score & Probability Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Risk Score */}
                <div
                  className={cn(
                    'p-4 rounded-2xl border flex flex-col justify-between',
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
                    <span className={cn('text-2xl font-black font-mono', riskConfig.text)}>
                      {analysis.riskScore}/100
                    </span>
                    <span className={cn('block text-[11px] font-bold mt-0.5', riskConfig.text)}>
                      {riskConfig.label}
                    </span>
                  </div>
                </div>

                {/* Recovery Probability */}
                <div className="p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      احتمالية التحصيل
                    </span>
                    <TrendingUp size={18} className="text-blue-500" />
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-black font-mono text-blue-950 dark:text-blue-200">
                      {analysis.recoveryProbability}%
                    </span>
                    <span className="block text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">
                      بناءً على التفاعل وتاريخ السداد
                    </span>
                  </div>
                </div>

                {/* Outstanding Balance */}
                <div className="p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-950/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      الرصيد القائم
                    </span>
                    <Layers size={18} className="text-gray-400" />
                  </div>
                  <div className="mt-2">
                    <span className="text-lg font-black font-mono text-gray-900 dark:text-slate-100">
                      {formatCurrency(Number(row.outstanding_balance), row.currency_code)}
                    </span>
                    <span className="block text-[10px] text-orange-600 dark:text-orange-400 mt-0.5 font-bold">
                      متأخر منذ {row.days_overdue} يوم
                    </span>
                  </div>
                </div>
              </div>

              {/* Diagnosis Summary */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-950/30 border border-gray-100 dark:border-slate-800/80">
                <h4 className="text-xs font-extrabold text-gray-900 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-500" />
                  تشخيص الذكاء الاصطناعي للحالة
                </h4>
                <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                  {analysis.summary}
                </p>
              </div>

              {/* Key Risk Factors */}
              {analysis.keyFactors && analysis.keyFactors.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
                  <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-600" />
                    عوامل الخطر الرئيسية
                  </h4>
                  <ul className="space-y-1.5 text-xs text-amber-950 dark:text-amber-200">
                    {analysis.keyFactors.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Collection Strategy */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/70 dark:border-blue-900/40">
                <h4 className="text-xs font-extrabold text-blue-950 dark:text-blue-200 mb-1.5 flex items-center gap-1.5">
                  <Lightbulb size={14} className="text-blue-600" />
                  الاستراتيجية الموصى بها
                </h4>
                <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed font-bold">
                  {analysis.recommendedStrategy}
                </p>
                {analysis.paymentPlanSuggestion && (
                  <div className="mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-800/40 text-[11px] text-blue-800 dark:text-blue-300">
                    💡 <span className="font-extrabold">اقتراح الجدولة: </span>
                    {analysis.paymentPlanSuggestion}
                  </div>
                )}
              </div>

              {/* Immediate Suggested Actions */}
              {analysis.suggestedActions && analysis.suggestedActions.length > 0 && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
                  <h4 className="text-xs font-extrabold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-emerald-500" />
                    الإجراءات الفورية المقترحة
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {analysis.suggestedActions.map((act, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-[11px] font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5"
                      >
                        <span className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-[10px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50 flex justify-between items-center">
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs font-bold">
            إغلاق
          </Button>

          {onOpenReminder && (
            <Button
              type="button"
              onClick={() => {
                onClose();
                onOpenReminder(row);
              }}
              className="px-5 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
              leftIcon={<Send size={14} />}
            >
              صياغة تذكير واتساب ذكي
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIDebtRiskModal;
