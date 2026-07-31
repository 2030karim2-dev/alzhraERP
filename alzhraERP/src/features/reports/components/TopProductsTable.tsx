import React from 'react';
import { TrendingUp } from 'lucide-react';
import ExcelTable from '../../../ui/common/ExcelTable';
import { formatCurrency } from '../../../core/utils';

interface TopProductsTableProps {
    data: any[];
}

export const TopProductsTable: React.FC<TopProductsTableProps> = ({ data }) => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 lg:col-span-2 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                    <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <TrendingUp size={18} className="text-emerald-500" />
                        المنتجات الأكثر حركة ومبيعاً
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 ml-6">أعلى الأصناف من حيث الكمية المباعة والإيرادات</p>
                </div>
            </div>
            <div className="p-0 flex-1">
                <ExcelTable
                    data={data}
                    columns={[
                        { header: 'المنتج', accessor: (row: any) => row.name, width: '250px', className: 'font-bold text-slate-800 dark:text-slate-200' },
                        { header: 'التصنيف', accessor: (row: any) => <span className={`text-[10px] px-2 py-1 rounded-md font-bold shadow-sm ${row.abcCategory === 'A' ? 'bg-emerald-100 text-emerald-800' : row.abcCategory === 'B' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>{row.abcCategory || '-'}</span>, width: '80px', className: 'text-center' },
                        { header: 'الكمية المباعة', accessor: (row: any) => <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg">{row.qtySold}</span>, className: 'text-center' },
                        { header: 'الإيرادات', accessor: (row: any) => <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">{formatCurrency(row.revenue)}</span>, className: 'text-left' }
                    ]}
                    showSearch={false}
                    colorTheme="blue"
                    emptyMessage="لا توجد بيانات مبيعات لهذه الفترة."
                />
            </div>
        </div>
    );
};
