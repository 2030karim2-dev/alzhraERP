
import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../../core/utils';
import { useAuditJournals } from '../hooks/useReports';
import { useFeedbackStore } from '../../../features/feedback/store';

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
            console.error('Audit failed:', fetchError);
            const err = fetchError as Error;
            showToast('Audit Failed: ' + err.message, 'error');
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
            const isBalanced = diff < 0.01;

            if (!isBalanced) {
                unbalancedCount++;
                auditResults.push({
                    id: entry.id,
                    date: entry.entry_date,
                    description: entry.description || 'No Description',
                    debit_amount: totalDebit,
                    credit_amount: totalCredit,
                    status: 'unbalanced',
                    message: `Difference: ${formatCurrency(diff)}`
                });
            } else if (totalDebit === 0 && totalCredit === 0) {
                errorCount++;
                auditResults.push({
                    id: entry.id,
                    date: entry.entry_date,
                    description: entry.description || 'No Description',
                    debit_amount: 0,
                    credit_amount: 0,
                    status: 'error',
                    message: 'Empty Entry (Zero Value)'
                });
            }
        });

        setResults(auditResults);
        setSummary({ total: entries?.length || 0, unbalanced: unbalancedCount, errors: errorCount });
        setIsAuditing(false); // Stop the loading state after processing
    }, [isAuditing, isLoading, entries, fetchError]);

    const runAudit = () => {
        setResults([]);
        setSummary({ total: 0, unbalanced: 0, errors: 0 });
        setIsAuditing(true);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-slate-800">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">فحص سلامة النظام المحاسبي</h2>
                            <p className="text-sm text-gray-500">مراجعة توازن القيود واكتشاف الأخطاء</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-400 hover:text-red-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-slate-950/50">

                    {!isLoading && results.length === 0 && summary.total === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <ShieldCheck size={64} className="text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">النظام جاهز للفحص</h3>
                            <p className="text-gray-400 max-w-md mx-auto mt-2">اضغط على زر "بدء الفحص" لمراجعة جميع القيود المحاسبية والتأكد من توازن الدائن والمدين.</p>
                            <button
                                onClick={runAudit}
                                className="mt-6 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                            >
                                <ShieldCheck size={20} />
                                بدء الفحص الشامل
                            </button>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-64 text-center animate-in fade-in">
                            <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
                            <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300">جاري فحص القيود...</h3>
                            <p className="text-gray-400">يرجى الانتظار، يتم تحليل البيانات</p>
                        </div>
                    )}

                    {!isLoading && summary.total > 0 && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">إجمالي القيود</span>
                                    <div className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{summary.total}</div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 shadow-sm">
                                    <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">غير متوازنة (Unbalanced)</span>
                                    <div className="text-2xl font-bold text-rose-600 mt-1">{summary.unbalanced}</div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
                                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">أخطاء (Errors)</span>
                                    <div className="text-2xl font-bold text-amber-600 mt-1">{summary.errors}</div>
                                </div>
                            </div>

                            {/* Results Table */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                        {results.length > 0 ? <AlertTriangle size={18} className="text-rose-500" /> : <CheckCircle size={18} className="text-emerald-500" />}
                                        نتائج الفحص التفصيلية
                                    </h3>
                                    {results.length === 0 && (
                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">نظامك سليم 100%</span>
                                    )}
                                </div>

                                {results.length > 0 ? (
                                    <table className="w-full text-sm text-right">
                                        <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500">
                                            <tr>
                                                <th className="p-4">رقم القيد / التاريخ</th>
                                                <th className="p-4">الوصف</th>
                                                <th className="p-4 text-left">المدين</th>
                                                <th className="p-4 text-left">الدائن</th>
                                                <th className="p-4">الحالة</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                            {results.map(res => (
                                                <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                                    <td className="p-4">
                                                        <div className="font-mono text-xs text-gray-400">{res.id.slice(0, 8)}</div>
                                                        <div className="font-bold text-gray-700 dark:text-gray-300">{res.date}</div>
                                                    </td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-400">{res.message}</td>
                                                    <td className="p-4 text-left font-mono font-bold text-gray-800 dark:text-gray-200">{formatCurrency(res.debit_amount)}</td>
                                                    <td className="p-4 text-left font-mono font-bold text-gray-800 dark:text-gray-200">{formatCurrency(res.credit_amount)}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${res.status === 'unbalanced' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {res.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-12 text-center text-gray-400">
                                        <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4 opacity-50" />
                                        <p>لم يتم العثور على أي قيود غير متوازنة.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
