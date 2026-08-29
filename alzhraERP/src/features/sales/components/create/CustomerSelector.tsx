import React, { useState, useEffect, useRef } from 'react';
import { Search, User, X, Check } from 'lucide-react';
import { useParties } from '../../../parties/hooks';
import { useSalesStore } from '../../store';
import { useAuthStore } from '../../../auth/store';
import { cn } from '../../../../core/utils';

interface Props {
  compact?: boolean;
}

const CustomerSelector: React.FC<Props> = ({ compact = false }) => {
  const { selectedCustomer, setCustomer } = useSalesStore();
  const { } = useAuthStore();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: filteredCustomers, isLoading } = useParties('customer', query);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  const handleSelect = (customer: any) => {
    setCustomer(customer);
    setQuery('');
    setIsOpen(false);
  };

  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !filteredCustomers || filteredCustomers.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredCustomers.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCustomers[highlightedIndex]) {
        handleSelect(filteredCustomers[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {selectedCustomer ? (
        <div className={cn(
          "flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 transition-all",
          compact ? "p-1.5 h-[38px]" : "p-3 rounded-2xl"
        )}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={cn(
              "rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0",
              compact ? "w-6 h-6" : "w-10 h-10"
            )}>
              <User size={compact ? 12 : 20} />
            </div>
            <div className="overflow-hidden">
              <p className={cn("font-bold text-gray-800 dark:text-slate-100 truncate", compact ? "text-[10px]" : "text-sm")}>
                {selectedCustomer.name}
              </p>
              {!compact && <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">{selectedCustomer.phone}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setCustomer(null); }}
            className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-gray-400 hover:text-rose-500 transition-all"
            title="إلغاء العميل"
          >
            <X size={compact ? 14 : 18} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => { setIsOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder={compact ? "بحث عميل (ذكي)..." : "بحث ذكي بالاسم، الهاتف، أو حروف متقطعة..."}
            className={cn(
              "w-full bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 font-bold dark:text-slate-100 transition-all outline-none focus:ring-2 focus:ring-blue-500/20",
              compact ? "py-1.5 pr-8 pl-2 text-[10px] h-[38px]" : "py-3 pr-11 pl-4 rounded-2xl text-sm"
            )}
          />
          <Search className={cn("absolute right-2.5 text-gray-400", compact ? "top-2.5" : "top-3.5")} size={compact ? 14 : 20} />

          {isOpen && query.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-[var(--app-surface)] border border-blue-600 shadow-2xl overflow-hidden rounded-xl animate-in fade-in slide-in-from-top-1">
              {isLoading ? (
                <div className="p-3 text-center text-xs text-gray-400 font-bold">جاري البحث...</div>
              ) : filteredCustomers.length > 0 ? (
                <ul className="max-h-64 overflow-y-auto custom-scrollbar">
                  {filteredCustomers.map((customer: any, idx: number) => {
                    const isHighlighted = idx === highlightedIndex;
                    return (
                      <li
                        key={customer.id}
                        onClick={() => { handleSelect(customer); }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={cn(
                          "px-3 py-2 cursor-pointer border-b dark:border-slate-800 last:border-none flex items-center justify-between group transition-colors",
                          isHighlighted ? "bg-blue-600 text-white" : "hover:bg-blue-600 hover:text-white"
                        )}
                      >
                        <div className="flex flex-col">
                          <p className="text-xs font-bold">{customer.name}</p>
                          {customer.phone && (
                            <p className={cn("text-[10px] font-mono", isHighlighted ? "text-blue-100" : "text-gray-400")}>
                              {customer.phone}
                            </p>
                          )}
                        </div>
                        <Check size={14} className={cn("opacity-0", isHighlighted && "opacity-100")} />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-3 text-center text-xs text-gray-400 font-bold">لا توجد نتائج مطابقة لـ &quot;{query}&quot;</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSelector;
