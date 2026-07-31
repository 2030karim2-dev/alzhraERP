import React, { useState, useMemo } from 'react';
import { useInventoryCategories } from '../../hooks/index';
import { Product } from '../../types';
import { Layers, Loader2 } from 'lucide-react';
import ProductExcelGrid from '../ProductExcelGrid';

interface Props {
    products: Product[];
    isLoading: boolean;
}

const WarehouseProductList: React.FC<Props> = ({ products, isLoading }) => {
    const { data: categories } = useInventoryCategories();
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const filteredProducts = useMemo(() => {
        if (selectedCategory === 'all') return products;
        return products.filter(p => p.category === selectedCategory);
    }, [products, selectedCategory]);

    if (isLoading) {
        return (
            <div className="p-20 text-center flex justify-center items-center gap-2">
                <Loader2 className="animate-spin text-blue-500" />
                <span className="text-xs font-bold text-gray-400">جاري جرد الأصناف...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 border-b-2 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">فرز حسب التصنيف</h3>
                </div>
                <div className="relative w-full md:w-64">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl py-2 pr-9 pl-3 text-[10px] font-bold outline-none appearance-none focus:border-blue-500/50 focus:bg-white transition-all dark:text-slate-200"
                    >
                        <option value="all">كل التصنيفات</option>
                        {Array.isArray(categories) && categories.map((cat: any) => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                    <Layers size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>

            <ProductExcelGrid
                products={filteredProducts}
                isLoading={isLoading}
                hideActions={true}
                hideBulkActions={true}
                title="الأصناف في المستودع"
                subtitle={`يوجد ${filteredProducts.length} صنف متاح`}
                colorTheme="blue"
            />
        </div>
    );
};

export default WarehouseProductList;