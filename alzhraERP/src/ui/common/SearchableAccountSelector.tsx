import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '../../core/utils';
import type { Account } from '../../features/accounting/types/models';

interface SearchableAccountSelectorProps {
  accounts: Account[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  placeholder?: string;
  className?: string;
  /** فلترة الحسابات إلى القابلة للترحيل فقط (allow_posting !== false) — يُستخدم عند ترحيل القيود */
  postableOnly?: boolean;
}

const SearchableAccountSelector: React.FC<SearchableAccountSelectorProps> = ({
  accounts,
  selectedId,
  onSelect,
  placeholder = 'ابحث برقم أو اسم الحساب...',
  className,
  postableOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const selectedAccount = useMemo(
    () => accounts.find(a => a.id === selectedId),
    [accounts, selectedId]
  );

  // حسابات قابلة للترحيل فقط عند الطلب (حسابات الأبوين / allow_posting=false تُستبعد)
  const selectableAccounts = useMemo(
    () => (postableOnly ? (accounts ?? []).filter(a => a.allow_posting !== false) : accounts),
    [accounts, postableOnly]
  );

  useEffect(() => {
    if (selectedAccount && !isOpen) {
      setSearch(`${selectedAccount.code} - ${selectedAccount.name}`);
    } else if (!selectedAccount && !isOpen) {
      setSearch('');
    }
  }, [selectedAccount, isOpen]);

  const filteredAccounts = useMemo(() => {
    const s = search.toLowerCase();
    // If search is exactly the selected item's text, show all (postable) accounts
    const isSearchSelected =
      selectedAccount && s === `${selectedAccount.code} - ${selectedAccount.name}`.toLowerCase();
    if (!search.trim() || isSearchSelected) return selectableAccounts;

    return selectableAccounts.filter(
      a => a.name.toLowerCase().includes(s) || a.code.toLowerCase().includes(s)
    );
  }, [selectableAccounts, search, selectedAccount]);

  const rowVirtualizer = useVirtualizer({
    count: filteredAccounts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45,
    overscan: 5,
  });

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={cn('relative z-30', className)} ref={containerRef}>
      <div className="group relative flex items-center">
        <Search
          size={16}
          className="absolute right-4 text-gray-400 transition-colors group-focus-within:text-blue-500"
        />
        <input
          type="text"
          value={search}
          onFocus={() => {
            setIsOpen(true);
          }}
          onChange={e => {
            setSearch(e.target.value);
            setIsOpen(true);
            if (selectedId) {
              onSelect(''); // Clear selection on type
            }
          }}
          placeholder={placeholder}
          className={cn(
            'font-cairo w-full rounded-xl border bg-[var(--app-surface)] py-2.5 pl-10 pr-11 text-sm font-bold outline-none transition-all',
            isOpen
              ? 'ring-[var(--accent)]/10 border-[var(--accent)] shadow-lg ring-4'
              : 'focus:border-[var(--accent)]/30 focus:ring-[var(--accent)]/10 border-[var(--app-border)] focus:ring-4'
          )}
        />
        {selectedId && !isOpen && (
          <button
            onClick={e => {
              e.stopPropagation();
              onSelect('');
              setSearch('');
              setIsOpen(true);
            }}
            className="absolute left-10 p-1 text-gray-400 transition-colors hover:text-red-500"
          >
            <X size={14} />
          </button>
        )}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
          }}
          className="absolute left-3 p-1 text-gray-400 transition-colors hover:text-blue-500"
        >
          <ChevronDown
            size={16}
            className={cn('transition-transform duration-300', isOpen && 'rotate-180')}
          />
        </button>
      </div>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-full mt-2 flex max-h-[400px] flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl backdrop-blur-xl"
          >
            {/* Accounts List (Virtualized) */}
            <div
              ref={parentRef}
              className="custom-scrollbar no-print min-h-[100px] flex-1 overflow-y-auto"
            >
              {filteredAccounts.length === 0 ? (
                <div className="space-y-2 p-10 text-center">
                  <div className="flex justify-center text-gray-300 dark:text-slate-700">
                    <Building2 size={40} />
                  </div>
                  <p className="text-xs font-bold text-gray-400">لا توجد حسابات مطابقة</p>
                </div>
              ) : (
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map(virtualRow => {
                    const acc = filteredAccounts[virtualRow.index];
                    const isSelected = selectedId === acc.id;
                    return (
                      <div
                        key={acc.id}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        className="absolute left-0 top-0 w-full"
                        style={{
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(acc.id);
                            setIsOpen(false);
                            setSearch(`${acc.code} - ${acc.name}`);
                          }}
                          className={cn(
                            'font-cairo flex w-full items-center justify-between gap-4 px-4 py-2.5 text-right outline-none transition-all',
                            isSelected
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                          )}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span
                              className={cn(
                                'rounded-md border px-2 py-0.5 font-mono text-[10px] font-black',
                                isSelected
                                  ? 'border-blue-200 bg-blue-100 dark:border-blue-800 dark:bg-blue-900/50'
                                  : 'border-gray-200 bg-gray-100 text-gray-500 dark:border-slate-700 dark:bg-slate-800'
                              )}
                            >
                              {acc.code}
                            </span>
                            <span className="truncate text-xs font-bold">{acc.name}</span>
                          </div>
                          {isSelected && (
                            <Check size={14} className="animate-in zoom-in shrink-0 duration-300" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50/50 p-2 text-center dark:border-slate-800 dark:bg-slate-800/20">
              <span className="text-[10px] font-bold text-gray-400">
                إجمالي الحسابات: {filteredAccounts.length} من {selectableAccounts.length}
                {postableOnly ? ' (قابلة للترحيل فقط)' : ''}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchableAccountSelector;
