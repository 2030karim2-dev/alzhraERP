import React from 'react';
import { DollarSign, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '@/core/utils';

interface PaymentInfoSectionProps {
  paymentInfo: any;
  currencyCode: string;
}

const PaymentInfoSection: React.FC<PaymentInfoSectionProps> = ({ paymentInfo, currencyCode }) => {
  if (!paymentInfo) return null;

  return (
    <div className="bg-[var(--app-surface)] rounded-xl p-4 border border-[var(--app-border)]">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
        <h3 className="font-bold text-[var(--app-text)] text-sm">المبالغ</h3>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="font-bold text-emerald-700 dark:text-emerald-300">الإجمالي:</span>
          <span className="font-mono font-bold text-gray-700 dark:text-slate-300">
            {formatCurrency(paymentInfo.total, currencyCode || 'SAR')}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold text-emerald-700 dark:text-emerald-300">المدفوع:</span>
          <span className="font-mono font-bold text-green-600">
            {formatCurrency(paymentInfo.paid, currencyCode || 'SAR')}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold text-emerald-700 dark:text-emerald-300">المتبقي:</span>
          <span className={`font-mono font-bold ${paymentInfo.remaining > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {formatCurrency(paymentInfo.remaining, currencyCode || 'SAR')}
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-700">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${paymentInfo.isPaid ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            paymentInfo.isPartial ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
            {paymentInfo.isPaid ? <CheckCircle size={12} /> : <Clock size={12} />}
            {paymentInfo.isPaid ? 'مدفوعة' : paymentInfo.isPartial ? 'مدفوعة جزئياً' : 'غير مدفوعة'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PaymentInfoSection;
