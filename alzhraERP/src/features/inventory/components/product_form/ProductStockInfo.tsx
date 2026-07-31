import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import Input from '../../../../ui/base/Input';
import { ProductFormData } from '../../types';
import { Box, BellRing } from 'lucide-react';
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
        error={errors.stock_quantity?.message as string}
      />
      <Input
        label={t('alert_limit')}
        type="number"
        {...register('min_stock_level')}
        dir="ltr"
        icon={<BellRing className="text-amber-500" />}
        className="font-bold text-amber-600 dark:text-amber-400"
        error={errors.min_stock_level?.message as string}
      />
    </>
  );
};

export default ProductStockInfo;
