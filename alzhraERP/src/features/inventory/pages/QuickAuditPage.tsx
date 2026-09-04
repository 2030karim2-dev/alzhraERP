// ============================================
// QuickAuditPage — الجرد السريع (تسوية مخزون فورية)
// ============================================
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, CheckCircle2, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import { useWarehouses } from '../hooks/useInventoryManagement';
import { useSearchProducts } from '../hooks/useProducts';
import { useInventoryMutations } from '../hooks/useInventoryManagement';
import MicroHeader from '../../../ui/base/MicroHeader';
import Button from '../../../ui/base/Button';
import AuditSearchPanel, { type SearchResult } from '../components/audit/AuditSearchPanel';
import QuickAuditItemsTable, { type AdjustedItem } from '../components/audit/QuickAuditItemsTable';
import ScannerOverlay from '../../../ui/base/ScannerOverlay';
import { useFeedbackStore } from '../../feedback/store';
import { parseError } from '../../../core/utils/errorUtils';

const QuickAuditPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useFeedbackStore();
  const { data: warehouses, isLoading: isWarehousesLoading } = useWarehouses();
  const { quickAdjustStock, isQuickAdjusting } = useInventoryMutations();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [filter, setFilter] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [items, setItems] = useState<AdjustedItem[]>([]);

  const { data: searchResults, isLoading: isLoadingSearch } = useSearchProducts(filter);

  // Get system quantity for a product in the selected warehouse
  const getSystemQuantity = useCallback(
    (product: SearchResult): number => {
      if (!selectedWarehouseId) return 0;
      const dist = product.warehouse_distribution?.find(
        w => w.warehouse_id === selectedWarehouseId
      );
      return dist ? Number(dist.quantity) || 0 : 0;
    },
    [selectedWarehouseId]
  );

  const handleAddItem = useCallback(
    (product: SearchResult) => {
      if (!selectedWarehouseId) {
        showToast('يرجى اختيار المستودع أولاً', 'warning');
        return;
      }

      setItems(prev => {
        const exists = prev.find(i => i.product_id === product.id);
        if (exists) {
          showToast('الصنف موجود مسبقاً في القائمة', 'info');
          return prev;
        }

        const systemQty = getSystemQuantity(product);
        const newItem: AdjustedItem = {
          product_id: product.id,
          name_ar: product.name_ar || 'بدون اسم',
          sku: product.sku || '---',
          part_number: product.part_number || '',
          brand: product.brand || '',
          alternative_numbers: product.alternative_numbers || '',
          size: product.size || '',
          warehouse_id: selectedWarehouseId,
          system_quantity: systemQty,
          quantity: systemQty, // Default to system quantity (no change)
        };
        return [newItem, ...prev];
      });

      setFilter('');
    },
    [selectedWarehouseId, getSystemQuantity, showToast]
  );

  const handleUpdateQuantity = useCallback((productId: string, qty: string) => {
    setItems(prev =>
      prev.map(item =>
        item.product_id === productId
          ? { ...item, quantity: qty === '' ? 0 : parseInt(qty, 10) || 0 }
          : item
      )
    );
  }, []);

  const handleRemoveItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.product_id !== productId));
  }, []);

  const handleScan = useCallback((barcode: string) => {
    setFilter(barcode);
    setIsScannerOpen(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedWarehouseId) {
      showToast('يرجى اختيار المستودع', 'warning');
      return;
    }
    if (items.length === 0) {
      showToast('لا توجد أصناف للتسوية', 'warning');
      return;
    }

    // Filter out items with no change
    const changedItems = items.filter(i => i.quantity !== i.system_quantity);
    if (changedItems.length === 0) {
      showToast('لا توجد فروقات للتسوية', 'info');
      return;
    }

    const payload = changedItems.map(i => ({
      product_id: i.product_id,
      warehouse_id: selectedWarehouseId,
      quantity: i.quantity,
    }));

    quickAdjustStock(payload, {
      onSuccess: () => {
        showToast(`تم تسوية ${changedItems.length} صنف بنجاح`, 'success');
        setItems([]);
        setSelectedWarehouseId('');
        navigate('/inventory');
      },
      onError: (err: unknown) => {
        showToast('فشلت التسوية: ' + parseError(err).message, 'error');
      },
    });
  }, [selectedWarehouseId, items, quickAdjustStock, showToast, navigate]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const changedItems = items.filter(i => i.quantity !== i.system_quantity).length;
    const totalDiff = items.reduce((sum, i) => sum + (i.quantity - i.system_quantity), 0);
    return { totalItems, changedItems, totalDiff };
  }, [items]);

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-slate-950">
      <MicroHeader
        title="الجرد السريع"
        icon={Zap}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/inventory')}
              leftIcon={<ArrowRight size={14} />}
            >
              رجوع للمخزون
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={handleSubmit}
              isLoading={isQuickAdjusting}
              disabled={items.length === 0 || !selectedWarehouseId}
              leftIcon={
                isQuickAdjusting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )
              }
            >
              تطبيق التسوية ({stats.changedItems})
            </Button>
          </div>
        }
      />

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 pb-16">
        <div className="mx-auto max-w-[1600px] space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[var(--app-surface)] p-3 shadow-sm dark:border-slate-800">
              <div className="shrink-0 rounded-lg bg-blue-50 p-2 dark:bg-blue-900/30">
                <Zap size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-gray-500 dark:text-slate-500">
                  أصناف مضافة
                </p>
                <p className="mt-0.5 text-xl font-black leading-none text-gray-900 dark:text-white">
                  {stats.totalItems}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[var(--app-surface)] p-3 shadow-sm dark:border-slate-800">
              <div className="shrink-0 rounded-lg bg-amber-50 p-2 dark:bg-amber-900/30">
                <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-gray-500 dark:text-slate-500">
                  أصناف متغيرة
                </p>
                <p className="mt-0.5 text-xl font-black leading-none text-amber-600 dark:text-amber-400">
                  {stats.changedItems}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[var(--app-surface)] p-3 shadow-sm dark:border-slate-800">
              <div className="shrink-0 rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/30">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-gray-500 dark:text-slate-500">
                  صافي الفرق
                </p>
                <p
                  className={`mt-0.5 text-xl font-black leading-none ${stats.totalDiff > 0 ? 'text-emerald-600' : stats.totalDiff < 0 ? 'text-rose-600' : 'text-gray-900 dark:text-white'}`}
                >
                  {stats.totalDiff > 0 ? `+${stats.totalDiff}` : stats.totalDiff}
                </p>
              </div>
            </div>
          </div>

          {/* Search Panel */}
          <AuditSearchPanel
            warehouses={warehouses || []}
            isLoadingWarehouses={isWarehousesLoading}
            selectedWarehouseId={selectedWarehouseId}
            onWarehouseChange={id => {
              setSelectedWarehouseId(id);
              // Clear items when warehouse changes to avoid mismatched data
              setItems([]);
            }}
            filter={filter}
            onFilterChange={setFilter}
            onScannerOpen={() => {
              setIsScannerOpen(true);
            }}
            searchResults={(searchResults ?? []) as unknown as SearchResult[]}
            isLoadingSearch={isLoadingSearch}
            onAddItem={handleAddItem}
          />

          {/* Items Table */}
          <QuickAuditItemsTable
            items={items}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
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
    </div>
  );
};

export default QuickAuditPage;
