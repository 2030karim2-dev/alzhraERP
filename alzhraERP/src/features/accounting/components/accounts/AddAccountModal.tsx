
import React from 'react';
import { useForm } from 'react-hook-form';
import { Layers, Save, Book, FolderTree } from 'lucide-react';
import { AccountFormData, Account } from '../../types/index'; // Import Account type
import Modal from '../../../../ui/base/Modal';
import Button from '../../../../ui/base/Button';
import Input from '../../../../ui/base/Input';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountFormData) => void;
  isSubmitting: boolean;
  accounts?: Account[] | undefined;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onSubmit, isSubmitting, accounts = [] }) => {
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<AccountFormData>();
  const selectedType = watch('type');

  // Filter potential parents based on type (optional but good UX)
  const potentialParents = accounts.filter(acc => !selectedType || acc.type === selectedType);

  React.useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const footer = (
    <>
      <button onClick={onClose} className="flex-1 py-3 text-[10px] font-bold text-gray-400 bg-white dark:bg-slate-800 border dark:border-slate-700 uppercase">إلغاء</button>
      <Button
        onClick={handleSubmit(onSubmit)}
        isLoading={isSubmitting}
        className="flex-[2] rounded-none text-[10px] font-bold bg-blue-600 border-blue-700 shadow-none uppercase"
        leftIcon={<Save size={14} />}
      >
        حفظ الحساب
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={Layers}
      title="إضافة حساب جديد"
      description="Micro-UI Chart of Accounts"
      footer={footer}
    >
      <form className="flex flex-col border-t dark:border-slate-800">

        <div className="grid grid-cols-3 divide-x-0">
          <div className="col-span-1">
            <Input
              label="رمز الحساب"
              {...register('code', { required: 'مطلوب' })}
              error={errors.code?.message}
              dir="ltr"
              className="font-mono font-bold"
            />
          </div>
          <div className="col-span-2">
            <Input
              label="اسم الحساب المالي"
              {...register('name', { required: 'مطلوب' })}
              error={errors.name?.message}
            />
          </div>
        </div>

        <div className="flex flex-col border-b dark:border-slate-800">
          <label className="text-[8px] font-bold text-gray-400 px-2 py-1 bg-gray-50 dark:bg-slate-800/30 uppercase tracking-widest">نوع الحساب (Account Classification)</label>
          <select
            {...register('type', { required: true })}
            className="bg-white dark:bg-slate-900 text-[10px] font-bold p-3 outline-none appearance-none dark:text-white border-b dark:border-slate-800"
          >
            <option value="asset">أصول (Assets)</option>
            <option value="liability">خصوم (Liabilities)</option>
            <option value="equity">حقوق ملكية (Equity)</option>
            <option value="revenue">إيرادات (Revenues)</option>
            <option value="expense">مصروفات (Expenses)</option>
          </select>
        </div>

        <div className="flex flex-col border-b dark:border-slate-800">
          <label htmlFor="account-currency" className="text-[8px] font-bold text-gray-400 px-2 py-1 bg-gray-50 dark:bg-slate-800/30 uppercase tracking-widest">العملة (Currency)</label>
          <select
            id="account-currency"
            {...register('currency_code')}
            className="bg-white dark:bg-slate-900 text-[10px] font-bold p-3 outline-none appearance-none dark:text-white border-b dark:border-slate-800"
          >
            <option value="SAR">SAR — ريال سعودي</option>
            <option value="YER">YER — ريال يمني</option>
            <option value="USD">USD — دولار أمريكي</option>
            <option value="OMR">OMR — ريال عماني</option>
            <option value="CNY">CNY — يوان صيني</option>
          </select>
        </div>

        <div className="flex flex-col border-b dark:border-slate-800">
          <label className="text-[8px] font-bold text-gray-400 px-2 py-1 bg-gray-50 dark:bg-slate-800/30 uppercase tracking-widest flex items-center gap-2">
            <FolderTree size={10} />
            الحساب الرئيسي (اختياري)
          </label>
          <select
            {...register('parent_id')}
            className="bg-white dark:bg-slate-900 text-[10px] font-bold p-3 outline-none appearance-none dark:text-white"
          >
            <option value="">-- حساب رئيسي (Root) --</option>
            {potentialParents.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.code} - {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-blue-50/20 dark:bg-blue-900/5 p-3 flex gap-2 items-center">
          <Book size={14} className="text-blue-500 shrink-0" />
          <p className="text-[9px] font-bold text-blue-800 dark:text-blue-400 leading-tight">
            سيتم إضافة هذا الحساب بشكل آلي إلى دفتر الأستاذ العام وسيكون متاحاً لترحيل القيود فور حفظه.
          </p>
        </div>
      </form>
    </Modal>
  );
};

export default AddAccountModal;
