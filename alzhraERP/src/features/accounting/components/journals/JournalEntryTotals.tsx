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
            <div className="bg-[var(--app-surface)] border border-[var(--app-border)] p-3 md:p-5 w-full md:w-80 space-y-3">
                <div className="flex justify-between items-start text-sm">
                    <span className="text-[var(--app-text-secondary)]">إجمالي المدين</span>
                    <div className="flex flex-col items-end">
                        <span dir="ltr" className="font-mono font-bold text-[var(--app-text)]">{formatCurrency(totals.debit_amount, currencyCode || 'SAR')}</span>
                        {currencyCode !== 'SAR' && (
                            <span dir="ltr" className="font-mono text-[10px] text-[var(--app-text-secondary)]">
                                {formatCurrency(convertToBaseCurrency({
                                    amount: totals.debit_amount,
                                    currencyCode: (currencyCode || 'SAR'),
                                    exchangeRate,
                                    exchangeOperator: isDivide ? 'divide' : 'multiply'
                                }), 'SAR')}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex justify-between items-start text-sm">
                    <span className="text-[var(--app-text-secondary)]">إجمالي الدائن</span>
                    <div className="flex flex-col items-end">
                        <span dir="ltr" className="font-mono font-bold text-[var(--app-text)]">{formatCurrency(totals.credit_amount, currencyCode || 'SAR')}</span>
                        {currencyCode !== 'SAR' && (
                            <span dir="ltr" className="font-mono text-[10px] text-[var(--app-text-secondary)]">
                                {formatCurrency(convertToBaseCurrency({
                                    amount: totals.credit_amount,
                                    currencyCode: (currencyCode || 'SAR'),
                                    exchangeRate,
                                    exchangeOperator: isDivide ? 'divide' : 'multiply'
                                }), 'SAR')}
                            </span>
                        )}
                    </div>
                </div>
                <div className={`flex justify-between items-start text-sm pt-3 border-t border-[var(--app-border)] font-bold ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <span>الفرق</span>
                    <div className="flex flex-col items-end">
                        <span dir="ltr" className="font-mono">{formatCurrency(Math.abs(difference), currencyCode || 'SAR')}</span>
                        {currencyCode !== 'SAR' && (
                            <span dir="ltr" className="font-mono text-[10px] opacity-70">
                                {formatCurrency(convertToBaseCurrency({
                                    amount: Math.abs(difference),
                                    currencyCode: (currencyCode || 'SAR'),
                                    exchangeRate,
                                    exchangeOperator: isDivide ? 'divide' : 'multiply'
                                }), 'SAR')}
                            </span>
                        )}
                    </div>
                </div>
                {(!isBalanced || errors.lines) && (
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 text-center bg-rose-50 dark:bg-rose-900/20 p-2 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center gap-1">
                        <AlertCircle size={10} />
                        <span>{errors.lines?.message || (totals.debit_amount === 0 ? 'يجب إدخال مبالغ' : 'القيد غير متوازن')}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JournalEntryTotals;
