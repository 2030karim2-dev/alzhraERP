import React from 'react';
import { Landmark, Plus, X, Tag, Calendar, FileText } from 'lucide-react';
import type { UseFormRegister } from 'react-hook-form';
import type { ExpenseFormData } from '../../../types';
import Button from '../../../../../ui/base/Button';
import Input from '../../../../../ui/base/Input';

interface ExpenseCategorySectionProps {
  register: UseFormRegister<ExpenseFormData>;
  categories: any[];
  newCatMode: boolean;
  setNewCatMode: (v: boolean) => void;
  newCatName: string;
  setNewCatName: (v: string) => void;
  handleAddCategory: () => void;
  isAddingCategory: boolean;
}

export const ExpenseCategorySection: React.FC<ExpenseCategorySectionProps> = ({
  register,
  categories,
  newCatMode,
  setNewCatMode,
  newCatName,
  setNewCatName,
  handleAddCategory,
  isAddingCategory,
}) => {
  return (
    <div className="space-y-4 border-b bg-gray-50/30 p-5 dark:border-slate-800 dark:bg-slate-950/30">
      <div className="space-y-2">
        <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          تصنيف المصروف
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              {...register('category_id', { required: true })}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-10 py-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">-- اختر التصنيف المناسب --</option>
              {Array.isArray(categories) &&
                categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
            <Landmark
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setNewCatMode(true);
            }}
            className="flex h-12 w-12 items-center justify-center rounded-xl border bg-gray-100 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Plus size={16} />
          </button>
        </div>
        {newCatMode && (
          <div className="animate-in fade-in flex gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <input
              autoFocus
              value={newCatName}
              onChange={e => {
                setNewCatName(e.target.value);
              }}
              placeholder="اسم التصنيف الجديد..."
              className="flex-1 rounded-lg border-none bg-white px-3 text-sm font-bold outline-none dark:bg-slate-700"
            />
            <Button
              type="button"
              onClick={handleAddCategory}
              isLoading={isAddingCategory}
              size="sm"
              className="px-4"
            >
              حفظ
            </Button>
            <button
              type="button"
              onClick={() => {
                setNewCatMode(false);
              }}
              className="p-2 text-gray-400 hover:text-rose-500"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      <Input
        label="شرح المصروف (البيان)"
        {...register('description', { required: true })}
        icon={<Tag className="text-blue-500" />}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="تاريخ الصرف"
          type="date"
          {...register('expense_date', { required: true })}
          dir="ltr"
          icon={<Calendar className="text-emerald-500" />}
        />
        <Input
          label="رقم السند المرجعي"
          {...register('voucher_number')}
          dir="ltr"
          icon={<FileText className="text-amber-500" />}
        />
      </div>
    </div>
  );
};
