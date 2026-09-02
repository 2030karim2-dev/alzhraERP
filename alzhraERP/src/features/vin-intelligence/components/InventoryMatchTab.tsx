import React, { useMemo, useState } from 'react';
import { Link2, Unlink2, PackagePlus, ScanLine, Search, CheckCircle2, Boxes } from 'lucide-react';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import ExcelTable, { type Column } from '../../../ui/common/ExcelTable';
import { cn } from '../../../core/utils';
import type { MatchingInventoryProduct, VehicleProductLink } from '../types';

interface InventoryMatchTabProps {
  hasVehicle: boolean;
  matchingProducts: MatchingInventoryProduct[];
  isMatching: boolean;
  linkedProducts: VehicleProductLink[];
  isLinkedLoading: boolean;
  isLinking: boolean;
  onLink: (productId: string) => void;
  onUnlink: (id: string) => void;
  onNavigateToExtract?: () => void;
  onNavigateToDecode?: () => void;
}

const statusColor: Record<string, string> = {
  CONFIRMED:
    'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
  POSSIBLE:
    'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
  UNKNOWN:
    'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  NOT_COMPATIBLE:
    'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
};

const statusLabelAr: Record<string, string> = {
  CONFIRMED: 'مؤكد ✓',
  POSSIBLE: 'محتمل ⚡',
  UNKNOWN: 'غير محدد',
  NOT_COMPATIBLE: 'غير متوافق ✕',
};

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const colorClass =
    Object.entries(statusColor).find(([k]) => k === status)?.[1] ?? statusColor.UNKNOWN;
  const label = Object.entries(statusLabelAr).find(([k]) => k === status)?.[1] ?? status;

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${colorClass}`}
    >
      {label}
    </span>
  );
}

/**
 * Merge graph matching products and direct vehicle-linked products
 * into a single unified deduplicated list with complete product names.
 */
export function mergeMatchingAndLinkedProducts(
  matching: MatchingInventoryProduct[],
  linked: VehicleProductLink[]
): MatchingInventoryProduct[] {
  const map = new Map<string, MatchingInventoryProduct>();

  // 1. Add matching products from graph RPC
  for (const m of matching) {
    map.set(m.product_id, { ...m });
  }

  // 2. Merge with directly linked products from vehicle_products
  for (const l of linked) {
    const existing = map.get(l.product_id);
    if (existing) {
      existing.compatibility_status =
        l.fitment_status || existing.compatibility_status || 'CONFIRMED';
      if (l.id) existing.link_id = l.id;
      if (l.product) {
        if (!existing.name_ar && (l.product.name_ar || l.product.name)) {
          existing.name_ar = l.product.name_ar || l.product.name || '';
        }
        if ((!existing.sku || existing.sku === '—') && l.product.sku) {
          existing.sku = l.product.sku;
        }
        if ((!existing.part_number || existing.part_number === '—') && l.product.part_number) {
          existing.part_number = l.product.part_number;
        }
        if (l.product.quantity != null) {
          existing.quantity = l.product.quantity;
        }
        if (l.product.sale_price != null && !existing.sale_price) {
          existing.sale_price = l.product.sale_price;
        }
      }
    } else {
      const prodName =
        l.product?.name_ar ||
        l.product?.name ||
        (l.product?.part_number
          ? `قطعة غيار (${l.product.part_number})`
          : `منتج (${l.product_id.slice(0, 8)})`);

      map.set(l.product_id, {
        product_id: l.product_id,
        link_id: l.id,
        sku: l.product?.sku || '—',
        part_number: l.product?.part_number || '—',
        name_ar: prodName,
        brand: l.product?.brand || '—',
        sale_price: Number(l.product?.sale_price ?? 0),
        quantity: Number(l.product?.quantity ?? 0),
        status: l.product?.status || 'active',
        compatibility_status: l.fitment_status || 'CONFIRMED',
        match_source: l.source === 'vin_extract' ? 'استخراج شاصي' : 'ربط يدوي',
      });
    }
  }

  return Array.from(map.values());
}

export const InventoryMatchTab: React.FC<InventoryMatchTabProps> = ({
  hasVehicle,
  matchingProducts,
  isMatching,
  linkedProducts,
  isLinkedLoading,
  isLinking,
  onLink,
  onUnlink,
  onNavigateToExtract,
  onNavigateToDecode,
}) => {
  const [searchFilter, setSearchFilter] = useState('');

  const linkedMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of linkedProducts) {
      if (l.id) m.set(l.product_id, l.id);
    }
    return m;
  }, [linkedProducts]);

  const allProducts = useMemo(
    () => mergeMatchingAndLinkedProducts(matchingProducts, linkedProducts),
    [matchingProducts, linkedProducts]
  );

  const filteredProducts = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(
      p =>
        p.name_ar.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.part_number && p.part_number.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
    );
  }, [allProducts, searchFilter]);

  if (!hasVehicle) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          <ScanLine size={28} />
        </div>
        <h3 className="mb-2 text-base font-bold text-slate-800 dark:text-slate-100">
          لم يتم تحديد سيارة بعد
        </h3>
        <p className="mx-auto mb-6 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          قم بفك رقم الشاصي (VIN) أو اختيار موديل ومواصفات السيارة لعرض كافة قطع الغيار المتطابقة في
          مخزونك تلقائياً بأسمائها وأسعارها وكمياتها.
        </p>
        {onNavigateToDecode && (
          <Button
            size="md"
            onClick={onNavigateToDecode}
            className="rounded-xl bg-blue-600 font-bold text-white shadow-md shadow-blue-500/20"
          >
            <ScanLine size={16} className="ml-1.5" />
            الانتقال لفك الشاصي وتحديد السيارة
          </Button>
        )}
      </div>
    );
  }

  const inStockCount = allProducts.filter(p => (p.quantity ?? 0) > 0).length;

  const columns: Array<Column<MatchingInventoryProduct>> = [
    {
      header: 'SKU',
      accessor: r => (
        <span className="rounded-md border border-slate-200/60 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600 dark:border-slate-700/60 dark:bg-slate-800 dark:text-slate-300">
          {r.sku}
        </span>
      ),
      width: '110px',
    },
    {
      header: 'رقم القطعة (OEM)',
      accessor: r => (
        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
          {r.part_number ?? '—'}
        </span>
      ),
      width: '130px',
    },
    {
      header: 'اسم المنتج في المخزون',
      accessor: r => (
        <div className="flex flex-col py-0.5">
          <span className="text-xs font-bold leading-snug text-slate-900 dark:text-slate-100">
            {r.name_ar}
          </span>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
            المصدر: {r.match_source}
          </span>
        </div>
      ),
    },
    {
      header: 'الماركة',
      accessor: r => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {r.brand ?? '—'}
        </span>
      ),
      width: '100px',
    },
    {
      header: 'الكمية المتوفرة',
      accessor: r => {
        const qty = r.quantity ?? 0;
        const inStock = qty > 0;
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-bold',
              inStock
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            )}
          >
            {qty}
          </span>
        );
      },
      width: '100px',
    },
    {
      header: 'سعر البيع',
      accessor: r => (
        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {r.sale_price ? `${r.sale_price.toLocaleString()}` : '—'}
        </span>
      ),
      width: '90px',
    },
    {
      header: 'التوافق',
      accessor: r => <StatusBadge status={r.compatibility_status} />,
      width: '110px',
    },
    {
      header: 'الإجراءات',
      accessor: r => {
        const linkId = r.link_id || linkedMap.get(r.product_id);
        const isLinked = !!linkId;

        return isLinked ? (
          <button
            onClick={() => {
              if (linkId) onUnlink(linkId);
            }}
            disabled={isLinkedLoading}
            title="إلغاء ربط القطعة من هذه المركبة"
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 shadow-xs transition-colors hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <Unlink2 size={11} /> إلغاء الربط
          </button>
        ) : (
          <button
            onClick={() => {
              onLink(r.product_id);
            }}
            disabled={isLinking}
            title="تأكيد وربط القطعة بهذه المركبة"
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Link2 size={11} /> ربط
          </button>
        );
      },
      width: '100px',
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Top Summary & Actions Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Boxes size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                قطع المخزون المتوافقة ({allProducts.length})
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                منها {inStockCount} قطعة متوفرة حالياً في المخزن
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 size={13} /> {linkedProducts.length} قطعة مثبتة بالمركبة
            </span>
          </div>
        </div>

        {onNavigateToExtract && (
          <Button
            size="sm"
            onClick={onNavigateToExtract}
            className="rounded-xl bg-indigo-600 font-bold text-white shadow-xs hover:bg-indigo-700"
          >
            <PackagePlus size={14} className="ml-1.5" />
            تسعير واستخراج قطع جديدة لهذه السيارة
          </Button>
        )}
      </div>

      {/* ── Search Bar ── */}
      {allProducts.length > 0 && (
        <div className="max-w-md">
          <Input
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="بحث برقم القطعة، الاسم، أو رمز الصنف (SKU)..."
            icon={<Search size={14} className="text-slate-400" />}
          />
        </div>
      )}

      {/* ── Main Inventory Products Excel Grid ── */}
      <ExcelTable
        columns={columns}
        data={filteredProducts}
        title="قطع المخزون المتطابقة والمرتبطة بهذه المركبة"
        enablePagination={filteredProducts.length > 25}
        pageSize={25}
        showSearch={false}
        isLoading={isMatching || isLinkedLoading}
        emptyMessage={
          searchFilter
            ? 'لا توجد نتائج مطابقة لبحثك'
            : 'لا توجد قطع مطابقة أو مرتبطة بهذه المركبة في المخزون حالياً'
        }
        colorTheme="blue"
        isRTL
      />
    </div>
  );
};
