// ============================================
// AuditSearchPanel — بحث الأصناف لجلسة الجرد السريع
// يحتوي: اختيار المستودع + حقل البحث + نتائج البحث كـ dropdown
// ============================================
import React, { useState } from 'react';
import { Database, ScanBarcode } from 'lucide-react';
import SearchInput from '../../../../ui/components/SearchInput';
import SearchDropdown from '../../../../ui/components/SearchDropdown';

interface Warehouse {
  id: string;
  name_ar?: string;
  name?: string;
}

export interface SearchResult {
  id: string;
  name_ar?: string;
  sku: string;
  part_number?: string;
  brand?: string;
  alternative_numbers?: string;
  size?: string;
  stock_quantity?: number;
  warehouse_distribution?: Array<{ warehouse_id: string; quantity: number }>;
}

interface Props {
  warehouses: Warehouse[];
  isLoadingWarehouses: boolean;
  selectedWarehouseId: string;
  onWarehouseChange: (id: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  onScannerOpen: () => void;
  searchResults: SearchResult[] | undefined;
  isLoadingSearch: boolean;
  onAddItem: (product: SearchResult) => void;
}

/** كمية الصنف في المستودع المحدد (تسوّى على أساسها، لا على الإجمالي لكل المستودعات).
 *  قبل اختيار مستودع تُعاد null ليُعرض "—" بدل رقم مضلل من مستودع آخر. */
export const getWarehouseStock = (p: SearchResult, warehouseId: string): number | null => {
  if (!warehouseId) return null;
  const dist = p.warehouse_distribution?.find(w => w.warehouse_id === warehouseId);
  return dist ? Number(dist.quantity) || 0 : 0;
};

const AuditSearchPanel: React.FC<Props> = ({
  warehouses,
  isLoadingWarehouses,
  selectedWarehouseId,
  onWarehouseChange,
  filter,
  onFilterChange,
  onScannerOpen,
  searchResults,
  isLoadingSearch,
  onAddItem,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const hasResults = (searchResults?.length ?? 0) > 0;

  return (
    <div className="space-y-4 rounded-xl border border-gray-100 bg-[var(--app-surface)] p-4 shadow-sm dark:border-slate-800">
      {/* Warehouse Selector */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase text-gray-500">
          <Database size={14} className="text-blue-500" /> المستودع المستهدف
        </label>
        {isLoadingWarehouses ? (
          <div className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800" />
        ) : (
          <select
            value={selectedWarehouseId}
            onChange={e => {
              onWarehouseChange(e.target.value);
            }}
            className="w-full rounded-lg border-none bg-gray-50 px-4 py-2.5 text-sm font-bold shadow-inner ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700"
          >
            <option value="" disabled>
              -- اختر المستودع --
            </option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.name_ar || w.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Search Field + Scanner Button */}
      <div className="relative space-y-1.5 opacity-90">
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase text-gray-500">
          <Database size={14} className="text-blue-500" /> البحث عن الأصناف للتسوية
        </label>
        <div className="flex gap-2">
          <SearchInput
            value={filter}
            onChange={val => {
              onFilterChange(val);
              if (val.trim()) setDropdownOpen(true);
            }}
            placeholder="ابحث بالاسم، SKU أو امسح الباركود..."
            disabled={!selectedWarehouseId}
            loading={isLoadingSearch}
            variant="default"
            size="md"
            className="flex-1"
            onEscape={() => {
              setDropdownOpen(false);
            }}
          />
          <button
            onClick={onScannerOpen}
            disabled={!selectedWarehouseId}
            className="shrink-0 rounded-lg bg-blue-600 p-2.5 text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ScanBarcode size={20} />
          </button>
        </div>

        <SearchDropdown
          open={dropdownOpen && !!filter.trim()}
          onClose={() => {
            setDropdownOpen(false);
          }}
          loading={isLoadingSearch}
          hasResults={hasResults}
          emptyMessage="لا توجد أصناف مطابقة"
          className="max-h-[60vh] overflow-hidden"
        >
          <div className="custom-scrollbar max-h-[60vh] overflow-y-auto">
            <table className="w-full border-collapse text-right text-xs">
              <thead className="sticky top-0 z-20 border-b-2 border-slate-200 bg-slate-50 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
                <tr className="font-black text-slate-900 dark:text-gray-100">
                  <th className="border-l border-slate-200 px-4 py-3 text-start dark:border-slate-800">
                    اسم القطعة
                  </th>
                  <th className="w-[120px] border-l border-slate-200 px-4 py-3 dark:border-slate-800">
                    رقم القطعة
                  </th>
                  <th className="w-[100px] border-l border-slate-200 px-4 py-3 text-center dark:border-slate-800">
                    الماركة
                  </th>
                  <th className="w-[80px] border-l border-slate-200 px-4 py-3 text-center dark:border-slate-800">
                    المقاس
                  </th>
                  <th className="w-[150px] border-l border-slate-200 px-4 py-3 dark:border-slate-800">
                    الأرقام البديلة
                  </th>
                  <th className="w-[110px] px-4 py-3 text-center">مخزون المستودع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {searchResults?.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => {
                      onAddItem(p);
                      setDropdownOpen(false);
                    }}
                    className="group cursor-pointer bg-[var(--app-surface)] transition-colors hover:bg-blue-50 dark:hover:bg-blue-500/10"
                  >
                    <td className="border-l border-slate-100 px-4 py-3 text-start font-bold text-slate-900 transition-colors group-hover:text-blue-600 dark:border-slate-800 dark:text-slate-50">
                      {p.name_ar}
                    </td>
                    <td className="border-l border-slate-100 px-4 py-3 font-mono text-slate-600 dark:border-slate-800 dark:text-slate-400">
                      {p.part_number || p.sku}
                    </td>
                    <td className="border-l border-slate-100 px-4 py-3 text-center dark:border-slate-800">
                      <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {p.brand || '-'}
                      </span>
                    </td>
                    <td className="border-l border-slate-100 px-4 py-3 text-center font-bold text-blue-500 dark:border-slate-800">
                      {p.size || '-'}
                    </td>
                    <td className="border-l border-slate-100 px-4 py-3 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      {p.alternative_numbers || '-'}
                    </td>
                    <td className="bg-slate-50/30 px-4 py-3 text-center font-mono font-black text-emerald-600 dark:bg-slate-800/30 dark:text-emerald-500">
                      {getWarehouseStock(p, selectedWarehouseId) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SearchDropdown>
      </div>
    </div>
  );
};

export default AuditSearchPanel;
