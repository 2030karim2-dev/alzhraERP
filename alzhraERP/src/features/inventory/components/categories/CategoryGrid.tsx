import React from 'react';
import { Layers, Trash2, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';

interface Category {
    id: string;
    name: string;
    productsCount: number;
    totalStock: number;
    totalValue: number;
    hasAlert: boolean;
}

interface Props {
    categories: Category[];
    onFilterProduct: (catName: string) => void;
    deleteCategory: (id: string) => void;
}

const CategoryGrid: React.FC<Props> = ({ categories, onFilterProduct, deleteCategory }) => {
    if (categories.length === 0) {
        return (
            <div className="col-span-full p-12 text-center border-2 border-dashed dark:border-slate-800 flex flex-col items-center gap-2">
                <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-full text-gray-200"><BarChart3 size={32} /></div>
                <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">لا توجد نتائج</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {categories.map((cat) => (
                <div key={cat.id} className="group relative bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-none p-2.5 transition-all hover:border-blue-500/40 hover:shadow-lg active:scale-[0.99] overflow-hidden flex flex-col justify-between min-h-[120px]">
                    {cat.hasAlert && (
                        <div className="absolute top-0 left-0 w-8 h-8 bg-rose-500 text-white flex items-center justify-center -translate-x-4 -translate-y-4 rotate-45 shadow-sm">
                            <AlertCircle size={7} className="-rotate-45 translate-x-0.5 translate-y-0.5" />
                        </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-none border border-blue-100 dark:border-blue-800 group-hover:scale-105 transition-transform shrink-0">
                                <Layers size={14} />
                            </div>
                            <div className="truncate">
                                <h4 className="text-[11px] font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tighter truncate leading-none">{cat.name}</h4>
                                <span className="text-[6px] font-bold text-gray-400 uppercase tracking-widest leading-none">SEGMENT</span>
                            </div>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); if (confirm('حذف القسم؟')) deleteCategory(cat.id); }}
                            className="p-1 text-gray-300 hover:text-rose-500 transition-colors shrink-0"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-0.5 mb-2 border-y border-gray-50 dark:border-slate-800 py-1.5">
                        <div className="text-center">
                            <span className="text-[6px] font-bold text-gray-400 uppercase block mb-0.5">أصناف</span>
                            <span className="text-[10px] font-bold text-blue-600 font-mono leading-none">{cat.productsCount || 0}</span>
                        </div>
                        <div className="text-center border-x border-gray-100 dark:border-slate-800">
                            <span className="text-[6px] font-bold text-gray-400 uppercase block mb-0.5">كمية</span>
                            <span className="text-[10px] font-bold text-emerald-600 font-mono leading-none">{cat.totalStock || 0}</span>
                        </div>
                        <div className="text-center min-w-0">
                            <span className="text-[6px] font-bold text-gray-400 uppercase block mb-0.5">القيمة</span>
                            <span dir="ltr" className="text-[9px] font-bold text-gray-600 dark:text-gray-300 font-mono truncate block leading-none">
                                {Math.round(cat.totalValue || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => onFilterProduct(cat.name)}
                        className="w-full py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-blue-600 text-white text-[8px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 group/btn"
                    >
                        تحليل
                        <TrendingUp size={10} className="group-hover/btn:translate-x-[-2px] transition-transform" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default CategoryGrid;
