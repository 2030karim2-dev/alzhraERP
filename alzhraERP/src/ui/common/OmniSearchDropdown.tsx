/**
 * OmniSearchDropdown — Unified search dropdown for Alzhra ERP.
 * Displays categorized results from omniSearchService.
 * Triggered by Ctrl+K or clicking the global search input.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, User, Truck, Receipt, FileText, Loader2 } from 'lucide-react';
import { cn } from '../../core/utils';
import { searchAll, type OmniSearchResponse } from '../../core/services/omniSearchService';
import { useAuthStore } from '../../features/auth/store';
import { useDebounce } from '../../lib/hooks/useDebounce';
import { useTranslation } from '../../lib/hooks/useTranslation';

interface OmniSearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  package: <Package size={14} />, user: <User size={14} />,
  truck: <Truck size={14} />, receipt: <Receipt size={14} />,
  'file-text': <FileText size={14} />,
};

const typeLabels: Record<string, string> = {
  product: 'منتجات', customer: 'عملاء', supplier: 'موردين',
  invoice: 'فواتير', journal: 'قيود',
};

const OmniSearchDropdown: React.FC<OmniSearchDropdownProps> = ({
  isOpen, onClose, initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<OmniSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { dir } = useTranslation();
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    if (isOpen && inputRef.current) { inputRef.current.focus(); setQuery(initialQuery); }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    const companyId = user?.company_id;
    if (!isOpen || !companyId || debouncedQuery.length < 2) { setResults(null); return; }
    setIsLoading(true);
    searchAll(companyId, debouncedQuery).then(setResults).finally(() => { setIsLoading(false); });
  }, [debouncedQuery, isOpen, user?.company_id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const all = results?.all || [];
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(p => Math.min(p + 1, all.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(p => Math.max(p - 1, -1)); }
    else if (e.key === 'Enter' && selectedIdx >= 0 && all[selectedIdx]) {
      e.preventDefault(); navigate(all[selectedIdx].path); onClose();
    } else if (e.key === 'Escape') { onClose(); }
  }, [results, selectedIdx, navigate, onClose]);

  useEffect(() => { setSelectedIdx(-1); }, [results]);
  useEffect(() => {
    const h = (e: MouseEvent): void => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose(); };
    if (isOpen) document.addEventListener('mousedown', h);
    return () => { document.removeEventListener('mousedown', h); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const all = results?.all || [];
  const showEmpty = !isLoading && debouncedQuery.length >= 2 && results && results.total === 0;

  return (
    <div className="fixed inset-0 z-[250] flex items-start justify-center pt-20 px-4">
      <div className="fixed inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={onClose} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="البحث الشامل"
        className="relative w-full max-w-xl bg-[var(--app-surface)] rounded-2xl shadow-2xl border border-[var(--app-border)] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Search Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--app-border)]">
          <Search size={18} className="text-[var(--app-text-secondary)] flex-shrink-0" />
          <input ref={inputRef} type="text" value={query}
            onChange={e => { setQuery(e.target.value); }} onKeyDown={handleKeyDown}
            placeholder="ابحث عن منتج، عميل، فاتورة..." aria-label="البحث الشامل"
            className="flex-1 bg-transparent text-sm font-medium text-[var(--app-text)] placeholder:text-[var(--app-text-secondary)] outline-none"
            autoComplete="off" spellCheck={false} dir={dir} />
          {isLoading && <Loader2 size={16} className="animate-spin text-blue-500 flex-shrink-0" />}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded bg-[var(--app-bg)] border border-[var(--app-border)] text-[var(--app-text-secondary)]">ESC</kbd>
        </div>
        {/* Results */}
        <div className="max-h-[60dvh] overflow-y-auto custom-scrollbar">
          {isLoading && <div className="flex items-center justify-center py-8 text-sm text-[var(--app-text-secondary)]"><Loader2 size={18} className="animate-spin mr-2" />جاري البحث...</div>}
          {showEmpty && <div className="flex flex-col items-center justify-center py-10 text-[var(--app-text-secondary)]"><Search size={36} className="opacity-30 mb-3" /><p className="text-sm font-bold">لا توجد نتائج</p><p className="text-xs mt-1 opacity-70">جرب كلمة بحث مختلفة</p></div>}
          {results && results.total > 0 && (
            <div>
              {(['product','customer','supplier','invoice','journal'] as const).map(type => {
                const items = results[`${type}s` as keyof typeof results] as typeof all;
                if (!items || !Array.isArray(items) || items.length === 0) return null;
                return (
                  <div key={type}>
                    <div className="px-4 py-2 text-[10px] font-black text-[var(--app-text-secondary)] uppercase tracking-widest bg-[var(--app-bg)]/50">{typeLabels[type]}</div>
                    {items.slice(0,5).map(item => {
                      const gi = all.indexOf(item);
                      return (
                        <button key={item.id}
                          onClick={() => { navigate(item.path); onClose(); }}
                          onMouseEnter={() => { setSelectedIdx(gi); }}
                          className={cn('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors', selectedIdx===gi ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-[var(--app-surface-hover)]')}>
                          <div className="w-8 h-8 rounded-lg bg-[var(--app-bg)] flex items-center justify-center text-[var(--app-text-secondary)] flex-shrink-0">{iconMap[item.icon]}</div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-bold text-[var(--app-text)] truncate">{item.title}</p><p className="text-[10px] text-[var(--app-text-secondary)] truncate">{item.subtitle}</p></div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              <div className="border-t border-[var(--app-border)] px-4 py-2 flex items-center gap-4 text-[10px] font-semibold text-[var(--app-text-secondary)]">
                <span>↑↓ تنقل</span><span>↵ فتح</span><span>ESC إغلاق</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OmniSearchDropdown;

