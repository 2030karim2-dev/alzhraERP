/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/restrict-template-expressions */
import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Box,
  Zap,
  TrendingUp,
  BadgePercent,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Coins,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { formatCurrency, formatNumberDisplay, cn } from '../../../core/utils';
import type { TopProduct } from './TopPerformers';

interface FastMovingPartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: TopProduct[];
  periodLabel?: string;
}

type SortField = 'index' | 'name' | 'stock' | 'quantity' | 'cost' | 'revenue' | 'profit' | 'margin';

type SortDirection = 'asc' | 'desc';
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'negative_stock';
type DisplayCurrency = 'YER' | 'SAR';

function getProductValues(p: TopProduct, currency: DisplayCurrency) {
  const isYer = currency === 'YER';
  const rev = isYer ? (p.revenue_yer ?? p.revenue * 410) : p.revenue;
  const cost = isYer ? (p.cost_yer ?? (p.cost ?? 0) * 410) : (p.cost ?? 0);
  const profit = isYer
    ? (p.gross_profit_yer ?? (p.gross_profit ?? 0) * 410)
    : (p.gross_profit ?? 0);
  const margin =
    p.margin_percentage !== undefined && p.margin_percentage !== null
      ? p.margin_percentage
      : rev > 0
        ? Math.round(((rev - cost) / rev) * 1000) / 10
        : 0;

  return { rev, cost, profit, margin };
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

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="opacity-40" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} className="text-amber-400" />
    ) : (
      <ArrowDown size={12} className="text-amber-400" />
    );
  };

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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-5 py-3.5 max-md:p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-inner">
              <Box size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white sm:text-base">
                  تحليل قطع الغيار الأسرع حركة والأكثر ربحية
                </h3>
                <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                  {periodLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                بيانات دقيقة لمحاسبة المبيعات وتكلفة البضاعة المباعة وخصم تكلفة المبيعات السالبة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Currency Selector */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-950/70 p-1">
              <span className="flex items-center gap-1 px-2 text-[10px] font-bold text-slate-400">
                <Coins size={12} className="text-amber-400" />
                العملة:
              </span>
              <button
                onClick={() => setSelectedCurrency('YER')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                  selectedCurrency === 'YER'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
                title="عرض المبالغ بالريال اليمني"
              >
                ﷼ يمني (ر.ي)
              </button>
              <button
                onClick={() => setSelectedCurrency('SAR')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                  selectedCurrency === 'SAR'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
                title="عرض المبالغ بالريال السعودي"
              >
                ﷼ سعودي (ر.س)
              </button>
            </div>

            {/* Maximize / Restore Button */}
            <button
              onClick={() => setIsMaximized(prev => !prev)}
              className="rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
              title={isMaximized ? 'تصغير الحجم الطبيعي' : 'تكبير ملء الشاشة'}
            >
              {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
              title="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-2 border-b border-slate-800 bg-slate-950/40 p-3 sm:grid-cols-6 sm:gap-3">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
            <span className="text-[10px] font-bold text-slate-400">عدد القطع المتصدرة</span>
            <p className="font-mono text-sm font-black text-amber-400 sm:text-base">
              {formatNumberDisplay(products.length)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
            <span className="text-[10px] font-bold text-slate-400">صافي المباع</span>
            <p className="font-mono text-sm font-black text-emerald-400 sm:text-base">
              {formatNumberDisplay(summary.totalQty)}{' '}
              <span className="font-sans text-[10px]">قطعة</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
            <span className="text-[10px] font-bold text-slate-400">إجمالي الإيراد</span>
            <p className="font-mono text-sm font-black text-blue-400 sm:text-base">
              {formatCurrency(summary.totalRev, selectedCurrency)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
            <span className="text-[10px] font-bold text-slate-400">إجمالي التكلفة الفعلية</span>
            <p className="font-mono text-sm font-black text-rose-400 sm:text-base">
              {formatCurrency(summary.totalCost, selectedCurrency)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">مجمل الربح المحقق</span>
              <span className="py-0.2 rounded bg-purple-500/20 px-1 text-[10px] font-bold text-purple-300">
                %{summary.avgMargin}
              </span>
            </div>
            <p className="font-mono text-sm font-black text-purple-400 sm:text-base">
              {formatCurrency(summary.totalProfit, selectedCurrency)}
            </p>
          </div>

          <div className="col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-400">مخاطر المخزون</span>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {summary.negativeStockCount > 0 && (
                <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
                  {summary.negativeStockCount} سالب
                </span>
              )}
              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                {summary.outOfStockCount} نفد
              </span>
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                {summary.lowStockCount} شحيح
              </span>
            </div>
          </div>
        </div>

        {/* Info Banner on Cost Accuracy */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 bg-amber-500/5 px-4 py-2 text-[11px] text-amber-300/90">
          <Info size={14} className="shrink-0 text-amber-400" />
          <span>
            <strong>معايير الحساب الدقيق:</strong> تم تحويل المبيعات والتكاليف إلى نفس العملة
            المحددة. تم خصم تكلفة البضاعة المباعة تلقائياً، والمنتجات المباعة بالسالب (قبل توريدها)
            تم احتساب تكلفة تقديرية لها بنسبة 70% لمنع إظهار أرباح وهمية.
          </span>
        </div>

        {/* Toolbar: Search, Sort & Stock Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 bg-slate-900/50 p-3 sm:px-5">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1 max-md:w-full">
            <Search
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم القطعة، رقم القطعة (OEM)، أو الماركة..."
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 py-1.5 pl-3 pr-9 text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40"
            />
          </div>

          {/* Quick Sort Shortcuts */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            <button
              onClick={() => handleSort('quantity')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                sortField === 'quantity'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Zap size={12} />
              <span>الكمية</span>
            </button>

            <button
              onClick={() => handleSort('revenue')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                sortField === 'revenue'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <TrendingUp size={12} />
              <span>الإيراد</span>
            </button>

            <button
              onClick={() => handleSort('profit')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                sortField === 'profit'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <BadgePercent size={12} />
              <span>الربح</span>
            </button>

            <button
              onClick={() => handleSort('margin')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                sortField === 'margin'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <span>الهامش %</span>
            </button>
          </div>

          {/* Stock Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            <button
              onClick={() => setStockFilter('all')}
              className={cn(
                'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
                stockFilter === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              الكل ({products.length})
            </button>
            <button
              onClick={() => setStockFilter('in_stock')}
              className={cn(
                'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
                stockFilter === 'in_stock'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              متوفر
            </button>
            <button
              onClick={() => setStockFilter('low_stock')}
              className={cn(
                'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
                stockFilter === 'low_stock'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              شحيح ({summary.lowStockCount})
            </button>
            <button
              onClick={() => setStockFilter('out_of_stock')}
              className={cn(
                'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
                stockFilter === 'out_of_stock'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              نفد ({summary.outOfStockCount})
            </button>
            {summary.negativeStockCount > 0 && (
              <button
                onClick={() => setStockFilter('negative_stock')}
                className={cn(
                  'rounded-lg px-2 py-1 text-[10px] font-bold transition-all',
                  stockFilter === 'negative_stock'
                    ? 'bg-rose-700 text-white'
                    : 'text-rose-400 hover:text-rose-300'
                )}
              >
                مكشوف/سالب ({summary.negativeStockCount})
              </button>
            )}
          </div>
        </div>

        {/* Table Content with Grid Lines & Cell Borders */}
        <div className="flex-1 overflow-auto p-3 sm:p-5">
          {filteredAndSortedProducts.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-700/90 shadow-lg">
              <table className="w-full border-collapse text-right">
                <thead className="bg-slate-950 text-xs font-bold text-slate-300">
                  <tr className="border-b-2 border-slate-700/90">
                    <th
                      onClick={() => handleSort('index')}
                      className="w-12 cursor-pointer border-l border-slate-700/80 px-3 py-3 text-center transition-colors hover:bg-slate-800/80"
                      title="الترتيب"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>#</span>
                        {renderSortIcon('index')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('name')}
                      className="cursor-pointer border-l border-slate-700/80 px-3 py-3 transition-colors hover:bg-slate-800/80"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>قطعة الغيار والمواصفات</span>
                        {renderSortIcon('name')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('stock')}
                      className="cursor-pointer border-l border-slate-700/80 px-3 py-3 text-center transition-colors hover:bg-slate-800/80"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>المخزون المتوفر</span>
                        {renderSortIcon('stock')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('quantity')}
                      className="cursor-pointer border-l border-slate-700/80 px-3 py-3 text-center transition-colors hover:bg-slate-800/80"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>صافي المباع</span>
                        {renderSortIcon('quantity')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('revenue')}
                      className="cursor-pointer border-l border-slate-700/80 px-3 py-3 text-left transition-colors hover:bg-slate-800/80"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>إجمالي الإيراد</span>
                        {renderSortIcon('revenue')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('cost')}
                      className="cursor-pointer border-l border-slate-700/80 px-3 py-3 text-left transition-colors hover:bg-slate-800/80"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>إجمالي التكلفة</span>
                        {renderSortIcon('cost')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('profit')}
                      className="cursor-pointer border-l border-slate-700/80 px-3 py-3 text-left transition-colors hover:bg-slate-800/80"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>مجمل الربح</span>
                        {renderSortIcon('profit')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('margin')}
                      className="cursor-pointer border-l border-slate-700/80 px-3 py-3 text-center transition-colors hover:bg-slate-800/80"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>الهامش %</span>
                        {renderSortIcon('margin')}
                      </div>
                    </th>

                    <th className="border-l border-slate-700/80 px-3 py-3 text-center">
                      حالة الصنف
                    </th>

                    <th className="w-10 px-2 py-3 text-center" title="تفاصيل إضافية">
                      <span className="sr-only">تفاصيل</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-slate-900/60 text-xs">
                  {filteredAndSortedProducts.map((p, idx) => {
                    const vals = getProductValues(p, selectedCurrency);
                    const stock = p.current_stock ?? 0;
                    const isNegative = stock < 0;
                    const isOut = p.is_out_of_stock || stock <= 0;
                    const isLow = !isOut && (p.is_low_stock || stock <= (p.min_stock_level ?? 5));
                    const isExpanded = expandedRowId === (p.id || `prod-${idx}`);

                    const currentVal =
                      sortField === 'revenue'
                        ? vals.rev
                        : sortField === 'profit'
                          ? vals.profit
                          : p.quantity || 0;
                    const pct = Math.min(100, Math.round((currentVal / maxVal) * 100));

                    return (
                      <React.Fragment key={p.id || `prod-${idx}`}>
                        <tr
                          onClick={() =>
                            setExpandedRowId(prev =>
                              prev === (p.id || `prod-${idx}`) ? null : p.id || `prod-${idx}`
                            )
                          }
                          className={cn(
                            'group cursor-pointer border-b border-slate-800 transition-colors',
                            isExpanded ? 'bg-slate-800/70' : 'hover:bg-slate-800/40'
                          )}
                        >
                          {/* Rank */}
                          <td className="border-l border-slate-700/70 px-3 py-3 text-center">
                            <span
                              className={cn(
                                'inline-flex h-6 w-6 items-center justify-center rounded-lg font-mono text-[10px] font-black',
                                idx === 0
                                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/40'
                                  : idx === 1
                                    ? 'bg-slate-300 text-slate-950'
                                    : idx === 2
                                      ? 'bg-amber-700 text-white'
                                      : 'border border-slate-800 bg-slate-800 text-slate-400'
                              )}
                            >
                              {idx + 1}
                            </span>
                          </td>

                          {/* Part Info */}
                          <td className="border-l border-slate-700/70 px-3 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-100 transition-colors group-hover:text-amber-400">
                                {p.name}
                              </span>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                {p.part_number && (
                                  <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                                    OEM: {p.part_number}
                                  </span>
                                )}
                                {p.brand && (
                                  <span className="rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
                                    {p.brand}
                                  </span>
                                )}
                                {p.category_name && (
                                  <span className="rounded border border-slate-700 bg-slate-800/50 px-1.5 py-0.5 text-[10px] text-slate-400">
                                    {p.category_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Current Stock */}
                          <td className="border-l border-slate-700/70 px-3 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span
                                className={cn(
                                  'font-mono text-xs font-bold',
                                  isNegative
                                    ? 'text-rose-500'
                                    : isOut
                                      ? 'text-rose-400'
                                      : isLow
                                        ? 'text-amber-400'
                                        : 'text-emerald-400'
                                )}
                              >
                                {formatNumberDisplay(stock)}
                              </span>
                              <span className="text-[10px] text-slate-400">قطعة بالمستودع</span>
                            </div>
                          </td>

                          {/* Net Quantity Sold + Progress Bar */}
                          <td className="border-l border-slate-700/70 px-3 py-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-mono text-xs font-bold text-white">
                                {formatNumberDisplay(p.quantity)}
                              </span>
                              <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-800">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Revenue */}
                          <td className="border-l border-slate-700/70 px-3 py-3 text-left font-mono font-bold text-blue-400">
                            {formatCurrency(vals.rev, selectedCurrency)}
                          </td>

                          {/* Deducted Cost */}
                          <td className="border-l border-slate-700/70 px-3 py-3 text-left font-mono font-bold text-rose-400">
                            {formatCurrency(vals.cost, selectedCurrency)}
                          </td>

                          {/* Gross Profit */}
                          <td className="border-l border-slate-700/70 px-3 py-3 text-left font-mono font-bold text-purple-400">
                            {formatCurrency(vals.profit, selectedCurrency)}
                          </td>

                          {/* Margin % */}
                          <td className="border-l border-slate-700/70 px-3 py-3 text-center">
                            <span
                              className={cn(
                                'rounded px-2 py-0.5 font-mono text-[11px] font-black',
                                vals.margin >= 30
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : vals.margin >= 15
                                    ? 'bg-amber-500/15 text-amber-400'
                                    : 'bg-rose-500/15 text-rose-400'
                              )}
                            >
                              %{vals.margin}
                            </span>
                          </td>

                          {/* Stock Status Badge */}
                          <td className="border-l border-slate-700/70 px-3 py-3 text-center">
                            {isNegative ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-400">
                                <ShieldAlert size={10} />
                                <span>بيع مكشوف ({stock})</span>
                              </span>
                            ) : isOut ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                                <XCircle size={10} />
                                <span>نفد من المخزن</span>
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                                <AlertTriangle size={10} />
                                <span>شحيح (طلب عاجل)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                <CheckCircle2 size={10} />
                                <span>متوفر بالمخزن</span>
                              </span>
                            )}
                          </td>

                          {/* Expand Trigger Icon */}
                          <td className="px-2 py-3 text-center text-slate-400">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </td>
                        </tr>

                        {/* Expandable Inspection Drawer */}
                        {isExpanded && (
                          <tr className="border-b-2 border-amber-500/40 bg-slate-950/90 text-xs">
                            <td colSpan={10} className="p-4">
                              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:grid-cols-4">
                                {/* Col 1: Piece Identity */}
                                <div className="space-y-2 border-b border-slate-800 pb-3 sm:border-b-0 sm:border-l sm:pb-0 sm:pl-4">
                                  <h5 className="text-[11px] font-bold text-amber-400">
                                    هوية ومواصفات القطعة
                                  </h5>
                                  <div className="space-y-1 text-slate-300">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">اسم الصنف:</span>
                                      <span className="font-bold text-white">{p.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">رقم القطعة OEM:</span>
                                      <span className="font-mono text-amber-300">
                                        {p.part_number ?? 'غير مسجل'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">الماركة:</span>
                                      <span className="text-blue-300">{p.brand ?? 'غير محدد'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">الباركود/رمز الصنف:</span>
                                      <span className="font-mono">{p.sku || 'لا يوجد'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Col 2: Price & Cost Structure */}
                                <div className="space-y-2 border-b border-slate-800 pb-3 sm:border-b-0 sm:border-l sm:pb-0 sm:pl-4">
                                  <h5 className="text-[11px] font-bold text-blue-400">
                                    هيكل السعر والتكلفة المحاسبية
                                  </h5>
                                  <div className="space-y-1 text-slate-300">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">
                                        متوسط سعر البيع للوحدة:
                                      </span>
                                      <span className="font-mono font-bold text-white">
                                        {formatCurrency(
                                          p.quantity > 0 ? vals.rev / p.quantity : 0,
                                          selectedCurrency
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">
                                        متوسط التكلفة المحسومة للوحدة:
                                      </span>
                                      <span className="font-mono font-bold text-rose-300">
                                        {formatCurrency(
                                          p.quantity > 0 ? vals.cost / p.quantity : 0,
                                          selectedCurrency
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">الربح للقطعة الواحدة:</span>
                                      <span className="font-mono font-bold text-purple-300">
                                        {formatCurrency(
                                          p.quantity > 0 ? vals.profit / p.quantity : 0,
                                          selectedCurrency
                                        )}
                                      </span>
                                    </div>
                                    {isNegative && (
                                      <p className="mt-1 text-[10px] text-amber-400">
                                        * تم تطبيق التكلفة التقديرية (70%) لتفادي تضخيم الأرباح قبل
                                        إدخال فاتورة الشراء.
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Col 3: Totals & Margins */}
                                <div className="space-y-2 border-b border-slate-800 pb-3 sm:border-b-0 sm:border-l sm:pb-0 sm:pl-4">
                                  <h5 className="text-[11px] font-bold text-purple-400">
                                    المجاميع ونسبة هامش الربح
                                  </h5>
                                  <div className="space-y-1 text-slate-300">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">
                                        إجمالي المبيعات المحققة:
                                      </span>
                                      <span className="font-mono font-bold text-blue-400">
                                        {formatCurrency(vals.rev, selectedCurrency)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">إجمالي تكلفة البضاعة:</span>
                                      <span className="font-mono font-bold text-rose-400">
                                        {formatCurrency(vals.cost, selectedCurrency)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">صافي مجمل الربح:</span>
                                      <span className="font-mono font-bold text-purple-400">
                                        {formatCurrency(vals.profit, selectedCurrency)}
                                      </span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="text-[10px] text-slate-500">الهامش:</span>
                                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                                        <div
                                          className="h-full bg-purple-500"
                                          style={{
                                            width: `${Math.min(100, Math.max(0, vals.margin))}%`,
                                          }}
                                        />
                                      </div>
                                      <span className="font-mono font-bold text-purple-300">
                                        %{vals.margin}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Col 4: Warehouse Advice */}
                                <div className="space-y-2">
                                  <h5 className="text-[11px] font-bold text-emerald-400">
                                    توصيات المخزون والطلب
                                  </h5>
                                  <div className="space-y-1.5 text-slate-300">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">الرصيد الفعلي الحالي:</span>
                                      <span
                                        className={cn(
                                          'font-mono font-bold',
                                          isNegative ? 'text-rose-400' : 'text-emerald-400'
                                        )}
                                      >
                                        {stock} قطعة
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">حد إعادة الطلب الأدنى:</span>
                                      <span className="font-mono">
                                        {p.min_stock_level ?? 5} قطعة
                                      </span>
                                    </div>
                                    {isNegative ? (
                                      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[10px] text-rose-300">
                                        ⚠️ المخزون بالسالب بمقدار ({Math.abs(stock)}) قطعة. يلزم
                                        إدخال فواتير الشراء لضبط المخزن والتكلفة الدقيقة.
                                      </div>
                                    ) : isOut ? (
                                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-300">
                                        ⚠️ القطعة نفدت تماماً ويوجد طلب عالي عليها ({p.quantity}{' '}
                                        مبيع). يُنصح بإنشاء أمر شراء فوري.
                                      </div>
                                    ) : isLow ? (
                                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-300">
                                        الرصيد شحيح ووصل لحد الطلب الأدنى.
                                      </div>
                                    ) : (
                                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-[10px] text-emerald-300">
                                        وضع المخزون صحي ومتوفر بالكمية المطلوبة.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Layers size={36} className="mb-2 text-slate-600" />
              <p className="text-sm font-bold text-slate-300">
                لا توجد قطع غيار مطابقة للبحث أو الفلترة
              </p>
              <p className="mt-1 text-xs text-slate-500">
                حاول تغيير خيارات البحث أو الفرز أو الفترة الزمنية المحددة
              </p>
            </div>
          )}
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
