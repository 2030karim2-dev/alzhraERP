import React, { useState, useEffect } from 'react';
import { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Camera, X } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { ProductFormData } from '../../types';
import { useTranslation } from '../../../../lib/hooks/useTranslation';

interface Props {
  setValue: UseFormSetValue<ProductFormData>;
  watch: UseFormWatch<ProductFormData>;
}

const ProductImageUploader: React.FC<Props> = ({ setValue, watch }) => {
  const { t } = useTranslation();
  const imageUrl = watch('image_url');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    setImagePreview(imageUrl || null);
  }, [imageUrl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setValue('image_url', result, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setValue('image_url', null, { shouldDirty: true });
  };

  return (
    <div className="w-32 shrink-0">
      <label className="block text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tighter mb-1 px-1">{t('product_preview')}</label>
      <div className="relative group">
        <div className={cn(
            "w-32 h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all",
            "border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 group-hover:border-blue-500/40",
            imagePreview && "border-solid border-blue-500 shadow-lg"
        )}>
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-300 dark:text-slate-700">
              <Camera size={28} />
              <span className="text-[8px] font-bold uppercase">{t('upload_image')}</span>
            </div>
          )}
          <label className="absolute inset-0 cursor-pointer">
            <input type="file" accept="image/*" onChange={handleImageChange} className="w-full h-full opacity-0" />
          </label>
        </div>
        {imagePreview && (
          <button type="button" onClick={clearImage} className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all z-10">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductImageUploader;
