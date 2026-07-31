import React from 'react';
import { Warehouse, Eye, Edit, Trash2 } from 'lucide-react';
import ExcelTable from '../../../../ui/common/ExcelTable';
import Button from '../../../../ui/base/Button';
import { formatCurrency, formatNumberDisplay } from '../../../../core/utils';

interface Props {
    warehouses: any[];
    onViewDetails: (id: string) => void;
    onEdit: (warehouse: any) => void;
    onDelete: (id: string) => void;
}

const WarehouseTable: React.FC<Props> = ({ warehouses, onViewDetails, onEdit, onDelete }) => {
    const columns = [
        {
            header: 'اسم المستودع',
            accessor: (row: any) => (
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                        <Warehouse size={16} />
                    </div>
                    <span className="font-bold text-gray-800 dark:text-slate-100 text-sm">{row.name_ar}</span>
                </div>
            )
        },
        { header: 'الموقع', accessor: (row: any) => <span className="font-bold text-gray-500">{row.location || '---'}</span> },
        {
            header: 'قيمة المخزون',
            accessor: (row: any) => <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(Number(row.stockValue || 0))}</span>,
            className: 'text-left'
        },
        {
            header: 'الأصناف',
            accessor: (row: any) => <span className="font-mono font-bold text-gray-700 dark:text-slate-300">{formatNumberDisplay(Number(row.itemCount || 0))}</span>,
            className: 'text-center'
        },
        {
            header: 'إجمالي القطع',
            accessor: (row: any) => <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatNumberDisplay(Number(row.totalStock || 0))}</span>,
            className: 'text-center'
        },
        {
            header: 'إجراءات',
            accessor: (row: any) => (
                <div className="flex items-center justify-center gap-2">
                    <Button onClick={() => onViewDetails(row.id)} variant="primary" size="sm" className="h-8 px-3" leftIcon={<Eye size={14} />}>
                        عرض المخزون
                    </Button>
                    <Button onClick={() => onEdit(row)} variant="outline" size="sm" className="h-8 px-3 text-blue-600 hover:bg-blue-50" leftIcon={<Edit size={14} />}>
                        تعديل
                    </Button>
                    <Button onClick={() => onDelete(row.id)} variant="danger" size="sm" className="h-8 px-3" leftIcon={<Trash2 size={14} />}>
                        حذف
                    </Button>
                </div>
            ),
            className: 'text-center w-64'
        }
    ];

    return (
        <div className="bg-white dark:bg-slate-900 rounded-none border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden flex-1">
            <ExcelTable
                columns={columns}
                data={warehouses}
                title="قائمة المستودعات"
                colorTheme="blue"
            />
        </div>
    );
};

export default WarehouseTable;
