import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import {  formatNumberDisplay } from '../../../../core/utils';
import Badge from '../../../../ui/base/Badge';

import type { UIJournalEntry, UIJournalLine } from '../../types/models';

// خريطة أنواع القيود — مُصدَّرة لتُستخدم في بطاقات الموبايل (JournalTable)
export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
    'manual': 'قيد يدوي',
    'invoice': 'فاتورة مبيعات',
    'sale': 'فاتورة مبيعات',
    'bill': 'فاتورة مشتريات',
    'purchase': 'فاتورة مشتريات',
    'sale_return': 'مرتجع مبيعات',
    'purchase_return': 'مرتجع مشتريات',
    'payment': 'سند صرف (دفع)',
    'payment_voucher': 'سند دفع',
    'payment_bond': 'سند صرف',
    'receipt': 'سند قبض',
    'receipt_voucher': 'سند قبض',
    'receipt_bond': 'سند قبض',
    'transfer_bond': 'تحويل داخلي',
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

interface JournalEntryRowProps {
    entry: UIJournalEntry;
}

const JournalEntryRow: React.FC<JournalEntryRowProps> = ({ entry }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => { setIsExpanded(!isExpanded); };

    // Calculate totals
    const totalDebit = (entry.journal_entry_lines || []).reduce((sum: number, line: UIJournalLine) => sum + (line.debit_amount || 0), 0);
    const totalCredit = (entry.journal_entry_lines || []).reduce((sum: number, line: UIJournalLine) => sum + (line.credit_amount || 0), 0);

    return (
        <>
            {/* Main Row */}
            <tr
                onClick={toggleExpand}
                className={`
            group cursor-pointer transition-colors border-b border-[var(--app-border)]
            ${isExpanded ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-[var(--app-surface-hover)] bg-[var(--app-surface)]'}
        `}
            >
                <td className="px-2 py-2 border-s border-[var(--app-border)] text-center w-10">
                    <button className="p-1 rounded hover:bg-black/10 text-[var(--app-text-secondary)]">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                </td>
                <td className="px-3 py-2 border-s border-[var(--app-border)] font-mono text-center font-bold text-blue-700 dark:text-blue-400 text-sm">
                    #{entry.entry_number}
                </td>
                <td className="px-3 py-2 border-s border-[var(--app-border)] text-center whitespace-nowrap text-sm text-[var(--app-text)]">
                    {entry.entry_date}
                </td>
                <td className="px-3 py-2 border-s border-[var(--app-border)] text-center text-xs font-bold text-[var(--app-text-secondary)]">
                    {(() => {
                        const type = entry.reference_type;
                        return <Badge variant="outline" className="w-full justify-center">{type ? (TRANSACTION_TYPE_LABELS[type] || type) : 'يدوي'}</Badge>;
                    })()}
                </td>
                <td className="px-3 py-2 border-s border-[var(--app-border)] text-center text-xs text-[var(--app-text-secondary)] truncate max-w-[120px]" title={entry.created_by_profile?.full_name || 'System'}>
                    {entry.created_by_profile?.full_name || 'System'}
                </td>
                <td className="px-3 py-2 border-s border-[var(--app-border)] text-right min-w-[250px] text-sm text-[var(--app-text)] font-medium">
                    {entry.description}
                    {entry.party_name && (
                        <span className="block text-[11px] text-[var(--app-text-secondary)] mt-0.5 font-normal">
                            {entry.party_name}
                        </span>
                    )}
                </td>
                <td className="px-3 py-2 border-s border-[var(--app-border)] text-start font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm bg-emerald-50/50 dark:bg-emerald-900/10">
                    {formatNumberDisplay(totalDebit)}
                </td>
                <td className="px-3 py-2 border-s border-[var(--app-border)] text-start font-mono font-bold text-red-700 dark:text-red-400 text-sm bg-red-50/50 dark:bg-red-900/10">
                    {formatNumberDisplay(totalCredit)}
                </td>
                <td className="px-3 py-2 border-s border-[var(--app-border)] text-center w-24">
                    {entry.status === 'posted' ? (
                        <Badge variant="success" className="gap-1">
                            <CheckCircle2 size={12} /> مرحل
                        </Badge>
                    ) : entry.status === 'void' ? (
                        <Badge variant="danger" className="gap-1">
                            <XCircle size={12} /> ملغى
                        </Badge>
                    ) : (
                        <Badge variant="neutral" className="gap-1">
                            <Clock size={12} /> مسودة
                        </Badge>
                    )}
                </td>
            </tr>

            {/* Expanded Details Row */}
            {isExpanded && (
                <tr className="bg-[var(--app-surface-hover)]">
                    <td colSpan={9} className="p-4 border-b border-[var(--app-border)] shadow-inner">
                        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--app-surface-hover)] font-bold text-[var(--app-text)] border-b border-[var(--app-border)]">
                                    <tr>
                                        <th className="px-4 py-2 border-s border-[var(--app-border)] text-right w-1/4">الحساب</th>
                                        <th className="px-4 py-2 border-s border-[var(--app-border)] text-right w-24">رمز الحساب</th>
                                        <th className="px-4 py-2 border-s border-[var(--app-border)] text-right">البيان / الشرح</th>
                                        <th className="px-4 py-2 border-s border-[var(--app-border)] text-start w-32 text-emerald-700">مدين</th>
                                        <th className="px-4 py-2 text-start w-32 text-red-700">دائن</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--app-border)]">
                                    {(entry.journal_entry_lines || []).map((line: UIJournalLine, idx: number) => (
                                        <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-slate-900/50">
                                            <td className="px-4 py-2 border-s border-[var(--app-border)] font-medium text-[var(--app-text)]">
                                                {line.account?.name_ar || line.account?.name || '---'}
                                            </td>
                                            <td className="px-4 py-2 border-s border-[var(--app-border)] font-mono text-[var(--app-text-secondary)] text-center">
                                                {line.account?.code || '---'}
                                            </td>
                                            <td className="px-4 py-2 border-s border-[var(--app-border)] text-[var(--app-text-secondary)] text-xs">
                                                {line.description || '-'}
                                            </td>
                                            <td className="px-4 py-2 border-s border-[var(--app-border)] text-start font-mono font-bold text-emerald-700 text-xs">
                                                {(line.debit_amount ?? 0) > 0 ? formatNumberDisplay(line.debit_amount || 0) : '-'}
                                            </td>
                                            <td className="px-4 py-2 text-start font-mono font-bold text-red-700 text-xs">
                                                {(line.credit_amount ?? 0) > 0 ? formatNumberDisplay(line.credit_amount || 0) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-[var(--app-surface-hover)] font-bold border-t border-[var(--app-border)]">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-2 text-start bg-[var(--app-surface-hover)] border-s border-[var(--app-border)]">الإجمالي</td>
                                        <td className="px-4 py-2 text-start font-mono text-emerald-800 border-s border-[var(--app-border)]">{formatNumberDisplay(totalDebit)}</td>
                                        <td className="px-4 py-2 text-start font-mono text-red-800">{formatNumberDisplay(totalCredit)}</td>
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
