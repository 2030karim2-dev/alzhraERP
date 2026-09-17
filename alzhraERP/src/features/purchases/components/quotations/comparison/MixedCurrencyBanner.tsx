import React from 'react';
import { Shield } from 'lucide-react';

interface MixedCurrencyBannerProps {
  currencies: string[];
  normalizeCurrency: boolean;
  onToggleNormalize: () => void;
}

/** تنبيه توضيحي يظهر عند تعدد عملات العروض، مع زر تبديل التوحيد. */
export const MixedCurrencyBanner = ({
  currencies,
  normalizeCurrency,
  onToggleNormalize,
}: MixedCurrencyBannerProps): React.ReactElement => (
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">
    <div className="flex items-center gap-2">
      <Shield size={15} className="shrink-0 text-amber-600" />
      <span>
        العروض تشمل عملات متعددة ({currencies.join(' ، ')}).
        {normalizeCurrency
          ? ' تم توحيد الأسعار للريال السعودي (ر.س) وفق أسعار الصرف للمقارنة العادلة.'
          : ' المقارنة الحالية بالأرقام المجردة بدون مراعاة أسعار الصرف.'}
      </span>
    </div>
    <button
      type="button"
      onClick={onToggleNormalize}
      className="font-bold underline transition-colors hover:text-amber-950 dark:hover:text-white"
    >
      {normalizeCurrency ? 'إلغاء توحيد العملات' : 'تفعيل توحيد العملات'}
    </button>
  </div>
);
