import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClipboardCheck, Save, CheckCircle, Loader2, ScanBarcode, Layers, PackageSearch } from 'lucide-react';
import { useAuditSession, useInventoryMutations, useInventoryCategories } from '../hooks/useInventoryManagement';
import { useSearchProducts } from '../hooks/useProducts';
import { useInventorySession } from '../hooks/useInventorySession';
import MicroHeader from '../../../ui/base/MicroHeader';
import Button from '../../../ui/base/Button';
import AuditStats from '../components/audit/AuditStats';
import AuditItemsTable from '../components/audit/AuditItemsTable';
import { useForm } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
import ScannerOverlay from '../../../ui/base/ScannerOverlay';
import SearchInput from '../../../ui/components/SearchInput';
import SearchDropdown from '../../../ui/components/SearchDropdown';
import { ConfirmModal } from '../../../ui/base/ConfirmModal';

const AuditSessionPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { data, isLoading, isError } = useAuditSession(sessionId);
    const {
        saveAuditProgress,
        isSavingProgress,
        finalizeAudit,
        isFinalizing,
        addItemToAudit,
        isAddingItem,
        removeItemFromAudit,
        isRemovingItem
    } = useInventoryMutations();
    const { data: categories } = useInventoryCategories();

    const [filter, setFilter] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [debouncedFilter] = useDebounce(filter, 300);
    const [showResults, setShowResults] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [isBulkAdding, setIsBulkAdding] = useState(false);
    const [, setBulkProgress] = useState({ current: 0, total: 0 });
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);

    const { data: searchResults, isLoading: isLoadingSearch } = useSearchProducts(debouncedFilter);

    const {
        items: sessionItems,
        isRestoring,
        saveStatus,
        updateItems,
        mergeWithServer,
        clearSession,
    } = useInventorySession({
        sessionId: sessionId ?? '',
        warehouseId: (data?.session?.warehouse_id as string | undefined),
        initialItems: data?.items ?? [],
    });

    const { register, reset, getValues } = useForm({
        defaultValues: { items: [] as Record<string, unknown>[] },
        shouldUnregister: false,
    });

    const lastSyncedRef = useRef<string>('');
    const isInitialMount = useRef(true);

    // On initial mount, load server items into form (only once)
    useEffect(() => {
        if (isInitialMount.current && data?.items && data.items.length > 0) {
            const serialized = JSON.stringify(data.items);
            lastSyncedRef.current = serialized;
            reset({ items: data.items });
            isInitialMount.current = false;
        } else if (isInitialMount.current) {
            isInitialMount.current = false;
        }
    }, [data?.items, reset]);

    // When sessionItems change (from useInventorySession), sync to form
    // Guard against loops: only reset if items actually differ from last synced
    useEffect(() => {
        if (!isInitialMount.current && sessionItems.length > 0) {
            const serialized = JSON.stringify(sessionItems);
            if (serialized !== lastSyncedRef.current) {
                lastSyncedRef.current = serialized;
                reset({ items: sessionItems });
            }
        }
    }, [sessionItems, reset]);

    // Periodically sync form → session (for counted_quantity persistence)
    // This is what enables auto-save of user-entered quantities
    // Sync on blur (when user leaves a quantity field)
    const handleSaveProgress = useCallback(() => {
        const formItems = getValues('items');
        if (formItems && formItems.length > 0) {
            const serialized = JSON.stringify(formItems);
            if (serialized !== lastSyncedRef.current) {
                lastSyncedRef.current = serialized;
                updateItems(formItems as any[]);
            }
        }
    }, [getValues, updateItems]);

    // On page unload, force-save current form state
    useEffect(() => {
        const handleBeforeUnload = () => {
            const formItems = getValues('items');
            if (formItems && formItems.length > 0) {
                updateItems(formItems as any[]);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [getValues, updateItems]);

    // When server data updates (realtime), merge with local state
    // mergeWithServer only ADDS new items, never overwrites existing ones
    useEffect(() => {
        if (data?.items && data.items.length > 0 && !isInitialMount.current) {
            mergeWithServer(data.items);
        }
    }, [data?.items, mergeWithServer]);

    const watchedItems = getValues('items');

    const stats = useMemo(() => {
        const sourceItems = sessionItems.length > 0 ? sessionItems : watchedItems;
        const total = sourceItems.length;
        const counted = sourceItems.filter(i => i.counted_quantity !== null && i.counted_quantity !== undefined && i.counted_quantity !== '').length;
        const discrepancies = sourceItems.filter(i => {
            const diff = (i.counted_quantity !== null && i.counted_quantity !== undefined && i.counted_quantity !== '') ? Number(i.counted_quantity) - Number(i.expected_quantity) : 0;
            return diff !== 0;
        }).length;
        return { total, counted, pending: total - counted, discrepancies };
    }, [sessionItems, watchedItems]);

    const handleSave = () => {
        const currentItems = getValues('items');
        saveAuditProgress(currentItems as any[]);
    };

    const handleFinalize = () => {
        if (stats.pending > 0) {
            if (!window.confirm(`تنبيه: يوجد ${stats.pending} صنف لم يتم جرده. هل تريد المتابعة وإغلاق الجلسة؟`)) {
                return;
            }
        }
        if (sessionId) {
            const currentItems = getValues('items') as any[];
            finalizeAudit({ sessionId, items: currentItems }, {
                onSuccess: () => {
                    clearSession();
                    navigate('/inventory');
                }
            });
        }
    };

    const handleScan = (barcode: string) => {
        setFilter(barcode);
        setShowResults(true);
        setIsScannerOpen(false);
    };

    const handleAddItem = async (product: any) => {
        if (data?.session?.status === 'completed') return;

        const currentItems = getValues('items');
        const existingIndex = currentItems.findIndex((i: any) => i.product_id === product.id);

        if (existingIndex >= 0) {
            const newItems = [...currentItems];
            const [existingItem] = newItems.splice(existingIndex, 1);
            newItems.unshift(existingItem);
            lastSyncedRef.current = JSON.stringify(newItems);
            reset({ items: newItems });
            updateItems(newItems);
            setFilter('');
            setShowResults(false);
            return;
        }

        if (!sessionId) return;

        let fullProduct = product;
        if (!fullProduct.warehouse_distribution) {
            try {
                const { inventoryService } = await import('../service');
                const res = await inventoryService.getProductById(product.id);
                // Map the raw product to our domain model to get warehouse_distribution
                if (res && res.data) {
                    const mapped = (await import('./../services/productService')).productService.mapRawProducts([res.data], data?.session?.warehouse_id);
                    if (mapped && mapped.length > 0) {
                        fullProduct = mapped[0];
                    }
                }
            } catch (e) {
                console.error("Failed to fetch full product details", e);
            }
        }

        // Since we passed warehouse_id to mapRawProducts above, fullProduct.stock_quantity is already isolated!
        // If it came from elsewhere, we check warehouse_distribution first (preferred),
        // and only fall back to stock_quantity if it was mapped with the warehouse context.
        let expectedQuantity = 0;
        const warehouseId = data?.session?.warehouse_id;
        if (fullProduct.warehouse_distribution) {
            const stockInfo = fullProduct.warehouse_distribution.find((w: any) => w.warehouse_id === warehouseId);
            if (stockInfo) {
                expectedQuantity = Number(stockInfo.quantity) || 0;
            } else if (warehouseId && fullProduct.warehouse_distribution.length > 0) {
                // Warehouse-specific info missing but distribution exists — default to 0
                // to avoid counting global stock for a different warehouse
                expectedQuantity = 0;
            } else {
                expectedQuantity = Number(fullProduct.stock_quantity) || 0;
            }
        } else if (warehouseId && fullProduct.stock_quantity !== undefined) {
            // If we know the warehouse but this product doesn't have distribution data,
            // we still use the filtered stock_quantity (mapped by mapRawProducts with warehouse_id)
            expectedQuantity = Number(fullProduct.stock_quantity) || 0;
        }

        addItemToAudit({ sessionId, productId: product.id, expectedQuantity }, {
            onSuccess: () => {
                setFilter('');
                setShowResults(false);
            }
        });
    };

    const confirmRemoveItem = () => {
        if (itemToDelete) {
            removeItemFromAudit(itemToDelete, {
                onSuccess: () => {
                    setItemToDelete(null);
                    const current = getValues('items');
                    const filtered = current.filter((i: any) => i.id !== itemToDelete && i.product_id !== itemToDelete && i.audit_item_id !== itemToDelete);
                    lastSyncedRef.current = JSON.stringify(filtered);
                    reset({ items: filtered });
                    updateItems(filtered);
                }
            });
        }
    };

    /** إضافة كل منتجات المستودع المحدد للجلسة دفعةً واحدة */
    const handleBulkAddWarehouseProducts = useCallback(async () => {
        if (!sessionId || !data?.session?.warehouse_id) return;
        const warehouseId_val = data.session.warehouse_id;
        const currentItems = getValues('items') as any[];
        const existingProductIds = new Set(currentItems.map((i: any) => i.product_id));

        const { products: allProducts } = await import('../service').then(async (m) => {
            // [CRITICAL FIX]: Pass warehouseId_val to getProducts to ensure stock is isolated to this warehouse
            const result = await m.inventoryService.getProducts(data?.session?.company_id, 1, 99999, warehouseId_val);
            return { products: Array.isArray(result) ? result : (result as any).data ?? [] };
        }).catch(() => ({ products: [] as any[] }));

        const newProducts = allProducts.filter((p: any) => !existingProductIds.has(p.id));
        if (newProducts.length === 0) {
            setShowBulkConfirm(false);
            return;
        }

        setIsBulkAdding(true);
        setBulkProgress({ current: 0, total: newProducts.length });

        if (currentItems.length > 0) saveAuditProgress(currentItems);

        for (let i = 0; i < newProducts.length; i++) {
            const p = newProducts[i];
            // Since getProducts was called with warehouseId, p.stock_quantity is already the isolated quantity
            const expectedQuantity = p.stock_quantity || 0;
            await new Promise<void>((resolve) => {
                addItemToAudit(
                    { sessionId, productId: p.id, expectedQuantity },
                    { onSuccess: resolve, onError: () => resolve() }
                );
            });
            setBulkProgress({ current: i + 1, total: newProducts.length });
        }

        setIsBulkAdding(false);
        setShowBulkConfirm(false);
        setBulkProgress({ current: 0, total: 0 });
    }, [sessionId, data, getValues, saveAuditProgress, addItemToAudit]);

    if (isLoading || isError) {
        if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin text-blue-500" /></div>;
        return <div>حدث خطأ أثناء تحميل بيانات الجرد.</div>;
    }

    const session = data?.session;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950">
            <MicroHeader
                title={(session?.title as string) || "جلسة جرد"}
                icon={ClipboardCheck}
                actions={
                    <div className="flex items-center gap-1 sm:gap-2">
                        {isRestoring && <span className="hidden md:inline text-[10px] text-blue-500 self-center ml-2 animate-pulse">استعادة...</span>}
                        {saveStatus === 'saving' && <span className="hidden md:inline text-[10px] text-amber-500 self-center ml-2">حفظ...</span>}
                        
                        {session?.status !== 'completed' && (
                            <Button
                                variant="outline"
                                size="xs"
                                onClick={() => setShowBulkConfirm(true)}
                                isLoading={isBulkAdding}
                                leftIcon={isBulkAdding
                                    ? <Loader2 size={12} className="animate-spin" />
                                    : <PackageSearch size={12} />}
                                title="جرد كامل للمستودع"
                                className="px-2 sm:px-3"
                            >
                                <span className="hidden sm:inline">جرد كامل</span>
                            </Button>
                        )}
                        <Button variant="outline" size="xs" onClick={handleSave} isLoading={isSavingProgress} leftIcon={<Save size={12} />} title="حفظ مسودة" className="px-2 sm:px-3">
                            <span className="hidden sm:inline">حفظ</span>
                        </Button>
                        <Button 
                            variant="success" 
                            size="xs" 
                            onClick={handleFinalize} 
                            isLoading={isFinalizing} 
                            disabled={session?.status === 'completed'}
                            leftIcon={<CheckCircle size={12} />}
                            className="bg-emerald-600 hover:bg-emerald-700 border-none px-2 sm:px-3"
                            title="إنهاء وترحيل"
                        >
                            <span className="hidden sm:inline">{session?.status === 'completed' ? 'تم الإغلاق' : 'إنهاء وترحيل'}</span>
                        </Button>
                    </div>
                }
            />

            {/* Search and Scan Bar */}
            {session?.status !== 'completed' && (
                <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-2 sm:p-4 sticky top-0 z-40 shadow-sm">
                    <div className="max-w-[1600px] mx-auto relative">
                        <div className="flex gap-2 relative">
                            <SearchInput
                                value={filter}
                                onChange={(val) => {
                                    setFilter(val);
                                    if (val.trim()) setShowResults(true);
                                }}
                                placeholder="ابحث عن صنف لجرده..."
                                loading={isLoadingSearch || isAddingItem}
                                variant="default"
                                size="md"
                                className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-bold"
                                onEscape={() => setShowResults(false)}
                            />
                            <button
                                onClick={() => setIsScannerOpen(true)}
                                className="flex items-center justify-center bg-blue-600 text-white w-12 rounded-xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all shrink-0"
                            >
                                <ScanBarcode size={22} />
                            </button>
                        </div>

                        {/* Search Results Dropdown */}
                        <SearchDropdown
                            open={showResults && !!filter.trim()}
                            onClose={() => setShowResults(false)}
                            loading={isLoadingSearch || isAddingItem}
                            hasResults={(searchResults?.length ?? 0) > 0}
                            emptyMessage="لا توجد نتائج مطابقة"
                            className="z-50"
                        >
                            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-right text-xs border-collapse border border-gray-200 dark:border-slate-700">
                                    <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                                        <tr className="text-slate-700 dark:text-gray-200">
                                            <th className="py-2 px-4 border border-gray-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-bold">الصنف</th>
                                            <th className="py-2 px-4 border border-gray-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 w-32 text-center font-bold">رقم القطعة/SKU</th>
                                            <th className="py-2 px-4 border border-gray-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 w-32 text-center font-bold">الشركة الصانعة</th>
                                            <th className="py-2 px-4 border border-gray-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 w-24 text-center font-bold">المقاس</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                        {searchResults?.map((p: any) => (
                                            <tr
                                                key={p.id}
                                                onClick={() => {
                                                    handleAddItem(p);
                                                    setShowResults(false);
                                                }}
                                                className="hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                                            >
                                                <td className="py-3 px-4 font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">{p.name_ar || p.name}</td>
                                                <td className="py-3 px-4 text-center font-mono text-gray-500 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">{p.part_number || p.sku || '-'}</td>
                                                <td className="py-3 px-4 text-center font-bold text-gray-600 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">{p.brand || '-'}</td>
                                                <td className="py-3 px-4 text-center text-blue-600 dark:text-blue-400 font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">{p.size || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </SearchDropdown>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 pb-16 custom-scrollbar" onClick={() => setShowResults(false)}>
                <div className="max-w-[1600px] mx-auto space-y-4">
                    <AuditStats stats={stats} session={session} />

                    {/* Category Filter Bar - Mobile Optimized */}
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-sm -mx-2 px-2 sm:mx-0 sm:px-0">
                        <div className="flex items-center gap-1 px-2 border-l dark:border-slate-800 text-gray-400">
                            <Layers size={12} />
                            <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap">الفئة:</span>
                        </div>
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${!selectedCategory ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 dark:bg-slate-800 text-gray-500'}`}
                        >
                            الكل
                        </button>
                        {categories?.map((cat: any) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${selectedCategory === cat.name ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    <AuditItemsTable
                        items={sessionItems.length > 0 ? sessionItems : watchedItems}
                        register={register}
                        filter={debouncedFilter}
                        category={selectedCategory}
                        isCompleted={session?.status === 'completed'}
                        onRemoveItem={setItemToDelete}
                        onSave={handleSaveProgress}
                    />
                </div>
            </div>

            {isScannerOpen && (
                <ScannerOverlay
                    onScan={handleScan}
                    onClose={() => setIsScannerOpen(false)}
                />
            )}

            <ConfirmModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmRemoveItem}
                title="إزالة الصنف من الجرد"
                message="هل أنت متأكد من رغبتك في إزالة هذا الصنف من جلسة الجرد الميدانية الحالية؟"
                variant="danger"
                confirmLabel="نعم، إزالة الصنف"
                isLoading={isRemovingItem}
            />

            <ConfirmModal
                isOpen={showBulkConfirm}
                onClose={() => setShowBulkConfirm(false)}
                onConfirm={handleBulkAddWarehouseProducts}
                title="جرد كامل المستودع"
                message="سيتم إضافة جميع منتجات هذا المستودع إلى جلسة الجرد الحالية تلقائياً. هذه العملية قد تستغرق بعض الوقت. هل تريد المتابعة؟"
                variant="warning"
                confirmLabel="نعم، أضف كل المنتجات"
            />
        </div>
    );
};

export default AuditSessionPage;
