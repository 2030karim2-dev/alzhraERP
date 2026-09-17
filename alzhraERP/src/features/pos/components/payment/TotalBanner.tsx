import React from 'react';
import { formatCurrency } from '../../../../core/utils';
import { useTranslation } from '../../../../lib/hooks/useTranslation';

interface TotalBannerProps {
  total: number;
  currency: string;
  originalTotal?: number;
  originalCurrency?: string;
  exchangeRate?: number;
}

export const TotalBanner: React.FC<TotalBannerProps> = ({
  total,
  currency,
  originalTotal,
  originalCurrency,
  exchangeRate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 px-5 py-4 text-center text-white max-md:px-3 max-md:py-3">
      <div
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 0%, transparent 60%)' }}
      />
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest opacity-80">
        {t('total_payable_amount')}
      </p>
      <p dir="ltr" className="font-mono text-4xl font-black tracking-tight max-md:text-3xl">
        {formatCurrency(total, currency)}
      </p>
      <p className="mt-0.5 text-[10px] font-bold uppercase opacity-60">{currency}</p>
      {originalCurrency && originalCurrency !== currency && (
        <div className="mx-auto mt-2 flex w-fit items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-medium text-blue-100/90">
          <span>أصل الفاتورة:</span>
          <span className="font-mono font-bold">
            {formatCurrency(originalTotal ?? 0, originalCurrency)}
          </span>
          {exchangeRate ? (
            <span className="font-mono text-[10px] opacity-80">(سعر الصرف: {exchangeRate})</span>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default TotalBanner;
