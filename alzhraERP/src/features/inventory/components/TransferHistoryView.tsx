import React, { useMemo } from 'react';
import { useTransfers } from '../hooks/useInventoryManagement';
import ExcelTable from '../../../ui/common/ExcelTable';
import TableSkeleton from '../../../ui/base/TableSkeleton';
import EmptyState from '../../../ui/base/EmptyState';
import { ArrowLeftRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../../core/utils';

const TransferHistoryView: React.FC = () => {
    const { data: transfers, isLoading } = useTransfers();

    const columns = useMemo(() => [
        { 
            header: '#', 
            accessor: (row: any) => <span className="font-mono font-bold text-gray-400">{row.transfer_number || '-'}</span>, 
            width: 'w-24' 
        },
        {
            header: 'من مستودع', 
            accessor: (row: any) => (
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></div>
                    <span className="font-black text-[11px] text-rose-600 dark:text-rose-400 uppercase tracking-tight">{row.from_warehouse_name}</span>
                </div>
            ), 
            sortKey: 'from_warehouse_name'
        },
        {
            header: 'إلى مستودع', 
            accessor: (row: any) => (
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                    <span className="font-black text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">{row.to_warehouse_name}</span>
                </div>
            ), 
            sortKey: 'to_warehouse_name'
        },
        {
            header: 'التاريخ', 
            accessor: (row: any) => (
                <span className="text-gray-600 dark:text-gray-400 font-mono text-[10px]">
                    {new Date(row.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
            ), 
            width: 'w-32', 
            sortKey: 'created_at'
        },
        {
            header: 'الأصناف', 
            accessor: (row: any) => (
                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {row.item_count} أصناف
                </span>
            ), 
            className: 'text-center', 
            width: 'w-24'
        },
        {
            header: 'الحالة',
            accessor: (row: any) => (
                <span className={cn(
                    "px-2.5 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 w-fit mx-auto",
                    row.status === 'completed'
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                        : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                )}>
                    {row.status === 'completed' ? <><CheckCircle size={10} /> مكتملة</> : <><AlertTriangle size={10} /> معلقة</>}
                </span>
            ),
            className: 'text-center',
            width: 'w-28'
        },
    ], []);

    if (isLoading) return <TableSkeleton rows={8} cols={6} />;

    if (!transfers || transfers.length === 0) {
        return (
            <EmptyState
                icon={ArrowLeftRight}
                title="لا يوجد سجلات مناقلة"
                description="لم يتم العثور على أي عمليات مناقلة مسجلة في النظام."
            />
        );
    }

    return (
        <div className="h-full flex flex-col gap-4">
            <ExcelTable
                columns={columns}
                data={transfers}
                colorTheme="indigo"
                title="سجل المناقلات الكامل"
                subtitle={`إجمالي العمليات: ${transfers.length}`}
            />
        </div>
    );
};

export default TransferHistoryView;
