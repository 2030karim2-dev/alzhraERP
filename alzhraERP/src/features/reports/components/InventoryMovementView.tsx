import React, { useState, useMemo } from 'react';
import { useItemMovement, useMinimalProducts } from '../../inventory/hooks/index';
import ExcelTable from '../../../ui/common/ExcelTable';
import {
  Search,
  Package,
  History,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  CheckCircle2,
  Zap,
  BarChart3,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { cn, formatLocalDate } from '@/core/utils';

/** صف حركة مخزون كما يعيده `useItemMovement`. */
interface MovementRow {
  id?: string;
  entry_date?: string;
  type?: string;
  reference_type?: string;
  description?: string;
  quantity: number;
  balance_after: number;
  document_number?: string;
  source_name?: string;
  source_user?: string;
  unit_cost?: number;
}

/** منتج مصغّر كما يعيده `useMinimalProducts`. */
interface MinimalProduct {
  id: string;
  name: string;
  sku: string | null;
}

const InventoryMovementView: React.FC = () => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Date Filtering State
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const { data: allProducts } = useMinimalProducts();
  const { data: movement, isLoading } = useItemMovement(selectedProductId || null);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    return (
      allProducts
        ?.filter(
          (p: { name: string; sku: string | null }) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 10) || []
    );
  }, [allProducts, searchQuery]);

  const selectedProduct = useMemo(() => {
    return allProducts?.find((p: { id: string }) => p.id === selectedProductId);
  }, [allProducts, selectedProductId]);

  const analysis = useMemo(() => {
    const movementArr =
      (movement as Array<{
        quantity: number;
        balance_after: number;
        entry_date?: string;
        type?: string;
        description?: string;
        unit_cost?: number;
        id?: string;
      }>) || [];
    if (!movementArr || movementArr.length === 0) return null;
    const totalIn = movementArr.reduce((sum, m) => sum + (m.quantity > 0 ? m.quantity : 0), 0);
    const totalOut = movementArr.reduce(
      (sum, m) => sum + (m.quantity < 0 ? Math.abs(m.quantity) : 0),
      0
    );
    const startBalance = movementArr[0].balance_after - movementArr[0].quantity;
    const avgStock = (startBalance + movementArr[movementArr.length - 1].balance_after) / 2;

    return {
      currentStock: movementArr[movementArr.length - 1].balance_after,
      totalIn,
      totalOut,
      turnover: avgStock > 0 ? (totalOut / avgStock).toFixed(1) : 0,
      lastMovement: movementArr[movementArr.length - 1].entry_date
        ? formatLocalDate(movementArr[movementArr.length - 1].entry_date!)
        : '—',
    };
  }, [movement]);

  const chartData = useMemo(() => {
    const movementArr = (movement as MovementRow[]) || [];
    return movementArr
      .map((m: MovementRow) => ({
        date: m.entry_date ? formatLocalDate(m.entry_date) : '',
        balance: m.balance_after,
      }))
      .reverse();
  }, [movement]);

  const columns = [
    {
      header: 'التاريخ',
      accessor: (row: MovementRow) => (
        <span dir="ltr" className="font-mono text-xs font-medium text-slate-500">
          {row.entry_date ? formatLocalDate(row.entry_date) : '—'}
        </span>
      ),
    },
    {
      header: 'نوع الحركة',
      accessor: (row: MovementRow) => {
        let icon = <CheckCircle2 size={12} />;
        let color = 'text-slate-500';
        let bg = 'bg-slate-100 dark:bg-slate-800';
        let label = '---';

        if (row.quantity > 0) {
          icon = <ArrowDownRight size={12} />;
          color = 'text-emerald-600';
          bg = 'bg-emerald-500/10 border border-emerald-500/20';
          label = 'وارد';
        } else {
          icon = <ArrowUpRight size={12} />;
          color = 'text-rose-600';
          bg = 'bg-rose-500/10 border border-rose-500/20';
          label = 'صادر';
        }

        if (row.reference_type === 'transfer') {
          icon = <ArrowLeftRight size={12} />;
          label = row.quantity > 0 ? 'استلام مناقلة' : 'إرسال مناقلة';
          color = 'text-blue-600';
          bg = 'bg-blue-500/10 border border-blue-500/20';
        } else if (row.reference_type === 'audit') {
          icon = <CheckCircle2 size={12} />;
          label = 'جرد';
          color = 'text-amber-600';
          bg = 'bg-amber-500/10 border border-amber-500/20';
        }

        return (
          <div
            className={cn(
              'mx-auto flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5',
              bg,
              color
            )}
          >
            {icon}
            <span className="text-[10px] font-bold">{label}</span>
          </div>
        );
      },
      className: 'text-center',
    },
    {
      header: 'تفاصيل المرجع',
      accessor: (row: MovementRow) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {row.document_number || '—'}
          </span>
          <span className="text-[10px] text-slate-400">{row.source_name}</span>
        </div>
      ),
    },
    {
      header: 'الكمية',
      accessor: (row: MovementRow) => (
        <span
          dir="ltr"
          className={cn(
            'rounded-lg px-2.5 py-0.5 font-mono text-xs font-bold',
            row.quantity > 0
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'
          )}
        >
          {row.quantity > 0 ? '+' : ''}
          {row.quantity}
        </span>
      ),
      className: 'text-center',
    },
    {
      header: 'الرصيد بعد الحركة',
      accessor: (row: MovementRow) => (
        <span
          dir="ltr"
          className="rounded-lg bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-bold text-blue-600 dark:bg-blue-900/20"
        >
          {row.balance_after}
        </span>
      ),
      className: 'text-center',
    },
    {
      header: 'المستخدم',
      accessor: (row: MovementRow) => (
        <span className="text-xs text-slate-500">{row.source_user || 'نظام'}</span>
      ),
      className: 'text-right',
    },
  ];

  const handleSelectProduct = (product: MinimalProduct) => {
    setSelectedProductId(product.id);
    setSearchQuery(product.name);
    setIsDropdownOpen(false);
  };
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 pb-6 duration-700 sm:space-y-5">
      {/* Command Center: Advanced Search & Control */}
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-sm sm:p-4 lg:flex-row lg:items-center">
        <div className="relative w-full lg:w-[420px]">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            تحديد الصنف المستهدف
          </label>
          <div className="group relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                setIsDropdownOpen(true);
              }}
              placeholder="ابحث بالاسم أو الباركود أو SKU..."
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] py-2 pl-3 pr-10 text-xs font-bold outline-none transition-all focus:border-blue-500 dark:text-slate-100"
            />
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
          </div>
          {isDropdownOpen && filteredProducts.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-72 overflow-y-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-lg">
              {filteredProducts.map((p: MinimalProduct) => (
                <div
                  key={p.id}
                  onClick={() => {
                    handleSelectProduct(p);
                  }}
                  className="flex cursor-pointer items-center justify-between border-b border-[var(--app-border)] p-3 transition-colors last:border-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{p.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">{p.sku || 'بدون رمز'}</p>
                    </div>
                  </div>
                  <Zap size={14} className="text-blue-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chronological Filters */}
        <div className="flex w-full gap-3 lg:w-auto">
          <div className="flex-1 lg:w-36">
            <label className="mb-1.5 block text-[10px] font-bold text-slate-400">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => {
                setFromDate(e.target.value);
              }}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3 py-1.5 font-mono text-xs font-bold outline-none transition-all focus:border-blue-500 dark:text-white"
            />
          </div>
          <div className="flex-1 lg:w-36">
            <label className="mb-1.5 block text-[10px] font-bold text-slate-400">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={e => {
                setToDate(e.target.value);
              }}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3 py-1.5 font-mono text-xs font-bold outline-none transition-all focus:border-blue-500 dark:text-white"
            />
          </div>
        </div>
      </div>

      {!selectedProductId ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-10 text-center">
          <div className="mb-3 rounded-xl bg-blue-500/10 p-3 text-blue-500">
            <History size={32} />
          </div>
          <h3 className="mb-1 text-base font-bold text-slate-800 dark:text-white">
            تحليل حركة المخزون
          </h3>
          <p className="max-w-sm text-xs leading-relaxed text-slate-400">
            حدد صنفاً من القائمة أعلاه لعرض السجل المحاسبي واللوجستي الكامل، بما في ذلك التوريد
            والصرف والمناقلات.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-12 text-center">
          <div className="border-3 h-8 w-8 animate-spin rounded-full border-slate-200 border-t-blue-500" />
          <span className="animate-pulse text-xs font-bold text-slate-400">
            جاري جرد حركة الصنف...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-12">
          {/* Insights Column */}
          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <BarChart3 size={14} /> مؤشرات حركة الصنف
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    الرصيد الفعلي الحالي
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h2 className="font-mono text-3xl font-bold text-slate-900 dark:text-white">
                      {analysis?.currentStock || 0}
                    </h2>
                    <span className="text-xs font-semibold text-slate-400">وحدة</span>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-3">
                  <p className="mb-1 text-[10px] font-bold text-slate-500">معدل الدوران</p>
                  <span className="font-mono text-xl font-bold text-blue-600 dark:text-blue-400">
                    {analysis?.turnover || 0}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <div className="mb-1 flex items-center gap-1 text-emerald-600">
                      <ArrowDownRight size={14} />
                      <span className="text-[10px] font-bold">إجمالي الوارد</span>
                    </div>
                    <p className="font-mono text-base font-bold text-emerald-600">
                      +{analysis?.totalIn}
                    </p>
                  </div>
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
                    <div className="mb-1 flex items-center gap-1 text-rose-600">
                      <ArrowUpRight size={14} />
                      <span className="text-[10px] font-bold">إجمالي الصادر</span>
                    </div>
                    <p className="font-mono text-base font-bold text-rose-600">
                      -{analysis?.totalOut}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Card */}
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
              <h4 className="mb-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                مسار الرصيد عبر الزمن
              </h4>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="stepAfter"
                      dataKey="balance"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorBalance)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Transaction Ledger Table */}
          <div className="lg:col-span-8">
            <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
              <ExcelTable
                columns={columns}
                data={movement || []}
                colorTheme="blue"
                title={`سجل حركة الصنف`}
                subtitle={`النشاط المسجل لـ: ${selectedProduct?.name}`}
                emptyMessage="لا توجد حركات مسجلة لهذا الصنف"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryMovementView;
