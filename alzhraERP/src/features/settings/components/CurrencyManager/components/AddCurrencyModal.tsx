import React from 'react';
import { Plus } from 'lucide-react';
import Modal from '../../../../../ui/base/Modal';
import Button from '../../../../../ui/base/Button';
import Input from '../../../../../ui/base/Input';

interface AddCurrencyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: () => void;
    isSaving: boolean;
    newCurrency: { code: string; symbol: string; name_ar: string; exchange_operator: 'multiply' | 'divide' };
    setNewCurrency: (curr: { code: string; symbol: string; name_ar: string; exchange_operator: 'multiply' | 'divide' }) => void;
}

export const AddCurrencyModal: React.FC<AddCurrencyModalProps> = ({
    isOpen,
    onClose,
    onAdd,
    isSaving,
    newCurrency,
    setNewCurrency
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            icon={Plus}
            title="إضافة عملة جديدة"
            description="تعريف عملة أجنبية جديدة في النظام"
            footer={
                <div className="flex w-full gap-2 p-1">
                    <button onClick={onClose} className="flex-1 py-3 text-[10px] font-bold text-gray-500 uppercase">إلغاء</button>
                    <Button onClick={onAdd} isLoading={isSaving} className="flex-[2] rounded-none">تأكيد الإضافة</Button>
                </div>
            }
        >
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <Input
                        label="رمز العملة (Code)"
                        placeholder="Ex: CNY"
                        dir="ltr"
                        value={newCurrency.code}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                    />
                    <Input
                        label="الرمز الرمزي (Symbol)"
                        placeholder="Ex: ¥"
                        dir="ltr"
                        value={newCurrency.symbol}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                    />
                </div>
                <Input
                    label="اسم العملة بالعربية"
                    placeholder="يوان صيني"
                    value={newCurrency.name_ar}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCurrency({ ...newCurrency, name_ar: e.target.value })}
                />
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">معامل الصرف (كيفية احتساب المعادل بالريال)</label>
                    <select
                        value={newCurrency.exchange_operator}
                        onChange={(e) => setNewCurrency({ ...newCurrency, exchange_operator: e.target.value as 'multiply' | 'divide' })}
                        className="w-full p-3 bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 focus:border-blue-500/50 rounded-xl text-sm font-bold outline-none cursor-pointer"
                    >
                        <option value="divide">قسمة (مثال: 1 ريال سعودي = 430 ريال يمني) - الأكثر شيوعاً</option>
                        <option value="multiply">ضرب (مثال: 1 دولار = 3.75 ريال سعودي)</option>
                    </select>
                </div>
            </div>
        </Modal>
    );
};
