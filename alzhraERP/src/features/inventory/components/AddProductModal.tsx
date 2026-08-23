/* eslint-disable */
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Zap, ShieldCheck, Package, DollarSign, Box } from 'lucide-react';
import { ProductFormData, Product } from '../types';
import { productFormSchema } from '../schema';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import SimilarityAdvisor from './SimilarityAdvisor';
import { useSimilarityCheck } from '../hooks/useSimilarityCheck';

// Modular Form Components
import ProductImageUploader from './product_form/ProductImageUploader';
import ProductCoreInfo from './product_form/ProductCoreInfo';
import ProductCategory from './product_form/ProductCategory';
import ProductFinancials from './product_form/ProductFinancials';
import ProductStockInfo from './product_form/ProductStockInfo';
import ProductDetails from './product_form/ProductDetails';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => void | Promise<void>;
  isSubmitting: boolean;
  initialData?: Product | null;
  /** Optional override for the overlay z-index (e.g. when opened above a fullscreen modal). */
  zIndex?: string;
}

/* eslint-disable max-lines-per-function -- نافذة إضافة وتعديل المنتج الشاملة */
const AddProductModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  zIndex,
}) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema) as any,
    defaultValues: {
      unit: 'piece',
      category: '',
      min_stock_level: 5,
    },
  });

  const productName = watch('name');
  const { similarProducts, setSimilarProducts } = useSimilarityCheck(
    productName,
    user?.company_id,
    !initialData
  );

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const rawUnit = initialData.unit;
        const normalizedUnit = rawUnit === 'set' ? 'set' : 'piece';
        const rawAlternatives =
          initialData.alternative_numbers ||
          (Array.isArray(initialData.alternatives) && initialData.alternatives.length > 0
            ? initialData.alternatives.join(', ')
            : '');

        reset({
          name: initialData.name || initialData.name_ar || '',
          sku: initialData.sku || '',
          part_number: initialData.part_number || '',
          brand: initialData.brand || '',
          size: initialData.size || '',
          specifications: initialData.specifications || '',
          alternative_numbers: rawAlternatives,
          image_url: initialData.image_url || null,
          cost_price: initialData.cost_price ?? initialData.purchase_price ?? '',
          selling_price: initialData.selling_price ?? initialData.sale_price ?? '',
          min_stock_level: initialData.min_stock_level ?? 5,
          stock_quantity: initialData.stock_quantity ?? 0,
          unit: normalizedUnit,
          category:
            initialData.category_id ||
            (initialData.category && initialData.category.length === 36
              ? initialData.category
              : '') ||
            '',
          location: initialData.location || '',
        });
      } else {
        const autoSku = `AZ-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        reset({
          name: '',
          sku: autoSku,
          part_number: '',
          brand: '',
          size: '',
          specifications: '',
          alternative_numbers: '',
          image_url: null,
          cost_price: '',
          selling_price: '',
          min_stock_level: 5,
          stock_quantity: 0,
          unit: 'piece',
          category: '',
          location: '',
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const onInvalid = (formErrors: typeof errors): void => {
    const errorList = Object.values(formErrors)
      .map(e => e?.message)
      .filter(Boolean);
    const firstMsg = errorList[0] || t('validation_error') || 'يرجى مراجعة وتصحيح الحقول المطلوبة';
    showToast(String(firstMsg), 'error');
  };

  const footer = (
    <div className="flex w-full gap-2 p-1">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 border bg-gray-50 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800"
      >
        {t('cancel')}
      </button>
      <Button
        onClick={handleSubmit(onSubmit as any, onInvalid)}
        isLoading={isSubmitting}
        className="flex-[2] rounded-none border-blue-700 bg-blue-600 text-[11px] font-bold uppercase tracking-widest shadow-xl"
        leftIcon={<Save size={16} />}
      >
        {initialData ? t('update_data') : t('confirm_product')}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={initialData ? ShieldCheck : Package}
      title={initialData ? t('edit_product_title') : t('new_product_title')}
      description={t('product_card_desc')}
      footer={footer}
      {...(zIndex ? { zIndex } : {})}
    >
      <div className="flex flex-col">
        <div className="flex flex-row gap-6 border-b bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex w-32 shrink-0 flex-col gap-2">
            <ProductImageUploader setValue={setValue} watch={watch} />
            <div className="space-y-1">
              <label className="block text-center text-[9px] font-bold uppercase tracking-tighter text-blue-500">
                {t('product_code')}
              </label>
              <input
                {...register('sku')}
                readOnly
                className="w-full rounded-lg border border-blue-100 bg-blue-50/50 py-1.5 text-center font-mono text-[10px] font-bold text-blue-700 outline-none dark:border-blue-800 dark:bg-blue-900/10 dark:text-blue-400"
              />
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <ProductCategory register={register} watch={watch} setValue={setValue} />
          </div>
        </div>

        <div className="border-b bg-gray-50/30 p-5 dark:border-slate-800 dark:bg-slate-950/30">
          <h4 className="mb-4 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <Zap size={14} className="text-blue-500" />
            {t('identity_data')}
          </h4>
          <ProductCoreInfo register={register} errors={errors} />
          <SimilarityAdvisor
            isVisible={similarProducts.length > 0}
            similarProducts={similarProducts}
            onApplyName={name => {
              setValue('name', name);
              setSimilarProducts([]);
            }}
          />
        </div>

        <div className="space-y-6 bg-white p-5 dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-x-6">
            <div className="space-y-3">
              <h4 className="flex items-center gap-1.5 px-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                <DollarSign size={12} /> {t('pricing')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <ProductFinancials register={register} errors={errors} />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="flex items-center gap-1.5 px-1 text-[9px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                <Box size={12} /> {t('stock')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <ProductStockInfo register={register} errors={errors} />
              </div>
            </div>
          </div>
          <ProductDetails register={register} />
        </div>
      </div>
    </Modal>
  );
};

export default AddProductModal;
