import React from 'react';
import { useForm } from 'react-hook-form';
import { Layers, Save, Book, FolderTree } from 'lucide-react';
import type { AccountFormData, Account } from '../../types/index'; // Import Account type
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

const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  accounts = [],
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<AccountFormData>();
  const selectedType = watch('type');

  // Filter potential parents based on type (optional but good UX)
  const potentialParents = accounts.filter(acc => !selectedType || acc.type === selectedType);

  React.useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const footer = (
    <>
      <button
        onClick={onClose}
        className="flex-1 border border-[var(--app-border)] bg-[var(--app-surface)] py-3 text-[10px] font-bold uppercase text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface-hover)]"
      >
        إلغاء
      </button>
      <Button
        onClick={handleSubmit(onSubmit)}
        isLoading={isSubmitting}
        variant="primary"
        size="md"
        className="flex-[2]"
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

        <div className="flex flex-col border-b border-[var(--app-border)]">
          <label className="bg-[var(--app-surface-hover)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)]">
            نوع الحساب (Account Classification)
          </label>
          <select
            {...register('type', { required: true })}
            className="appearance-none bg-[var(--app-surface)] p-3 text-[10px] font-bold text-[var(--app-text)] outline-none"
          >
            <option value="asset">أصول (Assets)</option>
            <option value="liability">خصوم (Liabilities)</option>
            <option value="equity">حقوق ملكية (Equity)</option>
            <option value="revenue">إيرادات (Revenues)</option>
            <option value="expense">مصروفات (Expenses)</option>
          </select>
        </div>

        <div className="flex flex-col border-b border-[var(--app-border)]">
          <label
            htmlFor="account-currency"
            className="bg-[var(--app-surface-hover)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)]"
          >
            العملة (Currency)
          </label>
          <select
            id="account-currency"
            {...register('currency_code')}
            className="appearance-none bg-[var(--app-surface)] p-3 text-[10px] font-bold text-[var(--app-text)] outline-none"
          >
            <option value="SAR">SAR — ريال سعودي</option>
            <option value="YER">YER — ريال يمني</option>
            <option value="USD">USD — دولار أمريكي</option>
            <option value="OMR">OMR — ريال عماني</option>
            <option value="CNY">CNY — يوان صيني</option>
          </select>
        </div>

        <div className="flex flex-col border-b border-[var(--app-border)]">
          <label className="flex items-center gap-2 bg-[var(--app-surface-hover)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)]">
            <FolderTree size={10} />
            الحساب الرئيسي (اختياري)
          </label>
          <select
            {...register('parent_id')}
            className="appearance-none bg-[var(--app-surface)] p-3 text-[10px] font-bold text-[var(--app-text)] outline-none"
          >
            <option value="">-- حساب رئيسي (Root) --</option>
            {potentialParents.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.code} - {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-blue-50/20 p-3 dark:bg-blue-900/5">
          <Book size={14} className="shrink-0 text-blue-500" />
          <p className="text-[10px] font-bold leading-tight text-blue-800 dark:text-blue-400">
            سيتم إضافة هذا الحساب بشكل آلي إلى دفتر الأستاذ العام وسيكون متاحاً لترحيل القيود فور
            حفظه.
          </p>
        </div>
      </form>
    </Modal>
  );
};

export default AddAccountModal;
