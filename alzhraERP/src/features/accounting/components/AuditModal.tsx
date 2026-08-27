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
            logger.error("AuditModal", 'Audit failed:', fetchError);
            const err = fetchError as Error;
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
                totalDebit = entry.journal_entry_lines.reduce((sum: number, line: any) => sum + Number(line.debit_amount), 0);
                totalCredit = entry.journal_entry_lines.reduce((sum: number, line: any) => sum + Number(line.credit_amount), 0);
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
                    message: `الفرق: ${formatCurrency(diff)}`
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
                    message: 'قيد فارغ (بقيمة صفر)'
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
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <ShieldCheck size={64} className="text-[var(--app-text-secondary)] opacity-40 mb-4" />
                        <h3 className="text-base font-bold text-[var(--app-text)]">النظام جاهز للفحص</h3>
                        <p className="text-[var(--app-text-secondary)] max-w-md mx-auto mt-2 text-sm">اضغط على زر "بدء الفحص" لمراجعة جميع القيود المحاسبية والتأكد من توازن الدائن والمدين.</p>
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
                    <div className="flex flex-col items-center justify-center h-64 text-center animate-in fade-in">
                        <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
                        <h3 className="text-base font-bold text-[var(--app-text)]">جاري فحص القيود...</h3>
                        <p className="text-[var(--app-text-secondary)] text-sm">يرجى الانتظار، يتم تحليل البيانات</p>
                    </div>
                )}

                {!isLoading && summary.total > 0 && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-md:gap-3">
                            <Card variant="ledger" className="p-3 max-md:p-2">
                                <span className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-widest">إجمالي القيود</span>
                                <div className="text-2xl max-md:text-lg font-bold text-[var(--app-text)] mt-1">{summary.total}</div>
                            </Card>
                            <Card variant="ledger" className="p-3 max-md:p-2 border-rose-200 dark:border-rose-900/50">
                                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">غير متوازنة (Unbalanced)</span>
                                <div className="text-2xl max-md:text-lg font-bold text-rose-600 mt-1">{summary.unbalanced}</div>
                            </Card>
                            <Card variant="ledger" className="p-3 max-md:p-2 border-amber-200 dark:border-amber-900/50">
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">أخطاء (Errors)</span>
                                <div className="text-2xl max-md:text-lg font-bold text-amber-600 mt-1">{summary.errors}</div>
                            </Card>
                        </div>

                        {/* Results Table */}
                        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] overflow-hidden shadow-sm">
                            <div className="p-3 max-md:p-2 border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] flex justify-between items-center">
                                <h3 className="font-bold text-[var(--app-text)] flex items-center gap-2 text-sm">
                                    {results.length > 0 ? <AlertTriangle size={18} className="text-rose-500" /> : <CheckCircle size={18} className="text-emerald-500" />}
                                    نتائج الفحص التفصيلية
                                </h3>
                                {results.length === 0 && (
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold">نظامك سليم 100%</span>
                                )}
                            </div>

                            {results.length > 0 ? (
                                <table className="w-full text-sm text-start">
                                    <thead className="bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)]">
                                        <tr>
                                            <th className="p-3 max-md:p-2">رقم القيد / التاريخ</th>
                                            <th className="p-3 max-md:p-2">الوصف</th>
                                            <th className="p-3 max-md:p-2 text-start">المدين</th>
                                            <th className="p-3 max-md:p-2 text-start">الدائن</th>
                                            <th className="p-3 max-md:p-2">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--app-border)]">
                                        {results.map(res => (
                                            <tr key={res.id} className="hover:bg-[var(--app-surface-hover)]">
                                                <td className="p-3 max-md:p-2">
                                                    <div className="font-mono text-xs text-[var(--app-text-secondary)]">{res.id.slice(0, 8)}</div>
                                                    <div className="font-bold text-[var(--app-text)] text-xs">{res.date}</div>
                                                </td>
                                                <td className="p-3 max-md:p-2 text-[var(--app-text-secondary)] text-xs">{res.message}</td>
                                                <td className="p-3 max-md:p-2 text-start font-mono font-bold text-[var(--app-text)] text-xs">{formatCurrency(res.debit_amount)}</td>
                                                <td className="p-3 max-md:p-2 text-start font-mono font-bold text-[var(--app-text)] text-xs">{formatCurrency(res.credit_amount)}</td>
                                                <td className="p-3 max-md:p-2">
                                                    <span className={`px-2 py-1 text-[10px] font-bold ${res.status === 'unbalanced' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {res.status.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-12 max-md:p-5 text-center text-[var(--app-text-secondary)]">
                                    <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4 opacity-50" />
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
