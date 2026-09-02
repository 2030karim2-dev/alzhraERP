import React from 'react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import Input from '../../../../ui/base/Input';
import type { ProductFormData } from '../../types';
import { Banknote, TrendingUp } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';

interface Props {
  register: UseFormRegister<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
}

const ProductFinancials: React.FC<Props> = ({ register, errors }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="relative">
        <Input
          label={t('purchase_cost')}
          type="number"
          step="0.01"
          {...register('cost_price')}
          dir="ltr"
          icon={<Banknote className="text-rose-500" />}
          className="border-rose-100 bg-rose-50/20 font-bold text-rose-600 dark:border-rose-900/30 dark:text-rose-400"
          error={errors.cost_price?.message}
        />
      </div>
      <div className="relative">
        <Input
          label={t('selling_price')}
          type="number"
          step="0.01"
          {...register('selling_price')}
          dir="ltr"
          icon={<TrendingUp className="text-emerald-500" />}
          className="border-emerald-100 bg-emerald-50/20 font-bold text-emerald-600 dark:border-emerald-900/30 dark:text-emerald-400"
          error={errors.selling_price?.message}
        />
      </div>
    </>
  );
};

export default ProductFinancials;
