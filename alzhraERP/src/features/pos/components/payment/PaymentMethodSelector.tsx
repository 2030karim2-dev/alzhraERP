import React from 'react';
import { Banknote, Building2 } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import type { POSPaymentMethod } from './paymentTypes';

interface PaymentMethodSelectorProps {
  method: POSPaymentMethod;
  onMethodChange: (method: POSPaymentMethod) => void;
  /** [FIX] طرق دفع متاحة — تُخفي الخيارات غير المفعّلة في مسار البيع الحالي. */
  allowedMethods?: POSPaymentMethod[];
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  method,
  onMethodChange,
  allowedMethods = ['cash', 'exchange'],
}) => {
  const { t } = useTranslation();
  const showCash = allowedMethods.includes('cash');
  const showExchange = allowedMethods.includes('exchange');

  if (!showCash && !showExchange) return null;

  return (
    <div className="flex h-12 shrink-0 border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20">
      {showCash && (
        <button
          type="button"
          onClick={() => {
            onMethodChange('cash');
          }}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 border-l border-slate-200 text-xs font-bold uppercase tracking-wider transition-all dark:border-slate-800',
            method === 'cash'
              ? 'bg-blue-600 text-white shadow-inner shadow-blue-700'
              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          )}
        >
          <Banknote size={15} />
          {t('payment_method_cash')}
        </button>
      )}
      {showExchange && (
        <button
          type="button"
          onClick={() => {
            onMethodChange('exchange');
          }}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all',
            method === 'exchange'
              ? 'bg-emerald-600 text-white shadow-inner shadow-emerald-700'
              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          )}
        >
          <Building2 size={15} />
          شركة صرافة
        </button>
      )}
    </div>
  );
};

export default PaymentMethodSelector;
