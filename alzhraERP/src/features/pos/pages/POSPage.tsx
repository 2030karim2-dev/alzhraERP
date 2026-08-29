import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ShoppingCart } from 'lucide-react';
import ProductGrid from '../components/ProductGrid';
import { POSCart } from '../components/POSCart';
import ScannerOverlay from '../../../ui/base/ScannerOverlay';
import SmartRecommendations from '../../../ui/pos/SmartRecommendations';
import ProductDetailModal from '../../inventory/components/ProductDetailModal';
import { useSalesStore } from '../../sales/store';
import { usePOSStore } from '../store';
import { useAuthStore } from '../../auth/store';
import { usePOSCheckout } from '../hooks';
import { usePOSSearch } from '../hooks/usePOSSearch';
import { posSearchService } from '../services/searchService';
import { useBreakpoint } from '../../../lib/hooks/useBreakpoint';
import { formatCurrency } from '../../../core/utils';
import { Product } from '../../inventory/types';
import { buildProductFromSearchResult } from '../utils/buildProductFromResult';
import { SuspendedOrdersModal } from '../components/SuspendedOrdersModal';
import { POSHeader } from '../components/layout/POSHeader';
import { useWarehousesWithBranches } from '../../inventory/hooks/useWarehouseStock';

const POSPage: React.FC = () => {
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [showSuspended, setShowSuspended] = useState(false);
    const [isQuickMode, setIsQuickMode] = useState(false);
    const [activeMobileTab, setActiveMobileTab] = useState<'products' | 'cart'>('products');
    const [inStockOnly, setInStockOnly] = useState(false);
    const [detailProduct, setDetailProduct] = useState<Product | null>(null);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
    const isDesktop = useBreakpoint('md');

    const { warehouses } = useWarehousesWithBranches();

    const search = usePOSSearch({
        debounceMs: 200,
        minChars: 1,
        limit: 25,
        filters: { in_stock_only: inStockOnly },
    });

    const { items, summary, selectedCustomer, currency, resetCart, addProductToCart } = useSalesStore();
    const { suspendedOrders, suspendCurrentOrder, resumeOrder, removeSuspended } = usePOSStore();
    const { processPayment } = usePOSCheckout();

    const handleBarcodeScanned = useCallback(async (code: string) => {
        setIsScannerOpen(false);
        const { user } = useAuthStore.getState();
        if (!user?.company_id) return;

        const result = await posSearchService.searchByBarcode(user.company_id, code);
        if (result) {
            const product = buildProductFromSearchResult(result, user.company_id);
            addProductToCart(product);
        } else {
            search.setQuery(code);
        }
    }, [addProductToCart, search]);

    const handleSearchSelect = useCallback((result: typeof search.results[number]) => {
        const { user } = useAuthStore.getState();
        if (!user?.company_id) return;
        const product = buildProductFromSearchResult(result, user.company_id);
        search.selectResult(result);
        addProductToCart(product);
    }, [addProductToCart, search]);

    const handleViewDetails = useCallback((result: typeof search.results[number]) => {
        const { user } = useAuthStore.getState();
        const product = buildProductFromSearchResult(result, user?.company_id ?? '');
        setDetailProduct(product);
    }, []);

    // Keyboard shortcut: Ctrl+B opens barcode scanner
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                setIsScannerOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const validCartItems = useMemo(
        () => (Array.isArray(items) ? items.filter((i) => i.productId) : []),
        [items]
    );

    const handlePayConfirm = useCallback(() => {
        processPayment({
            partyId: selectedCustomer?.id || null,
            type: 'sale',
            items: validCartItems.map((i) => ({
                ...i,
                unitPrice: i.price,
                costPrice: i.costPrice || 0,
                maxStock: 0,
            })),
            discount: 0,
            paymentMethod: 'cash',
            status: 'paid' as const
        }, {
            onSuccess: () => {
                resetCart();
            }
        });
    }, [processPayment, selectedCustomer, validCartItems, resetCart]);

    const handleSuspend = useCallback(() => {
        if (validCartItems.length === 0) return;
        suspendCurrentOrder(items, selectedCustomer);
        resetCart();
    }, [validCartItems, items, selectedCustomer, suspendCurrentOrder, resetCart]);

    return (
        <div className="h-[100dvh] w-screen flex flex-col bg-gray-50 dark:bg-slate-950 fixed inset-0 z-50 overflow-hidden font-cairo select-none">
            <POSHeader
                search={search}
                inStockOnly={inStockOnly}
                setInStockOnly={setInStockOnly}
                isQuickMode={isQuickMode}
                setIsQuickMode={setIsQuickMode}
                suspendedOrdersCount={suspendedOrders.length}
                showSuspended={showSuspended}
                setShowSuspended={setShowSuspended}
                onClearCart={resetCart}
                onLaunchScanner={() => setIsScannerOpen(true)}
                onSearchSelect={handleSearchSelect}
                onViewDetails={handleViewDetails}
                warehouses={warehouses}
                selectedWarehouseId={selectedWarehouseId}
                onWarehouseChange={setSelectedWarehouseId}
            />

            <div className="flex-1 flex overflow-hidden flex-row-reverse relative p-2 max-md:p-2 md:p-4 lg:p-6 md:gap-4 lg:gap-6 bg-gray-50/50 dark:bg-slate-950/50">
                <aside className={`
          ${isDesktop ? 'w-[400px] lg:w-[450px] xl:w-[500px] 2xl:w-[550px] 3xl:w-[600px] rounded-3xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)] border dark:border-slate-800' : (activeMobileTab === 'cart' ? 'w-full min-w-0' : 'hidden')}
          flex flex-col h-full bg-[var(--app-surface)] relative z-20 transition-all duration-300 overflow-hidden
        `}>
                    {!isDesktop && (
                        <div className="shrink-0 p-3 max-md:p-3 bg-[var(--app-surface)] border-b dark:border-slate-800 flex items-center justify-between">
                            <button onClick={() => setActiveMobileTab('products')} className="flex items-center gap-2 max-md:gap-2 text-blue-600 font-bold text-xs">
                                <ChevronLeft size={16} /> العودة للمنتجات
                            </button>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">مراجعة الطلب</span>
                        </div>
                    )}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <POSCart onPay={handlePayConfirm} onSuspend={handleSuspend} />
                    </div>

                    {!isQuickMode && (
                        <div className="shrink-0 p-2 max-md:p-2 bg-gray-50 dark:bg-slate-950 border-t dark:border-slate-800 hidden md:block">
                            <SmartRecommendations cartItems={validCartItems} onAdd={(name) => search.setQuery(name)} />
                        </div>
                    )}
                </aside>

                <main className={`
          ${isDesktop ? 'flex-1 rounded-2xl border dark:border-slate-800' : (activeMobileTab === 'products' ? 'flex-1' : 'hidden')} 
          overflow-hidden relative bg-[var(--app-surface)] shadow-sm
        `}>
                    <ProductGrid
                        searchTerm={search.debouncedQuery}
                        onAddToCart={(p) => addProductToCart(p)}
                        inStockOnly={inStockOnly}
                        onViewDetails={(p) => setDetailProduct(p)}
                        selectedWarehouseId={selectedWarehouseId}
                    />
                </main>
            </div>

            {!isDesktop && activeMobileTab === 'products' && items.length > 0 && (
                <div className="fixed bottom-0 inset-x-0 p-4 max-md:p-4 z-40 animate-in slide-in-from-bottom-10 h-24 pointer-events-none">
                    <div
                        onClick={() => setActiveMobileTab('cart')}
                        className="w-full max-w-md mx-auto h-full bg-blue-600 text-white rounded-[2rem] shadow-2xl shadow-blue-500/40 flex items-center justify-between px-6 py-3 cursor-pointer pointer-events-auto active:scale-[0.98] transition-all"
                    >
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">إجمالي السلة ({items.length})</span>
                            <span dir="ltr" className="text-xl font-bold font-mono">{formatCurrency(summary.totalAmount, currency)}</span>
                        </div>
                        <div className="flex items-center gap-3 max-md:gap-3">
                            <div className="bg-white/20 p-2 max-md:p-2.5 rounded-2xl">
                                <ShoppingCart size={20} />
                            </div>
                            <span className="text-sm font-bold">عرض السلة</span>
                        </div>
                    </div>
                </div>
            )}

            {isScannerOpen && (
                <ScannerOverlay
                    onScan={(code) => handleBarcodeScanned(code)}
                    onClose={() => setIsScannerOpen(false)}
                />
            )}


            {detailProduct && (
                <ProductDetailModal
                    product={detailProduct}
                    onClose={() => setDetailProduct(null)}
                />
            )}

            {showSuspended && (
                <SuspendedOrdersModal
                    orders={suspendedOrders}
                    onClose={() => setShowSuspended(false)}
                    onResume={(id) => {
                        const res = resumeOrder(id);
                        if (res) {
                            useSalesStore.setState({ items: res.items, selectedCustomer: res.customer });
                            useSalesStore.getState().calculateTotals();
                        }
                    }}
                    onRemove={removeSuspended}
                />
            )}
        </div>
    );
};

export default POSPage;