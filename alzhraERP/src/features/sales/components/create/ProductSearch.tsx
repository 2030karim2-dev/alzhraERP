// ============================================
// Product Search Component
// Search and select products for invoice
// ============================================

import React, { useState } from 'react';
import { Search, X, ArrowLeftRight } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { useProductSearch, ProductSearchResult } from '../../../sales/hooks/useProductSearch';
import { useAuthStore } from '../../../auth/store';
import { CartItem } from '../../../sales/types';
import ProductSelectionModal from './ProductSelectionModal';
import { Product } from '../../../inventory/types';

interface ProductSearchProps {
    onSelectProduct: (product: CartItem) => void;
    onClose?: () => void;
}

const ProductSearch: React.FC<ProductSearchProps> = ({ onSelectProduct, }) => {
    const { } = useTranslation();
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
            isCoreReturn: product.is_core === true
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث عن منتج..."
                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {searchTerm.trim().length >= 2 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 max-h-80 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500">جاري البحث...</div>
                    ) : !hasResults ? (
                        <div className="p-4 text-center text-gray-500">لا توجد نتائج</div>
                    ) : (
                        <ul>
                            {products.map((product: ProductSearchResult) => (
                                <li
                                    key={product.id}
                                    onClick={() => handleSelect(product)}
                                    className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-100 dark:border-slate-700 last:border-0"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                {product.name_ar}
                                                {searchTerm && product.alternative_numbers?.includes(searchTerm) && (
                                                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md font-bold">
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
                    <div className="border-t border-gray-100 dark:border-slate-700 p-2">
                        <button
                            onClick={() => setShowAdvanced(true)}
                            className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors uppercase tracking-widest"
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
                onClose={() => setShowAdvanced(false)}
                onSelect={handleAdvancedSelect}
                initialQuery={searchTerm}
            />
        </div>
    );
};

export default ProductSearch;
