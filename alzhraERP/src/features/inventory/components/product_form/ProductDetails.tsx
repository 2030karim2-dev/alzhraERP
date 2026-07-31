import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { ProductFormData } from '../../types';
import Input from '../../../../ui/base/Input';
import { Maximize2, MapPin, AlignRight } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';

interface Props { register: UseFormRegister<ProductFormData>; }

const ProductDetails: React.FC<Props> = ({ register }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
          <Input 
            label={t('size_dimension')}
            placeholder="17mm" 
            {...register('size')} 
            icon={<Maximize2 className="text-blue-400" />} 
          />
          <Input 
            label={t('shelf_location')}
            placeholder="A-1-4" 
            {...register('location')} 
            icon={<MapPin className="text-rose-400" />} 
          />
      </div>

      <div className="w-full">
          <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 px-1 flex items-center gap-1.5">
             <AlignRight size={10} className="text-slate-400" /> {t('additional_specs')}
          </label>
          <textarea 
            {...register('specifications')} 
            rows={2} 
            placeholder="سجل هنا أي معلومات تقنية إضافية أو بدائل للقطعة..."
            className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all dark:text-slate-100 shadow-sm" 
          />
      </div>
    </div>
  );
};

export default ProductDetails;
