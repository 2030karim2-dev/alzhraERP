import React from 'react';
import { Search, Package } from 'lucide-react';
import { useProducts, useInventoryCategories } from '../../inventory/hooks/index';
import type { Product } from '../../inventory/types';
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
  isCrossBranch?: boolean;
  /** وضع رؤية فقط — فرع محمد */
  isInventoryOnly?: boolean | undefined;
  requesterBranchId?: string | null | undefined;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  searchTerm,
  onAddToCart,
  onViewDetails,
  inStockOnly = false,
  selectedWarehouseId = null,
  isCrossBranch = false,
  isInventoryOnly = false,
  requesterBranchId = null,
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
      <div className="grid grid-cols-2 gap-2 p-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border bg-[var(--app-surface)] shadow-sm dark:border-slate-800"
          ></div>
        ))}
      </div>
    );
  }

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-2 pb-32">
      <CategoryPills
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {isSearching && (
        <div className="mb-3 flex items-center gap-2 px-2">
          <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
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

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-5">
        {filteredProducts.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            searchTerm={searchTerm}
            onAddToCart={onAddToCart}
            onViewDetails={onViewDetails ?? undefined}
            playNotificationSound={playNotificationSound}
            isCrossBranch={isCrossBranch}
            selectedWarehouseId={selectedWarehouseId}
            isInventoryOnly={isInventoryOnly}
            requesterBranchId={requesterBranchId}
          />
        ))}

        {filteredProducts.length === 0 && !isLoading && (
          <div className="col-span-full flex flex-col items-center justify-center gap-3 py-24">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Package size={42} className="text-slate-300 dark:text-slate-600" />
            </div>
            <div className="text-center">
              <h3 className="mb-1 text-base font-bold text-slate-600 dark:text-slate-300">
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
