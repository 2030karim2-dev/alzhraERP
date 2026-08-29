import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, User, X, Check, ChevronsUpDown, Phone } from 'lucide-react';
import { Party, PartyType } from '../types';
import { filterPartiesSmart } from '../../../core/utils/partySearch';
import { cn } from '../../../core/utils';

interface SmartPartySelectProps {
  partyType: PartyType;
  parties?: Party[];
  selectedPartyId: string;
  onSelectPartyId: (id: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SmartPartySelect: React.FC<SmartPartySelectProps> = ({
  partyType,
  parties = [],
  selectedPartyId,
  onSelectPartyId,
  placeholder,
  className,
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedParty = useMemo(
    () => parties.find((p) => p.id === selectedPartyId),
    [parties, selectedPartyId]
  );

  const defaultPlaceholder =
    placeholder ||
    (partyType === 'customer'
      ? 'ابحث بالاسم أو الهاتف أو حروف متقطعة...'
      : 'ابحث عن المورد بالاسم أو الهاتف...');

  const filteredParties = useMemo(() => {
    return filterPartiesSmart(parties, query);
  }, [parties, query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight on query change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (partyId: string) => {
    onSelectPartyId(partyId);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectPartyId('');
    setQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredParties.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredParties[highlightedIndex]) {
        handleSelect(filteredParties[highlightedIndex].id);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      <div
        className={cn(
          'relative flex items-center bg-slate-50 dark:bg-slate-800/80 border rounded-lg transition-all',
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-800'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        )}
      >
        <div className="flex items-center justify-center pl-2 pr-3 text-slate-400">
          <Search size={16} />
        </div>

        <input
          ref={inputRef}
          type="text"
          autoFocus={autoFocus}
          value={isOpen ? query : selectedParty?.name || query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedParty ? selectedParty.name : defaultPlaceholder}
          className="w-full bg-transparent py-2 pl-8 pr-1 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
        />

        <div className="flex items-center gap-1 pl-2 pr-1">
          {(selectedPartyId || query) && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
              title="مسح الاختيار"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen((prev) => !prev);
              if (!isOpen && inputRef.current) inputRef.current.focus();
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          >
            <ChevronsUpDown size={15} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-[var(--app-surface)] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
          {filteredParties.length === 0 ? (
            <div className="p-4 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
              لا توجد نتائج مطابقة لـ &quot;{query}&quot;
            </div>
          ) : (
            <ul
              ref={listRef}
              className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar"
            >
              {filteredParties.map((party, index) => {
                const isSelected = party.id === selectedPartyId;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={party.id}
                    onClick={() => handleSelect(party.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'px-3 py-2.5 cursor-pointer flex items-center justify-between transition-colors gap-2',
                      isHighlighted
                        ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50',
                      isSelected && 'font-black bg-blue-100/50 dark:bg-blue-900/60'
                    )}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black',
                          partyType === 'customer'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                        )}
                      >
                        <User size={14} />
                      </div>

                      <div className="flex flex-col truncate">
                        <span className="text-sm font-bold truncate">{party.name}</span>
                        {party.phone && (
                          <span className="text-[11px] text-slate-400 dark:text-slate-400 flex items-center gap-1 font-mono">
                            <Phone size={10} />
                            {party.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {party.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                          {party.category}
                        </span>
                      )}

                      {isSelected && (
                        <Check size={16} className="text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartPartySelect;
