import React from 'react';
import { LayoutGrid, Users, Edit, Trash2 } from 'lucide-react';
import { PartyCategory } from '../types';


interface Props {
  category: PartyCategory;
  onEdit: () => void;
  onDelete: () => void;
}

const CategoryCard: React.FC<Props> = ({ category, onEdit, onDelete }) => {
  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 transition-all flex flex-col hover:border-blue-500/40 rounded-none overflow-hidden">
      <div className="p-3 flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <LayoutGrid size={14} />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tighter">{category.name}</h4>
            <div className="flex items-center gap-1 text-[8px] font-bold text-gray-400 uppercase">
              <Users size={10} />
              <span>{category.count || 0} سجلات نشطة</span>
            </div>
          </div>
        </div>

        <div className="flex gap-px bg-gray-100 dark:bg-slate-800 border dark:border-slate-800">
          <button onClick={onEdit} className="p-1.5 bg-white dark:bg-slate-900 text-gray-400 hover:text-blue-500 transition-colors">
            <Edit size={12} />
          </button>
          <button onClick={onDelete} className="p-1.5 bg-white dark:bg-slate-900 text-gray-400 hover:text-rose-500 transition-colors border-r dark:border-slate-800">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Visual Progress/Indicator */}
      <div className="mt-auto h-1 w-full bg-gray-50 dark:bg-slate-800 overflow-hidden">
        <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${Math.min(100, (category.count || 0) * 5)}%` }}></div>
      </div>
    </div>
  );
};

export default CategoryCard;