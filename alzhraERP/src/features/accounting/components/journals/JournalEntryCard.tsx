import React, { useState } from 'react';
import { ChevronDown,   Calendar,  CheckCircle2, Clock, User } from 'lucide-react';
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
        <div className={`bg-white dark:bg-slate-900 rounded-lg border transition-all duration-200 ${isExpanded ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 dark:border-slate-800 hover:border-blue-300'}`}>

            {/* Header / Summary Row */}
            <div
                className="p-4 cursor-pointer flex items-center justify-between group"
                onClick={toggleExpand}
            >
                <div className="flex items-center gap-4 flex-1">
                    {/* Icon & Entry Number */}
                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 font-bold font-mono text-sm border border-blue-100 dark:border-blue-800">
                        <span className="text-[10px] text-blue-400 uppercase">QID</span>
                        <span>{entry.entry_number}</span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {entry.description || 'بدون وصف'}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                                <Calendar size={12} />
                                <span dir="ltr">{entry.entry_date}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                {isBalanced ? 'متوازن' : 'غير متوازن'}
                            </span>
                            {entry.reference_type && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] border border-indigo-100">
                                    {entry.reference_type === 'manual' ? 'قيد يدوي' : entry.reference_type}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side Stats */}
                <div className="flex items-center gap-6">
                    <div className="text-left hidden sm:block">
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">الإجمالي</div>
                        <div className="font-mono font-bold text-lg text-gray-800 dark:text-white">
                            {formatCurrency(totalDebit)} <span className="text-xs text-gray-400">ر.ي</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {entry.status === 'posted' ? (
                            <Badge variant="success" className="gap-1 px-2.5">
                                <CheckCircle2 size={12} /> مرحل
                            </Badge>
                        ) : (
                            <Badge variant="warning" className="gap-1 px-2.5">
                                <Clock size={12} /> مسودة
                            </Badge>
                        )}
                        <div className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${isExpanded ? 'rotate-180 bg-gray-100' : ''}`}>
                            <ChevronDown size={20} className="text-gray-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 p-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Detailed Table */}
                    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-4 py-2 w-1/3">الحساب</th>
                                    <th className="px-4 py-2">الشرح / البيان</th>
                                    <th className="px-4 py-2 text-left w-24 text-emerald-600">مدين</th>
                                    <th className="px-4 py-2 text-left w-24 text-red-600">دائن</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                                {(entry.journal_entry_lines || []).map((line: any, idx: number) => (
                                    <tr key={line.id || idx} className="hover:bg-blue-50/50 dark:hover:bg-slate-900 transition-colors">
                                        <td className="px-4 py-2.5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800 dark:text-white">
                                                    {line.account?.name_ar || line.account?.name || '---'}
                                                </span>
                                                <span className="text-xs font-mono text-gray-400">
                                                    {line.account?.code || '---'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 text-xs">
                                            {line.description || '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-left font-mono font-bold text-emerald-600 text-sm bg-emerald-50/30">
                                            {line.debit_amount > 0 ? formatNumberDisplay(line.debit_amount) : '-'}
                                        </td>
                                        <td className="px-4 py-2.5 text-left font-mono font-bold text-red-600 text-sm bg-red-50/30">
                                            {line.credit_amount > 0 ? formatNumberDisplay(line.credit_amount) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-slate-900 font-bold border-t border-gray-200 dark:border-slate-700">
                                <tr>
                                    <td colSpan={2} className="px-4 py-2 text-left text-gray-500 text-xs uppercase tracking-wider">الإجمالي</td>
                                    <td className="px-4 py-2 text-left font-mono text-emerald-700">{formatNumberDisplay(totalDebit)}</td>
                                    <td className="px-4 py-2 text-left font-mono text-red-700">{formatNumberDisplay(totalCredit)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Footer Metadata */}
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-2">
                            <User size={12} />
                            <span>تم الإنشاء بواسطة: {entry.created_by_user?.email || 'System'}</span>
                        </div>
                        <div className="font-mono tracking-widest opacity-50">{entry.id}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JournalEntryCard;
