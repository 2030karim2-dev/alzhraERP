import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Package, Plus, Check, X, Warehouse, AlertCircle } from 'lucide-react';
import type { Product } from '../../types';
import { cn, normalizeSearch } from '../../../../core/utils';

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
  products,
  fromWarehouseId,
  onAddItem,
  selectedProductIds,
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

    const tokens: string[] = normalizeSearch(query).split(/\s+/).filter(Boolean);

    return list
      .filter(p => {
        const target = normalizeSearch(
          [
            p.name,
            p.name_ar,
            p.sku,
            p.part_number,
            p.brand,
            p.size,
            p.barcode,
            p.alternative_numbers,
          ]
            .filter(Boolean)
            .join(' ')
        );
        return tokens.every((token: string) => target.includes(token));
      })
      .slice(0, 40);
  }, [products, query, fromWarehouseId, showOnlyInStock]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative z-30 space-y-1">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
            <Search size={16} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
            }}
            placeholder="ابحث بالاسم أو رقم القطعة أو الباركود لإضافة صنف..."
            className="w-full rounded-xl border border-gray-200 bg-[var(--app-surface)] py-2 pl-8 pr-9 text-xs font-bold text-slate-800 placeholder-gray-400 shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:text-slate-100"
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
              'flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-[11px] font-bold transition-all',
              showOnlyInStock
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-gray-200 bg-[var(--app-surface)] text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300'
            )}
          >
            <Warehouse size={13} />
            <span>الأصناف المتوفرة فقط</span>
          </button>
        )}
      </div>

      {/* Instant Search & Picker Dropdown */}
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-[var(--app-surface)] shadow-2xl duration-200 dark:border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold text-gray-500 dark:border-slate-800 dark:bg-slate-800/60">
            <span className="flex items-center gap-1">
              <Package size={12} className="text-blue-500" />
              {query.trim() ? `نتائج البحث عن "${query}"` : 'أصناف المخزون المتاحة للمناقلة'}
            </span>
            <span>{filteredProducts.length} صنف</span>
          </div>

          <div className="custom-scrollbar max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {filteredProducts.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <AlertCircle size={28} className="mx-auto mb-2 text-amber-500 opacity-40" />
                <p className="text-xs font-bold text-gray-600 dark:text-slate-300">
                  لم يتم العثور على منتجات مطابقة
                </p>
                <p className="mt-0.5 text-[10px] text-gray-400">
                  تأكد من كتابة الاسم أو رقم القطعة بشكل صحيح
                </p>
              </div>
            ) : (
              filteredProducts.map(p => {
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
                      'flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-right transition-colors',
                      isAdded
                        ? 'cursor-default bg-blue-50/50 opacity-75 dark:bg-blue-950/20'
                        : 'hover:bg-blue-50 dark:hover:bg-slate-800/80'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                          {p.name_ar || p.name}
                        </span>
                        {p.brand && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
                            {p.brand}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-gray-400">
                        {p.part_number && <span>رقم القطعة: {p.part_number}</span>}
                        {p.sku && <span>SKU: {p.sku}</span>}
                        {p.size && (
                          <span className="font-sans text-gray-500">المقاس: {p.size}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-left">
                        <span className="block text-[10px] font-bold text-gray-400">
                          المتوفر بالمصدر
                        </span>
                        <span
                          className={cn(
                            'font-mono text-xs font-black',
                            stockInWh > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-500'
                          )}
                        >
                          {stockInWh} قطعة
                        </span>
                      </div>

                      {isAdded ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          <Check size={12} /> مضاف
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onAddItem(p);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-95"
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
