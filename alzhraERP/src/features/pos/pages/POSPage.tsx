import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import type { Product } from '../../inventory/types';
import { buildProductFromSearchResult } from '../utils/buildProductFromResult';
import { SuspendedOrdersModal } from '../components/SuspendedOrdersModal';
import { POSHeader } from '../components/layout/POSHeader';
import { useWarehousesWithBranches } from '../../inventory/hooks/useWarehouseStock';
import { createIdempotencyKey } from '../../../core/utils/idempotency';

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

  const { items, summary, selectedCustomer, currency, resetCart, addProductToCart } =
    useSalesStore();
  const { suspendedOrders, suspendCurrentOrder, resumeOrder, removeSuspended } = usePOSStore();
  const { processPayment } = usePOSCheckout();

  // مفتاح منع التكرار لكل نية دفع — يُعاد توليده بعد نجاح الدفع فقط.
  const checkoutIdempotencyKeyRef = useRef(createIdempotencyKey('pos'));

  const handleBarcodeScanned = useCallback(
    async (code: string) => {
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
    },
    [addProductToCart, search]
  );

  const handleSearchSelect = useCallback(
    (result: (typeof search.results)[number]) => {
      const { user } = useAuthStore.getState();
      if (!user?.company_id) return;
      const product = buildProductFromSearchResult(result, user.company_id);
      search.selectResult(result);
      addProductToCart(product);
    },
    [addProductToCart, search]
  );

  const handleViewDetails = useCallback((result: (typeof search.results)[number]) => {
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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const validCartItems = useMemo(
    () => (Array.isArray(items) ? items.filter(i => i.productId) : []),
    [items]
  );

  const handlePayConfirm = useCallback(() => {
    processPayment(
      {
        partyId: selectedCustomer?.id || null,
        idempotencyKey: checkoutIdempotencyKeyRef.current,
        type: 'sale',
        items: validCartItems.map(i => ({
          ...i,
          unitPrice: i.price,
          costPrice: i.costPrice || 0,
          maxStock: 0,
        })),
        discount: 0,
        paymentMethod: 'cash',
        status: 'paid' as const,
      },
      {
        onSuccess: () => {
          resetCart();
          // نية دفع جديدة = مفتاح جديد (الإبقاء عليه عند الفشل يسمح
          // بإعادة المحاولة بأمان دون فاتورة مكررة).
          checkoutIdempotencyKeyRef.current = createIdempotencyKey('pos');
        },
      }
    );
  }, [processPayment, selectedCustomer, validCartItems, resetCart]);

  const handleSuspend = useCallback(() => {
    if (validCartItems.length === 0) return;
    suspendCurrentOrder(items, selectedCustomer);
    resetCart();
  }, [validCartItems, items, selectedCustomer, suspendCurrentOrder, resetCart]);

  return (
    <div className="font-cairo fixed inset-0 z-50 flex h-[100dvh] w-screen select-none flex-col overflow-hidden bg-gray-50 dark:bg-slate-950">
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
        onLaunchScanner={() => {
          setIsScannerOpen(true);
        }}
        onSearchSelect={handleSearchSelect}
        onViewDetails={handleViewDetails}
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        onWarehouseChange={setSelectedWarehouseId}
      />

      <div className="relative flex flex-1 flex-row-reverse overflow-hidden bg-gray-50/50 p-2 dark:bg-slate-950/50 max-md:p-2 md:gap-4 md:p-4 lg:gap-6 lg:p-6">
        <aside
          className={` ${isDesktop ? 'w-[400px] rounded-3xl border shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)] dark:border-slate-800 lg:w-[450px] xl:w-[500px] 2xl:w-[550px] 3xl:w-[600px]' : activeMobileTab === 'cart' ? 'w-full min-w-0' : 'hidden'} relative z-20 flex h-full flex-col overflow-hidden bg-[var(--app-surface)] transition-all duration-300`}
        >
          {!isDesktop && (
            <div className="flex shrink-0 items-center justify-between border-b bg-[var(--app-surface)] p-3 dark:border-slate-800 max-md:p-3">
              <button
                onClick={() => {
                  setActiveMobileTab('products');
                }}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 max-md:gap-2"
              >
                <ChevronLeft size={16} /> العودة للمنتجات
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                مراجعة الطلب
              </span>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            <POSCart onPay={handlePayConfirm} onSuspend={handleSuspend} />
          </div>

          {!isQuickMode && (
            <div className="hidden shrink-0 border-t bg-gray-50 p-2 dark:border-slate-800 dark:bg-slate-950 max-md:p-2 md:block">
              <SmartRecommendations
                cartItems={validCartItems}
                onAdd={name => {
                  search.setQuery(name);
                }}
              />
            </div>
          )}
        </aside>

        <main
          className={` ${isDesktop ? 'flex-1 rounded-2xl border dark:border-slate-800' : activeMobileTab === 'products' ? 'flex-1' : 'hidden'} relative overflow-hidden bg-[var(--app-surface)] shadow-sm`}
        >
          <ProductGrid
            searchTerm={search.debouncedQuery}
            onAddToCart={p => {
              addProductToCart(p);
            }}
            inStockOnly={inStockOnly}
            onViewDetails={p => {
              setDetailProduct(p);
            }}
            selectedWarehouseId={selectedWarehouseId}
          />
        </main>
      </div>

      {!isDesktop && activeMobileTab === 'products' && items.length > 0 && (
        <div className="animate-in slide-in-from-bottom-10 pointer-events-none fixed inset-x-0 bottom-0 z-40 h-24 p-4 max-md:p-4">
          <div
            onClick={() => {
              setActiveMobileTab('cart');
            }}
            className="pointer-events-auto mx-auto flex h-full w-full max-w-md cursor-pointer items-center justify-between rounded-[2rem] bg-blue-600 px-6 py-3 text-white shadow-2xl shadow-blue-500/40 transition-all active:scale-[0.98]"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                إجمالي السلة ({items.length})
              </span>
              <span dir="ltr" className="font-mono text-xl font-bold">
                {formatCurrency(summary.totalAmount, currency)}
              </span>
            </div>
            <div className="flex items-center gap-3 max-md:gap-3">
              <div className="rounded-2xl bg-white/20 p-2 max-md:p-2.5">
                <ShoppingCart size={20} />
              </div>
              <span className="text-sm font-bold">عرض السلة</span>
            </div>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <ScannerOverlay
          onScan={code => handleBarcodeScanned(code)}
          onClose={() => {
            setIsScannerOpen(false);
          }}
        />
      )}

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => {
            setDetailProduct(null);
          }}
        />
      )}

      {showSuspended && (
        <SuspendedOrdersModal
          orders={suspendedOrders}
          onClose={() => {
            setShowSuspended(false);
          }}
          onResume={id => {
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
