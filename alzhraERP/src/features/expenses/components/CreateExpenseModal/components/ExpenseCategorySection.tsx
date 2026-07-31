import React from 'react';
import { Landmark, Plus, X, Tag, Calendar, FileText } from 'lucide-react';
import { UseFormRegister } from 'react-hook-form';
import { ExpenseFormData } from '../../../types';
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
    register, categories, newCatMode, setNewCatMode, newCatName, setNewCatName, handleAddCategory, isAddingCategory
}) => {
    return (
        <div className="p-5 border-b dark:border-slate-800 bg-gray-50/30 dark:bg-slate-950/30 space-y-4">
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">تصنيف المصروف</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <select {...register('category_id', { required: true })} className="w-full px-10 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none appearance-none">
                            <option value="">-- اختر التصنيف المناسب --</option>
                            {Array.isArray(categories) && categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        <Landmark className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                    <button type="button" onClick={() => setNewCatMode(true)} className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-gray-400 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-500 transition-colors border dark:border-slate-700">
                        <Plus size={16} />
                    </button>
                </div>
                {newCatMode && (
                    <div className="flex gap-2 p-3 bg-blue-50 dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700 rounded-xl animate-in fade-in">
                        <input autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                            placeholder="اسم التصنيف الجديد..."
                            className="flex-1 bg-white dark:bg-slate-700 border-none rounded-lg text-sm font-bold outline-none px-3" />
                        <Button type="button" onClick={handleAddCategory} isLoading={isAddingCategory} size="sm" className="px-4">حفظ</Button>
                        <button type="button" onClick={() => setNewCatMode(false)} className="p-2 text-gray-400 hover:text-rose-500"><X size={16} /></button>
                    </div>
                )}
            </div>

            <Input label="شرح المصروف (البيان)" {...register('description', { required: true })} placeholder="مثال: فاتورة كهرباء شهر أكتوبر..." icon={<Tag className="text-blue-500" />} />

            <div className="grid grid-cols-2 gap-4">
                <Input label="تاريخ الصرف" type="date" {...register('expense_date', { required: true })} dir="ltr" icon={<Calendar className="text-emerald-500" />} />
                <Input label="رقم السند المرجعي" {...register('voucher_number')} placeholder="Manual ID..." dir="ltr" icon={<FileText className="text-amber-500" />} />
            </div>
        </div>
    );
};
