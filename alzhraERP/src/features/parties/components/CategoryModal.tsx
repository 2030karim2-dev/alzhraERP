
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { LayoutGrid } from 'lucide-react';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string }) => void;
  isSaving: boolean;
  initialData?: any;
}

const CategoryModal: React.FC<Props> = ({ isOpen, onClose, onSave, isSaving, initialData }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ name: string }>();

  useEffect(() => {
    if (isOpen) reset(initialData || { name: '' });
  }, [isOpen, initialData, reset]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={LayoutGrid}
      title={initialData ? t('edit_category') : t('add_new_category')}
      description={t('organizational_category_desc')}
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1">{t('cancel')}</Button>
          <Button onClick={handleSubmit(onSave)} isLoading={isSaving} className="flex-1">
            {initialData ? t('save_changes') : t('add')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSave)}>
        <Input
          label={t('category_name_label')}
          {...register('name', { required: t('category_name_required') })}
          error={errors.name?.message}
          placeholder={t('category_name_placeholder')}
          autoFocus
        />
      </form>
    </Modal>
  );
};

export default CategoryModal;
