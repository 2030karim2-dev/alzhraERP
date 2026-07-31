
import React from 'react';
import { useSalesStore } from '../../store';
import { useDiscountStore } from '../../../settings/taxDiscountStore';
import { formatCurrency, cn } from '../../../../core/utils';
import { Wallet } from 'lucide-react';

const InvoiceTotals: React.FC = () => {
    const { summary, currency } = useSalesStore();

    return (
        <div className="p-2 md:p-3 bg-white dark:bg-slate-900 border-t-2 border-gray-100 dark:border-slate-800">
            <div className="flex justify-between items-stretch">
                <div className="flex-1 p-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ملاحظات الفاتورة</h4>
                    <textarea
                        className="w-full h-full mt-2 bg-transparent text-xs font-bold outline-none resize-none"
                        placeholder="أضف أي ملاحظات أو شروط خاصة بالفاتورة هنا..."
                    />
                </div>

                <div className="w-full md:w-80 flex flex-col border-l dark:border-slate-800">
                    <div className={cn("grid", useDiscountStore.getState().discountEnabled ? "grid-cols-2" : "grid-cols-1")}>
                        <div className="p-3 border-b dark:border-slate-800 text-right">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block">المجموع الفرعي</span>
                            <span dir="ltr" className="text-sm font-bold font-mono text-gray-700 dark:text-slate-300">{formatCurrency(summary.subtotal, currency)}</span>
                        </div>
                        {useDiscountStore.getState().discountEnabled && (
                            <div className="p-3 border-b border-l dark:border-slate-800 text-right">
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block">إجمالي الخصم</span>
                                <span dir="ltr" className="text-sm font-bold font-mono text-rose-500">{formatCurrency(summary.discountAmount, currency)}</span>
                            </div>
                        )}

                    </div>

                    <div className="bg-slate-950 text-white p-4 flex justify-between items-center relative overflow-hidden group flex-1">
                        <div className="relative z-10">
                            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em] block mb-1">صافي الفاتورة</span>
                            <h2 dir="ltr" className="text-4xl font-bold font-mono tracking-tighter group-hover:scale-105 transition-transform duration-500 leading-none">
                                {formatCurrency(summary.totalAmount, currency)}
                            </h2>
                        </div>
                        <div className="relative z-10 p-3 bg-blue-600 rounded-none shadow-lg shadow-blue-500/40">
                            <Wallet size={20} />
                        </div>
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 animate-pulse"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceTotals;
