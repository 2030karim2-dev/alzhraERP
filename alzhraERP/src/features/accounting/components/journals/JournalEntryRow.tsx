import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import {  formatNumberDisplay } from '../../../../core/utils';
import Badge from '../../../../ui/base/Badge';

import { UIJournalEntry, UIJournalLine } from '../../types/models';

interface JournalEntryRowProps {
    entry: UIJournalEntry;
}

const JournalEntryRow: React.FC<JournalEntryRowProps> = ({ entry }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => setIsExpanded(!isExpanded);

    // Calculate totals
    const totalDebit = (entry.journal_entry_lines || []).reduce((sum: number, line: UIJournalLine) => sum + (line.debit_amount || 0), 0);
    const totalCredit = (entry.journal_entry_lines || []).reduce((sum: number, line: UIJournalLine) => sum + (line.credit_amount || 0), 0);

    return (
        <>
            {/* Main Row */}
            <tr
                onClick={toggleExpand}
                className={`
            group cursor-pointer transition-colors border-b border-gray-300 dark:border-slate-700
            ${isExpanded ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'}
        `}
            >
                <td className="px-2 py-2 border-l border-gray-300 dark:border-slate-700 text-center w-10">
                    <button className="p-1 rounded hover:bg-black/10 text-gray-500">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                </td>
                <td className="px-3 py-2 border-l border-gray-300 dark:border-slate-700 font-mono text-center font-bold text-blue-700 dark:text-blue-400 text-sm">
                    #{entry.entry_number}
                </td>
                <td className="px-3 py-2 border-l border-gray-300 dark:border-slate-700 text-center whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {entry.entry_date}
                </td>
                <td className="px-3 py-2 border-l border-gray-300 dark:border-slate-700 text-center text-xs font-bold text-gray-600 dark:text-gray-400">
                    {(() => {
                        const type = entry.reference_type;
                        const labels: Record<string, string> = {
                            'manual': 'قيد يدوي',
                            'invoice': 'فاتورة مبيعات',
                            'sale': 'فاتورة مبيعات',
                            'bill': 'فاتورة مشتريات',
                            'purchase': 'فاتورة مشتريات',
                            'return_sale': 'مرتجع مبيعات',
                            'return_purchase': 'مرتجع مشتريات',
                            'payment': 'سند صرف (دفع)',
                            'payment_voucher': 'سند دفع',
                            'receipt': 'سند قبض',
                            'receipt_voucher': 'سند قبض',
                            'expense': 'مصروفات',
                            'expenses': 'مصروفات',
                            'expense_void': 'إلغاء مصروف',
                            'transfer': 'تحويل داخلي',
                            'opening_balance': 'رصيد افتتاحي',
                            'correction': 'تصحيح قيد',
                            'automated_sync': 'مزامنة آلية',
                            'sub_ledger_sync': 'مزامنة أستاذ مساعد',
                            'journal': 'قيد يومية'
                        };
                        return <Badge variant="outline" className="w-full justify-center">{type ? (labels[type] || type) : 'يدوي'}</Badge>;
                    })()}
                </td>
                <td className="px-3 py-2 border-l border-gray-300 dark:border-slate-700 text-center text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]" title={entry.created_by_profile?.full_name || 'System'}>
                    {entry.created_by_profile?.full_name || 'System'}
                </td>
                <td className="px-3 py-2 border-l border-gray-300 dark:border-slate-700 text-right min-w-[250px] text-sm text-gray-800 dark:text-gray-200 font-medium">
                    {entry.description}
                    {entry.party_name && (
                        <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-normal">
                            {entry.party_name}
                        </span>
                    )}
                </td>
                <td className="px-3 py-2 border-l border-gray-300 dark:border-slate-700 text-left font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm bg-emerald-50/50 dark:bg-emerald-900/10">
                    {formatNumberDisplay(totalDebit)}
                </td>
                <td className="px-3 py-2 border-l border-gray-300 dark:border-slate-700 text-left font-mono font-bold text-red-700 dark:text-red-400 text-sm bg-red-50/50 dark:bg-red-900/10">
                    {formatNumberDisplay(totalCredit)}
                </td>
                <td className="px-3 py-2 border-l border-gray-300 dark:border-slate-700 text-center w-24">
                    {entry.status === 'posted' ? (
                        <div className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-bold">
                            <CheckCircle2 size={14} />
                            <span>مرحل</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-1 text-gray-500 text-xs font-bold">
                            <Clock size={14} />
                            <span>مسودة</span>
                        </div>
                    )}
                </td>
            </tr>

            {/* Expanded Details Row */}
            {isExpanded && (
                <tr className="bg-gray-50 dark:bg-slate-900/50">
                    <td colSpan={9} className="p-4 border-b border-gray-300 dark:border-slate-700 shadow-inner">
                        <div className="bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 dark:bg-slate-800 font-bold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-2 border-l border-gray-300 dark:border-slate-700 text-right w-1/4">الحساب</th>
                                        <th className="px-4 py-2 border-l border-gray-300 dark:border-slate-700 text-right w-24">رمز الحساب</th>
                                        <th className="px-4 py-2 border-l border-gray-300 dark:border-slate-700 text-right">البيان / الشرح</th>
                                        <th className="px-4 py-2 border-l border-gray-300 dark:border-slate-700 text-left w-32 text-emerald-700">مدين</th>
                                        <th className="px-4 py-2 text-left w-32 text-red-700">دائن</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                                    {(entry.journal_entry_lines || []).map((line: UIJournalLine, idx: number) => (
                                        <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-slate-900/50">
                                            <td className="px-4 py-2 border-l border-gray-200 dark:border-slate-800 font-medium text-gray-800 dark:text-gray-200">
                                                {line.account?.name_ar || line.account?.name || '---'}
                                            </td>
                                            <td className="px-4 py-2 border-l border-gray-200 dark:border-slate-800 font-mono text-gray-500 text-center">
                                                {line.account?.code || '---'}
                                            </td>
                                            <td className="px-4 py-2 border-l border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 text-xs">
                                                {line.description || '-'}
                                            </td>
                                            <td className="px-4 py-2 border-l border-gray-200 dark:border-slate-800 text-left font-mono font-bold text-emerald-700 text-xs">
                                                {(line.debit_amount ?? 0) > 0 ? formatNumberDisplay(line.debit_amount || 0) : '-'}
                                            </td>
                                            <td className="px-4 py-2 text-left font-mono font-bold text-red-700 text-xs">
                                                {(line.credit_amount ?? 0) > 0 ? formatNumberDisplay(line.credit_amount || 0) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 dark:bg-slate-900 font-bold border-t border-gray-300 dark:border-slate-700">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-2 text-left bg-gray-100 dark:bg-slate-800 border-l border-gray-300 dark:border-slate-700">الإجمالي</td>
                                        <td className="px-4 py-2 text-left font-mono text-emerald-800 border-l border-gray-300 dark:border-slate-700">{formatNumberDisplay(totalDebit)}</td>
                                        <td className="px-4 py-2 text-left font-mono text-red-800">{formatNumberDisplay(totalCredit)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>


                    </td>
                </tr>
            )}
        </>
    );
};

export default JournalEntryRow;
