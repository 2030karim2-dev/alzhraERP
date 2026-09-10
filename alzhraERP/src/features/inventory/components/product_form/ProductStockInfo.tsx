import React from 'react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import Input from '../../../../ui/base/Input';
import type { ProductFormData } from '../../types';
import { Box, BellRing, Star } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';

interface Props {
  register: UseFormRegister<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
}

const ProductStockInfo: React.FC<Props> = ({ register, errors }) => {
  const { t } = useTranslation();
  return (
    <>
      <Input
        label={t('opening_balance')}
        type="number"
        {...register('stock_quantity')}
        dir="ltr"
        icon={<Box className="text-blue-500" />}
        className="font-bold text-blue-600 dark:text-blue-400"
        error={errors.stock_quantity?.message}
      />
      <Input
        label={t('alert_limit')}
        type="number"
        {...register('min_stock_level')}
        dir="ltr"
        icon={<BellRing className="text-amber-500" />}
        className="font-bold text-amber-600 dark:text-amber-400"
        error={errors.min_stock_level?.message}
      />
      <div className="col-span-1 mt-1 md:col-span-2">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/50 p-2.5 transition-colors hover:bg-amber-100/50 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:bg-amber-900/30">
          <input
            type="checkbox"
            {...register('is_core')}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-amber-500 focus:ring-amber-400 dark:border-gray-600"
          />
          <div className="flex items-center gap-2">
            <Star size={16} className="fill-amber-400 text-amber-500" />
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                صنف استراتيجي (العمود الفقري للمنشأة)
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                مراقبة دقيقة وتنبيهات أولوية قصوى عند اقتراب نفاذ المخزون
              </span>
            </div>
          </div>
        </label>
      </div>
    </>
  );
};

export default ProductStockInfo;
