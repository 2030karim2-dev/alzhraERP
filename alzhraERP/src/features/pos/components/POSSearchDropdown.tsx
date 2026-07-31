import React, { useRef, useEffect } from 'react';
import { cn } from '../../../core/utils';
import { POSSearchResult, SortMode } from '../hooks/usePOSSearch';
import { SearchSortToolbar } from './search/SearchSortToolbar';
import { SearchResultCard } from './search/SearchResultCard';
import { SearchLoadingState, SearchPopularHeader, SearchEmptyState, SearchFooterStats } from './search/SearchStates';

export interface POSSearchDropdownProps {
    open: boolean;
    onClose: () => void;
    results: POSSearchResult[];
    loading?: boolean;
    query: string;
    isShowingPopular?: boolean;
    selectedIndex: number;
    sortMode: SortMode;
    onSortChange: (mode: SortMode) => void;
    onSelect: (result: POSSearchResult) => void;
    onViewDetails?: (result: POSSearchResult) => void;
    triggerRef?: React.RefObject<HTMLElement | null>;
    total?: number;
    searchTimeMs?: number;
}

const POSSearchDropdown: React.FC<POSSearchDropdownProps> = ({
    open,
    onClose,
    results,
    loading = false,
    query,
    isShowingPopular = false,
    selectedIndex,
    sortMode,
    onSortChange,
    onSelect,
    onViewDetails,
    triggerRef,
    total = 0,
    searchTimeMs = 0,
}) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // ── Scroll selected item into view ─────────────────────────────
    useEffect(() => {
        if (selectedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('[data-result-item]');
            if (items[selectedIndex]) {
                items[selectedIndex].scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth',
                });
            }
        }
    }, [selectedIndex]);

    // ── Click outside handler ──────────────────────────────────────
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                !triggerRef?.current?.contains(target)
            ) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onClose, triggerRef]);

    if (!open) return null;

    return (
        <div
            ref={dropdownRef}
            className={cn(
                'absolute top-full left-0 right-0 mt-1.5 z-50',
                'bg-white dark:bg-slate-900 rounded-2xl',
                'shadow-2xl shadow-slate-900/10 dark:shadow-black/50',
                'border-2 border-slate-200 dark:border-slate-700',
                'overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200',
                'max-h-[70vh] flex flex-col'
            )}
        >
            <SearchSortToolbar sortMode={sortMode} onSortChange={onSortChange} />

            <div
                ref={listRef}
                className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800"
            >
                {loading && <SearchLoadingState />}

                {!loading && isShowingPopular && results.length > 0 && <SearchPopularHeader />}

                {!loading && results.length === 0 && query && <SearchEmptyState query={query} />}

                {!loading &&
                    results.map((result, idx) => (
                        <div key={result.id} data-result-item>
                            <SearchResultCard
                                result={result}
                                isSelected={idx === selectedIndex}
                                onSelect={onSelect}
                                onViewDetails={onViewDetails}
                                onMouseEnter={() => { }}
                            />
                        </div>
                    ))}
            </div>

            {!loading && results.length > 0 && (
                <SearchFooterStats resultCount={results.length} total={total} searchTimeMs={searchTimeMs} />
            )}
        </div>
    );
};

export default POSSearchDropdown;
