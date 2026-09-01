import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, ShieldCheck, Zap, Plus, Phone, Globe, Copy } from 'lucide-react';
import { PartyFormData, Party, PartyType } from '../types';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import Modal from '../../../ui/base/Modal';
import { useCategories, useCategoryMutations } from '../hooks';
import CategoryModal from './CategoryModal';
import { cn } from '../../../core/utils';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface PartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PartyFormData) => void;
  isSubmitting: boolean;
  initialData?: Party | null;
  prefillData?: Partial<PartyFormData> | null;
  partyType: PartyType;
}

const PartyModal: React.FC<PartyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  prefillData,
  partyType,
}) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<PartyFormData>();
  const { data: categories } = useCategories(partyType);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const { save: saveCategory, isSaving: isSavingCategory } = useCategoryMutations(partyType);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name,
          phone: initialData.phone || '',
          email: initialData.email || '',
          tax_number: initialData.tax_number || '',
          address: initialData.address || '',
          type: partyType,
          status: initialData.status || 'active',
          category_id: initialData.category_id || '',
        });
      } else if (prefillData) {
        reset({
          type: partyType,
          name: prefillData.name || '',
          phone: prefillData.phone || '',
          email: prefillData.email || '',
          tax_number: prefillData.tax_number || '',
          address: prefillData.address || '',
          status: prefillData.status || 'active',
          category_id: prefillData.category_id || '',
        });
      } else {
        reset({
          type: partyType,
          name: '',
          phone: '',
          email: '',
          tax_number: '',
          address: '',
          status: 'active',
          category_id: '',
        });
      }
    }
  }, [isOpen, initialData, reset, partyType]);

  const entityType = partyType === 'customer' ? t('customer') : t('supplier');
  const title = initialData
    ? t('edit_entity', { entity: entityType })
    : t('add_entity', { entity: entityType });

  const currentStatus = watch('status');

  const handleSaveCategory = (data: { name: string }) => {
    saveCategory(
      { name: data.name },
      {
        onSuccess: () => setIsCategoryModalOpen(false),
      }
    );
  };

  const footer = (
    <div className="flex w-full gap-3 border-t bg-gray-50 p-2 dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 dark:border-slate-700 dark:bg-slate-800"
      >
        {t('cancel')}
      </button>
      <Button
        onClick={handleSubmit(onSubmit)}
        isLoading={isSubmitting}
        className="flex-[2] rounded-xl border-blue-700 bg-blue-600 py-3 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20"
      >
        {initialData ? t('update_data') : t('save')}
      </Button>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        icon={initialData ? ShieldCheck : Zap}
        title={title}
        description={t('party_management_desc')}
        size="xl"
        footer={footer}
      >
        <form className="flex flex-col overflow-hidden">
          {/* Section 1: Core Identity */}
          <div className="space-y-5 bg-[var(--app-surface)] p-6">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">
                <User size={14} />
                {t('core_identity')}
              </h4>
              <div className="flex h-9 w-32 rounded-xl border border-gray-200/50 bg-gray-100 p-1 dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setValue('status', 'active')}
                  className={cn(
                    'flex-1 rounded-lg text-[10px] font-bold transition-all duration-300',
                    currentStatus === 'active'
                      ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-600'
                      : 'text-gray-400 hover:text-gray-500'
                  )}
                >
                  {t('active')}
                </button>
                <button
                  type="button"
                  onClick={() => setValue('status', 'blocked')}
                  className={cn(
                    'flex-1 rounded-lg text-[10px] font-bold transition-all duration-300',
                    currentStatus === 'blocked'
                      ? 'bg-white text-rose-600 shadow-sm dark:bg-slate-600'
                      : 'text-gray-400 hover:text-gray-500'
                  )}
                >
                  {t('blocked')}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label={t('full_name')}
                {...register('name', { required: t('name_required') })}
                error={errors.name?.message}
                autoFocus
                className="bg-gray-50/50"
              />

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {t('category')}
                  </label>
                  <div className="flex gap-2">
                    <div className="group relative flex-1">
                      <select
                        {...register('category_id')}
                        className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800/50"
                      >
                        <option value="">{t('general')}</option>
                        {Array.isArray(categories) &&
                          categories.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-hover:text-blue-500">
                        <Zap size={14} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm transition-all hover:bg-blue-600 hover:text-white dark:bg-blue-900/20"
                      title={t('add_new_category')}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Communication */}
          <div className="space-y-5 border-t bg-gray-50/50 p-6 dark:border-slate-800 dark:bg-slate-950/20">
            <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">
              <Phone size={14} />
              {t('contact_info')}
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label={t('phone_number')}
                {...register('phone')}
                dir="ltr"
                className="bg-[var(--app-surface)] font-mono"
              />
              <Input
                label={t('email_address')}
                {...register('email')}
                type="email"
                dir="ltr"
                className="bg-[var(--app-surface)] font-mono"
              />
            </div>

            <Input
              label={t('address')}
              {...register('address')}
              className="bg-[var(--app-surface)]"
            />
          </div>

          {/* Section 3: Supplier Portal Link */}
          {partyType === 'supplier' && initialData?.portal_token && (
            <div className="space-y-3 border-t bg-blue-50/30 p-6 dark:border-slate-800 dark:bg-blue-950/20">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">
                  <Globe size={14} />
                  بوابة المورد الإلكترونية (Supplier Portal)
                </h4>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  مفعلة
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/portal/supplier/${initialData.portal_token}`}
                  className="w-full select-all bg-transparent font-mono text-[11px] font-bold text-slate-800 outline-none dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      `${window.location.origin}/portal/supplier/${initialData.portal_token}`
                    );
                    alert('تم نسخ رابط البوابة بنجاح');
                  }}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white transition-all hover:bg-blue-700"
                >
                  <Copy size={13} />
                  <span>نسخ</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        isSaving={isSavingCategory}
        initialData={null}
      />
    </>
  );
};

export default PartyModal;
