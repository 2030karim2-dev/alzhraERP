import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import Input from '../../../../ui/base/Input';
import { ProductFormData } from '../../types';
import { Tag, FileCode, Award, Combine } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';

interface Props {
  register: UseFormRegister<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
}

const ProductCoreInfo: React.FC<Props> = ({ register, errors }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5 px-1">{t('base_product_name')}</label>
        <div className="relative">
          <input
            placeholder={t('enter_full_name')}
            {...register('name', { required: t('name_required') })}
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white placeholder:text-gray-300 focus:border-blue-500 outline-none transition-all pr-10 shadow-sm"
          />
          <Tag className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
        </div>
        {errors.name && <p className="text-[9px] text-rose-500 font-bold mt-1 px-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('oem_part_number')}
          placeholder="مثال: 04465-0K240"
          {...register('part_number')}
          icon={<FileCode className="text-indigo-500" />}
          dir="ltr"
          className="font-mono text-xs"
          error={errors.part_number?.message as string}
        />
        <Input
          label={t('manufacturer')}
          placeholder="Toyota, Denso..."
          {...register('brand')}
          icon={<Award className="text-amber-500" />}
          className="font-bold text-xs"
          error={errors.brand?.message as string}
        />
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 px-1 flex items-center gap-1">
            <Combine size={12} /> {t('alternative_numbers_label')}
          </label>
          <input
            placeholder="مثال: 04465-0K320, 04465-YZZE1"
            {...register('alternative_numbers')}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 focus:border-blue-500 outline-none transition-all"
            dir="ltr"
          />
          {errors.alternative_numbers && <p className="text-[9px] text-rose-500 font-bold mt-1 px-1">{errors.alternative_numbers.message}</p>}
        </div>

        {/* Core charge option removed because is_core is not in the database schema yet */}
      </div>
    </div>
  );
};

export default ProductCoreInfo;
