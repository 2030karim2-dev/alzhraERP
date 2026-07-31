import React, { useMemo } from 'react';
import { ArrowRightLeft, Package, AlertTriangle, Truck, MapPin } from 'lucide-react';
import { cn } from '../../../core/utils';
import { useProducts, useWarehouses } from '../../inventory/hooks/index';
import { Product, Warehouse } from '../../inventory/types';

interface TransferSuggestion {
    product: Product;
    fromWarehouse: Warehouse;
    toWarehouse: Warehouse;
    availableQty: number;
    reason: string;
}

const WarehouseTransferSuggestions: React.FC<{ className?: string }> = ({ className }) => {
    const { data: products } = useProducts();
    const { data: warehousesRaw } = useWarehouses();
    const warehouses = (warehousesRaw || []) as any[];

    const suggestions = useMemo(() => {
        if (!products || !warehouses || warehouses.length < 2) return [];

        const mainWarehouse = warehouses.find((w: Warehouse) =>
            w.name_ar?.includes('رئيسي') || w.name_ar?.includes('متجر') || w.name_ar?.includes('محل')
        ) || warehouses[0];

        const results: TransferSuggestion[] = [];

        products.forEach((product: Product) => {
            if (!product.warehouse_distribution || product.warehouse_distribution.length === 0) return;

            // Check if product is missing or out of stock in main warehouse
            const mainStock = product.warehouse_distribution.find(
                (wd) => wd.warehouse_id === mainWarehouse?.id
            );
            const mainQty = mainStock?.quantity || 0;

            if (mainQty === 0) {
                // Product is missing from main warehouse — find it in branches
                product.warehouse_distribution.forEach((wd) => {
                    if (wd.warehouse_id !== mainWarehouse?.id && wd.quantity > 0) {
                        const fromWh = warehouses.find((w: Warehouse) => w.id === wd.warehouse_id);
                        if (fromWh && mainWarehouse) {
                            results.push({
                                product,
                                fromWarehouse: fromWh,
                                toWarehouse: mainWarehouse,
                                availableQty: wd.quantity,
                                reason: mainQty === 0 ? 'غير متوفر في المتجر الرئيسي' : 'مخزون منخفض'
                            });
                        }
                    }
                });
            }
        });

        // Sort by available quantity (higher first — more impactful transfers)
        return results.sort((a, b) => b.availableQty - a.availableQty).slice(0, 8);
    }, [products, warehouses]);

    const hasSuggestions = suggestions.length > 0;

    return (
        <div className={cn(
            "bg-[var(--app-surface)]/80 backdrop-blur-xl border border-[var(--app-border)] rounded-2xl p-4 relative overflow-hidden group",
            className
        )}>
            {/* Ambient glow */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-violet-500/10 rounded-full blur-[60px] group-hover:bg-violet-400/20 transition-all duration-700 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                        <ArrowRightLeft size={16} className="text-violet-400 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--app-text)]">اقتراحات المناقلات</h3>
                        <p className="text-[9px] text-[var(--app-text-secondary)]">منتجات متوفرة بالفروع وغير موجودة بالمتجر</p>
                    </div>
                </div>
                {hasSuggestions && (
                    <span className="text-[9px] font-bold bg-violet-500/20 text-violet-300 px-2 py-1 rounded-lg border border-violet-500/20">
                        {suggestions.length} اقتراح
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {!hasSuggestions ? (
                    <div className="text-center py-6">
                        <Package size={32} className="mx-auto text-[var(--app-text-secondary)] mb-2" />
                        <p className="text-xs font-bold text-[var(--app-text-secondary)]">لا توجد اقتراحات حالياً</p>
                        <p className="text-[10px] text-[var(--app-text-secondary)] mt-1 opacity-60">جميع المنتجات متوفرة في المتجر الرئيسي</p>
                    </div>
                ) : (
                    suggestions.map((s, i) => (
                        <div
                            key={`${s.product.id}-${s.fromWarehouse.id}-${i}`}
                            className="bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/10 transition-all duration-300 group/item"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20 flex-shrink-0 mt-0.5">
                                    <AlertTriangle size={12} className="text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-[var(--app-text)] truncate">{s.product.name}</p>
                                    {s.product.part_number && (
                                        <p className="text-[9px] text-[var(--app-text-secondary)] font-mono">{s.product.part_number}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2 text-[10px]">
                                        <div className="flex items-center gap-1 text-emerald-400">
                                            <MapPin size={10} />
                                            <span className="font-bold">{s.fromWarehouse.name_ar}</span>
                                        </div>
                                        <Truck size={10} className="text-[var(--app-text-secondary)]" />
                                        <div className="flex items-center gap-1 text-blue-400">
                                            <MapPin size={10} />
                                            <span className="font-bold">{s.toWarehouse.name_ar}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-left flex-shrink-0">
                                    <span className="text-sm font-bold text-[var(--app-text)] font-mono">{s.availableQty}</span>
                                    <p className="text-[8px] text-[var(--app-text-secondary)] font-bold">متوفر</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default WarehouseTransferSuggestions;
