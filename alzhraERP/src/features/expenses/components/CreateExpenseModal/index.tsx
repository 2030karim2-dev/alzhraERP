import React from 'react';
import { Save, Landmark } from 'lucide-react';
import { ExpenseFormData } from '../../types';
import Button from '../../../../ui/base/Button';
import Modal from '../../../../ui/base/Modal';
import { useExpenseForm } from './hooks/useExpenseForm';
import { ExpenseAmountSection } from './components/ExpenseAmountSection';
import { ExpenseCategorySection } from './components/ExpenseCategorySection';

import { ExpenseFinancialSection } from './components/ExpenseFinancialSection';
import { useFeedbackStore } from '../../../feedback/store';
import AIAssistantButton from '../../../../ui/common/AIAssistantButton';

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
        isAddingCategory
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
                exchange_rate: 'سعر الصرف'
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
                className="flex-1 py-3 text-[11px] font-bold text-gray-500 bg-gray-50 dark:bg-slate-800 border dark:border-slate-700 uppercase tracking-widest hover:bg-gray-100 transition-colors"
            >
                إلغاء
            </button>
            <Button
                onClick={handleSubmit(onSubmit, onInvalidSubmit)}
                isLoading={isSubmitting}
                className="flex-[2] rounded-none text-[11px] font-bold bg-rose-600 border-rose-700 shadow-xl uppercase tracking-widest"
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
                <div className="p-3 border-b dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-900/10 flex justify-between items-center bg-[url('/bg-pattern.svg')] bg-cover">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black text-indigo-800 dark:text-indigo-300">مساعد إدخال المصروفات</span>
                        <span className="text-[9px] text-indigo-600/70 dark:text-indigo-400/70 font-bold">اشرح المصروف وسيقوم المساعد بتعبئة النموذج آلياً.</span>
                    </div>
                    <AIAssistantButton
                        promptDescription="أنت تقوم بإنشاء سند مصروف جديد. استنتج المبلغ المطلوب، وصف المصروف، وتصنيف المصروف المناسب من طلب المستخدم بالرجوع لقائمة التصنيفات المتوفرة."
                        schemaDescription={`{
  "amount": "المبلغ كرقم",
  "description": "بيان المصروف",
  "category_id": "معرف (ID) تصنيف المصروف الأنسب من القائمة المرفقة، أو فارغ إذا لم تجد تصنيف مناسب",
  "payment_method": "نوع الدفع، اختر فقط من: cash, bank, credit_card",
  "currency_code": "رمز العملة مثل SAR أو USD أو EUR، الافتراضي SAR"
}`}
                        contextData={{
                            categories: categories?.map((c: any) => ({ id: c.id, name: c.name }))
                        }}
                        onDataExtracted={(data) => {
                            type ExpenseAIData = {
                              amount?: number; description?: string;
                              category_id?: string; payment_method?: string; currency_code?: string;
                            };
                            const d = data as ExpenseAIData;
                            if (d.amount) setValue('amount', d.amount, { shouldValidate: true });
                            if (d.description) setValue('description', d.description, { shouldValidate: true });
                            if (d.category_id) setValue('category_id', d.category_id, { shouldValidate: true });
                            if (d.payment_method) setValue('payment_method', d.payment_method as ExpenseFormData['payment_method'], { shouldValidate: true });
                            if (d.currency_code) setValue('currency_code', d.currency_code, { shouldValidate: true });
                        }}
                    />
                </div>
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


                <ExpenseFinancialSection
                    watch={watch}
                    setValue={setValue}
                />
            </form>
        </Modal>
    );
};

export default CreateExpenseModal;
