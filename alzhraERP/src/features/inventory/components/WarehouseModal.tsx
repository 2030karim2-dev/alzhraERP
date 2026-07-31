import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Package, MapPin } from 'lucide-react';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
  initialData?: any;
}

const WarehouseModal: React.FC<Props> = ({ isOpen, onClose, onSave, isSaving, initialData }) => {
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (isOpen) reset(initialData || { name_ar: '', location: '' });
  }, [isOpen, initialData, reset]);

  const footer = (
    <>
      <Button variant="outline" onClick={onClose} className="flex-1">إلغاء</Button>
      <Button
        onClick={handleSubmit(onSave)}
        isLoading={isSaving}
        className="flex-1"
      >
        {initialData ? 'حفظ التعديلات' : 'إضافة مستودع'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={Package}
      title={initialData ? "تعديل بيانات المستودع" : "مستودع جديد"}
      description="إدارة مواقع تخزين البضاعة"
      footer={footer}
    >
      <form className="space-y-4">
        <Input label="اسم المستودع / الفرع" placeholder="مثال: المستودع الرئيسي" {...register('name_ar', { required: true })} icon={<Package />} />
        <Input label="الموقع (اختياري)" placeholder="مثال: مدينة جدة، حي الصناعية" {...register('location')} icon={<MapPin />} />
      </form>
    </Modal>
  );
};
export default WarehouseModal;