import React from 'react';
import { Search, X, Box } from 'lucide-react';
import { cn } from '../../../../core/utils';
import SearchInput from '../../../../ui/components/SearchInput';
import SearchDropdown from '../../../../ui/components/SearchDropdown';

interface AuditProductPickerProps {
  selectedProduct: any;
  setSelectedProduct: (p: any) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  isProductsLoading: boolean;
  products: any[];
  isMaximized: boolean;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

const AuditProductPicker: React.FC<AuditProductPickerProps> = ({
  selectedProduct,
  setSelectedProduct,
  searchQuery,
  setSearchQuery,
  isDropdownOpen,
  setIsDropdownOpen,
  isProductsLoading,
  products,
  isMaximized,
  handleKeyDown,
  dropdownRef,
}) => {
  return (
    <div
      className={cn('relative p-2', isMaximized && 'mx-auto mt-10 w-full max-w-4xl')}
      ref={dropdownRef}
    >
      <div
        className={cn(
          'flex items-center gap-3 rounded-3xl border bg-[var(--app-surface)] px-4 py-3 shadow-sm transition-all duration-300',
          isDropdownOpen
            ? 'border-blue-500 shadow-lg ring-4 ring-blue-500/10'
            : 'border-gray-100 dark:border-slate-800'
        )}
      >
        <div className="rounded-2xl bg-blue-600/10 p-2 text-blue-600">
          <Search size={20} />
        </div>

        {selectedProduct ? (
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {selectedProduct.name}
              </span>
              <span className="rounded-lg bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-slate-800">
                {selectedProduct.sku}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedProduct(null);
              }}
              className="rounded-xl p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <SearchInput
            value={searchQuery}
            onChange={val => {
              setSearchQuery(val);
              if (val.trim()) setIsDropdownOpen(true);
            }}
            placeholder="ابحث عن صنف بالاسم أو الكود..."
            variant="minimal"
            size="sm"
            clearable={false}
            onKeyDown={handleKeyDown}
            onEscape={() => {
              setIsDropdownOpen(false);
            }}
            className="flex-1 border-none shadow-none ring-0"
            inputClassName="placeholder:text-gray-400 dark:placeholder:text-slate-400"
          />
        )}
      </div>

      <SearchDropdown
        open={isDropdownOpen && searchQuery.trim().length > 0}
        onClose={() => {
          setIsDropdownOpen(false);
        }}
        loading={isProductsLoading}
        hasResults={products.length > 0}
        emptyMessage="لا توجد نتائج مطابقة"
        className="z-[100] rounded-[2rem] shadow-2xl backdrop-blur-xl"
      >
        <div className="custom-scrollbar grid max-h-[300px] grid-cols-1 gap-1 overflow-y-auto p-2">
          {products.map((p: any) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedProduct(p);
                setIsDropdownOpen(false);
              }}
              className="group flex items-center justify-between rounded-2xl p-3 text-right transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-400 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-slate-800">
                  <Box size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{p.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-gray-400">{p.sku}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-emerald-600">
                  {p.stock_quantity ?? 0} في المخزن
                </p>
                <p className="text-[10px] font-bold text-gray-400">
                  {p.brand || 'ماركة غير محددة'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </SearchDropdown>
    </div>
  );
};

export default AuditProductPicker;
