import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '../../core/utils';
import { Account } from '../../features/accounting/types/models';

interface SearchableAccountSelectorProps {
  accounts: Account[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchableAccountSelector: React.FC<SearchableAccountSelectorProps> = ({
  accounts,
  selectedId,
  onSelect,
  placeholder = "اختر حساباً...",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const selectedAccount = useMemo(() => 
    accounts.find(a => a.id === selectedId),
    [accounts, selectedId]
  );

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts;
    const s = search.toLowerCase();
    return accounts.filter(a => 
      a.name.toLowerCase().includes(s) || 
      a.code.toLowerCase().includes(s)
    );
  }, [accounts, search]);

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative z-30", className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 font-cairo",
          isOpen 
            ? "border-blue-500 ring-4 ring-blue-500/10 bg-white dark:bg-slate-900 shadow-lg" 
            : "border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900"
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={cn(
            "p-1.5 rounded-lg shrink-0",
            selectedAccount ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-gray-200 text-gray-400 dark:bg-slate-800"
          )}>
            <Building2 size={16} />
          </div>
          <div className="flex flex-col items-start truncate overflow-hidden">
            {selectedAccount ? (
              <>
                <span className="text-xs font-black dark:text-blue-100 truncate">{selectedAccount.name}</span>
                <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-slate-400">{selectedAccount.code}</span>
              </>
            ) : (
              <span className="text-xs font-bold text-gray-400 dark:text-slate-500">{placeholder}</span>
            )}
          </div>
        </div>
        <ChevronDown 
          size={16} 
          className={cn("text-gray-400 transition-transform duration-300", isOpen && "rotate-180")} 
        />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl bg-opacity-95 dark:bg-opacity-95 flex flex-col max-h-[400px]"
          >
            {/* Search Input */}
            <div className="p-3 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-inherit z-10">
              <div className="relative group">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث برقم أو اسم الحساب..."
                  className="w-full bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-xl py-2 px-9 text-xs font-bold outline-none focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10 transition-all font-cairo"
                />
                {search && (
                  <button 
                    onClick={() => setSearch('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Accounts List (Virtualized) */}
            <div 
              ref={parentRef}
              className="flex-1 overflow-y-auto custom-scrollbar no-print min-h-[100px]"
            >
              {filteredAccounts.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <div className="text-gray-300 dark:text-slate-700 flex justify-center"><Building2 size={40} /></div>
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
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const acc = filteredAccounts[virtualRow.index];
                    const isSelected = selectedId === acc.id;
                    return (
                      <div
                        key={acc.id}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        className="absolute top-0 left-0 w-full"
                        style={{
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(acc.id);
                            setIsOpen(false);
                            setSearch('');
                          }}
                          className={cn(
                            "w-full flex items-center justify-between gap-4 px-4 py-2.5 transition-all outline-none text-right font-cairo",
                            isSelected 
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                              : "hover:bg-gray-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-slate-300"
                          )}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className={cn(
                              "text-[10px] font-mono font-black px-2 py-0.5 rounded-md border",
                              isSelected 
                                ? "bg-blue-100 border-blue-200 dark:bg-blue-900/50 dark:border-blue-800" 
                                : "bg-gray-100 border-gray-200 dark:bg-slate-800 dark:border-slate-700 text-gray-500"
                            )}>
                              {acc.code}
                            </span>
                            <span className="text-xs font-bold truncate">{acc.name}</span>
                          </div>
                          {isSelected && <Check size={14} className="shrink-0 animate-in zoom-in duration-300" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-2 bg-gray-50/50 dark:bg-slate-800/20 border-t border-gray-100 dark:border-slate-800 text-center">
               <span className="text-[10px] font-bold text-gray-400">إجمالي الحسابات: {accounts.length}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchableAccountSelector;
