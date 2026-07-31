import React from 'react';
import { Info } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import type { PaymentAccount } from './paymentTypes';

interface PaymentSummaryProps {
    total: number;
    currency: string;
    method: 'cash' | 'exchange';
    selectedAccount: PaymentAccount | undefined;
    receivedNum: number;
    change: number;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
    total, currency, method, selectedAccount, receivedNum, change
}) => {
    const { t } = useTranslation();

    return (
        <div className="mx-4 mt-3 mb-1 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 mb-2">
                <Info size={11} className="text-blue-500" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">ملخص الدفع</span>
            </div>
            <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">الإجمالي</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{formatCurrency(total)} {currency}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">طريقة الدفع</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                        {method === 'cash' ? 'نقداً' : 'شركة صرافة'}
                    </span>
                </div>
                {selectedAccount && (
                    <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500">الحساب</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                            {selectedAccount.name_ar}
                        </span>
                    </div>
                )}
                {method === 'cash' && receivedNum > 0 && (
                    <>
                        <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                        <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">المدفوع</span>
                            <span className="font-bold font-mono text-emerald-600">{formatCurrency(receivedNum)} {currency}</span>
                        </div>
                        {change >= 0 && (
                            <div className="flex justify-between text-[10px]">
                                <span className="text-slate-500">الباقي</span>
                                <span className="font-bold font-mono text-amber-600">{formatCurrency(change)} {currency}</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentSummary;