import { useMemo, useState } from 'react';
import { Product } from '../types';

export interface SmartSuggestion {
    productName: string;
    productId: string;
    fromWarehouse: string;
    fromWarehouseId: string;
    toWarehouse: string;
    toWarehouseId: string;
    fromQty: number;
    toQty: number;
    suggestedQty: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
}

interface Warehouse {
    id: string;
    name?: string;
    name_ar?: string;
}

export const useSmartTransferSuggestions = (products: Product[] | undefined, warehouses: Warehouse[] | undefined) => {
    const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

    const dismissSuggestion = (key: string) => {
        setDismissedSuggestions(prev => {
            const next = new Set(prev);
            next.add(key);
            return next;
        });
    };

    const suggestions = useMemo<SmartSuggestion[]>(() => {
        if (!products || products.length === 0 || !warehouses || warehouses.length < 2) return [];

        const suggestions: SmartSuggestion[] = [];
        const whMap = new Map<string, string>();
        warehouses.forEach((w) => whMap.set(w.id, (w.name || w.name_ar || 'مستودع') as string));

        for (const product of products) {
            const dist = product.warehouse_distribution || [];
            if (dist.length < 2) continue;

            for (const target of dist) {
                // Target warehouse is low stock
                if (target.quantity <= (product.min_stock_level || 5)) {
                    // Find a source warehouse with surplus
                    const source = dist.find(d =>
                        d.warehouse_id !== target.warehouse_id &&
                        d.quantity > (product.min_stock_level || 5) * 2
                    );

                    if (source) {
                        const suggestedQty = Math.min(
                            Math.floor(source.quantity / 3), // Transfer a third
                            Math.max(1, (product.min_stock_level || 5) - target.quantity) // Or the deficit
                        );

                        if (suggestedQty > 0) {
                            const key = `${product.id}-${source.warehouse_id}-${target.warehouse_id}`;
                            if (!dismissedSuggestions.has(key)) {
                                suggestions.push({
                                    productName: product.name,
                                    productId: product.id,
                                    fromWarehouse: source.warehouse_name || whMap.get(source.warehouse_id) || 'مستودع',
                                    fromWarehouseId: source.warehouse_id,
                                    toWarehouse: target.warehouse_name || whMap.get(target.warehouse_id) || 'مستودع',
                                    toWarehouseId: target.warehouse_id,
                                    fromQty: source.quantity,
                                    toQty: target.quantity,
                                    suggestedQty,
                                    reason: target.quantity === 0 ? 'نفاد مخزون' : 'مخزون منخفض',
                                    priority: target.quantity === 0 ? 'high' : target.quantity <= 2 ? 'medium' : 'low'
                                });
                            }
                        }
                    }
                }
            }
        }

        // Sort by priority
        return suggestions.sort((a, b) => {
            const p = { high: 0, medium: 1, low: 2 };
            return p[a.priority] - p[b.priority];
        }).slice(0, 8); // Max 8 suggestions
    }, [products, warehouses, dismissedSuggestions]);

    return {
        suggestions,
        dismissSuggestion,
        count: suggestions.length
    };
};
