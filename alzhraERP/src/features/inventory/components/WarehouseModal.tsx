import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Package, MapPin, Building2, Hash } from 'lucide-react';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import { useBranches } from '../../settings/hooks';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
  initialData?: any;
}

const WarehouseModal: React.FC<Props> = ({ isOpen, onClose, onSave, isSaving, initialData }) => {
  const { register, handleSubmit, reset } = useForm();
  const { data: branches = [] } = useBranches();

  useEffect(() => {
    if (isOpen) {
      reset(initialData || { name_ar: '', location: '', branch_id: '', code: '' });
    }
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
      description="إدارة مواقع تخزين البضاعة وتخصيصها للفروع"
      footer={footer}
    >
      <form className="space-y-4 text-right">
        <Input 
          label="اسم المستودع" 
          placeholder="مثال: المستودع الرئيسي / مستودع قطع المحركات"
          {...register('name_ar', { required: true })} 
          icon={<Package size={16} />} 
        />

        <div className="space-y-1">
          <label className="block text-xs font-bold text-[var(--app-text)]">
            الفرع التابع له (اختياري)
          </label>
          <div className="relative">
            <select
              {...register('branch_id')}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-xs text-[var(--app-text)] outline-none focus:border-[var(--accent)]"
            >
              <option value="">مستودع عام للشركة (كافة الفروع)</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.name_ar}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input 
            label="رمز / كود المستودع (اختياري)" 
            placeholder="WH-01" 
            dir="ltr"
            {...register('code')} 
            icon={<Hash size={16} />} 
          />
          <Input 
            label="الموقع / العنوان (اختياري)" 
            placeholder="المنطقة الصناعية - بوابة 2" 
            {...register('location')} 
            icon={<MapPin size={16} />} 
          />
        </div>
      </form>
    </Modal>
  );
};
export default WarehouseModal;