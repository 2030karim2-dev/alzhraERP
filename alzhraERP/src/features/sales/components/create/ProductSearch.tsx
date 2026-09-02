// ============================================
// Product Search Component
// Search and select products for invoice
// ============================================

import React, { useState } from 'react';
import { Search, X, ArrowLeftRight } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { useProductSearch, type ProductSearchResult } from '../../../sales/hooks/useProductSearch';
import { useAuthStore } from '../../../auth/store';
import type { CartItem } from '../../../sales/types';
import ProductSelectionModal from './ProductSelectionModal';
import type { Product } from '../../../inventory/types';

interface ProductSearchProps {
  onSelectProduct: (product: CartItem) => void;
  onClose?: () => void;
}

const ProductSearch: React.FC<ProductSearchProps> = ({ onSelectProduct }) => {
  const {} = useTranslation();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { products, isLoading, hasResults } = useProductSearch(searchTerm, {
    companyId: user?.company_id || '',
    debounceMs: 300,
    enabled: !!user?.company_id && searchTerm.trim().length >= 2,
  });

  const handleSelect = (product: ProductSearchResult) => {
    const cartItem: CartItem = {
      productId: product.id,
      name: product.name_ar,
      sku: product.sku,
      quantity: 1,
      unitPrice: product.sale_price,
      costPrice: product.purchase_price,

      maxStock: product.quantity || 999,
      isCoreReturn: product.is_core === true,
    };
    onSelectProduct(cartItem);
    setSearchTerm('');
  };

  const handleAdvancedSelect = (product: Product) => {
    const cartItem: CartItem = {
      productId: product.id,
      name: product.name || product.name_ar,
      sku: product.sku,
      quantity: 1,
      unitPrice: product.selling_price || product.sale_price || 0,
      costPrice: product.cost_price || 0,
      maxStock: product.stock_quantity || 999,
    };
    onSelectProduct(cartItem);
    setSearchTerm('');
    setShowAdvanced(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
          }}
          placeholder="ابحث عن منتج..."
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-10 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
          autoFocus
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {searchTerm.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">جاري البحث...</div>
          ) : !hasResults ? (
            <div className="p-4 text-center text-gray-500">لا توجد نتائج</div>
          ) : (
            <ul>
              {products.map((product: ProductSearchResult) => (
                <li
                  key={product.id}
                  onClick={() => {
                    handleSelect(product);
                  }}
                  className="cursor-pointer border-b border-gray-100 p-3 last:border-0 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                        {product.name_ar}
                        {searchTerm && product.alternative_numbers?.includes(searchTerm) && (
                          <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                            بديل
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{product.sku}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-blue-600">{product.sale_price}</p>
                      <p className="text-xs text-gray-500">المخزون: {product.quantity}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* [FIX #6] رابط فتح مستكشف الأصناف المتقدم */}
          <div className="border-t border-gray-100 p-2 dark:border-slate-700">
            <button
              onClick={() => {
                setShowAdvanced(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[10px] font-bold uppercase tracking-widest text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
            >
              <ArrowLeftRight size={14} />
              مستكشف الأصناف المتقدم
            </button>
          </div>
        </div>
      )}

      {/* [FIX #6] نافذة مستكشف الأصناف المتقدم منبثقة من البحث السريع */}
      <ProductSelectionModal
        isOpen={showAdvanced}
        onClose={() => {
          setShowAdvanced(false);
        }}
        onSelect={handleAdvancedSelect}
        initialQuery={searchTerm}
      />
    </div>
  );
};

export default ProductSearch;
