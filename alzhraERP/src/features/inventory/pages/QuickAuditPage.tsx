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
    const getSystemQuantity = useCallback((product: SearchResult): number => {
        if (!selectedWarehouseId) return 0;
        const dist = product.warehouse_distribution?.find((w) => w.warehouse_id === selectedWarehouseId);
        return dist ? Number(dist.quantity) || 0 : 0;
    }, [selectedWarehouseId]);

    const handleAddItem = useCallback((product: SearchResult) => {
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
    }, [selectedWarehouseId, getSystemQuantity, showToast]);

    const handleUpdateQuantity = useCallback((productId: string, qty: string) => {
        setItems(prev => prev.map(item =>
            item.product_id === productId
                ? { ...item, quantity: qty === '' ? 0 : parseInt(qty) || 0 }
                : item
        ));
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
            quantity: i.quantity
        }));

        quickAdjustStock(payload, {
            onSuccess: () => {
                showToast(`تم تسوية ${changedItems.length} صنف بنجاح`, 'success');
                setItems([]);
                setSelectedWarehouseId('');
                navigate('/inventory');
            },
            onError: (err: any) => {
                showToast('فشلت التسوية: ' + (err?.message || 'خطأ غير معروف'), 'error');
            }
        });
    }, [selectedWarehouseId, items, quickAdjustStock, showToast, navigate]);

    const stats = useMemo(() => {
        const totalItems = items.length;
        const changedItems = items.filter(i => i.quantity !== i.system_quantity).length;
        const totalDiff = items.reduce((sum, i) => sum + (i.quantity - i.system_quantity), 0);
        return { totalItems, changedItems, totalDiff };
    }, [items]);

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950">
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
                            leftIcon={isQuickAdjusting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        >
                            تطبيق التسوية ({stats.changedItems})
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 overflow-y-auto p-4 pb-16 custom-scrollbar">
                <div className="max-w-[1600px] mx-auto space-y-4">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[var(--app-surface)] rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-3 shadow-sm">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg shrink-0">
                                <Zap size={16} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase">أصناف مضافة</p>
                                <p className="text-xl font-black text-gray-900 dark:text-white leading-none mt-0.5">{stats.totalItems}</p>
                            </div>
                        </div>
                        <div className="bg-[var(--app-surface)] rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-3 shadow-sm">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg shrink-0">
                                <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase">أصناف متغيرة</p>
                                <p className="text-xl font-black text-amber-600 dark:text-amber-400 leading-none mt-0.5">{stats.changedItems}</p>
                            </div>
                        </div>
                        <div className="bg-[var(--app-surface)] rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-3 shadow-sm">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg shrink-0">
                                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase">صافي الفرق</p>
                                <p className={`text-xl font-black leading-none mt-0.5 ${stats.totalDiff > 0 ? 'text-emerald-600' : stats.totalDiff < 0 ? 'text-rose-600' : 'text-gray-900 dark:text-white'}`}>
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
                        onWarehouseChange={(id) => {
                            setSelectedWarehouseId(id);
                            // Clear items when warehouse changes to avoid mismatched data
                            setItems([]);
                        }}
                        filter={filter}
                        onFilterChange={setFilter}
                        onScannerOpen={() => { setIsScannerOpen(true); }}
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
                    onClose={() => { setIsScannerOpen(false); }}
                />
            )}
        </div>
    );
};

export default QuickAuditPage;