import React from 'react';
import { formatCurrency } from '../../../../core/utils';
import { useTranslation } from '../../../../lib/hooks/useTranslation';

interface TotalBannerProps {
  total: number;
  currency: string;
}

export const TotalBanner: React.FC<TotalBannerProps> = ({ total, currency }) => {
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
    </div>
  );
};

export default TotalBanner;
