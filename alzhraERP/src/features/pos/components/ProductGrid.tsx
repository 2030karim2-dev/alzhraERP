import React from 'react';
import { Search, Package } from 'lucide-react';
import { useProducts, useInventoryCategories } from '../../inventory/hooks/index';
import { Product } from '../../inventory/types';
import { useSoundStore } from '../../notifications/store';
import { CategoryPills } from './grid/CategoryPills';
import { ProductCard } from './grid/ProductCard';
import { useProductFilter } from './grid/useProductFilter';

interface ProductGridProps {
    searchTerm: string;
    onAddToCart: (product: Product) => void;
    onViewDetails?: (product: Product) => void;
    inStockOnly?: boolean;
    selectedWarehouseId?: string | null;
}

const ProductGrid: React.FC<ProductGridProps> = ({
    searchTerm,
    onAddToCart,
    onViewDetails,
    inStockOnly = false,
    selectedWarehouseId = null,
}) => {
    const { products, isLoading: isProductsLoading } = useProducts(searchTerm);
    const { data: categories = [], isLoading: isCategoriesLoading } = useInventoryCategories();
    const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
    const { playNotificationSound } = useSoundStore();

    const isLoading = isProductsLoading || isCategoriesLoading;
    const isSearching = searchTerm.trim().length > 0;

    const filteredProducts = useProductFilter({
        products,
        selectedCategory,
        inStockOnly,
        selectedWarehouseId,
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-2 p-2">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-xl h-28 animate-pulse shadow-sm border dark:border-slate-800"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="p-2 h-full overflow-y-auto pb-32 custom-scrollbar">
            <CategoryPills
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
            />

            {isSearching && (
                <div className="mb-3 px-2 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full">
                        <Search size={12} />
                        <span className="text-xs font-bold">
                            {filteredProducts.length} نتيجة عن "{searchTerm}"
                        </span>
                    </div>
                    {filteredProducts.length === 0 && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                            جرّب البحث بكلمات مختلفة أو باستخدام الرمز
                        </span>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-5 gap-2 md:gap-3">
                {filteredProducts.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        searchTerm={searchTerm}
                        onAddToCart={onAddToCart}
                        onViewDetails={onViewDetails ?? undefined}
                        playNotificationSound={playNotificationSound}
                    />
                ))}

                {filteredProducts.length === 0 && !isLoading && (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center gap-3">
                        <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Package size={42} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-slate-600 dark:text-slate-300 text-base mb-1">
                                {isSearching ? 'لا توجد منتجات مطابقة' : 'لا توجد منتجات في هذه الفئة'}
                            </h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                {isSearching ? 'جرّب تغيير معايير البحث' : 'اختر فئة أخرى أو امسح البحث'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductGrid;