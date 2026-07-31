import React from 'react';
import { AlertCircle } from 'lucide-react';
import { formatCurrency, convertToBaseCurrency } from '../../../../core/utils';

interface JournalEntryTotalsProps {
    totals: { debit_amount: number; credit_amount: number };
    currencyCode: string;
    exchangeRate: number;
    isDivide: boolean;
    difference: number;
    isBalanced: boolean;
    errors: any;
}

const JournalEntryTotals: React.FC<JournalEntryTotalsProps> = ({
    totals,
    currencyCode,
    exchangeRate,
    isDivide,
    difference,
    isBalanced,
    errors
}) => {
    return (
        <div className="flex justify-end pt-2">
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 w-full md:w-80 space-y-3 shadow-inner">
                <div className="flex justify-between items-start text-sm">
                    <span className="text-gray-500 dark:text-slate-400">إجمالي المدين</span>
                    <div className="flex flex-col items-end">
                        <span dir="ltr" className="font-mono font-bold text-gray-800 dark:text-slate-100">{formatCurrency(totals.debit_amount, currencyCode || 'SAR')}</span>
                        {currencyCode !== 'SAR' && (
                            <span dir="ltr" className="font-mono text-[10px] text-gray-500">
                                {formatCurrency(convertToBaseCurrency({
                                    amount: totals.debit_amount,
                                    currencyCode: (currencyCode || 'SAR') as any,
                                    exchangeRate,
                                    exchangeOperator: isDivide ? 'divide' : 'multiply'
                                }), 'SAR')}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex justify-between items-start text-sm">
                    <span className="text-gray-500 dark:text-slate-400">إجمالي الدائن</span>
                    <div className="flex flex-col items-end">
                        <span dir="ltr" className="font-mono font-bold text-gray-800 dark:text-slate-100">{formatCurrency(totals.credit_amount, currencyCode || 'SAR')}</span>
                        {currencyCode !== 'SAR' && (
                            <span dir="ltr" className="font-mono text-[10px] text-gray-500">
                                {formatCurrency(convertToBaseCurrency({
                                    amount: totals.credit_amount,
                                    currencyCode: (currencyCode || 'SAR') as any,
                                    exchangeRate,
                                    exchangeOperator: isDivide ? 'divide' : 'multiply'
                                }), 'SAR')}
                            </span>
                        )}
                    </div>
                </div>
                <div className={`flex justify-between items-start text-sm pt-3 border-t border-gray-200 dark:border-slate-700 font-bold ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
                    <span>الفرق</span>
                    <div className="flex flex-col items-end">
                        <span dir="ltr" className="font-mono">{formatCurrency(Math.abs(difference), currencyCode || 'SAR')}</span>
                        {currencyCode !== 'SAR' && (
                            <span dir="ltr" className="font-mono text-[10px] opacity-70">
                                {formatCurrency(convertToBaseCurrency({
                                    amount: Math.abs(difference),
                                    currencyCode: (currencyCode || 'SAR') as any,
                                    exchangeRate,
                                    exchangeOperator: isDivide ? 'divide' : 'multiply'
                                }), 'SAR')}
                            </span>
                        )}
                    </div>
                </div>
                {(!isBalanced || errors.lines) && (
                    <div className="text-[10px] text-red-500 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/20 p-1.5 rounded-lg border border-red-100 dark:border-red-900/30 animate-pulse flex items-center justify-center gap-1">
                        <AlertCircle size={10} />
                        <span>{errors.lines?.message || (totals.debit_amount === 0 ? 'يجب إدخال مبالغ' : 'القيد غير متوازن')}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JournalEntryTotals;
