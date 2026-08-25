import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Package, Plus, Check, X, Warehouse, AlertCircle } from 'lucide-react';
import type { Product } from '../../types';
import { cn } from '../../../../core/utils';

interface Props {
    query: string;
    setQuery: (q: string) => void;
    products: Product[];
    fromWarehouseId?: string;
    onAddItem: (p: Product) => void;
    selectedProductIds: Set<string>;
}

const TransferProductSearch: React.FC<Props> = ({
    query,
    setQuery,
    products = [],
    fromWarehouseId,
    onAddItem,
    selectedProductIds
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showOnlyInStock, setShowOnlyInStock] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Calculate stock in source warehouse
    const getWhStock = (p: Product) => {
        if (!fromWarehouseId) return p.stock_quantity ?? 0;
        if (p.warehouse_distribution && p.warehouse_distribution.length > 0) {
            const wh = p.warehouse_distribution.find((w: any) => w.warehouse_id === fromWarehouseId);
            if (wh) return Number(wh.quantity) || 0;
        }
        return p.stock_quantity ?? 0;
    };

    // Filter products based on search query and stock toggle
    const filteredProducts = useMemo(() => {
        let list = products;

        if (showOnlyInStock && fromWarehouseId) {
            list = list.filter(p => getWhStock(p) > 0);
        }

        if (!query.trim()) {
            return list.slice(0, 30);
        }

        const normalizeArabic = (text: string) => {
            return (text || '')
                .replace(/[أإآ]/g, 'ا')
                .replace(/ة/g, 'ه')
                .replace(/ى/g, 'ي')
                .replace(/[\u064B-\u065F]/g, '')
                .toLowerCase();
        };

        const tokens = query.toLowerCase().split(/\s+/).filter(Boolean).map(normalizeArabic);

        return list.filter(p => {
            const target = normalizeArabic(
                [p.name, p.name_ar, p.sku, p.part_number, p.brand, p.size, p.alternative_numbers]
                    .filter(Boolean)
                    .join(' ')
            );
            return tokens.every(token => target.includes(token));
        }).slice(0, 40);
    }, [products, query, fromWarehouseId, showOnlyInStock]);

    // Handle outside click to close dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative z-30 space-y-1">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                        <Search size={16} />
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder="ابحث بالاسم أو رقم القطعة أو الباركود لإضافة صنف..."
                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl pr-9 pl-8 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                inputRef.current?.focus();
                            }}
                            className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {fromWarehouseId && (
                    <button
                        type="button"
                        onClick={() => {
                            setShowOnlyInStock(!showOnlyInStock);
                            setIsOpen(true);
                        }}
                        className={cn(
                            "px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border transition-all whitespace-nowrap",
                            showOnlyInStock
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                                : "bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50"
                        )}
                    >
                        <Warehouse size={13} />
                        <span>الأصناف المتوفرة فقط</span>
                    </button>
                )}
            </div>

            {/* Instant Search & Picker Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] font-bold text-gray-500">
                        <span className="flex items-center gap-1">
                            <Package size={12} className="text-blue-500" />
                            {query.trim() ? `نتائج البحث عن "${query}"` : 'أصناف المخزون المتاحة للمناقلة'}
                        </span>
                        <span>{filteredProducts.length} صنف</span>
                    </div>

                    <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredProducts.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">
                                <AlertCircle size={28} className="mx-auto mb-2 opacity-40 text-amber-500" />
                                <p className="text-xs font-bold text-gray-600 dark:text-slate-300">لم يتم العثور على منتجات مطابقة</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">تأكد من كتابة الاسم أو رقم القطعة بشكل صحيح</p>
                            </div>
                        ) : (
                            filteredProducts.map((p) => {
                                const stockInWh = getWhStock(p);
                                const isAdded = selectedProductIds.has(p.id);

                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => {
                                            if (!isAdded) {
                                                onAddItem(p);
                                            }
                                        }}
                                        className={cn(
                                            "px-3 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors text-right",
                                            isAdded
                                                ? "bg-blue-50/50 dark:bg-blue-950/20 opacity-75 cursor-default"
                                                : "hover:bg-blue-50 dark:hover:bg-slate-800/80"
                                        )}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                                                    {p.name_ar || p.name}
                                                </span>
                                                {p.brand && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                                                        {p.brand}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400 font-mono">
                                                {p.part_number && <span>رقم القطعة: {p.part_number}</span>}
                                                {p.sku && <span>SKU: {p.sku}</span>}
                                                {p.size && <span className="font-sans text-gray-500">المقاس: {p.size}</span>}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-left">
                                                <span className="text-[9px] block text-gray-400 font-bold">المتوفر بالمصدر</span>
                                                <span className={cn(
                                                    "text-xs font-mono font-black",
                                                    stockInWh > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                                                )}>
                                                    {stockInWh} قطعة
                                                </span>
                                            </div>

                                            {isAdded ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                    <Check size={12} /> مضاف
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onAddItem(p);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm active:scale-95"
                                                >
                                                    <Plus size={12} /> إضافة
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransferProductSearch;
