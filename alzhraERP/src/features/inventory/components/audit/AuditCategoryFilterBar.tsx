import React from 'react';
import { Layers } from 'lucide-react';

interface CategoryItem {
  id: string;
  name?: string | undefined;
  productsCount?: number;
  totalStock?: number;
  totalValue?: number;
  hasAlert?: boolean;
}

interface AuditCategoryFilterBarProps {
  categories: CategoryItem[] | undefined;
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}

export const AuditCategoryFilterBar: React.FC<AuditCategoryFilterBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="no-scrollbar -mx-2 flex items-center gap-2 overflow-x-auto rounded-xl border border-gray-100 bg-[var(--app-surface)] p-2 px-2 shadow-sm dark:border-slate-800 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-1 border-l px-2 text-gray-400 dark:border-slate-800">
        <Layers size={12} />
        <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-tighter">
          الفئة:
        </span>
      </div>
      <button
        onClick={() => {
          onSelectCategory(null);
        }}
        className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-bold transition-all ${
          !selectedCategory
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-gray-50 text-gray-500 dark:bg-slate-800'
        }`}
      >
        الكل
      </button>
      {categories?.map(cat => (
        <button
          key={cat.id}
          onClick={() => {
            onSelectCategory(cat.name ?? null);
          }}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-bold transition-all ${
            selectedCategory === cat.name
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
};
