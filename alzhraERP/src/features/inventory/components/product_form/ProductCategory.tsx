import React from 'react';
import { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { ProductFormData } from '../../types';
import { Layers } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { useInventoryCategories } from '../../hooks/index';
import { useTranslation } from '../../../../lib/hooks/useTranslation';

interface Props {
  register: UseFormRegister<ProductFormData>;
  watch: UseFormWatch<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
}

const ProductCategory: React.FC<Props> = ({ register, watch, setValue }) => {
  const { t } = useTranslation();
  const currentUnit = watch('unit');
  const { data: categories } = useInventoryCategories();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 px-1 flex items-center gap-1.5">
          <Layers size={12} className="text-gray-400" />
          {t('section_classification')}
        </label>
        <div className="relative">
          <select
            {...register('category')}
            className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none appearance-none focus:border-blue-500 transition-all dark:text-slate-200"
          >
            <option value="">{t('general_section') || 'قسم عام'}</option>
            {Array.isArray(categories) && categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <Layers className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        </div>
        <p className="text-[8px] text-gray-400 mt-1 px-1">{t('add_category_info')}</p>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 px-1">{t('selling_unit')}</label>
        <div className="flex h-[42px] bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700">
          <button
            type="button"
            onClick={() => setValue('unit', 'piece')}
            className={cn(
              "flex-1 rounded-lg text-[10px] font-bold transition-all",
              currentUnit === 'piece' ? "bg-white dark:bg-slate-600 text-blue-600 shadow-sm" : "text-gray-400"
            )}
          >{t('piece')}</button>
          <button
            type="button"
            onClick={() => setValue('unit', 'set')}
            className={cn(
              "flex-1 rounded-lg text-[10px] font-bold transition-all",
              currentUnit === 'set' ? "bg-white dark:bg-slate-600 text-blue-600 shadow-sm" : "text-gray-400"
            )}
          >{t('set')}</button>
        </div>
      </div>
    </div>
  );
};

export default ProductCategory;
