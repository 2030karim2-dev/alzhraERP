
import React from 'react';
import { useForm } from 'react-hook-form';
import { Layers, Save, Book, FolderTree } from 'lucide-react';
import { AccountFormData, Account } from '../../types/index'; // Import Account type
import Modal from '../../../../ui/base/Modal';
import Button from '../../../../ui/base/Button';
import Input from '../../../../ui/base/Input';
import AIAssistantButton from '../../../../ui/common/AIAssistantButton';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountFormData) => void;
  isSubmitting: boolean;
  accounts?: Account[] | undefined;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onSubmit, isSubmitting, accounts = [] }) => {
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<AccountFormData>();
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
        <div className="p-3 border-b dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-900/10 flex justify-between items-center bg-[url('/bg-pattern.svg')] bg-cover">
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-indigo-800 dark:text-indigo-300">مساعد إدخال الحسابات</span>
            <span className="text-[9px] text-indigo-600/70 dark:text-indigo-400/70 font-bold">اشرح الحساب الذي تريد إضافته وسجلّه آلياً.</span>
          </div>
          <AIAssistantButton
            promptDescription="أنت تقوم بإنشاء حساب مالي جديد في دليل الحسابات (شجرة الحسابات). استنتج رمز الحساب والاسم ونوعه المناسب والحساب الرئيسي من طلب المستخدم بالرجوع لقائمة الحسابات المتوفرة."
            schemaDescription={`{
  "code": "رمز الحساب المالي (يستنتج ليكون تابعاً للحساب الرئيسي إن وجد، أو رقم مقترح)",
  "name": "الاسم الكامل للحساب",
  "type": "نوع الحساب، يجب أن يكون أحد هذه القيم فقط: asset, liability, equity, revenue, expense",
  "parent_id": "معرف (ID) الحساب الرئيسي (الأب). ابحث في الحسابات المرفقة عن الأنسب وأرجع المعرف الخاص به، وإذا كان حساباً مستقلاً أرجع سلسلة فارغة"
}`}
            contextData={{
               existingAccounts: accounts.map(a => ({ id: a.id, name: a.name, code: a.code, type: a.type }))
            }}
            onDataExtracted={(data) => {
               type AccountAIData = { code?: string; name?: string; type?: string; parent_id?: string };
               const d = data as AccountAIData;
               if (d.code) setValue('code', d.code, { shouldValidate: true });
               if (d.name) setValue('name', d.name, { shouldValidate: true });
               if (d.type) setValue('type', d.type as AccountFormData['type'], { shouldValidate: true });
               if (d.parent_id) setValue('parent_id', d.parent_id, { shouldValidate: true });
            }}
          />
        </div>

        <div className="grid grid-cols-3 divide-x-0">
          <div className="col-span-1">
            <Input
              label="رمز الحساب"
              placeholder="Ex: 1010"
              {...register('code', { required: 'مطلوب' })}
              error={errors.code?.message}
              dir="ltr"
              className="font-mono font-bold"
            />
          </div>
          <div className="col-span-2">
            <Input
              label="اسم الحساب المالي"
              placeholder="أدخل اسم الحساب..."
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
