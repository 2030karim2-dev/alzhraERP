import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, ShieldCheck, Zap, Plus, Phone } from 'lucide-react';
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

const PartyModal: React.FC<PartyModalProps> = ({ isOpen, onClose, onSubmit, isSubmitting, initialData, prefillData, partyType }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<PartyFormData>();
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
          category_id: initialData.category_id || ''
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
          category_id: prefillData.category_id || ''
        });
      } else {
        reset({ type: partyType, name: '', phone: '', email: '', tax_number: '', address: '', status: 'active', category_id: '' });
      }
    }
  }, [isOpen, initialData, reset, partyType]);

  const entityType = partyType === 'customer' ? t('customer') : t('supplier');
  const title = initialData
    ? t('edit_entity', { entity: entityType })
    : t('add_entity', { entity: entityType });

  const currentStatus = watch('status');

  const handleSaveCategory = (data: { name: string }) => {
    saveCategory({ name: data.name }, {
      onSuccess: () => setIsCategoryModalOpen(false)
    });
  };

  const footer = (
    <div className="flex w-full gap-3 p-2 bg-gray-50 dark:bg-slate-900 border-t dark:border-slate-800">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 py-3 text-[10px] font-bold text-gray-500 hover:text-gray-700 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl uppercase tracking-widest transition-all hover:bg-gray-100"
      >
        {t('cancel')}
      </button>
      <Button
        onClick={handleSubmit(onSubmit)}
        isLoading={isSubmitting}
        className="flex-[2] rounded-xl text-[10px] font-bold bg-blue-600 border-blue-700 shadow-lg shadow-blue-500/20 uppercase tracking-widest py-3"
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
          <div className="p-6 bg-white dark:bg-slate-900 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <User size={14} />
                {t('core_identity')}
              </h4>
              <div className="flex h-9 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200/50 dark:border-slate-700 w-32">
                <button
                  type="button"
                  onClick={() => setValue('status', 'active')}
                  className={cn(
                    "flex-1 rounded-lg text-[9px] font-bold transition-all duration-300",
                    currentStatus === 'active'
                      ? "bg-white dark:bg-slate-600 text-emerald-600 shadow-sm"
                      : "text-gray-400 hover:text-gray-500"
                  )}
                >
                  {t('active')}
                </button>
                <button
                  type="button"
                  onClick={() => setValue('status', 'blocked')}
                  className={cn(
                    "flex-1 rounded-lg text-[9px] font-bold transition-all duration-300",
                    currentStatus === 'blocked'
                      ? "bg-white dark:bg-slate-600 text-rose-600 shadow-sm"
                      : "text-gray-400 hover:text-gray-500"
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
                placeholder={t('enter_full_name')}
                autoFocus
                className="bg-gray-50/50"
              />

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                    {t('category')}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1 group">
                      <select
                        {...register('category_id')}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none appearance-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                        <option value="">{t('general')}</option>
                        {Array.isArray(categories) && categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors">
                        <Zap size={14} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="w-12 h-12 flex-shrink-0 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
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
          <div className="p-6 bg-gray-50/50 dark:bg-slate-950/20 border-t dark:border-slate-800 space-y-5">
            <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Phone size={14} />
              {t('contact_info')}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('phone_number')}
                {...register('phone')}
                placeholder="+967 --- --- ---"
                dir="ltr"
                className="bg-white dark:bg-slate-900 font-mono"
              />
              <Input
                label={t('email_address')}
                {...register('email')}
                type="email"
                placeholder="example@mail.com"
                dir="ltr"
                className="bg-white dark:bg-slate-900 font-mono"
              />
            </div>

            <Input
              label={t('address')}
              {...register('address')}
              placeholder={t('enter_physical_address')}
              className="bg-white dark:bg-slate-900"
            />
          </div>
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
