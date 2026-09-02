import React from 'react';
import { LayoutGrid, Users, Edit, Trash2 } from 'lucide-react';
import type { PartyCategory } from '../types';

interface Props {
  category: PartyCategory;
  onEdit: () => void;
  onDelete: () => void;
}

const CategoryCard: React.FC<Props> = ({ category, onEdit, onDelete }) => {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-none border border-gray-100 bg-[var(--app-surface)] transition-all hover:border-blue-500/40 dark:border-slate-800">
      <div className="flex items-start justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <LayoutGrid size={14} />
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-tighter text-gray-800 dark:text-slate-100">
              {category.name}
            </h4>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400">
              <Users size={10} />
              <span>{category.count || 0} سجلات نشطة</span>
            </div>
          </div>
        </div>

        <div className="flex gap-px border bg-gray-100 dark:border-slate-800 dark:bg-slate-800">
          <button
            onClick={onEdit}
            className="bg-[var(--app-surface)] p-1.5 text-gray-400 transition-colors hover:text-blue-500"
          >
            <Edit size={12} />
          </button>
          <button
            onClick={onDelete}
            className="border-r bg-[var(--app-surface)] p-1.5 text-gray-400 transition-colors hover:text-rose-500 dark:border-slate-800"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Visual Progress/Indicator */}
      <div className="mt-auto h-1 w-full overflow-hidden bg-gray-50 dark:bg-slate-800">
        <div
          className="h-full bg-blue-600 transition-all duration-1000"
          style={{ width: `${Math.min(100, (category.count || 0) * 5)}%` }}
        ></div>
      </div>
    </div>
  );
};

export default CategoryCard;
