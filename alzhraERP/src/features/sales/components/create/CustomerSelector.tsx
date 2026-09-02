import React, { useState, useEffect, useRef } from 'react';
import { Search, User, X, Check, Phone, ArrowLeftRight } from 'lucide-react';
import { useParties } from '../../../parties/hooks';
import { useSalesStore } from '../../store';
import { cn } from '../../../../core/utils';

interface Props {
  compact?: boolean;
}

const CustomerSelector: React.FC<Props> = ({ compact = false }) => {
  const { selectedCustomer, setCustomer } = useSalesStore();
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (customer: { id: string; name: string; phone?: string | null }) => {
    setCustomer({
      id: customer.id,
      name: customer.name,
      ...(customer.phone ? { phone: customer.phone } : {}),
    });
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
      setHighlightedIndex(prev => (prev < filteredCustomers.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
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
        <div
          className={cn(
            'flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/80 shadow-xs transition-all dark:border-blue-800/80 dark:bg-blue-950/40',
            compact ? 'h-[38px] p-1.5' : 'p-2.5'
          )}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs',
                compact ? 'h-6 w-6' : 'h-9 w-9'
              )}
            >
              <User size={compact ? 13 : 18} />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <p
                  className={cn(
                    'truncate font-black text-slate-900 dark:text-slate-100',
                    compact ? 'text-[11px]' : 'text-xs'
                  )}
                >
                  {selectedCustomer.name}
                </p>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  عميل
                </span>
              </div>
              {!compact && selectedCustomer.phone && (
                <div className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  <Phone size={10} className="text-slate-400" />
                  <span dir="ltr">{selectedCustomer.phone}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setCustomer(null);
                setIsOpen(true);
              }}
              className="flex items-center gap-1 rounded-lg bg-blue-100/60 px-2 py-1 text-[10px] font-bold text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-800"
              title="تغيير العميل"
            >
              <ArrowLeftRight size={11} />
              <span className="hidden sm:inline">تغيير</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomer(null);
              }}
              className="rounded-lg p-1 text-slate-400 transition-all hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/40"
              title="إلغاء العميل"
            >
              <X size={compact ? 14 : 16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={compact ? 'بحث عميل...' : 'ابحث بالاسم، الهاتف، أو السجل المدني للعميل...'}
            className={cn(
              'w-full rounded-xl border border-slate-300 bg-white font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
              compact
                ? 'h-[38px] py-1.5 pl-2 pr-8 text-[10px]'
                : 'py-2.5 pl-4 pr-10 text-xs shadow-xs'
            )}
          />
          <Search
            className={cn('absolute right-3 text-slate-400', compact ? 'top-2.5' : 'top-3')}
            size={compact ? 14 : 17}
          />

          {isOpen && query.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-1 absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              {isLoading ? (
                <div className="p-3 text-center text-xs font-bold text-slate-400">
                  جاري البحث في قاعدة العملاء...
                </div>
              ) : filteredCustomers && filteredCustomers.length > 0 ? (
                <ul className="custom-scrollbar max-h-64 overflow-y-auto">
                  {filteredCustomers.map(
                    (
                      customer: { id: string; name: string; phone?: string | null },
                      idx: number
                    ) => {
                      const isHighlighted = idx === highlightedIndex;
                      return (
                        <li
                          key={customer.id}
                          onClick={() => {
                            handleSelect(customer);
                          }}
                          onMouseEnter={() => {
                            setHighlightedIndex(idx);
                          }}
                          className={cn(
                            'group flex cursor-pointer items-center justify-between border-b border-slate-100 px-3.5 py-2.5 transition-colors last:border-none dark:border-slate-800/80',
                            isHighlighted
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                          )}
                        >
                          <div className="flex flex-col">
                            <p className="text-xs font-bold">{customer.name}</p>
                            {customer.phone && (
                              <p
                                dir="ltr"
                                className={cn(
                                  'mt-0.5 font-mono text-[10px]',
                                  isHighlighted ? 'text-blue-100' : 'text-slate-400'
                                )}
                              >
                                {customer.phone}
                              </p>
                            )}
                          </div>
                          <Check
                            size={14}
                            className={cn('opacity-0', isHighlighted && 'opacity-100')}
                          />
                        </li>
                      );
                    }
                  )}
                </ul>
              ) : (
                <div className="p-3 text-center text-xs font-bold text-slate-400">
                  لا توجد نتائج مطابقة لـ &quot;{query}&quot;
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSelector;
