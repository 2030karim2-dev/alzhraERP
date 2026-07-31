import React from 'react';
import { Layers, Box, AlertCircle } from 'lucide-react';
import { formatNumberDisplay } from '../../../../core/utils';

interface Props {
    categoriesCount: number;
    totalProducts: number;
    alertedCategories: number;
}

const CategoryStats: React.FC<Props> = ({ categoriesCount, totalProducts, alertedCategories }) => {
    return (
        <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-white dark:bg-slate-900 p-2 border border-gray-100 dark:border-slate-800 rounded-none flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 text-white rounded shadow-md"><Layers size={12} /></div>
                <div className="min-w-0">
                    <p className="text-[7px] font-bold text-gray-400 uppercase leading-none mb-0.5">الأقسام</p>
                    <h4 className="text-[10px] font-bold dark:text-white truncate">{categoriesCount}</h4>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 border border-gray-100 dark:border-slate-800 rounded-none flex items-center gap-2">
                <div className="p-1.5 bg-emerald-600 text-white rounded shadow-md"><Box size={12} /></div>
                <div className="min-w-0">
                    <p className="text-[7px] font-bold text-gray-400 uppercase leading-none mb-0.5">الأصناف</p>
                    <h4 className="text-[10px] font-bold dark:text-white truncate">{formatNumberDisplay(totalProducts)}</h4>
                </div>
            </div>
            <div className="bg-slate-900 p-2 rounded-none border-r-2 border-amber-500 flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 text-white rounded"><AlertCircle size={12} /></div>
                <div className="min-w-0">
                    <p className="text-[7px] font-bold text-amber-500 uppercase leading-none mb-0.5">تنبيهات</p>
                    <h4 className="text-[10px] font-bold text-white truncate">{alertedCategories}</h4>
                </div>
            </div>
        </div>
    );
};

export default CategoryStats;
