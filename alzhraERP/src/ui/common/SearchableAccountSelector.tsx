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
  placeholder = "ابحث برقم أو اسم الحساب...",
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

  useEffect(() => {
    if (selectedAccount && !isOpen) {
      setSearch(`${selectedAccount.code} - ${selectedAccount.name}`);
    } else if (!selectedAccount && !isOpen) {
      setSearch('');
    }
  }, [selectedAccount, isOpen]);

  const filteredAccounts = useMemo(() => {
    const s = search.toLowerCase();
    // If search is exactly the selected item's text, show all
    const isSearchSelected = selectedAccount && s === `${selectedAccount.code} - ${selectedAccount.name}`.toLowerCase();
    if (!search.trim() || isSearchSelected) return accounts;
    
    return accounts.filter(a => 
      a.name.toLowerCase().includes(s) || 
      a.code.toLowerCase().includes(s)
    );
  }, [accounts, search, selectedAccount]);

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
      <div className="relative group flex items-center">
        <Search size={16} className="absolute right-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          value={search}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
             setSearch(e.target.value);
             setIsOpen(true);
             if (selectedId) {
               onSelect(''); // Clear selection on type
             }
          }}
          placeholder={placeholder}
          className={cn(
            "w-full bg-white dark:bg-slate-900 border py-2.5 pr-11 pl-10 text-sm font-bold outline-none transition-all font-cairo rounded-xl",
            isOpen ? "border-blue-500 ring-4 ring-blue-500/10 shadow-lg" : "border-gray-200 dark:border-slate-800 focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/10"
          )}
        />
        {selectedId && !isOpen && (
           <button 
             onClick={(e) => {
               e.stopPropagation();
               onSelect('');
               setSearch('');
               setIsOpen(true);
             }}
             className="absolute left-10 text-gray-400 hover:text-red-500 transition-colors p-1"
           >
             <X size={14} />
           </button>
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="absolute left-3 text-gray-400 hover:text-blue-500 p-1 transition-colors"
        >
          <ChevronDown size={16} className={cn("transition-transform duration-300", isOpen && "rotate-180")} />
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
            className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl bg-opacity-95 dark:bg-opacity-95 flex flex-col max-h-[400px]"
          >
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
                            setSearch(`${acc.code} - ${acc.name}`);
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
               <span className="text-[10px] font-bold text-gray-400">إجمالي الحسابات: {filteredAccounts.length} من {accounts.length}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchableAccountSelector;
