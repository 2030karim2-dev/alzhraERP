import React from 'react';
import { PackageSearch, Link2, Unlink2 } from 'lucide-react';
import Card from '../../../ui/base/Card';
import ExcelTable, { Column } from '../../../ui/common/ExcelTable';
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
}

const statusColor: Record<string, string> = {
  CONFIRMED: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  POSSIBLE: 'text-amber-700 bg-amber-50 border-amber-200',
  UNKNOWN: 'text-slate-600 bg-slate-100 border-slate-200',
  NOT_COMPATIBLE: 'text-rose-700 bg-rose-50 border-rose-200',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
        statusColor[status] ?? statusColor.UNKNOWN
      }`}
    >
      {status}
    </span>
  );
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
}) => {
  if (!hasVehicle) {
    return (
      <Card isMicro className="text-center py-8">
        <PackageSearch size={24} className="text-[var(--app-text-secondary)] opacity-40 mx-auto mb-2" />
        <p className="text-[11px] font-bold text-[var(--app-text-secondary)]">
          أدخل رقم الشاصي (VIN) في تبويب «فك الشاصي» أولاً لعرض المنتجات المطابقة
        </p>
      </Card>
    );
  }

  const linkedIds = new Set(linkedProducts.map((l) => l.product_id));

  const columns: Column<MatchingInventoryProduct>[] = [
    {
      header: 'SKU',
      accessor: (r) => <span className="font-mono text-[10px]">{r.sku}</span>,
      width: '120px',
    },
    {
      header: 'رقم القطعة',
      accessor: (r) => <span className="font-mono text-[10px]">{r.part_number ?? '—'}</span>,
      width: '140px',
    },
    {
      header: 'الاسم',
      accessor: (r) => <span className="text-[10px] font-semibold">{r.name_ar}</span>,
    },
    {
      header: 'الماركة',
      accessor: (r) => <span className="text-[10px]">{r.brand ?? '—'}</span>,
      width: '100px',
    },
    {
      header: 'السعر',
      accessor: (r) => <span className="text-[10px] font-mono">{r.sale_price}</span>,
      width: '80px',
    },
    {
      header: 'التوافق',
      accessor: (r) => <StatusBadge status={r.compatibility_status} />,
      width: '110px',
    },
    {
      header: '',
      accessor: (r) =>
        linkedIds.has(r.product_id) ? (
          <span className="text-[9px] text-emerald-600 font-bold">مرتبط ✓</span>
        ) : (
          <button
            onClick={() => onLink(r.product_id)}
            disabled={isLinking}
            className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Link2 size={10} /> ربط
          </button>
        ),
      width: '70px',
    },
  ];

  return (
    <div className="space-y-2">
      <ExcelTable
        columns={columns}
        data={matchingProducts}
        title="منتجات المخزون المطابقة للمركبة"
        enablePagination={false}
        showSearch={false}
        isLoading={isMatching}
        emptyMessage="لا توجد منتجات مطابقة لهذه المركبة في المخزون"
        colorTheme="blue"
        isRTL
      />

      {linkedProducts.length > 0 && (
        <Card isMicro>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Link2 size={12} className="text-emerald-600" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">
              المنتجات المرتبطة ({linkedProducts.length})
            </h3>
          </div>
          {isLinkedLoading ? (
            <p className="text-[10px] text-[var(--app-text-secondary)]">جارٍ التحميل...</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {linkedProducts.map((l) => (
                <span
                  key={l.id ?? l.product_id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700"
                >
                  {l.product_id.slice(0, 8)}
                  <button onClick={() => l.id && onUnlink(l.id)} title="إلغاء الربط" className="hover:text-rose-600">
                    <Unlink2 size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
