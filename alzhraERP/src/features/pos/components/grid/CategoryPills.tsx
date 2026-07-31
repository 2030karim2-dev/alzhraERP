import React from 'react';
import { cn } from '../../../../core/utils';

interface CategoryPillsProps {
    categories: any[];
    selectedCategory: string | null;
    onSelectCategory: (id: string | null) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = React.memo(({ categories, selectedCategory, onSelectCategory }) => {
    return (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide no-scrollbar sticky top-0 bg-gray-50/80 dark:bg-slate-950/80 backdrop-blur-md z-10 px-1 -mx-1 pt-1 border-b dark:border-slate-800/50">
            <button
                onClick={() => onSelectCategory(null)}
                className={cn(
                    'px-5 py-2 md:py-2.5 rounded-xl font-black text-xs md:text-sm whitespace-nowrap shadow-sm transition-all active:scale-95 border',
                    selectedCategory === null
                        ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20 shadow-lg'
                        : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
                )}
            >
                الكل
            </button>
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    className={cn(
                        'px-5 py-2 md:py-2.5 rounded-xl font-black text-xs md:text-sm whitespace-nowrap shadow-sm transition-all active:scale-95 border',
                        selectedCategory === cat.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20 shadow-lg'
                            : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
                    )}
                >
                    {cat.name}
                </button>
            ))}
        </div>
    );
});

CategoryPills.displayName = 'CategoryPills';
