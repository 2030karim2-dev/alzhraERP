import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Save,
  CheckCircle,
  Loader2,
  PackageSearch,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  useAuditSession,
  useInventoryMutations,
  useInventoryCategories,
} from '../hooks/useInventoryManagement';
import { useSearchProducts } from '../hooks/useProducts';
import { inventoryService } from '../service';
import { useInventorySession } from '../hooks/useInventorySession';
import { useAuthStore } from '../../auth/store';
import MicroHeader from '../../../ui/base/MicroHeader';
import Button from '../../../ui/base/Button';
import AuditStats, { type AuditSessionInfo } from '../components/audit/AuditStats';
import AuditItemsTable, {
  type AuditItemTarget,
  type AuditStatusFilter,
} from '../components/audit/AuditItemsTable';
import { AuditCategoryFilterBar } from '../components/audit/AuditCategoryFilterBar';
import { AuditSessionSearchDropdown } from '../components/audit/AuditSessionSearchDropdown';
import { useForm } from 'react-hook-form';
import { useDebounce } from 'use-debounce';
import ScannerOverlay from '../../../ui/base/ScannerOverlay';
import { ConfirmModal } from '../../../ui/base/ConfirmModal';
import { useFeedbackStore } from '../../feedback/store';
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
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
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
    populateWarehouseItems,
    isPopulatingWarehouse,
  } = useInventoryMutations();
  const { data: categories } = useInventoryCategories();

  const [filter, setFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AuditStatusFilter>('all');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [debouncedFilter] = useDebounce(filter, 300);
  const [showResults, setShowResults] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AuditItemTarget | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  const { data: searchResults, isLoading: isLoadingSearch } = useSearchProducts(debouncedFilter);

  const isCompleted = data?.session?.status === 'completed';
  const canManageAudit =
    user?.role === 'owner' || user?.role === 'admin' || user?.role === 'manager';

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
    let discrepancyValue = 0;
    let matchedCount = 0;
    const counted = displayItems.filter(
      i =>
        i.counted_quantity !== null && i.counted_quantity !== undefined && i.counted_quantity !== ''
    ).length;
    const discrepancies = displayItems.filter(i => {
      const isCounted =
        i.counted_quantity !== null &&
        i.counted_quantity !== undefined &&
        i.counted_quantity !== '';
      if (!isCounted) return false;
      const diff = Number(i.counted_quantity) - Number(i.expected_quantity);
      if (diff !== 0) {
        const prod = (i.products as Record<string, unknown>) || i;
        const unitCost = Number(prod.cost_price ?? prod.purchase_price ?? 0);
        discrepancyValue += diff * unitCost;
        return true;
      } else {
        matchedCount += 1;
        return false;
      }
    }).length;
    return {
      total,
      counted,
      pending: total - counted,
      discrepancies,
      matched: matchedCount,
      discrepancyValue: Math.round(discrepancyValue * 100) / 100,
    };
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
    const existingIndex = currentItems.findIndex(
      i =>
        (i.product_id || i.id) === product.id || (i.products as { id?: string })?.id === product.id
    );

    // Barcode Accumulator: If item already in audit session, increment counted quantity by +1
    if (existingIndex >= 0) {
      const newItems = [...currentItems];
      const existingItem = { ...newItems[existingIndex] };
      const currentQty =
        existingItem.counted_quantity !== null &&
        existingItem.counted_quantity !== undefined &&
        existingItem.counted_quantity !== ''
          ? Number(existingItem.counted_quantity)
          : 0;
      const nextQty = currentQty + 1;
      existingItem.counted_quantity = nextQty;
      newItems.splice(existingIndex, 1);
      newItems.unshift(existingItem);
      lastSyncedRef.current = JSON.stringify(newItems);
      reset({ items: newItems });
      updateItems(newItems);
      setFilter('');
      setShowResults(false);
      showToast(
        `تم زيادة كمية "${(existingItem.products as { name?: string })?.name || product.name_ar || 'الصنف'}" إلى (${nextQty})`,
        'info',
        { hideAfter: 1500 }
      );
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

    // Optimistic addition for instant UI response (no delay)
    const optimisticItem = {
      product_id: product.id,
      expected_quantity: expectedQuantity,
      counted_quantity: null, // Starts uncounted until counted or scanned again
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
    showToast(`تمت إضافة "${product.name_ar || product.name}" إلى مسودة الجرد`, 'success', {
      hideAfter: 1500,
    });

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

  // Atomic bulk warehouse population
  const handleBulkAddWarehouseProducts = useCallback(async () => {
    if (!sessionId) return;
    const currentItems = getValues('items');
    if (currentItems.length > 0) {
      const itemsToSave = prepareProgressItems();
      if (itemsToSave.length > 0) {
        await inventoryService.saveAuditProgress({ sessionId, items: itemsToSave });
      }
    }

    populateWarehouseItems(sessionId, {
      onSuccess: () => {
        setShowBulkConfirm(false);
      },
      onError: () => {
        setShowBulkConfirm(false);
      },
    });
  }, [sessionId, getValues, prepareProgressItems, populateWarehouseItems]);

  if (isLoading || isError) {
    if (isLoading)
      return (
        <div className="flex h-64 items-center justify-center p-20 text-center">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      );
    return <div className="p-8 text-center text-rose-500">حدث خطأ أثناء تحميل بيانات الجرد.</div>;
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

            {session?.status !== 'completed' && canManageAudit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowBulkConfirm(true);
                }}
                isLoading={isPopulatingWarehouse}
                leftIcon={
                  isPopulatingWarehouse ? (
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
              disabled={session?.status === 'completed' || !canManageAudit}
              leftIcon={<CheckCircle size={12} />}
              className="border-none bg-emerald-600 px-2 hover:bg-emerald-700 sm:px-3"
              title={canManageAudit ? 'إنهاء وترحيل' : 'يتطلب صلاحية مدير/مالك'}
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
          <AuditStats stats={stats} session={(session ?? {}) as unknown as AuditSessionInfo} />

          {/* Category & Status Filter Bars */}
          <div className="space-y-2">
            <AuditCategoryFilterBar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Quick Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-100 bg-[var(--app-surface)] p-1.5 shadow-sm dark:border-slate-800">
              <span className="flex items-center gap-1 px-2 text-[10px] font-black uppercase text-gray-400">
                <Filter size={12} /> الحالة:
              </span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-black transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white shadow dark:bg-slate-700'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                الكل ({stats.total})
              </button>
              <button
                onClick={() => setStatusFilter('discrepancy')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black transition-all ${
                  statusFilter === 'discrepancy'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                }`}
              >
                <AlertTriangle size={10} /> بها فروقات ({stats.discrepancies})
              </button>
              <button
                onClick={() => setStatusFilter('matched')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black transition-all ${
                  statusFilter === 'matched'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                }`}
              >
                <CheckCircle2 size={10} /> مطابقة ({stats.matched ?? 0})
              </button>
              <button
                onClick={() => setStatusFilter('uncounted')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black transition-all ${
                  statusFilter === 'uncounted'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                }`}
              >
                <Clock size={10} /> لم تُجرد ({stats.pending})
              </button>
            </div>
          </div>

          <AuditItemsTable
            items={displayItems}
            register={register}
            filter={debouncedFilter}
            category={selectedCategory}
            statusFilter={statusFilter}
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
        message="سيتم إضافة جميع منتجات هذا المستودع إلى جلسة الجرد الحالية تلقائياً وبشكل فوري. هل تريد المتابعة؟"
        variant="warning"
        confirmLabel="نعم، أضف كل المنتجات"
        isLoading={isPopulatingWarehouse}
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
