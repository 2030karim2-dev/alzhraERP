import React from 'react';
import { AlertTriangle } from 'lucide-react';
import ExcelTable from '../../../ui/common/ExcelTable';

interface StockAlertsTableProps {
    data: any[];
}

export const StockAlertsTable: React.FC<StockAlertsTableProps> = ({ data }) => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-rose-100 dark:border-rose-900/30 overflow-hidden flex flex-col relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
            <div className="p-5 border-b border-rose-50 dark:border-rose-900/20 flex justify-between items-center bg-rose-50/30 dark:bg-slate-800/50">
                <div>
                    <h3 className="text-sm font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
                        <AlertTriangle size={18} />
                        تنبيهات النفاذ الحرجة
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 ml-6">منتجات سريعة الحركة على وشك النفاذ خلال أيام معدودة</p>
                </div>
                {data.length > 0 && (
                    <span className="text-[10px] bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-full font-bold shadow-sm border border-rose-200 dark:border-rose-800">
                        {data.length} تنبيهات
                    </span>
                )}
            </div>
            <div className="p-0 flex-1">
                <ExcelTable
                    data={data}
                    columns={[
                        { header: 'المنتج', accessor: (row: any) => row.name, className: 'font-bold text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap' },
                        { header: 'المخزون', accessor: (row: any) => <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{row.stock_quantity}</span>, className: 'text-center w-20' },
                        { header: 'الاستهلاك', accessor: (row: any) => <span className="font-mono text-xs text-slate-500">{(row.dailyVelocity || 0).toFixed(1)} /يوم</span>, className: 'text-center w-24' },
                        {
                            header: 'ينفذ خلال',
                            accessor: (row: any) => {
                                const days = row.daysRemaining || 0;
                                const isUrgent = days < 3;
                                return (
                                    <span className={`inline-flex items-center justify-center font-bold px-2 py-1 min-w-[60px] rounded-lg text-xs shadow-sm border ${isUrgent ? 'bg-rose-500 text-white border-rose-600 animate-pulse' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                                        {days} أيام
                                    </span>
                                );
                            },
                            className: 'text-center w-24'
                        }
                    ]}
                    colorTheme="orange"
                    showSearch={false}
                    emptyMessage="لا توجد منتجات حرجة حالياً، المخزون في مستويات آمنة."
                />
            </div>
        </div>
    );
};
