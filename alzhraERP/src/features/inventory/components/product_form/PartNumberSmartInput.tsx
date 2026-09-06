import React, { useState, useRef, useEffect } from 'react';
import { FileCode, Loader2, Copy, AlertTriangle, ArrowRight } from 'lucide-react';
import { usePartNumberSuggestions } from '../../hooks/usePartNumberSuggestions';
import { useAuthStore } from '../../../auth/store';
import type { ProductFormData } from '../../types';

interface PartNumberProductMatch {
  id: string;
  name_ar: string;
  part_number: string | null;
  alternative_numbers: string | null;
  brand: string | null;
  sku: string;
  sale_price: number | null;
  purchase_price: number | null;
}

interface PartNumberSmartInputProps {
  value?: string | undefined;
  currentBrand?: string | undefined;
  onChange: (value: string) => void;
  onApplyProduct?: ((product: Partial<ProductFormData>) => void) | undefined;
  error?: string | undefined;
  label?: string | undefined;
  disabled?: boolean | undefined;
}

export const PartNumberSmartInput: React.FC<PartNumberSmartInputProps> = ({
  value = '',
  currentBrand = '',
  onChange,
  onApplyProduct,
  error,
  label = 'رقم القطعة المصنعي (Part Number)',
  disabled = false,
}) => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { suggestions, isSearching } = usePartNumberSuggestions({
    companyId: user?.company_id,
    query: value,
    enabled: Boolean(user?.company_id),
  });

  // Automatically open suggestions popup if matches are found and user is typing
  useEffect(() => {
    if (suggestions.length > 0 && value.trim().length >= 2) {
      setIsOpen(true);
    }
  }, [suggestions, value]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleSelectSuggestion = (item: PartNumberProductMatch) => {
    if (item.part_number) {
      onChange(item.part_number);
    }
    if (onApplyProduct) {
      onApplyProduct({
        brand: item.brand || undefined,
        name: item.name_ar,
        selling_price: item.sale_price ?? undefined,
        cost_price: item.purchase_price ?? undefined,
        alternative_numbers: item.alternative_numbers || undefined,
      });
    }
    setIsOpen(false);
  };

  const isDuplicateBrandAndPart = suggestions.some(
    s =>
      s.part_number?.trim().toLowerCase() === value.trim().toLowerCase() &&
      s.brand?.trim().toLowerCase() === currentBrand.trim().toLowerCase() &&
      currentBrand.trim().length > 0
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
          <FileCode size={13} className="text-indigo-500" />
          {label}
        </label>
        {isDuplicateBrandAndPart && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle size={11} />
            مسجل مسبقاً لنفس الماركة
          </span>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            if (e.target.value.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          disabled={disabled}
          dir="ltr"
          placeholder="مثال: 06H103495AE أو كود القطعة"
          className={`w-full rounded-xl border-2 bg-[var(--app-surface)] py-2 pl-9 pr-9 font-mono text-xs font-bold text-gray-800 outline-none transition-all placeholder:font-sans placeholder:text-gray-400 dark:text-white dark:placeholder:text-slate-500 ${
            error
              ? 'border-rose-500 focus:border-rose-600'
              : isDuplicateBrandAndPart
                ? 'border-amber-400 focus:border-amber-500 dark:border-amber-600'
                : 'border-gray-100 hover:border-gray-200 focus:border-indigo-500 dark:border-slate-800 dark:hover:border-slate-700 dark:focus:border-indigo-500'
          }`}
        />

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500">
          <FileCode size={16} />
        </div>

        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isSearching ? (
            <Loader2 size={14} className="animate-spin text-indigo-500" />
          ) : suggestions.length > 0 ? (
            <span
              onClick={() => {
                setIsOpen(prev => !prev);
              }}
              className="cursor-pointer rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300"
              title="عرض القطع المطابقة"
            >
              {suggestions.length} مطابق
            </span>
          ) : null}
        </div>
      </div>

      {error && <p className="mt-1 px-1 text-[10px] font-bold text-rose-500">{error}</p>}

      {/* Matching Part Numbers Floating Card */}
      {isOpen && suggestions.length > 0 && (
        <div className="animate-in fade-in-50 zoom-in-95 absolute z-50 mt-1 max-h-64 w-full overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-2xl duration-100 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-gray-100 bg-indigo-50/50 px-3 py-1.5 dark:border-slate-800 dark:bg-indigo-950/30">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              <Copy size={12} /> قطع سابقة مسجلة بنفس الرقم
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
              }}
              className="text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
            >
              إغلاق
            </button>
          </div>

          <div className="scrollbar-thin max-h-56 divide-y divide-gray-100 overflow-y-auto p-1 dark:divide-slate-800">
            {suggestions.map(item => {
              const matchesBrand =
                currentBrand &&
                item.brand &&
                item.brand.trim().toLowerCase() === currentBrand.trim().toLowerCase();

              return (
                <div
                  key={item.id}
                  className={`group flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 ${
                    matchesBrand ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1 pl-2">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-bold text-gray-900 dark:text-white">
                        {item.name_ar}
                      </span>
                      {item.brand && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                          {item.brand}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-gray-500 dark:text-slate-400">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {item.part_number || item.sku}
                      </span>
                      {item.sale_price !== null && item.sale_price !== undefined && (
                        <span>• السعر: {Number(item.sale_price).toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleSelectSuggestion(item);
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[10px] font-bold text-indigo-700 shadow-sm transition-all hover:border-indigo-400 hover:bg-indigo-600 hover:text-white dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white"
                    title="استيراد الماركة والبيانات من هذه القطعة"
                  >
                    <span>استيراد</span>
                    <ArrowRight size={11} className="rotate-180" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PartNumberSmartInput;
