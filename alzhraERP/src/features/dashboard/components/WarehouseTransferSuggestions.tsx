import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  AlertTriangle,
  Truck,
  MapPin,
  CheckCircle2,
  Search,
  Building2,
  Coins,
  X,
} from 'lucide-react';
import { cn, formatCurrency } from '../../../core/utils';
import { useProducts, useWarehouses } from '../../inventory/hooks/index';
import { useBranches } from '../../settings/hooks';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';
import type { Product, Warehouse } from '../../inventory/types';
import type { Branch } from '../../settings/types';
import StockTransferRequestModal from '../../inventory/components/StockTransferRequestModal';
import {
  computeTransferSuggestions,
  type TransferSuggestion,
} from '../services/transferRebalancingEngine';

interface Props {
  className?: string;
}

type FilterTab = 'all' | 'critical' | 'my_branch';

const WarehouseTransferSuggestions: React.FC<Props> = ({ className }) => {
  const { data: products } = useProducts();
  const { data: warehousesRaw } = useWarehouses();
  const { data: branches = [] } = useBranches();
  const { branchId: activeBranchId, branchName: activeBranchName } = useBranchFilter();

  const warehouses = (warehousesRaw || []) as Warehouse[];
  const [activeModalSuggestion, setActiveModalSuggestion] = useState<TransferSuggestion | null>(
    null
  );
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Compute suggestions via the rebalancing engine
  const { suggestions: allSuggestions, summary } = useMemo(() => {
    return computeTransferSuggestions({
      products: (products || []) as Product[],
      warehouses,
      branches: branches as Branch[],
      activeBranchId,
      limit: 20,
    });
  }, [products, warehouses, branches, activeBranchId]);

  // Apply UI filtering (dismissed, tab, search)
  const filteredSuggestions = useMemo(() => {
    return allSuggestions
      .filter(s => !dismissedIds.has(s.id))
      .filter(s => {
        if (filterTab === 'critical') return s.priority === 'critical';
        if (filterTab === 'my_branch') {
          if (!activeBranchId) return true;
          return s.toBranch.id === activeBranchId || s.fromBranch.id === activeBranchId;
        }
        return true;
      })
      .filter(s => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          s.product.name_ar.toLowerCase().includes(term) ||
          (s.product.part_number && s.product.part_number.toLowerCase().includes(term)) ||
          (s.product.brand && s.product.brand.toLowerCase().includes(term)) ||
          s.fromBranch.name.toLowerCase().includes(term) ||
          s.toBranch.name.toLowerCase().includes(term)
        );
      });
  }, [allSuggestions, dismissedIds, filterTab, activeBranchId, searchTerm]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const hasSuggestions = filteredSuggestions.length > 0;

  return (
    <>
      <div
        className={cn(
          'bg-[var(--app-surface)]/90 relative overflow-hidden rounded-2xl border border-[var(--app-border)] p-4 shadow-sm backdrop-blur-xl transition-all duration-300 max-md:rounded-xl max-md:p-3',
          className
        )}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-violet-500/10 blur-[60px]" />

        {/* Header with Title & Action Stats */}
        <div className="border-[var(--app-border)]/60 relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-2 shadow-sm shadow-violet-500/10">
              <ArrowRightLeft size={18} className="text-violet-500 dark:text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--app-text)]">
                  مقترحات المناقلات بين الفروع
                </h3>
                {summary.criticalCount > 0 && (
                  <span className="flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    <AlertTriangle size={10} />
                    {summary.criticalCount} عاجل
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[var(--app-text-secondary)]">
                توزيع ذكي للمخزون بين الفروع لسد العجز وتدوير الفائض دون شراء جديد
              </p>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          {summary.totalSuggestions > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <Coins size={12} />
                <span>توفير شراء:</span>
                <span className="font-mono font-bold">
                  {formatCurrency(summary.estimatedCapitalSaved)}
                </span>
              </div>
              <span className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-600 dark:text-violet-300">
                {summary.totalUnitsToTransfer} قطعة مقترحة
              </span>
            </div>
          )}
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
            <button
              onClick={() => setFilterTab('all')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                filterTab === 'all'
                  ? 'bg-white text-violet-600 shadow-sm dark:bg-slate-700 dark:text-violet-300'
                  : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
              )}
            >
              الكل ({allSuggestions.length})
            </button>
            <button
              onClick={() => setFilterTab('critical')}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                filterTab === 'critical'
                  ? 'bg-white text-rose-600 shadow-sm dark:bg-slate-700 dark:text-rose-300'
                  : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              عاجل ({summary.criticalCount})
            </button>
            {activeBranchId && (
              <button
                onClick={() => setFilterTab('my_branch')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all',
                  filterTab === 'my_branch'
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                    : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
                )}
              >
                فرعي ({activeBranchName || 'الحالي'})
              </button>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--app-text-secondary)]"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث بالصنف، الكود، أو الفرع..."
              className="w-full rounded-xl border border-[var(--app-border)] bg-white/60 py-1 pe-2.5 ps-7 text-[11px] text-[var(--app-text)] placeholder-[var(--app-text-secondary)] transition-all focus:border-violet-500 focus:outline-none dark:bg-slate-800/40"
            />
          </div>
        </div>

        {/* Proposals List */}
        <div className="custom-scrollbar relative z-10 max-h-[380px] space-y-2 overflow-y-auto pe-0.5">
          {!hasSuggestions ? (
            <div className="rounded-xl border border-dashed border-[var(--app-border)] py-8 text-center">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-80" />
              <p className="text-xs font-bold text-[var(--app-text)]">توازن ممتاز في المخزون</p>
              <p className="mt-1 text-[11px] text-[var(--app-text-secondary)]">
                لا توجد فجوات عجز حرجة أو اقتراحات مناقلة نشطة حالياً بين الفروع.
              </p>
            </div>
          ) : (
            filteredSuggestions.map(s => {
              const isZeroStock = s.toBranch.currentStock === 0;

              return (
                <div
                  key={s.id}
                  className="group relative rounded-xl border border-[var(--app-border)] bg-slate-50/50 p-3 transition-all duration-200 hover:border-violet-500/40 hover:bg-white hover:shadow-md dark:bg-slate-800/30 dark:hover:bg-slate-800/70"
                >
                  {/* Top Row: Product Info + Priority Badge + Dismiss */}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-bold text-[var(--app-text)]">
                          {s.product.name_ar}
                        </span>
                        {s.product.is_core && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            رئيسي
                          </span>
                        )}
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                            s.priority === 'critical'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : s.priority === 'high'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          )}
                        >
                          {s.priorityLabel}
                        </span>
                      </div>

                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-[var(--app-text-secondary)]">
                        {s.product.part_number && (
                          <span className="font-mono">P/N: {s.product.part_number}</span>
                        )}
                        {s.product.sku && <span className="font-mono">SKU: {s.product.sku}</span>}
                        {s.product.brand && (
                          <span className="font-semibold text-slate-500">[{s.product.brand}]</span>
                        )}
                      </div>
                    </div>

                    {/* Snooze/Dismiss Button */}
                    <button
                      onClick={e => handleDismiss(s.id, e)}
                      title="تجاهل مؤقت"
                      className="text-slate-400 opacity-0 transition-opacity hover:text-slate-600 group-hover:opacity-100 dark:hover:text-slate-200"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Transfer Route Vector */}
                  <div className="border-[var(--app-border)]/60 mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white/80 p-2 text-[11px] dark:bg-slate-900/50">
                    {/* Source Branch */}
                    <div className="flex items-center gap-1.5">
                      <div className="rounded bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400">
                        <Building2 size={12} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          من: {s.fromBranch.name}
                        </span>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          فائض آمن: {s.fromBranch.surplus} (إجمالي: {s.fromBranch.currentStock})
                        </div>
                      </div>
                    </div>

                    {/* Arrow / Qty Badge */}
                    <div className="flex items-center gap-1">
                      <Truck size={12} className="animate-pulse text-violet-500" />
                      <span className="rounded-lg bg-violet-600 px-2 py-0.5 font-mono text-xs font-bold text-white shadow-sm">
                        {s.suggestedQty} قطعة
                      </span>
                      <ArrowRightLeft size={12} className="text-violet-500" />
                    </div>

                    {/* Target Branch */}
                    <div className="flex items-center gap-1.5 text-left">
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          إلى: {s.toBranch.name}
                        </span>
                        <div
                          className={cn(
                            'text-[10px] font-bold',
                            isZeroStock
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-amber-600 dark:text-amber-400'
                          )}
                        >
                          {isZeroStock ? 'نفاد تام (0)' : `عجز (متبقي ${s.toBranch.currentStock})`}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'rounded p-1',
                          isZeroStock
                            ? 'bg-rose-500/10 text-rose-600'
                            : 'bg-amber-500/10 text-amber-600'
                        )}
                      >
                        <MapPin size={12} />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Row: Reason + Action Button */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="truncate text-[10px] text-[var(--app-text-secondary)]">
                      💡 {s.reason}
                    </p>

                    <button
                      onClick={() => setActiveModalSuggestion(s)}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-violet-700 active:scale-95"
                    >
                      <ArrowRightLeft size={12} />
                      طلب المناقلة
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Stock Transfer Request Modal */}
      {activeModalSuggestion && (
        <StockTransferRequestModal
          product={activeModalSuggestion.product}
          sourceBranchId={activeModalSuggestion.fromBranch.id}
          sourceBranchName={activeModalSuggestion.fromBranch.name}
          requesterBranchId={activeModalSuggestion.toBranch.id}
          availableQty={activeModalSuggestion.fromBranch.currentStock}
          onClose={() => setActiveModalSuggestion(null)}
        />
      )}
    </>
  );
};

export default WarehouseTransferSuggestions;
