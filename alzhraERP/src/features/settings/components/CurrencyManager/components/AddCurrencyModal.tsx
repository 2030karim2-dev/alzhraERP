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
  newCurrency: {
    code: string;
    symbol: string;
    name_ar: string;
    exchange_operator: 'multiply' | 'divide';
  };
  setNewCurrency: (curr: {
    code: string;
    symbol: string;
    name_ar: string;
    exchange_operator: 'multiply' | 'divide';
  }) => void;
}

export const AddCurrencyModal: React.FC<AddCurrencyModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  isSaving,
  newCurrency,
  setNewCurrency,
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
          <button
            onClick={onClose}
            className="flex-1 py-3 text-[10px] font-bold uppercase text-gray-500"
          >
            إلغاء
          </button>
          <Button onClick={onAdd} isLoading={isSaving} className="flex-[2] rounded-none">
            تأكيد الإضافة
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="رمز العملة (Code)"
            dir="ltr"
            value={newCurrency.code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() });
            }}
          />
          <Input
            label="الرمز الرمزي (Symbol)"
            dir="ltr"
            value={newCurrency.symbol}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setNewCurrency({ ...newCurrency, symbol: e.target.value });
            }}
          />
        </div>
        <Input
          label="اسم العملة بالعربية"
          value={newCurrency.name_ar}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setNewCurrency({ ...newCurrency, name_ar: e.target.value });
          }}
        />
        <div className="space-y-1.5">
          <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            معامل الصرف (كيفية احتساب المعادل بالريال)
          </label>
          <select
            value={newCurrency.exchange_operator}
            onChange={e => {
              setNewCurrency({
                ...newCurrency,
                exchange_operator: e.target.value as 'multiply' | 'divide',
              });
            }}
            className="w-full cursor-pointer rounded-xl border-2 border-gray-100 bg-white p-3 text-sm font-bold outline-none focus:border-blue-500/50 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="divide">قسمة - الأكثر شيوعاً</option>
            <option value="multiply">ضرب</option>
          </select>
        </div>
      </div>
    </Modal>
  );
};
