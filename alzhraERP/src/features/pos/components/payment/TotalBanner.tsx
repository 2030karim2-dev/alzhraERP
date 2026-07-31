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
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-5 py-4 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 0%, transparent 60%)' }} />
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{t('total_payable_amount')}</p>
            <p dir="ltr" className="text-4xl font-black font-mono tracking-tight">{formatCurrency(total, currency as any)}</p>
            <p className="text-[10px] font-bold uppercase opacity-60 mt-0.5">{currency}</p>
        </div>
    );
};

export default TotalBanner;