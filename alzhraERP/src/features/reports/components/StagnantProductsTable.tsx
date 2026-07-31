import React from 'react';
import { PackageX } from 'lucide-react';
import ExcelTable from '../../../ui/common/ExcelTable';

interface StagnantProductsTableProps {
    data: any[];
}

export const StagnantProductsTable: React.FC<StagnantProductsTableProps> = ({ data }) => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-amber-100 dark:border-amber-900/30 overflow-hidden flex flex-col relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
            <div className="p-5 border-b border-amber-50 dark:border-amber-900/20 flex justify-between items-center bg-amber-50/30 dark:bg-slate-800/50">
                <div>
                    <h3 className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-500">
                        <PackageX size={18} />
                        الأصناف الراكدة (تكدس رأس المال)
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 ml-6">منتجات لم تتحرك منذ فترة طويلة وتكلف مساحة وأموال</p>
                </div>
            </div>
            <div className="p-0 flex-1">
                <ExcelTable
                    data={data}
                    columns={[
                        { header: 'المنتج', accessor: (row: any) => row.name, className: 'font-bold text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap' },
                        { header: 'المخزون المتكدس', accessor: (row: any) => <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-lg">{row.stock_quantity || row.stock}</span>, className: 'text-center w-32' },
                        {
                            header: 'آخر حركة', accessor: (row: any) => {
                                if (!row.lastSold || row.lastSold === 'Never') return <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-md font-bold">لا يوجد مبيعات مطلقاً</span>;
                                return <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">{new Date(row.lastSold).toLocaleDateString('en-GB')}</span>
                            }, className: 'text-center w-32'
                        }
                    ]}
                    colorTheme="orange"
                    showSearch={false}
                    emptyMessage="ممتاز! لا توجد منتجات راكدة حالياً."
                />
            </div>
        </div>
    );
};
