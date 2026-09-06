import React, { useState, useRef, useEffect, useId } from 'react';
import { Award, ChevronDown, Check, Plus, Loader2 } from 'lucide-react';
import { useBrandSuggestions } from '../../hooks/useBrandSuggestions';
import { useAuthStore } from '../../../auth/store';

interface BrandComboboxProps {
  value?: string | undefined;
  onChange: (value: string) => void;
  error?: string | undefined;
  label?: string | undefined;
  disabled?: boolean | undefined;
}

export const BrandCombobox: React.FC<BrandComboboxProps> = ({
  value = '',
  onChange,
  error,
  label = 'الشركة الصانعة / الماركة',
  disabled = false,
}) => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const { brands, filteredBrands, isLoading } = useBrandSuggestions({
    companyId: user?.company_id,
    searchTerm: value,
  });

  // Close dropdown when clicking outside
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

  // Ensure highlighted item is in view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (brandName: string) => {
    onChange(brandName);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = filteredBrands.length + (showCreateOption ? 0 : -1);
      setHighlightedIndex(prev => (prev < maxIndex ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const maxIndex = filteredBrands.length + (showCreateOption ? 0 : -1);
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : maxIndex));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0) {
        e.preventDefault();
        if (showCreateOption && highlightedIndex === filteredBrands.length) {
          handleSelect(value.trim());
        } else if (filteredBrands[highlightedIndex]) {
          handleSelect(filteredBrands[highlightedIndex]);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const trimmedVal = value.trim();
  const exactMatchExists = brands.some(b => b.toLowerCase().trim() === trimmedVal.toLowerCase());
  const showCreateOption = trimmedVal.length > 0 && !exactMatchExists;

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="mb-1.5 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Award size={13} className="text-amber-500" />
            {label}
          </span>
          {brands.length > 0 && (
            <span className="text-[10px] font-normal text-gray-400 dark:text-slate-500">
              {brands.length} مسجلة
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="ابحث أو اكتب اسم الماركة..."
          className={`w-full rounded-xl border-2 bg-[var(--app-surface)] py-2 pl-9 pr-9 text-xs font-bold text-gray-800 outline-none transition-all placeholder:text-gray-400 dark:text-white dark:placeholder:text-slate-500 ${
            error
              ? 'border-rose-500 focus:border-rose-600'
              : 'border-gray-100 hover:border-gray-200 focus:border-blue-500 dark:border-slate-800 dark:hover:border-slate-700 dark:focus:border-blue-500'
          }`}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-amber-500">
          <Award size={16} />
        </div>

        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen(prev => !prev);
            inputRef.current?.focus();
          }}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          {isLoading ? (
            <Loader2 size={14} className="animate-spin text-blue-500" />
          ) : (
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          )}
        </button>
      </div>

      {error && <p className="mt-1 px-1 text-[10px] font-bold text-rose-500">{error}</p>}

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div className="animate-in fade-in-50 zoom-in-95 absolute z-50 mt-1 max-h-56 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl duration-100 dark:border-slate-700 dark:bg-slate-900">
          <ul
            id={listboxId}
            ref={listRef}
            role="listbox"
            className="scrollbar-thin max-h-52 overflow-y-auto p-1"
          >
            {filteredBrands.length === 0 && !showCreateOption && (
              <li className="px-3 py-3 text-center text-xs text-gray-400 dark:text-slate-500">
                لا توجد ماركات مسجلة حالياً
              </li>
            )}

            {filteredBrands.map((brand, idx) => {
              const isSelected = brand.toLowerCase() === trimmedVal.toLowerCase();
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={brand}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    handleSelect(brand);
                  }}
                  onMouseEnter={() => {
                    setHighlightedIndex(idx);
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    isHighlighted
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : isSelected
                        ? 'bg-gray-50 text-gray-900 dark:bg-slate-800/60 dark:text-white'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {brand}
                  </span>
                  {isSelected && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                </li>
              );
            })}

            {showCreateOption && (
              <li
                role="option"
                aria-selected={false}
                onClick={() => {
                  handleSelect(trimmedVal);
                }}
                onMouseEnter={() => {
                  setHighlightedIndex(filteredBrands.length);
                }}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border-t border-gray-100 px-3 py-2 text-xs font-bold text-emerald-600 transition-colors dark:border-slate-800 dark:text-emerald-400 ${
                  highlightedIndex === filteredBrands.length
                    ? 'bg-emerald-50 dark:bg-emerald-950/30'
                    : 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                }`}
              >
                <Plus size={14} />
                <span>اعتماد ماركة جديدة:</span>
                <span className="truncate font-mono font-bold text-emerald-700 underline dark:text-emerald-300">
                  "{trimmedVal}"
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BrandCombobox;
