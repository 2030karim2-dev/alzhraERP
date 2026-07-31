import React from 'react';
import { Layers, LayoutGrid, List, Sparkles } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import { cn } from '../../../../core/utils';
import SearchInput from '../../../../ui/components/SearchInput';

interface Props {
    newCatName: string;
    setNewCatName: (name: string) => void;
    handleAdd: (e: React.FormEvent) => void;
    isCreating: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    displayMode: 'grid' | 'table';
    setDisplayMode: (mode: 'grid' | 'table') => void;
    onOpenAICategorize: () => void;
}

const CategoryControlBar: React.FC<Props> = ({
    newCatName, setNewCatName, handleAdd, isCreating,
    searchQuery, setSearchQuery, displayMode, setDisplayMode,
    onOpenAICategorize
}) => {
    return (
        <div className="flex flex-col md:flex-row gap-1.5 bg-white dark:bg-slate-900 p-1.5 border border-gray-100 dark:border-slate-800 shadow-sm">
            <form onSubmit={handleAdd} className="flex-1 flex gap-1.5">
                <div className="relative flex-1">
                    <Layers className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={12} />
                    <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="إضافة قسم جديد..."
                        className="w-full bg-gray-50 dark:bg-slate-800 border-none py-2 pr-8 text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500/20 dark:text-white"
                    />
                </div>
                <Button type="submit" isLoading={isCreating} size="sm" className="px-3 rounded-none text-[9px]">حفظ</Button>
            </form>

            <Button
                onClick={onOpenAICategorize}
                variant="ghost"
                size="sm"
                className="gap-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 rounded-none px-4"
            >
                <Sparkles size={12} />
                تصنيف ذكي (AI)
            </Button>
            <div className="flex gap-1 bg-gray-50 dark:bg-slate-800 p-1 rounded-none">
                <button
                    onClick={() => setDisplayMode('grid')}
                    className={cn(
                        "p-1.5 rounded-none transition-all",
                        displayMode === 'grid'
                            ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
                            : "text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                    )}
                    title="عرض بطاقات"
                >
                    <LayoutGrid size={14} />
                </button>
                <button
                    onClick={() => setDisplayMode('table')}
                    className={cn(
                        "p-1.5 rounded-none transition-all",
                        displayMode === 'table'
                            ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
                            : "text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                    )}
                    title="عرض جدول"
                >
                    <List size={14} />
                </button>
            </div>

            <div className="md:w-48">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="بحث سريع..."
                    variant="default"
                    size="sm"
                    className="h-full"
                    inputClassName="text-[9px]"
                />
            </div>
        </div>
    );
};

export default CategoryControlBar;
