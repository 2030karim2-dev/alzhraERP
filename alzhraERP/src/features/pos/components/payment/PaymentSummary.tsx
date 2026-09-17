import React from 'react';
import { Info } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';
import type { PaymentAccount } from './paymentTypes';

interface PaymentSummaryProps {
  total: number;
  currency: string;
  method: 'cash' | 'exchange';
  selectedAccount: PaymentAccount | undefined;
  receivedNum: number;
  change: number;
  paymentCurrency?: string;
  payableTotal?: number;
  exchangeRate?: number;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  total,
  currency,
  method,
  selectedAccount,
  receivedNum,
  change,
  paymentCurrency,
  payableTotal,
  exchangeRate,
}) => {
  const effectiveCurrency = paymentCurrency || currency;
  const isConverted = paymentCurrency && paymentCurrency !== currency;

  return (
    <div className="mx-4 mb-1 mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-2 flex items-center gap-1.5">
        <Info size={11} className="text-blue-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          ملخص الدفع
        </span>
      </div>
      <div className="space-y-1.5">
        {isConverted ? (
          <>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">أصل الفاتورة</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(total)} {currency}
              </span>
            </div>
            {exchangeRate ? (
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">سعر الصرف المعتمد</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  1 ر.س = {exchangeRate} ر.ي
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-[10px]">
              <span className="font-semibold text-slate-500">المطلوب سداده</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(payableTotal ?? total)} {effectiveCurrency}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">الإجمالي</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(total)} {currency}
            </span>
          </div>
        )}
        <div className="flex justify-between text-[10px]">
          <span className="text-slate-500">طريقة الدفع</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {method === 'cash' ? 'نقداً' : 'شركة صرافة'}
          </span>
        </div>
        {selectedAccount && (
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">الحساب</span>
            <span className="max-w-[180px] truncate font-bold text-slate-700 dark:text-slate-300">
              {selectedAccount.name_ar}
            </span>
          </div>
        )}
        {method === 'cash' && receivedNum > 0 && (
          <>
            <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">المدفوع</span>
              <span className="font-mono font-bold text-emerald-600">
                {formatCurrency(receivedNum)} {effectiveCurrency}
              </span>
            </div>
            {change >= 0 && (
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">الباقي</span>
                <span className="font-mono font-bold text-amber-600">
                  {formatCurrency(change)} {effectiveCurrency}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSummary;
