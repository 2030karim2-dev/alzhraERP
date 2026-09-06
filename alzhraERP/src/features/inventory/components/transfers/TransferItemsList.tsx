import React, { useMemo } from 'react';
import { Trash2, Box, PackagePlus } from 'lucide-react';
import ProductExcelGrid from '../ProductExcelGrid';
import type { Product } from '../../types';
import { parseNumberFlexible } from '@/core/utils/currencyUtils';

interface Props {
  items: Array<{ product: Product; qty: number }>;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  fromWarehouseId?: string;
}

const TransferItemsList: React.FC<Props> = ({ items, onRemove, onUpdateQty, fromWarehouseId }) => {
  // Map items to Product format for ProductExcelGrid
  const mappedProducts = useMemo(() => {
    return items.map(item => ({
      ...item.product,
      transfer_qty: item.qty,
    }));
  }, [items]);

  const extraColumns = useMemo(
    () => [
      {
        header: 'المتوفر بالمصدر',
        accessorKey: 'wh_stock',
        accessor: (row: Product & { transfer_qty?: number }) => {
          let whStock = row.stock_quantity ?? 0;
          if (
            fromWarehouseId &&
            row.warehouse_distribution &&
            row.warehouse_distribution.length > 0
          ) {
            const dist = row.warehouse_distribution.find(
              (w: any) => w.warehouse_id === fromWarehouseId
            );
            if (dist) whStock = Number(dist.quantity) || 0;
          }
          const isShortage = (row.transfer_qty || 1) > whStock;
          return (
            <div className="flex items-center justify-center">
              <span
                className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${isShortage ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}
              >
                {whStock}
              </span>
            </div>
          );
        },
        width: '100px',
        align: 'center' as const,
      },
      {
        header: 'الكمية المحولة',
        accessorKey: 'transfer_qty',
        accessor: (row: Product & { transfer_qty?: number }) => (
          <div className="flex items-center justify-center gap-1.5">
            <input
              type="number"
              step="any"
              min={0.001}
              value={row.transfer_qty || 1}
              onChange={e => {
                const parsed = parseNumberFlexible(e.target.value);
                const val = Number.isNaN(parsed) || parsed <= 0 ? 1 : parsed;
                onUpdateQty(row.id, val);
              }}
              onClick={e => {
                e.stopPropagation();
              }}
              className="h-7 w-16 rounded-lg border border-blue-200 bg-blue-50 text-center font-mono text-xs font-black text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
            />
            <span className="text-[10px] font-bold text-gray-400">قطعة</span>
          </div>
        ),
        isEditable: false,
        width: '120px',
        align: 'center' as const,
      },
      {
        header: '',
        accessorKey: 'remove_action',
        accessor: (row: Product & { transfer_qty?: number }) => (
          <button
            onClick={e => {
              e.stopPropagation();
              onRemove(row.id);
            }}
            className="group rounded-lg p-1 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/30"
            title="حذف الصنف"
          >
            <Trash2 size={16} className="transition-transform group-hover:scale-110" />
          </button>
        ),
        width: '50px',
        align: 'center' as const,
      },
    ],
    [onRemove, onUpdateQty, fromWarehouseId]
  );

  const handleCellUpdate = (rowIndex: number, columnKey: string, value: unknown) => {
    if (columnKey === 'transfer_qty') {
      const rowId = mappedProducts[rowIndex]?.id;
      if (rowId) {
        const newQty = parseInt(String(value), 10) || 1;
        onUpdateQty(rowId, newQty);
      }
    }
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2">
        <div className="flex items-center gap-2">
          <Box size={14} className="text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-tight text-[var(--app-text)]">
            الأصناف المحددة للمناقلة ({items.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {items.reduce((sum, item) => sum + item.qty, 0)} قطعة إجمالاً
          </span>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/50 p-8 text-center text-gray-400 dark:bg-slate-900/20">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 shadow-inner dark:bg-blue-950/40">
              <PackagePlus size={28} />
            </div>
            <h4 className="mb-1 text-sm font-bold text-slate-700 dark:text-slate-200">
              لم يتم إضافة أي أصناف بعد
            </h4>
            <p className="max-w-sm text-xs leading-relaxed text-gray-400">
              اختر صنفاً من شريط البحث أعلاه أو تصفح أصناف المستودع للبدء بإضافتها إلى أمر المناقلة
            </p>
          </div>
        ) : (
          <ProductExcelGrid
            products={mappedProducts}
            isLoading={false}
            hideActions={true}
            hideBulkActions={true}
            extraColumns={extraColumns}
            onCellUpdate={handleCellUpdate}
            title="أصناف المناقلة"
            colorTheme="blue"
            visibleColumns={['name', 'part_number', 'brand', 'size']}
          />
        )}
      </div>
    </div>
  );
};

export default TransferItemsList;
