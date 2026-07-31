
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar } from 'lucide-react';
import Modal from '../../../../ui/base/Modal';
import Button from '../../../../ui/base/Button';
import Input from '../../../../ui/base/Input';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}

const FiscalYearModal: React.FC<Props> = ({ isOpen, onClose, onSave, isSaving }) => {
  const { register, handleSubmit, reset } = useForm();
  
  useEffect(() => {
    if (isOpen) {
      const currentYear = new Date().getFullYear();
      reset({
        name: currentYear.toString(),
        start_date: `${currentYear}-01-01`,
        end_date: `${currentYear}-12-31`
      });
    }
  }, [isOpen, reset]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={Calendar}
      title="إنشاء سنة مالية جديدة"
      description="تحديد فترة محاسبية جديدة لتسجيل القيود والفواتير"
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="flex-1">إلغاء</Button>
          <Button onClick={handleSubmit(onSave)} isLoading={isSaving} className="flex-1">إنشاء السنة</Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input label="اسم السنة" {...register('name', { required: true })} icon={<Calendar size={16}/>} />
        <Input label="تاريخ بداية الفترة" type="date" {...register('start_date', { required: true })} icon={<Calendar size={16}/>} />
        <Input label="تاريخ نهاية الفترة" type="date" {...register('end_date', { required: true })} icon={<Calendar size={16}/>} />
      </form>
    </Modal>
  );
};
export default FiscalYearModal;
