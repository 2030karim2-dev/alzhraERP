/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/consistent-type-imports, @typescript-eslint/array-type, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unnecessary-condition */
import React, { useMemo, useState } from 'react';
import { cn } from '../../../core/utils';
import type { TopProduct } from './TopPerformers';
import { FastMovingFilters } from './fast-moving/FastMovingFilters';
import { FastMovingHeader } from './fast-moving/FastMovingHeader';
import { FastMovingKpis } from './fast-moving/FastMovingKpis';
import { FastMovingTable } from './fast-moving/FastMovingTable';
import {
  getProductValues,
  type DisplayCurrency,
  type SortDirection,
  type SortField,
  type StockFilter,
} from './fast-moving/types';

interface FastMovingPartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: TopProduct[];
  periodLabel?: string;
}

export const FastMovingPartsModal: React.FC<FastMovingPartsModalProps> = ({
  isOpen,
  onClose,
  products,
  periodLabel = 'الفترة المحددة',
}) => {
  // Detect if products have YER transactions to set initial default
  const hasYerData = useMemo(() => {
    return products.some(p => (p.revenue_yer ?? 0) > 0);
  }, [products]);

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<DisplayCurrency>(
    hasYerData ? 'YER' : 'SAR'
  );
  const [isMaximized, setIsMaximized] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('quantity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // 1. Search filter
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(p => {
        const name = (p.name || '').toLowerCase();
        const partNo = (p.part_number || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return (
          name.includes(query) ||
          partNo.includes(query) ||
          brand.includes(query) ||
          sku.includes(query)
        );
      });
    }

    // 2. Stock filter
    if (stockFilter === 'negative_stock') {
      result = result.filter(p => (p.current_stock ?? 0) < 0);
    } else if (stockFilter === 'out_of_stock') {
      result = result.filter(p => p.is_out_of_stock || (p.current_stock ?? 0) <= 0);
    } else if (stockFilter === 'low_stock') {
      result = result.filter(
        p =>
          p.is_low_stock ||
          ((p.current_stock ?? 0) > 0 && (p.current_stock ?? 0) <= (p.min_stock_level ?? 5))
      );
    } else if (stockFilter === 'in_stock') {
      result = result.filter(p => (p.current_stock ?? 0) > 0 && !p.is_low_stock);
    }

    // 3. Multi-column sort
    result.sort((a, b) => {
      const valsA = getProductValues(a, selectedCurrency);
      const valsB = getProductValues(b, selectedCurrency);
      let diff = 0;

      switch (sortField) {
        case 'name':
          diff = (a.name || '').localeCompare(b.name || '');
          break;
        case 'stock':
          diff = (a.current_stock ?? 0) - (b.current_stock ?? 0);
          break;
        case 'quantity':
          diff = (a.quantity || 0) - (b.quantity || 0);
          break;
        case 'cost':
          diff = valsA.cost - valsB.cost;
          break;
        case 'revenue':
          diff = valsA.rev - valsB.rev;
          break;
        case 'profit':
          diff = valsA.profit - valsB.profit;
          break;
        case 'margin':
          diff = valsA.margin - valsB.margin;
          break;
        default:
          diff = (a.quantity || 0) - (b.quantity || 0);
          break;
      }

      return sortDirection === 'asc' ? diff : -diff;
    });

    return result;
  }, [products, searchQuery, stockFilter, sortField, sortDirection, selectedCurrency]);

  // Aggregate KPI summary
  const summary = useMemo(() => {
    const totalQty = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    let totalRev = 0;
    let totalCost = 0;
    let totalProfit = 0;

    for (const p of products) {
      const vals = getProductValues(p, selectedCurrency);
      totalRev += vals.rev;
      totalCost += vals.cost;
      totalProfit += vals.profit;
    }

    const avgMargin = totalRev > 0 ? Math.round((totalProfit / totalRev) * 1000) / 10 : 0;
    const negativeStockCount = products.filter(p => (p.current_stock ?? 0) < 0).length;
    const outOfStockCount = products.filter(
      p => p.is_out_of_stock || (p.current_stock ?? 0) <= 0
    ).length;
    const lowStockCount = products.filter(
      p =>
        p.is_low_stock ||
        ((p.current_stock ?? 0) > 0 && (p.current_stock ?? 0) <= (p.min_stock_level ?? 5))
    ).length;

    return {
      totalQty,
      totalRev,
      totalCost,
      totalProfit,
      avgMargin,
      negativeStockCount,
      outOfStockCount,
      lowStockCount,
    };
  }, [products, selectedCurrency]);

  const maxVal = useMemo(() => {
    if (products.length === 0) return 1;
    if (sortField === 'revenue') {
      return Math.max(...products.map(p => getProductValues(p, selectedCurrency).rev), 1);
    }
    if (sortField === 'profit') {
      return Math.max(...products.map(p => getProductValues(p, selectedCurrency).profit), 1);
    }
    return Math.max(...products.map(p => p.quantity || 0), 1);
  }, [products, sortField, selectedCurrency]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        isMaximized ? 'p-0' : 'p-2 sm:p-4 md:p-6'
      )}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={cn(
          'relative flex flex-col overflow-hidden border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl transition-all duration-200',
          isMaximized
            ? 'h-full w-full rounded-none border-none'
            : 'max-h-[94vh] w-full max-w-7xl rounded-2xl sm:rounded-3xl'
        )}
      >
        {/* Header */}
        <FastMovingHeader
          periodLabel={periodLabel}
          selectedCurrency={selectedCurrency}
          setSelectedCurrency={setSelectedCurrency}
          isMaximized={isMaximized}
          setIsMaximized={setIsMaximized}
          onClose={onClose}
        />

        {/* KPI Strip & Info Banner */}
        <FastMovingKpis
          productsCount={products.length}
          summary={summary}
          selectedCurrency={selectedCurrency}
        />

        {/* Toolbar: Search, Sort & Stock Filter */}
        <FastMovingFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortField={sortField}
          handleSort={handleSort}
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          productsCount={products.length}
          summary={summary}
        />

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-5">
          <FastMovingTable
            products={filteredAndSortedProducts}
            selectedCurrency={selectedCurrency}
            sortField={sortField}
            sortDirection={sortDirection}
            handleSort={handleSort}
            maxVal={maxVal}
            expandedRowId={expandedRowId}
            setExpandedRowId={setExpandedRowId}
          />
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/95 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>
              يتم احتساب الكميات والإيرادات بعد خصم المرتجعات تلقائياً. اضغط على أي عمود للترتيب أو
              على أي صف لعرض بطاقة الفحص والتكلفة.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default FastMovingPartsModal;
