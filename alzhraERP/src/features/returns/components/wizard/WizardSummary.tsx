import React from 'react';
import { FileDown } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';

interface Props {
    totalItemsCount: number;
    totalAmount: number;
}

export const WizardSummary: React.FC<Props> = ({ totalItemsCount, totalAmount }) => {
    return (
        <div className="hidden md:flex absolute top-0 right-0 w-full md:w-80 h-full bg-slate-50 dark:bg-slate-900/40 p-6 flex-col justify-end">
            <div className="mb-4">
                <FileDown size={48} className="text-slate-200 dark:text-slate-700 mb-6" />
                <h4 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter mb-2">إجمالي المرتجع</h4>
                <p className="text-xs font-bold text-slate-500">مجموع قيمة الأصناف المحددة للإرجاع بناءً على الفاتورة الأصلية.</p>
            </div>
            
            <div className="space-y-4 pt-6 border-t border-slate-200/50 dark:border-slate-700/50 mt-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-500 tracking-tighter">الكمية الإجمالية</span>
                    <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg text-sm font-mono font-bold border border-slate-100 dark:border-slate-700/50 text-slate-700 dark:text-slate-300">
                        {totalItemsCount}
                    </span>
                </div>
                <div className="flex justify-between items-baseline pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">القيمة الإجمالية</span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tighter">
                        {formatCurrency(totalAmount)}
                    </span>
                </div>
            </div>
        </div>
    );
};
