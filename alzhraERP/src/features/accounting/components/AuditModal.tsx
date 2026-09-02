import { logger } from '../../../core/utils/logger';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../../core/utils';
import { useAuditJournals } from '../hooks/useReports';
import { useFeedbackStore } from '../../../features/feedback/store';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import Card from '../../../ui/base/Card';

interface AuditResult {
  id: string;
  date: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  status: 'balanced' | 'unbalanced' | 'error';
  message?: string;
}

interface Props {
  onClose: () => void;
}

export const AuditModal: React.FC<Props> = ({ onClose }) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const { data: entries, isLoading, error: fetchError } = useAuditJournals(isAuditing);
  const { showToast } = useFeedbackStore();

  const [results, setResults] = useState<AuditResult[]>([]);
  const [summary, setSummary] = useState({ total: 0, unbalanced: 0, errors: 0 });

  useEffect(() => {
    if (!isAuditing || isLoading) return;

    if (fetchError) {
      logger.error('AuditModal', 'Audit failed:', fetchError);
      const err = fetchError;
      showToast('فشل التدقيق: ' + err.message, 'error');
      setIsAuditing(false);
      return;
    }

    const auditResults: AuditResult[] = [];
    let unbalancedCount = 0;
    let errorCount = 0;

    entries?.forEach((entry: any) => {
      let totalDebit = 0;
      let totalCredit = 0;

      if (entry.journal_entry_lines) {
        totalDebit = entry.journal_entry_lines.reduce(
          (sum: number, line: any) => sum + Number(line.debit_amount),
          0
        );
        totalCredit = entry.journal_entry_lines.reduce(
          (sum: number, line: any) => sum + Number(line.credit_amount),
          0
        );
      }

      const diff = Math.abs(totalDebit - totalCredit);
      // Same tolerance as the DB `check_journal_balance` deferred trigger (0.001)
      const isBalanced = diff < 0.001;

      if (!isBalanced) {
        unbalancedCount++;
        auditResults.push({
          id: entry.id,
          date: entry.entry_date,
          description: entry.description || 'بدون بيان',
          debit_amount: totalDebit,
          credit_amount: totalCredit,
          status: 'unbalanced',
          message: `الفرق: ${formatCurrency(diff)}`,
        });
      } else if (totalDebit === 0 && totalCredit === 0) {
        errorCount++;
        auditResults.push({
          id: entry.id,
          date: entry.entry_date,
          description: entry.description || 'بدون بيان',
          debit_amount: 0,
          credit_amount: 0,
          status: 'error',
          message: 'قيد فارغ (بقيمة صفر)',
        });
      }
    });

    setResults(auditResults);
    setSummary({ total: entries?.length || 0, unbalanced: unbalancedCount, errors: errorCount });
    setIsAuditing(false); // Stop the loading state after processing
  }, [isAuditing, isLoading, entries, fetchError, showToast]);

  const runAudit = () => {
    setResults([]);
    setSummary({ total: 0, unbalanced: 0, errors: 0 });
    setIsAuditing(true);
  };

  const footer = (
    <Button variant="primary" size="md" onClick={runAudit} disabled={isLoading}>
      {isLoading ? 'جاري الفحص...' : 'إعادة الفحص'}
    </Button>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      icon={ShieldCheck}
      title="فحص سلامة النظام المحاسبي"
      description="مراجعة توازن القيود واكتشاف الأخطاء"
      size="2xl"
      footer={footer}
    >
      <div className="space-y-4">
        {!isLoading && results.length === 0 && summary.total === 0 && (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <ShieldCheck size={64} className="mb-4 text-[var(--app-text-secondary)] opacity-40" />
            <h3 className="text-base font-bold text-[var(--app-text)]">النظام جاهز للفحص</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--app-text-secondary)]">
              اضغط على زر "بدء الفحص" لمراجعة جميع القيود المحاسبية والتأكد من توازن الدائن والمدين.
            </p>
            <Button
              onClick={runAudit}
              variant="primary"
              size="md"
              className="mt-6"
              leftIcon={<ShieldCheck size={18} />}
            >
              بدء الفحص الشامل
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="animate-in fade-in flex h-64 flex-col items-center justify-center text-center">
            <Loader2 size={48} className="mb-4 animate-spin text-indigo-600" />
            <h3 className="text-base font-bold text-[var(--app-text)]">جاري فحص القيود...</h3>
            <p className="text-sm text-[var(--app-text-secondary)]">
              يرجى الانتظار، يتم تحليل البيانات
            </p>
          </div>
        )}

        {!isLoading && summary.total > 0 && (
          <div className="animate-in slide-in-from-bottom-4 space-y-4 duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-3 max-md:gap-3 md:grid-cols-3">
              <Card variant="ledger" className="p-3 max-md:p-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)]">
                  إجمالي القيود
                </span>
                <div className="mt-1 text-2xl font-bold text-[var(--app-text)] max-md:text-lg">
                  {summary.total}
                </div>
              </Card>
              <Card
                variant="ledger"
                className="border-rose-200 p-3 dark:border-rose-900/50 max-md:p-2"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
                  غير متوازنة (Unbalanced)
                </span>
                <div className="mt-1 text-2xl font-bold text-rose-600 max-md:text-lg">
                  {summary.unbalanced}
                </div>
              </Card>
              <Card
                variant="ledger"
                className="border-amber-200 p-3 dark:border-amber-900/50 max-md:p-2"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                  أخطاء (Errors)
                </span>
                <div className="mt-1 text-2xl font-bold text-amber-600 max-md:text-lg">
                  {summary.errors}
                </div>
              </Card>
            </div>

            {/* Results Table */}
            <div className="overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] p-3 max-md:p-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
                  {results.length > 0 ? (
                    <AlertTriangle size={18} className="text-rose-500" />
                  ) : (
                    <CheckCircle size={18} className="text-emerald-500" />
                  )}
                  نتائج الفحص التفصيلية
                </h3>
                {results.length === 0 && (
                  <span className="bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    نظامك سليم 100%
                  </span>
                )}
              </div>

              {results.length > 0 ? (
                <table className="w-full text-start text-sm">
                  <thead className="bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)]">
                    <tr>
                      <th className="p-3 max-md:p-2">رقم القيد / التاريخ</th>
                      <th className="p-3 max-md:p-2">الوصف</th>
                      <th className="p-3 text-start max-md:p-2">المدين</th>
                      <th className="p-3 text-start max-md:p-2">الدائن</th>
                      <th className="p-3 max-md:p-2">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-border)]">
                    {results.map(res => (
                      <tr key={res.id} className="hover:bg-[var(--app-surface-hover)]">
                        <td className="p-3 max-md:p-2">
                          <div className="font-mono text-xs text-[var(--app-text-secondary)]">
                            {res.id.slice(0, 8)}
                          </div>
                          <div className="text-xs font-bold text-[var(--app-text)]">{res.date}</div>
                        </td>
                        <td className="p-3 text-xs text-[var(--app-text-secondary)] max-md:p-2">
                          {res.message}
                        </td>
                        <td className="p-3 text-start font-mono text-xs font-bold text-[var(--app-text)] max-md:p-2">
                          {formatCurrency(res.debit_amount)}
                        </td>
                        <td className="p-3 text-start font-mono text-xs font-bold text-[var(--app-text)] max-md:p-2">
                          {formatCurrency(res.credit_amount)}
                        </td>
                        <td className="p-3 max-md:p-2">
                          <span
                            className={`px-2 py-1 text-[10px] font-bold ${res.status === 'unbalanced' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}
                          >
                            {res.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-[var(--app-text-secondary)] max-md:p-5">
                  <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500 opacity-50" />
                  <p>لم يتم العثور على أي قيود غير متوازنة.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
