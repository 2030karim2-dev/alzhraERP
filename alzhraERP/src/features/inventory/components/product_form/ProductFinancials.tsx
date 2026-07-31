import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import Input from '../../../../ui/base/Input';
import { ProductFormData } from '../../types';
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
          type="number" step="0.01"
          {...register('cost_price')}
          dir="ltr"
          icon={<Banknote className="text-rose-500" />}
          className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50/20 border-rose-100 dark:border-rose-900/30"
          error={errors.cost_price?.message as string}
        />
      </div>
      <div className="relative">
        <Input
          label={t('selling_price')}
          type="number" step="0.01"
          {...register('selling_price')}
          dir="ltr"
          icon={<TrendingUp className="text-emerald-500" />}
          className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 border-emerald-100 dark:border-emerald-900/30"
          error={errors.selling_price?.message as string}
        />
      </div>
    </>
  );
};

export default ProductFinancials;
