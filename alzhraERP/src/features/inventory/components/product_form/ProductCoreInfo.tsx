import React from 'react';
import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import Input from '../../../../ui/base/Input';
import type { ProductFormData } from '../../types';
import { Tag, FileCode, Award, Combine } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import BrandCombobox from './BrandCombobox';
import PartNumberSmartInput from './PartNumberSmartInput';

interface Props {
  register: UseFormRegister<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
  setValue?: UseFormSetValue<ProductFormData>;
  watch?: UseFormWatch<ProductFormData>;
}

const ProductCoreInfo: React.FC<Props> = ({ register, errors, setValue, watch }) => {
  const { t } = useTranslation();

  const currentBrand = watch ? watch('brand') || '' : '';
  const currentPartNumber = watch ? watch('part_number') || '' : '';

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block px-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          {t('base_product_name')}
        </label>
        <div className="relative">
          <input
            {...register('name', { required: t('name_required') })}
            className="w-full rounded-xl border-2 border-gray-100 bg-[var(--app-surface)] px-4 py-2.5 pr-10 text-sm font-bold text-gray-800 shadow-sm outline-none transition-all placeholder:text-gray-300 focus:border-blue-500 dark:border-slate-800 dark:text-white"
          />
          <Tag className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
        </div>
        {errors.name && (
          <p className="mt-1 px-1 text-[10px] font-bold text-rose-500">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {setValue ? (
          <PartNumberSmartInput
            value={currentPartNumber}
            currentBrand={currentBrand}
            onChange={val => {
              setValue('part_number', val, { shouldValidate: true, shouldDirty: true });
            }}
            onApplyProduct={productData => {
              if (productData.brand) {
                setValue('brand', productData.brand, { shouldValidate: true, shouldDirty: true });
              }
              if (productData.name) {
                setValue('name', productData.name, { shouldValidate: true, shouldDirty: true });
              }
              if (productData.selling_price !== undefined) {
                setValue('selling_price', productData.selling_price, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }
              if (productData.cost_price !== undefined) {
                setValue('cost_price', productData.cost_price, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }
              if (productData.alternative_numbers) {
                setValue('alternative_numbers', productData.alternative_numbers, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }
            }}
            label={t('oem_part_number')}
            error={errors.part_number?.message}
          />
        ) : (
          <Input
            label={t('oem_part_number')}
            {...register('part_number')}
            icon={<FileCode className="text-indigo-500" />}
            dir="ltr"
            className="font-mono text-xs"
            error={errors.part_number?.message}
          />
        )}

        {setValue ? (
          <BrandCombobox
            value={currentBrand}
            onChange={val => {
              setValue('brand', val, { shouldValidate: true, shouldDirty: true });
            }}
            label={t('manufacturer')}
            error={errors.brand?.message}
          />
        ) : (
          <Input
            label={t('manufacturer')}
            {...register('brand')}
            icon={<Award className="text-amber-500" />}
            className="text-xs font-bold"
            error={errors.brand?.message}
          />
        )}
      </div>

      <div className="space-y-4 border-t border-gray-100 pt-3 dark:border-slate-800">
        <div>
          <label className="mb-1.5 block flex items-center gap-1 px-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <Combine size={12} /> {t('alternative_numbers_label')}
          </label>
          <input
            {...register('alternative_numbers')}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 font-mono text-xs text-gray-700 outline-none transition-all focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-gray-300"
            dir="ltr"
          />
          {errors.alternative_numbers && (
            <p className="mt-1 px-1 text-[10px] font-bold text-rose-500">
              {errors.alternative_numbers.message}
            </p>
          )}
        </div>

        {/* Core charge option removed because is_core is not in the database schema yet */}
      </div>
    </div>
  );
};

export default ProductCoreInfo;
