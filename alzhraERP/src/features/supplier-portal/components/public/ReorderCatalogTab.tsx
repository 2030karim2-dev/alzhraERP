import React from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '../../../../core/utils';
import ExcelTable, { type Column } from '../../../../ui/common/ExcelTable';
import type { PublicPortalContext } from '../../types';

export type ReorderProductItem = PublicPortalContext['reorder_products'][0];

interface ReorderCatalogTabProps {
  products: ReorderProductItem[];
  reorderCount: number;
  onlyNeedsReorder: boolean;
  setOnlyNeedsReorder: React.Dispatch<React.SetStateAction<boolean>>;
  selectedProductIds: Set<string>;
  setSelectedProductIds: (ids: Set<string>) => void;
  onBulkAddSelectedToDraft: () => void;
  productSearch: string;
  setProductSearch: (s: string) => void;
  productColumns: Array<Column<ReorderProductItem>>;
}

interface FilterBarProps {
  onlyNeedsReorder: boolean;
  onToggleReorder: () => void;
  reorderCount: number;
  selectedCount: number;
  onBulkAdd: () => void;
}

const ReorderFilterBar: React.FC<FilterBarProps> = ({
  onlyNeedsReorder,
  onToggleReorder,
  reorderCount,
  selectedCount,
  onBulkAdd,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-md">
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggleReorder}
        className={cn(
          'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all',
          onlyNeedsReorder
            ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
            : 'border-slate-700 bg-slate-800 text-slate-300'
        )}
      >
        <AlertTriangle size={14} />
        <span>أصناف إعادة الطلب فقط ({reorderCount})</span>
      </button>
    </div>

    {selectedCount > 0 && (
      <button
        type="button"
        onClick={onBulkAdd}
        className="flex animate-pulse items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition-all hover:from-emerald-500 hover:to-teal-500"
      >
        <Sparkles size={15} />
        <span>تسعير الأصناف المحددة ({selectedCount}) دفعة واحدة</span>
      </button>
    )}
  </div>
);

export const ReorderCatalogTab: React.FC<ReorderCatalogTabProps> = ({
  products,
  reorderCount,
  onlyNeedsReorder,
  setOnlyNeedsReorder,
  selectedProductIds,
  setSelectedProductIds,
  onBulkAddSelectedToDraft,
  productSearch,
  setProductSearch,
  productColumns,
}) => {
  return (
    <div className="space-y-3">
      <ReorderFilterBar
        onlyNeedsReorder={onlyNeedsReorder}
        onToggleReorder={() => {
          setOnlyNeedsReorder(prev => !prev);
        }}
        reorderCount={reorderCount}
        selectedCount={selectedProductIds.size}
        onBulkAdd={onBulkAddSelectedToDraft}
      />

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-1 shadow-2xl">
        <ExcelTable<ReorderProductItem>
          columns={productColumns}
          data={products}
          title="جدول الأصناف المطلوب توريدها"
          subtitle="حدد الأصناف لتسعيرها جماعياً أو انقر تسعير لأي صنف مباشرة"
          colorTheme="green"
          showSearch={true}
          searchValue={productSearch}
          onSearchChange={setProductSearch}
          enableSelection={true}
          selectedRowIds={selectedProductIds}
          onSelectionChange={setSelectedProductIds}
          getRowId={p => p.id}
          enablePagination={true}
          pageSize={20}
          enableResize={true}
          resizeStorageKey="supplier_portal_reorder_table"
          emptyMessage="لا توجد أصناف مطابقة لخيارات البحث"
        />
      </div>
    </div>
  );
};
