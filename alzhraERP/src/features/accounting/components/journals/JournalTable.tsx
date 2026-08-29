import React, { useState, useMemo } from 'react';
import { Filter, Search,  ArrowUpDown } from 'lucide-react';
import { useJournals } from '../../hooks/useJournals';
// import TableSkeleton from '../../../../ui/base/TableSkeleton';
// import EmptyState from '../../../../ui/base/EmptyState';
import JournalEntryRow, { TRANSACTION_TYPE_LABELS } from './JournalEntryRow';
import { formatNumberDisplay } from '../../../../core/utils';
// import Input from '../../../../ui/base/Input';
import { UIJournalEntry, UIJournalLine } from '../../types/models';

const JournalTable: React.FC = () => {
    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useJournals();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const journals: UIJournalEntry[] = useMemo(() => data?.pages?.flat() || [], [data]);

    // Filter & Sort Logic
    const filteredJournals = useMemo(() => {
        if (!journals.length) return [];

        let result = [...journals];

        // 1. Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(j =>
                j.description?.toLowerCase().includes(lowerTerm) ||
                j.entry_number?.toString().includes(lowerTerm) ||
                // Search in lines
                j.journal_entry_lines?.some((l: UIJournalLine) =>
                    l.description?.toLowerCase().includes(lowerTerm) ||
                    l.account?.name?.toLowerCase().includes(lowerTerm) ||
                    l.account?.name_ar?.toLowerCase().includes(lowerTerm) ||
                    l.account?.code?.toLowerCase().includes(lowerTerm)
                )
            );
        }

        // 2. Sort
        result.sort((a, b) => {
            const dateA = new Date(a.entry_date).getTime();
            const dateB = new Date(b.entry_date).getTime();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        return result;
    }, [journals, searchTerm, sortOrder]);

    if (isLoading) return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-[var(--app-surface)] border border-[var(--app-border)] shadow-sm animate-pulse" />)}
        </div>
    );

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-20">

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row gap-3 max-md:gap-3 justify-between items-center bg-[var(--app-surface)] p-2 md:p-3 border border-[var(--app-border)] shadow-sm sticky top-0 z-10">
                <div className="relative w-full md:w-96">
                    <Search className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--app-text-secondary)]" size={18} />
                    <input
                        type="text"
                        placeholder="بحث برقم القيد، الوصف، أو اسم الحساب..."
                        className="w-full ps-4 pe-10 py-2 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-[var(--radius)] text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-[var(--app-text)]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 max-md:gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2 px-3 py-2 bg-[var(--app-surface-hover)] text-[var(--app-text)] hover:bg-[var(--app-border)] transition-colors text-sm font-bold rounded-[var(--radius)]"
                    >
                        <ArrowUpDown size={16} />
                        <span>{sortOrder === 'asc' ? 'الأقدم أولاً' : 'الأحدث أولاً'}</span>
                    </button>
                    <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-[var(--radius)] text-xs font-bold font-mono">
                        {filteredJournals.length} قيود
                    </div>
                    {searchTerm && (
                        <span className="text-[10px] text-[var(--app-text-secondary)] font-bold whitespace-nowrap">
                            (بحث في القيود المحمّلة)
                        </span>
                    )}
                </div>
            </div>

            {/* Journals Table */}
            <div className="bg-[var(--app-surface)] border border-[var(--app-border)] shadow-sm overflow-hidden">
                <div className="hidden md:block overflow-x-auto scroll-x-hint-surface">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-[var(--app-surface-hover)] text-[var(--app-text)] font-bold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-2 py-3 border border-[var(--app-border)] w-10 text-center">#</th>
                                <th className="px-3 py-3 border border-[var(--app-border)] w-24 text-center">رقم القيد</th>
                                <th className="px-3 py-3 border border-[var(--app-border)] w-32 text-center">التاريخ</th>
                                <th className="px-3 py-3 border border-[var(--app-border)] w-24 text-center">نوع المعاملة</th>
                                <th className="px-3 py-3 border border-[var(--app-border)] w-32 text-center">المستخدم</th>
                                <th className="px-3 py-3 border border-[var(--app-border)] text-right min-w-[200px]">البيان / الشرح</th>
                                <th className="px-3 py-3 border border-[var(--app-border)] w-32 text-center">إجمالي مدين</th>
                                <th className="px-3 py-3 border border-[var(--app-border)] w-32 text-center">إجمالي دائن</th>
                                <th className="px-3 py-3 border border-[var(--app-border)] w-24 text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--app-border)]">
                            {filteredJournals.length > 0 ? (
                                filteredJournals.map((journal: UIJournalEntry) => (
                                    <JournalEntryRow key={journal.id} entry={journal} />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="p-8 max-md:p-4 text-center text-[var(--app-text-secondary)]">
                                        <Filter className="mx-auto mb-2 text-[var(--app-text-secondary)] opacity-40" size={32} />
                                        <p>لا توجد قيود تطابق البحث</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards — بديل الجدول على الهاتف */}
                <div className="md:hidden">
                    {filteredJournals.length === 0 ? (
                        <div className="p-6 m-2 text-center text-sm text-[var(--app-text-secondary)] border-2 border-dashed border-[var(--app-border)] rounded-2xl">
                            <Filter className="mx-auto mb-2 opacity-40" size={28} />
                            <p>لا توجد قيود تطابق البحث</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--app-border)]">
                            {filteredJournals.map((journal: UIJournalEntry) => {
                                const totalDebit = (journal.journal_entry_lines || []).reduce((s: number, l: UIJournalLine) => s + (l.debit_amount || 0), 0);
                                const totalCredit = (journal.journal_entry_lines || []).reduce((s: number, l: UIJournalLine) => s + (l.credit_amount || 0), 0);
                                const statusMeta = journal.status === 'posted'
                                    ? { label: 'مرحل', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' }
                                    : journal.status === 'void'
                                        ? { label: 'ملغى', cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' }
                                        : { label: 'مسودة', cls: 'bg-slate-500/10 text-[var(--app-text-secondary)]' };
                                return (
                                    <div key={journal.id} className="p-3 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-[var(--app-text)] line-clamp-2">{journal.description}</p>
                                                {journal.party_name && (
                                                    <p className="text-[11px] text-[var(--app-text-secondary)] mt-0.5">{journal.party_name}</p>
                                                )}
                                            </div>
                                            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusMeta.cls}`}>
                                                {statusMeta.label}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--app-text-secondary)]">
                                            <span className="font-mono font-bold text-blue-700 dark:text-blue-400" dir="ltr">#{journal.entry_number}</span>
                                            <span>{journal.entry_date}</span>
                                            <span className="font-bold text-[var(--app-text)]">
                                                {journal.reference_type ? (TRANSACTION_TYPE_LABELS[journal.reference_type] || journal.reference_type) : 'يدوي'}
                                            </span>
                                            <span className="truncate max-w-[120px]" title={journal.created_by_profile?.full_name || 'System'}>
                                                {journal.created_by_profile?.full_name || 'System'}
                                            </span>
                                            <span>{(journal.journal_entry_lines || []).length} سطور</span>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1.5 border-t border-[var(--app-border)]">
                                            <div className="flex-1 rounded-lg bg-emerald-500/5 px-2 py-1.5">
                                                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">مدين</p>
                                                <p className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400" dir="ltr">{formatNumberDisplay(totalDebit)}</p>
                                            </div>
                                            <div className="flex-1 rounded-lg bg-rose-500/5 px-2 py-1.5">
                                                <p className="text-[10px] font-bold text-red-700 dark:text-red-400">دائن</p>
                                                <p className="text-xs font-mono font-bold text-red-700 dark:text-red-400" dir="ltr">{formatNumberDisplay(totalCredit)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {hasNextPage && (
                    <div className="p-4 max-md:p-3 text-center border-t border-[var(--app-border)] bg-[var(--app-surface-hover)]">
                        <button
                            onClick={() => fetchNextPage()}
                            disabled={isFetchingNextPage}
                            className="px-6 max-md:px-3 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60 rounded-[var(--radius)] text-sm font-bold transition-colors disabled:opacity-50"
                        >
                            {isFetchingNextPage ? 'جاري التحميل...' : 'تحميل المزيد'}
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
};

export default JournalTable;
