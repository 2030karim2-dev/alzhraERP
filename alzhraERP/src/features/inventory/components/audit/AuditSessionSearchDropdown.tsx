import React from 'react';
import { ScanBarcode, Plus } from 'lucide-react';
import SearchInput from '../../../../ui/components/SearchInput';
import SearchDropdown from '../../../../ui/components/SearchDropdown';
import type { Product } from '../../types';
import type { SearchResultProduct } from '../../services/productService';

interface AuditSessionSearchDropdownProps {
  filter: string;
  setFilter: (val: string) => void;
  showResults: boolean;
  setShowResults: (show: boolean) => void;
  isLoadingSearch: boolean;
  isAddingItem: boolean;
  searchResults: SearchResultProduct[] | undefined;
  onAddItem: (product: Product) => void;
  onOpenScanner: () => void;
  onOpenAddProduct?: () => void;
}

export const AuditSessionSearchDropdown: React.FC<AuditSessionSearchDropdownProps> = ({
  filter,
  setFilter,
  showResults,
  setShowResults,
  isLoadingSearch,
  isAddingItem,
  searchResults,
  onAddItem,
  onOpenScanner,
  onOpenAddProduct,
}) => {
  return (
    <div className="sticky top-0 z-40 border-b border-gray-200 bg-[var(--app-surface)] p-2 shadow-sm dark:border-slate-800 sm:p-4">
      <div className="relative mx-auto max-w-[1600px]">
        <div className="relative flex gap-2">
          <SearchInput
            value={filter}
            onChange={val => {
              setFilter(val);
              if (val.trim()) setShowResults(true);
            }}
            placeholder="ابحث عن صنف لجرده..."
            loading={isLoadingSearch || isAddingItem}
            variant="default"
            size="md"
            className="h-11 flex-1 text-sm font-bold sm:h-12 sm:text-base"
            onEscape={() => {
              setShowResults(false);
            }}
          />
          <button
            onClick={onOpenScanner}
            className="flex w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-95"
            title="مسح الباركود"
          >
            <ScanBarcode size={22} />
          </button>
          {onOpenAddProduct && (
            <button
              onClick={onOpenAddProduct}
              className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-700 active:scale-95 sm:h-12"
              title="إضافة منتج جديد للجلسة مباشرة"
            >
              <Plus size={18} />
              <span>منتج جديد</span>
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        <SearchDropdown
          open={showResults && !!filter.trim()}
          onClose={() => {
            setShowResults(false);
          }}
          loading={isLoadingSearch || isAddingItem}
          hasResults={(searchResults?.length ?? 0) > 0}
          emptyMessage={
            onOpenAddProduct ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  لا توجد نتائج مطابقة لـ "{filter}"
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowResults(false);
                    onOpenAddProduct();
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
                >
                  <Plus size={14} />
                  إضافة كمنتج جديد في الجرد الآن
                </button>
              </div>
            ) : (
              'لا توجد نتائج مطابقة'
            )
          }
          className="z-50"
        >
          <div className="custom-scrollbar max-h-[60vh] overflow-y-auto">
            <table className="w-full border-collapse border border-gray-200 text-right text-xs dark:border-slate-700">
              <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm dark:bg-slate-800">
                <tr className="text-slate-700 dark:text-gray-200">
                  <th className="border border-gray-200 bg-slate-100 px-4 py-2 font-bold dark:border-slate-700 dark:bg-slate-800">
                    الصنف
                  </th>
                  <th className="w-32 border border-gray-200 bg-slate-100 px-4 py-2 text-center font-bold dark:border-slate-700 dark:bg-slate-800">
                    رقم القطعة/SKU
                  </th>
                  <th className="w-32 border border-gray-200 bg-slate-100 px-4 py-2 text-center font-bold dark:border-slate-700 dark:bg-slate-800">
                    الشركة الصانعة
                  </th>
                  <th className="w-24 border border-gray-200 bg-slate-100 px-4 py-2 text-center font-bold dark:border-slate-700 dark:bg-slate-800">
                    المقاس
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {searchResults?.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => {
                      onAddItem(p as unknown as Product);
                      setShowResults(false);
                    }}
                    className="cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-slate-700"
                  >
                    <td className="border border-gray-200 bg-[var(--app-surface)] px-4 py-3 font-bold text-slate-800 dark:border-slate-700 dark:text-slate-100">
                      {p.name_ar || p.name}
                    </td>
                    <td className="border border-gray-200 bg-[var(--app-surface)] px-4 py-3 text-center font-mono text-gray-500 dark:border-slate-700">
                      {p.part_number || p.sku || '-'}
                    </td>
                    <td className="border border-gray-200 bg-[var(--app-surface)] px-4 py-3 text-center font-bold text-gray-600 dark:border-slate-700">
                      {p.brand || '-'}
                    </td>
                    <td className="border border-gray-200 bg-[var(--app-surface)] px-4 py-3 text-center font-bold text-blue-600 dark:border-slate-700 dark:text-blue-400">
                      {p.size || '-'}
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
