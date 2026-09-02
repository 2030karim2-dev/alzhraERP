import React from 'react';
import { Save, Landmark } from 'lucide-react';
import type { ExpenseFormData } from '../../types';
import Button from '../../../../ui/base/Button';
import Modal from '../../../../ui/base/Modal';
import { useExpenseForm } from './hooks/useExpenseForm';
import { ExpenseAmountSection } from './components/ExpenseAmountSection';
import { ExpenseCategorySection } from './components/ExpenseCategorySection';

import { ExpenseFinancialSection } from './components/ExpenseFinancialSection';
import { useFeedbackStore } from '../../../feedback/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => void;
  isSubmitting: boolean;
}

const CreateExpenseModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const {
    form,
    categories,
    currencies,
    newCatMode,
    setNewCatMode,
    newCatName,
    setNewCatName,
    handleAddCategory,
    isAddingCategory,
  } = useExpenseForm(isOpen);

  const { register, handleSubmit, watch, setValue } = form;

  const { showToast } = useFeedbackStore();

  const onInvalidSubmit = (errors: Record<string, unknown>) => {
    // Collect error messages
    const errorMessages = Object.keys(errors).map(key => {
      const fieldNames: Record<string, string> = {
        category_id: 'التصنيف',
        amount: 'المبلغ',
        expense_date: 'تاريخ الصرف',
        description: 'البيان',
        exchange_rate: 'سعر الصرف',
      };
      return `حقل ${fieldNames[key] || key} مطلوب أو غير صالح`;
    });

    if (errorMessages.length > 0) {
      showToast(errorMessages.join(' | '), 'error');
    } else {
      showToast('الرجاء التأكد من تعبئة جميع الحقول المطلوبة', 'error');
    }
  };

  const footer = (
    <div className="flex w-full gap-2 p-1">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 border bg-gray-50 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800"
      >
        إلغاء
      </button>
      <Button
        onClick={handleSubmit(onSubmit, onInvalidSubmit)}
        isLoading={isSubmitting}
        className="flex-[2] rounded-none border-rose-700 bg-rose-600 text-[11px] font-bold uppercase tracking-widest shadow-xl"
        leftIcon={<Save size={16} />}
      >
        حفظ واعتماد المصروف
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={Landmark}
      title="قسيمة صرف مالي"
      description="إدارة التدفقات النقدية الخارجة"
      footer={footer}
    >
      <form className="flex flex-col">
        <ExpenseAmountSection
          register={register}
          currenciesData={currencies.data || []}
          watch={watch}
          setValue={setValue}
        />

        <ExpenseCategorySection
          register={register}
          categories={categories as any[]}
          newCatMode={newCatMode}
          setNewCatMode={setNewCatMode}
          newCatName={newCatName}
          setNewCatName={setNewCatName}
          handleAddCategory={handleAddCategory}
          isAddingCategory={isAddingCategory}
        />

        <ExpenseFinancialSection watch={watch} setValue={setValue} />
      </form>
    </Modal>
  );
};

export default CreateExpenseModal;
