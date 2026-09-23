import React, { useState, useEffect } from 'react';
import { Sparkles, Send } from 'lucide-react';
import Button from '../../../ui/base/Button';
import { useAuthStore } from '../../auth/store';
import { debtAiService, type DebtRiskAnalysis } from '../services/debtAiService';
import type { FollowUpDashboardRow } from '../types';
import { RiskMetricsGrid } from './risk/RiskMetricsGrid';
import { RiskDiagnosisBody } from './risk/RiskDiagnosisBody';
import { DebtsModalShell } from './DebtsModalShell';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  row: FollowUpDashboardRow | null;
  onOpenReminder?: (row: FollowUpDashboardRow) => void;
}

export const AIDebtRiskModal: React.FC<Props> = ({ isOpen, onClose, row, onOpenReminder }) => {
  const { user } = useAuthStore();
  const [analysis, setAnalysis] = useState<DebtRiskAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && row) {
      let cancelled = false;
      setIsLoading(true);
      debtAiService.analyzeDebtRisk(row, user?.company_name).then(
        res => {
          if (!cancelled) {
            setAnalysis(res);
            setIsLoading(false);
          }
        },
        () => {
          // فشل التحليل يُترك بلا نتيجة (الواجهة تعرض الحالة الفارغة).
          if (!cancelled) {
            setAnalysis(null);
            setIsLoading(false);
          }
        }
      );
      return () => {
        cancelled = true;
      };
    }
    setAnalysis(null);
    return undefined;
  }, [isOpen, row, user?.company_name]);

  if (!isOpen || !row) return null;

  return (
    <DebtsModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={<Sparkles size={22} />}
      iconClassName="bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-500/20"
      title={`التحليل الذكي للعميل: ${row.party_name}`}
      description="تقييم سلوك السداد، مؤشر المخاطر، واستراتيجية التحصيل المقترحة بالذكاء الاصطناعي"
      size="2xl"
      rounded="rounded-3xl"
      footer={
        <>
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
              className="rounded-xl bg-green-600 px-5 text-xs font-bold text-white shadow-lg shadow-green-600/20 hover:bg-green-700"
              leftIcon={<Send size={14} />}
            >
              صياغة تذكير واتساب ذكي
            </Button>
          )}
        </>
      }
    >
      {isLoading ? (
        <div className="space-y-3 py-16 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
          <p className="animate-pulse text-xs font-bold text-gray-500 dark:text-slate-400">
            جاري تحليل سجل الفواتير وسلوك السداد للعميل عبر الذكاء الاصطناعي...
          </p>
        </div>
      ) : analysis ? (
        <div className="space-y-4">
          <RiskMetricsGrid analysis={analysis} row={row} />
          <RiskDiagnosisBody analysis={analysis} />
        </div>
      ) : null}
    </DebtsModalShell>
  );
};

export default AIDebtRiskModal;
