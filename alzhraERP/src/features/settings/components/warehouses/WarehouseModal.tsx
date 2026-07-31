import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Package, MapPin, ShieldCheck, Save } from 'lucide-react';
import Modal from '../../../../ui/base/Modal';
import Button from '../../../../ui/base/Button';
import Input from '../../../../ui/base/Input';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { useBranches } from '../../hooks';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
  initialData?: any;
}

const WarehouseModal: React.FC<Props> = ({ isOpen, onClose, onSave, isSaving, initialData }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (isOpen) reset(initialData || { name_ar: '', location: '', is_primary: false, branch_id: '' });
  }, [isOpen, initialData, reset]);

  const { data: branches } = useBranches();

  const entityType = t('warehouse');
  const title = initialData
    ? t('edit_entity', { entity: entityType })
    : t('add_entity', { entity: entityType });

  const footer = (
    <>
      <button onClick={onClose} className="flex-1 py-3 text-[10px] font-bold text-gray-400 bg-white dark:bg-slate-800 border dark:border-slate-700 uppercase">
        {t('cancel')}
      </button>
      <Button
        onClick={handleSubmit(onSave)}
        isLoading={isSaving}
        className="flex-[2] rounded-none text-[10px] font-bold bg-blue-600 border-blue-700 shadow-none uppercase"
        leftIcon={<Save size={14} />}
      >
        {t('save_changes')}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={Package}
      title={title}
      description={t('warehouse_desc')}
      footer={footer}
    >
      <form onSubmit={handleSubmit(onSave)} className="flex flex-col border-t dark:border-slate-800">
        <Input
          label={t('warehouse_name_label')}
          placeholder={t('warehouse_name_placeholder')}
          {...register('name_ar', { required: t('warehouse_name_required') })}
          error={errors.name_ar?.message as string}
          icon={<Package />}
        />
        <Input
          label={t('warehouse_location_label')}
          placeholder={t('warehouse_location_placeholder')}
          {...register('location')}
          icon={<MapPin />}
        />

        <div className="p-3 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-800">
          <label className="text-[10px] font-bold text-gray-400 uppercase px-1 mb-1 block">
            الفرع التابع له (اختياري)
          </label>
          <select
            {...register('branch_id')}
            className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl p-2 text-[11px] font-bold outline-none"
          >
            <option value="">-- فرع رئيسي / بدون فرع --</option>
            {branches?.map((branch: any) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-950 border-b dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
              <ShieldCheck size={14} />
            </div>
            <span className="text-[10px] font-bold text-gray-600 dark:text-slate-400">{t('default_warehouse_for_ops')}</span>
          </div>
          <div className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" {...register('is_primary')} className="sr-only peer" />
            <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
export default WarehouseModal;
