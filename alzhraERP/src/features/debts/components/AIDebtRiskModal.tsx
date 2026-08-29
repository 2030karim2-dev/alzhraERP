import React, { useState, useEffect } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import Button from '../../../ui/base/Button';
import { useAuthStore } from '../../auth/store';
import { debtAiService, type DebtRiskAnalysis } from '../services/debtAiService';
import type { FollowUpDashboardRow } from '../types';
import { RiskMetricsGrid } from './risk/RiskMetricsGrid';
import { RiskDiagnosisBody } from './risk/RiskDiagnosisBody';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  row: FollowUpDashboardRow | null;
  onOpenReminder?: (row: FollowUpDashboardRow) => void;
}

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[var(--app-surface)] w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
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
              <RiskMetricsGrid analysis={analysis} row={row} />
              <RiskDiagnosisBody analysis={analysis} />
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
