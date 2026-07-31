import React, { useState, useMemo } from 'react';
import { Filter, Search,  ArrowUpDown } from 'lucide-react';
import { useJournals } from '../../hooks/useJournals';
// import TableSkeleton from '../../../../ui/base/TableSkeleton';
// import EmptyState from '../../../../ui/base/EmptyState';
import JournalEntryRow from './JournalEntryRow';
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
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm sticky top-0 z-10">
                <div className="relative w-full md:w-96">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="بحث برقم القيد، الوصف، أو اسم الحساب..."
                        className="w-full pl-4 pr-10 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm font-bold"
                    >
                        <ArrowUpDown size={16} />
                        <span>{sortOrder === 'asc' ? 'الأقدم أولاً' : 'الأحدث أولاً'}</span>
                    </button>
                    <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold font-mono">
                        {filteredJournals.length} قيود
                    </div>
                </div>
            </div>

            {/* Journals Table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-300 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-bold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-2 py-3 border border-gray-300 dark:border-slate-700 w-10 text-center">#</th>
                                <th className="px-3 py-3 border border-gray-300 dark:border-slate-700 w-24 text-center">رقم القيد</th>
                                <th className="px-3 py-3 border border-gray-300 dark:border-slate-700 w-32 text-center">التاريخ</th>
                                <th className="px-3 py-3 border border-gray-300 dark:border-slate-700 w-24 text-center">نوع المعاملة</th>
                                <th className="px-3 py-3 border border-gray-300 dark:border-slate-700 w-32 text-center">المستخدم</th>
                                <th className="px-3 py-3 border border-gray-300 dark:border-slate-700 text-right min-w-[200px]">البيان / الشرح</th>
                                <th className="px-3 py-3 border border-gray-300 dark:border-slate-700 w-32 text-center">إجمالي مدين</th>
                                <th className="px-3 py-3 border border-gray-300 dark:border-slate-700 w-32 text-center">إجمالي دائن</th>
                                <th className="px-3 py-3 border border-gray-300 dark:border-slate-700 w-24 text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {filteredJournals.length > 0 ? (
                                filteredJournals.map((journal: UIJournalEntry) => (
                                    <JournalEntryRow key={journal.id} entry={journal} />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-500">
                                        <Filter className="mx-auto mb-2 text-gray-300" size={32} />
                                        <p>لا توجد قيود تطابق البحث</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {hasNextPage && (
                    <div className="p-4 text-center border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                        <button
                            onClick={() => fetchNextPage()}
                            disabled={isFetchingNextPage}
                            className="px-6 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
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
