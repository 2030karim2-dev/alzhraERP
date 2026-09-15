import React from 'react';
import { LayoutGrid, Users, Edit, Trash2 } from 'lucide-react';
import type { PartyCategory } from '../types';
import { formatCurrency, formatNumberDisplay } from '../../../core/utils';

interface Props {
  category: PartyCategory;
  onEdit: () => void;
  onDelete: () => void;
}

const CategoryCard: React.FC<Props> = ({ category, onEdit, onDelete }) => {
  const balance = category.totalBalance ?? 0;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow dark:border-slate-800 dark:bg-slate-900">
      <div className="p-3.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <LayoutGrid size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{category.name}</h4>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-slate-400">
                <Users size={11} />
                <span>{formatNumberDisplay(category.count || 0)} سجل</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
              title="تعديل الفئة"
            >
              <Edit size={13} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
              title="حذف الفئة"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Balance information if available */}
        {balance !== 0 && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">إجمالي الأرصدة:</span>
            <span dir="ltr" className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(balance)}
            </span>
          </div>
        )}
      </div>

      {/* Visual Progress Bar */}
      <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-blue-600 transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(5, (category.count || 0) * 10))}%` }}
        />
      </div>
    </div>
  );
};

export default CategoryCard;
