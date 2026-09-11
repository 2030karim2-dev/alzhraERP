import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClipboardCheck, Save, CheckCircle, Loader2, PackageSearch } from 'lucide-react';
import {
  useAuditSession,
  useInventoryMutations,
  useInventoryCategories,
} from '../hooks/useInventoryManagement';
import { useSearchProducts } from '../hooks/useProducts';
import { inventoryService } from '../service';
import { useInventorySession } from '../hooks/useInventorySession';
import MicroHeader from '../../../ui/base/MicroHeader';
import Button from '../../../ui/base/Button';
import AuditStats from '../components/audit/AuditStats';
import AuditItemsTable, { type AuditItemTarget } from '../components/audit/AuditItemsTable';
import { AuditCategoryFilterBar } from '../components/audit/AuditCategoryFilterBar';
import { AuditSessionSearchDropdown } from '../components/audit/AuditSessionSearchDropdown';
import { useForm } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
import ScannerOverlay from '../../../ui/base/ScannerOverlay';
import { ConfirmModal } from '../../../ui/base/ConfirmModal';
import type { Product } from '../types';

/** Shape of audit progress items (matches inventoryService.saveAuditProgress). */
interface AuditProgressItem {
  id?: string;
  product_id: string;
  counted_quantity: number | null;
}

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
    isRemovingItem,
  } = useInventoryMutations();
  const { data: categories } = useInventoryCategories();

  const [filter, setFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [debouncedFilter] = useDebounce(filter, 300);
  const [showResults, setShowResults] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AuditItemTarget | null>(null);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [, setBulkProgress] = useState({ current: 0, total: 0 });
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  const { data: searchResults, isLoading: isLoadingSearch } = useSearchProducts(debouncedFilter);

  const isCompleted = data?.session?.status === 'completed';

  const {
    items: sessionItems,
    isRestoring,
    saveStatus,
    updateItems,
    mergeWithServer,
    clearSession,
  } = useInventorySession({
    sessionId: sessionId ?? '',
    ...(data?.session?.warehouse_id
      ? { warehouseId: (data.session as { warehouse_id?: string }).warehouse_id! }
      : {}),
    initialItems: data?.items ?? [],
    isCompleted,
  });

  const { register, reset, getValues } = useForm({
    defaultValues: { items: [] as Array<Record<string, unknown>> },
    shouldUnregister: false,
  });

  const lastSyncedRef = useRef<string>('');
  const hasLoadedServerItemsRef = useRef(false);

  // Sync server items to form on load.
  // Preserves draft quantities if already restored from local storage.
  useEffect(() => {
    if (data?.items && data.items.length > 0 && !hasLoadedServerItemsRef.current) {
      hasLoadedServerItemsRef.current = true;
      const itemsToReset =
        sessionItems.length > 0
          ? data.items.map(serverItem => {
              const serverProductId =
                (serverItem as Record<string, unknown>).product_id ||
                (serverItem as Record<string, unknown>).id;
              const local = sessionItems.find(s => (s.product_id || s.id) === serverProductId);
              return local &&
                local.counted_quantity !== null &&
                local.counted_quantity !== undefined
                ? { ...serverItem, counted_quantity: local.counted_quantity }
                : serverItem;
            })
          : data.items;

      const serialized = JSON.stringify(itemsToReset);
      lastSyncedRef.current = serialized;
      reset({ items: itemsToReset });
    }
  }, [data?.items, sessionItems, reset]);

  const watchedItems = getValues('items');

  const displayItems = useMemo(() => {
    if (isCompleted) {
      return data?.items || [];
    }
    return sessionItems.length > 0 ? sessionItems : watchedItems;
  }, [isCompleted, data?.items, sessionItems, watchedItems]);

  const stats = useMemo(() => {
    const total = displayItems.length;
    const counted = displayItems.filter(
      i =>
        i.counted_quantity !== null && i.counted_quantity !== undefined && i.counted_quantity !== ''
    ).length;
    const discrepancies = displayItems.filter(i => {
      const diff =
        i.counted_quantity !== null && i.counted_quantity !== undefined && i.counted_quantity !== ''
          ? Number(i.counted_quantity) - Number(i.expected_quantity)
          : 0;
      return diff !== 0;
    }).length;
    return { total, counted, pending: total - counted, discrepancies };
  }, [displayItems]);

  const prepareProgressItems = useCallback((): AuditProgressItem[] => {
    const formItems = getValues('items') || [];
    const sourceList = displayItems.length > 0 ? displayItems : data?.items || [];
    return sourceList.map(item => {
      const rawItem = item as Record<string, unknown>;
      const targetProductId = String(rawItem.product_id || rawItem.id || '');
      const matched = formItems.find(f => String(f.product_id || f.id || '') === targetProductId);
      const formVal = matched?.counted_quantity;
      const counted = formVal !== undefined && formVal !== '' ? formVal : rawItem.counted_quantity;
      let finalCounted: number | null = null;
      if (counted !== null && counted !== undefined && counted !== '') {
        const parsed = Number(counted);
        finalCounted = Number.isNaN(parsed) ? null : parsed;
      } else if (
        rawItem.counted_quantity !== null &&
        rawItem.counted_quantity !== undefined &&
        rawItem.counted_quantity !== ''
      ) {
        const parsed = Number(rawItem.counted_quantity);
        finalCounted = Number.isNaN(parsed) ? null : parsed;
      }

      const res: AuditProgressItem = {
        product_id: targetProductId,
        counted_quantity: finalCounted,
      };
      if (typeof rawItem.id === 'string' && rawItem.id.length > 0) {
        res.id = rawItem.id;
      }
      return res;
    });
  }, [displayItems, data?.items, getValues]);

  // When sessionItems change (from useInventorySession), sync to form if not completed
  useEffect(() => {
    if (!isCompleted && sessionItems.length > 0) {
      const serialized = JSON.stringify(sessionItems);
      if (serialized !== lastSyncedRef.current) {
        lastSyncedRef.current = serialized;
        reset({ items: sessionItems });
      }
    }
  }, [sessionItems, isCompleted, reset]);

  // Periodically sync form → session
  const handleSaveProgress = useCallback(() => {
    if (isCompleted) return;
    const formItems = getValues('items');
    if (formItems && formItems.length > 0) {
      const serialized = JSON.stringify(formItems);
      if (serialized !== lastSyncedRef.current) {
        lastSyncedRef.current = serialized;
        updateItems(formItems);
      }
    }
  }, [getValues, isCompleted, updateItems]);

  // On page unload or SPA unmount, force-save current form state
  useEffect(() => {
    if (isCompleted) return;
    const handleBeforeUnload = () => {
      const formItems = getValues('items');
      if (formItems && formItems.length > 0) {
        updateItems(formItems);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // SPA Navigation unmount save: update session draft and trigger database save
      const formItems = getValues('items');
      if (formItems && formItems.length > 0) {
        updateItems(formItems);
        if (sessionId) {
          const itemsToSave = prepareProgressItems();
          if (itemsToSave.length > 0) {
            void inventoryService.saveAuditProgress({ sessionId, items: itemsToSave });
          }
        }
      }
    };
  }, [getValues, isCompleted, updateItems, sessionId, prepareProgressItems]);

  // When server data updates (realtime), merge with local state if not completed.
  // Guard with !isRestoring so we don't race against the draft restoration in useInventorySession.
  useEffect(() => {
    if (
      !isCompleted &&
      !isRestoring &&
      data?.items &&
      data.items.length > 0 &&
      hasLoadedServerItemsRef.current
    ) {
      mergeWithServer(data.items);
    }
  }, [data?.items, isCompleted, isRestoring, mergeWithServer]);

  const handleSave = () => {
    const itemsToSave = prepareProgressItems();
    if (sessionId) {
      saveAuditProgress({ sessionId, items: itemsToSave });
    } else {
      saveAuditProgress(itemsToSave);
    }
  };

  const executeFinalize = () => {
    if (sessionId) {
      const itemsToFinalize = prepareProgressItems();
      finalizeAudit(
        { sessionId, items: itemsToFinalize },
        {
          onSuccess: () => {
            clearSession();
            setShowFinalizeConfirm(false);
            navigate('/inventory');
          },
        }
      );
    }
  };

  const handleFinalize = () => {
    if (stats.pending > 0) {
      setShowFinalizeConfirm(true);
      return;
    }
    executeFinalize();
  };

  const handleScan = (barcode: string) => {
    setFilter(barcode);
    setShowResults(true);
    setIsScannerOpen(false);
  };

  const handleAddItem = async (product: Product) => {
    if (data?.session?.status === 'completed') return;

    const currentItems = getValues('items');
    const existingIndex = currentItems.findIndex(i => i.product_id === product.id);

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

    const warehouseId = (data?.session as { warehouse_id?: string })?.warehouse_id;
    let expectedQuantity = 0;
    if (product.warehouse_distribution) {
      const stockInfo = product.warehouse_distribution.find(w => w.warehouse_id === warehouseId);
      if (stockInfo) {
        expectedQuantity = Number(stockInfo.quantity) || 0;
      }
    } else if (product.stock_quantity !== undefined) {
      expectedQuantity = Number(product.stock_quantity) || 0;
    }

    // Optimistic addition for instant UI response (no 30-second delay)
    const optimisticItem = {
      product_id: product.id,
      expected_quantity: expectedQuantity,
      counted_quantity: null,
      products: {
        id: product.id,
        name: product.name_ar || product.name || 'بدون اسم',
        name_ar: product.name_ar || product.name || 'بدون اسم',
        sku: product.sku || '---',
        part_number: product.part_number || null,
        brand: product.brand || null,
        size: product.size || null,
        category: (product as unknown as { category?: string }).category || 'عام',
      },
    };

    const newItems = [optimisticItem, ...currentItems];
    lastSyncedRef.current = JSON.stringify(newItems);
    reset({ items: newItems });
    updateItems(newItems);
    setFilter('');
    setShowResults(false);

    addItemToAudit(
      { sessionId, productId: product.id, expectedQuantity },
      {
        onSuccess: (res: unknown) => {
          const realId = (res as { id?: string })?.id;
          if (realId) {
            const current = getValues('items');
            const updated = current.map(item =>
              (item.product_id || (item as { products?: { id?: string } }).products?.id) ===
              product.id
                ? { ...item, id: realId, audit_item_id: realId }
                : item
            );
            lastSyncedRef.current = JSON.stringify(updated);
            reset({ items: updated });
            updateItems(updated);
          }
        },
        onError: () => {
          const reverted = getValues('items').filter(i => i.product_id !== product.id);
          lastSyncedRef.current = JSON.stringify(reverted);
          reset({ items: reverted });
          updateItems(reverted);
        },
      }
    );
  };

  const confirmRemoveItem = () => {
    if (itemToDelete && sessionId) {
      const targetId = itemToDelete.id;
      const targetProductId = itemToDelete.productId;

      const current = getValues('items');
      const filtered = current.filter(
        i =>
          (!targetId || (i.id !== targetId && i.audit_item_id !== targetId)) &&
          (!targetProductId || i.product_id !== targetProductId)
      );
      lastSyncedRef.current = JSON.stringify(filtered);
      reset({ items: filtered });
      updateItems(filtered);
      setItemToDelete(null);

      removeItemFromAudit(
        {
          ...(targetId ? { itemId: targetId } : {}),
          productId: targetProductId,
          sessionId,
        },
        {
          onError: () => {
            lastSyncedRef.current = JSON.stringify(current);
            reset({ items: current });
            updateItems(current);
          },
        }
      );
    }
  };

  const handleBulkAddWarehouseProducts = useCallback(async () => {
    if (!sessionId || !data?.session?.warehouse_id) return;
    const warehouseId_val = (data.session as { warehouse_id: string }).warehouse_id;
    const currentItems = getValues('items');
    const existingProductIds = new Set(currentItems.map(i => i.product_id));

    const { products: allProducts } = await import('../service')
      .then(async m => {
        const result = await m.inventoryService.getProducts(
          (data?.session as { company_id?: string })?.company_id || '',
          1,
          99999,
          warehouseId_val
        );
        return {
          products: Array.isArray(result)
            ? result
            : ((result as unknown as { data?: Product[] }).data ?? []),
        };
      })
      .catch(() => ({ products: [] as Product[] }));

    const newProducts = allProducts.filter(p => !existingProductIds.has(p.id));
    if (newProducts.length === 0) {
      setShowBulkConfirm(false);
      return;
    }

    setIsBulkAdding(true);
    setBulkProgress({ current: 0, total: newProducts.length });

    if (currentItems.length > 0)
      saveAuditProgress({
        sessionId,
        items: currentItems as unknown as Array<{
          id?: string;
          product_id: string;
          counted_quantity: number | null;
        }>,
      });

    for (let i = 0; i < newProducts.length; i++) {
      const p = newProducts[i];
      const dist = p.warehouse_distribution?.find(w => w.warehouse_id === warehouseId_val);
      const expectedQuantity =
        dist !== undefined ? Number(dist.quantity) || 0 : p.stock_quantity || 0;
      await new Promise<void>(resolve => {
        addItemToAudit(
          { sessionId, productId: p.id, expectedQuantity },
          {
            onSuccess: () => {
              resolve();
            },
            onError: () => {
              resolve();
            },
          }
        );
      });
      setBulkProgress({ current: i + 1, total: newProducts.length });
    }

    setIsBulkAdding(false);
    setShowBulkConfirm(false);
    setBulkProgress({ current: 0, total: 0 });
  }, [sessionId, data, getValues, saveAuditProgress, addItemToAudit]);

  if (isLoading || isError) {
    if (isLoading)
      return (
        <div className="p-20 text-center">
          <Loader2 className="animate-spin text-blue-500" />
        </div>
      );
    return <div>حدث خطأ أثناء تحميل بيانات الجرد.</div>;
  }

  const session = data?.session;

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-slate-950">
      <MicroHeader
        title={(session?.title as string) || 'جلسة جرد'}
        icon={ClipboardCheck}
        actions={
          <div className="flex items-center gap-1 sm:gap-2">
            {isRestoring && (
              <span className="ml-2 hidden animate-pulse self-center text-[10px] text-blue-500 md:inline">
                استعادة...
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="ml-2 hidden self-center text-[10px] text-amber-500 md:inline">
                حفظ...
              </span>
            )}

            {session?.status !== 'completed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowBulkConfirm(true);
                }}
                isLoading={isBulkAdding}
                leftIcon={
                  isBulkAdding ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <PackageSearch size={12} />
                  )
                }
                title="جرد كامل للمستودع"
                className="px-2 sm:px-3"
              >
                <span className="hidden sm:inline">جرد كامل</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              isLoading={isSavingProgress}
              leftIcon={<Save size={12} />}
              title="حفظ مسودة"
              className="px-2 sm:px-3"
            >
              <span className="hidden sm:inline">حفظ</span>
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={handleFinalize}
              isLoading={isFinalizing}
              disabled={session?.status === 'completed'}
              leftIcon={<CheckCircle size={12} />}
              className="border-none bg-emerald-600 px-2 hover:bg-emerald-700 sm:px-3"
              title="إنهاء وترحيل"
            >
              <span className="hidden sm:inline">
                {session?.status === 'completed' ? 'تم الإغلاق' : 'إنهاء وترحيل'}
              </span>
            </Button>
          </div>
        }
      />

      {/* Search and Scan Bar */}
      {session?.status !== 'completed' && (
        <AuditSessionSearchDropdown
          filter={filter}
          setFilter={setFilter}
          showResults={showResults}
          setShowResults={setShowResults}
          isLoadingSearch={isLoadingSearch}
          isAddingItem={isAddingItem}
          searchResults={searchResults}
          onAddItem={handleAddItem}
          onOpenScanner={() => {
            setIsScannerOpen(true);
          }}
        />
      )}

      <div
        className="custom-scrollbar flex-1 overflow-y-auto p-4 pb-16"
        onClick={() => {
          setShowResults(false);
        }}
      >
        <div className="mx-auto max-w-[1600px] space-y-4">
          <AuditStats stats={stats} session={session} />

          {/* Category Filter Bar */}
          <AuditCategoryFilterBar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          <AuditItemsTable
            items={displayItems}
            register={register}
            filter={debouncedFilter}
            category={selectedCategory}
            isCompleted={isCompleted}
            onRemoveItem={setItemToDelete}
            onSave={handleSaveProgress}
          />
        </div>
      </div>

      {isScannerOpen && (
        <ScannerOverlay
          onScan={handleScan}
          onClose={() => {
            setIsScannerOpen(false);
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => {
          setItemToDelete(null);
        }}
        onConfirm={confirmRemoveItem}
        title="إزالة الصنف من الجرد"
        message={
          itemToDelete?.name
            ? `هل أنت متأكد من رغبتك في إزالة "${itemToDelete.name}" من جلسة الجرد الميدانية الحالية؟`
            : 'هل أنت متأكد من رغبتك في إزالة هذا الصنف من جلسة الجرد الميدانية الحالية؟'
        }
        variant="danger"
        confirmLabel="نعم، إزالة الصنف"
        isLoading={isRemovingItem}
      />

      <ConfirmModal
        isOpen={showBulkConfirm}
        onClose={() => {
          setShowBulkConfirm(false);
        }}
        onConfirm={handleBulkAddWarehouseProducts}
        title="جرد كامل المستودع"
        message="سيتم إضافة جميع منتجات هذا المستودع إلى جلسة الجرد الحالية تلقائياً. هذه العملية قد تستغرق بعض الوقت. هل تريد المتابعة؟"
        variant="warning"
        confirmLabel="نعم، أضف كل المنتجات"
      />

      <ConfirmModal
        isOpen={showFinalizeConfirm}
        onClose={() => {
          setShowFinalizeConfirm(false);
        }}
        onConfirm={executeFinalize}
        title="إنهاء واعتماد الجرد"
        message={`تنبيه: يوجد ${stats.pending} صنف لم يتم جرده بعد. عند الاعتماد سيتم ترحيل الفروقات المخزنية نهائياً وإغلاق الجلسة. هل تريد المتابعة؟`}
        variant="warning"
        confirmLabel="نعم، اعتماد وإنهاء الجرد"
        isLoading={isFinalizing}
      />
    </div>
  );
};

export default AuditSessionPage;
