import React, { useState } from 'react';
import { ChevronDown, Calendar, CheckCircle2, Clock, User } from 'lucide-react';
import { formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import Badge from '../../../../ui/base/Badge';

interface JournalEntryCardProps {
    entry: any; // Using detailed types would be better, but sticking to existing pattern for now
}

const JournalEntryCard: React.FC<JournalEntryCardProps> = ({ entry }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => setIsExpanded(!isExpanded);

    // Calculate totals for verification
    const totalDebit = (entry.journal_entry_lines || []).reduce((sum: number, line: any) => sum + (line.debit_amount || 0), 0);
    const totalCredit = (entry.journal_entry_lines || []).reduce((sum: number, line: any) => sum + (line.credit_amount || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return (
        <div className={`bg-[var(--app-surface)] border transition-all duration-200 ${isExpanded ? 'border-blue-500 ring-1 ring-blue-500' : 'border-[var(--app-border)] hover:border-blue-300'}`}>

            {/* Header / Summary Row */}
            <div
                className="p-3 max-md:p-3 cursor-pointer flex items-center justify-between group"
                onClick={toggleExpand}
            >
                <div className="flex items-center gap-3 max-md:gap-2 flex-1">
                    {/* Icon & Entry Number */}
                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold font-mono text-sm border border-blue-100 dark:border-blue-800">
                        <span className="text-[10px] text-blue-400 uppercase">QID</span>
                        <span>{entry.entry_number}</span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col gap-1 max-md:gap-0.5">
                        <h3 className="font-bold text-[var(--app-text)] text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {entry.description || 'بدون وصف'}
                        </h3>
                        <div className="flex items-center gap-3 max-md:gap-2 text-xs text-[var(--app-text-secondary)]">
                            <span className="flex items-center gap-1 bg-[var(--app-surface-hover)] px-2 py-0.5 rounded-[var(--radius)] text-[11px]">
                                <Calendar size={12} />
                                <span dir="ltr">{entry.entry_date}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                {isBalanced ? 'متوازن' : 'غير متوازن'}
                            </span>
                            {entry.reference_type && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-[var(--radius)] text-[10px] border border-indigo-100">
                                    {entry.reference_type === 'manual' ? 'قيد يدوي' : entry.reference_type}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side Stats */}
                <div className="flex items-center gap-6 max-md:gap-3">
                    <div className="text-start hidden sm:block">
                        <div className="text-[10px] text-[var(--app-text-secondary)] uppercase font-bold tracking-wider">الإجمالي</div>
                        <div className="font-mono font-bold text-base text-[var(--app-text)]">
                            {formatCurrency(totalDebit)} <span className="text-xs text-[var(--app-text-secondary)]">ر.ي</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 max-md:gap-1">
                        {entry.status === 'posted' ? (
                            <Badge variant="success" className="gap-1 px-2.5">
                                <CheckCircle2 size={12} /> مرحل
                            </Badge>
                        ) : (
                            <Badge variant="warning" className="gap-1 px-2.5">
                                <Clock size={12} /> مسودة
                            </Badge>
                        )}
                        <div className={`p-1.5 max-md:p-1 rounded-full hover:bg-[var(--app-surface-hover)] transition-colors ${isExpanded ? 'rotate-180 bg-[var(--app-surface-hover)]' : ''}`}>
                            <ChevronDown size={18} className="text-[var(--app-text-secondary)]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] p-3 max-md:p-2 animate-in slide-in-from-top-2 duration-200">
                    {/* Detailed Table */}
                    <div className="overflow-hidden border border-[var(--app-border)]">
                        <table className="w-full text-sm text-start">
                            <thead className="bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] font-bold border-b border-[var(--app-border)]">
                                <tr>
                                    <th className="px-4 py-2 w-1/3">الحساب</th>
                                    <th className="px-4 py-2">الشرح / البيان</th>
                                    <th className="px-4 py-2 text-start w-24 text-emerald-600">مدين</th>
                                    <th className="px-4 py-2 text-start w-24 text-red-600">دائن</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--app-border)] bg-[var(--app-surface)]">
                                {(entry.journal_entry_lines || []).map((line: any, idx: number) => (
                                    <tr key={line.id || idx} className="hover:bg-blue-50/50 dark:hover:bg-slate-900 transition-colors">
                                        <td className="px-4 py-2.5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[var(--app-text)]">
                                                    {line.account?.name_ar || line.account?.name || '---'}
                                                </span>
                                                <span className="text-xs font-mono text-[var(--app-text-secondary)]">
                                                    {line.account?.code || '---'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-[var(--app-text-secondary)] text-xs">
                                            {line.description || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-start font-mono font-bold text-emerald-600 text-sm bg-emerald-50/30">
                                            {line.debit_amount > 0 ? formatNumberDisplay(line.debit_amount) : '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-start font-mono font-bold text-red-600 text-sm bg-red-50/30">
                                            {line.credit_amount > 0 ? formatNumberDisplay(line.credit_amount) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-[var(--app-surface-hover)] font-bold border-t border-[var(--app-border)]">
                                <tr>
                                    <td colSpan={2} className="px-4 py-2 text-start text-[var(--app-text-secondary)] text-xs uppercase tracking-wider">الإجمالي</td>
                                    <td className="px-4 py-2 text-start font-mono text-emerald-700">{formatNumberDisplay(totalDebit)}</td>
                                    <td className="px-4 py-2 text-start font-mono text-red-700">{formatNumberDisplay(totalCredit)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Footer Metadata */}
                    <div className="mt-3 flex items-center justify-between text-xs text-[var(--app-text-secondary)]">
                        <div className="flex items-center gap-2 max-md:gap-1">
                            <User size={12} />
                            <span>تم الإنشاء بواسطة: {entry.created_by_profile?.full_name || 'System'}</span>
                        </div>
                        <div className="font-mono tracking-widest opacity-50">{entry.id}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JournalEntryCard;
