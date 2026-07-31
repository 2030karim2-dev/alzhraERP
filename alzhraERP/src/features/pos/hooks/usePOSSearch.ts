import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { posSearchService, POSSearchResult, POSSearchFilters } from '../services/searchService';

// ── Re-exports ────────────────────────────────────────────────────
export type { POSSearchResult } from '../services/searchService';

// ── Types ──────────────────────────────────────────────────────────

export type SortMode = 'relevance' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc' | 'name' | 'popular';

export interface UsePOSSearchOptions {
    /** Debounce delay in ms - default 200ms */
    debounceMs?: number;
    /** Min characters before triggering search - default 1 */
    minChars?: number;
    /** Max results to return - default 20 */
    limit?: number;
    /** Filters applied to search */
    filters?: POSSearchFilters;
    /** Default sort mode */
    defaultSort?: SortMode;
}

// ── Hook ───────────────────────────────────────────────────────────

/**
 * POS Smart Search Hook
 * Provides debounced, instant search with popularity scoring,
 * spell correction, and comprehensive autocomplete.
 */
export function usePOSSearch(options: UsePOSSearchOptions = {}) {
    const {
        debounceMs = 200,
        minChars = 1,
        limit = 20,
        filters,
        defaultSort = 'relevance',
    } = options;

    const { user } = useAuthStore();
    const companyId = user?.company_id || '';

    // ── State ──────────────────────────────────────────────────────
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [sortMode, setSortMode] = useState<SortMode>(defaultSort);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suppressDropdownRef = useRef(false);

    // ── Debounce ───────────────────────────────────────────────────
    useEffect(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        if (query.length < minChars) {
            setDebouncedQuery('');
            setIsDropdownOpen(false);
            return;
        }

        debounceTimer.current = setTimeout(() => {
            setDebouncedQuery(query);
            if (suppressDropdownRef.current) {
                suppressDropdownRef.current = false;
            } else {
                setIsDropdownOpen(true);
            }
        }, debounceMs);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [query, minChars, debounceMs]);

    // ── Search Query ───────────────────────────────────────────────
    const searchQuery = useQuery({
        queryKey: ['pos_search', companyId, debouncedQuery, filters, limit],
        queryFn: () =>
            posSearchService.search(companyId, debouncedQuery, filters, limit),
        enabled: !!companyId && debouncedQuery.length >= minChars,
        staleTime: 15_000, // 15 seconds stale time
        gcTime: 60_000,    // 1 minute garbage collection
        placeholderData: (prev) => prev, // Keep previous data while loading
    });

    // Empty query search - popular products
    const popularQuery = useQuery({
        queryKey: ['pos_popular', companyId, limit],
        queryFn: () => posSearchService.getPopularProducts(companyId, limit),
        enabled: !!companyId && query.length < minChars,
        staleTime: 60_000,
        gcTime: 120_000,
    });

    // ── Computed ───────────────────────────────────────────────────
    const rawResults = searchQuery.data?.results ?? [];
    const popularResults = popularQuery.data ?? [];

    /**
     * Apply current sort mode to results.
     */
    const sortedResults = useMemo(() => {
        const results = query.length < minChars ? popularResults : rawResults;

        const sorted = [...results];
        switch (sortMode) {
            case 'relevance':
                sorted.sort((a, b) => b.score - a.score);
                break;
            case 'price_asc':
                sorted.sort((a, b) => a.selling_price - b.selling_price);
                break;
            case 'price_desc':
                sorted.sort((a, b) => b.selling_price - a.selling_price);
                break;
            case 'stock_asc':
                sorted.sort((a, b) => a.stock_quantity - b.stock_quantity);
                break;
            case 'stock_desc':
                sorted.sort((a, b) => b.stock_quantity - a.stock_quantity);
                break;
            case 'name':
                sorted.sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'));
                break;
            case 'popular':
                sorted.sort((a, b) => (b.sales_count ?? 0) - (a.sales_count ?? 0));
                break;
        }
        return sorted;
    }, [rawResults, popularResults, query, minChars, sortMode]);

    const isLoading = searchQuery.isFetching && debouncedQuery.length >= minChars;
    const hasResults = sortedResults.length > 0;
    const showDropdown = isDropdownOpen && (isLoading || hasResults || popularResults.length > 0);
    const isShowingPopular = query.length < minChars && popularResults.length > 0;

    // ── Handlers ───────────────────────────────────────────────────
    const handleQueryChange = useCallback((value: string) => {
        setQuery(value);
        setSelectedIndex(-1);
        if (!value.trim()) {
            setIsDropdownOpen(false);
        }
    }, []);

    const handleSelectResult = useCallback((result: POSSearchResult) => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
            debounceTimer.current = null;
        }
        suppressDropdownRef.current = true;
        setQuery(result.name_ar);
        setIsDropdownOpen(false);
        inputRef.current?.blur();
        return result;
    }, []);

    const handleClear = useCallback(() => {
        setQuery('');
        setDebouncedQuery('');
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.focus();
    }, []);

    const handleCloseDropdown = useCallback(() => {
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (!showDropdown) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                        prev < sortedResults.length - 1 ? prev + 1 : 0
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                        prev > 0 ? prev - 1 : sortedResults.length - 1
                    );
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < sortedResults.length) {
                        handleSelectResult(sortedResults[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    setIsDropdownOpen(false);
                    inputRef.current?.blur();
                    break;
            }
        },
        [showDropdown, sortedResults, selectedIndex, handleSelectResult]
    );

    const toggleSort = useCallback((mode: SortMode) => {
        setSortMode((prev) => (prev === mode ? 'relevance' : mode));
    }, []);

    // ── Return ─────────────────────────────────────────────────────
    return {
        // State
        query,
        debouncedQuery,
        results: sortedResults,
        searchResponse: searchQuery.data,
        isLoading,
        hasResults,
        isShowingPopular,
        isDropdownOpen,
        showDropdown,
        sortMode,
        selectedIndex,

        // Handlers
        setQuery: handleQueryChange,
        selectResult: handleSelectResult,
        clear: handleClear,
        closeDropdown: handleCloseDropdown,
        onKeyDown: handleKeyDown,
        setSortMode: toggleSort,

        // Refs
        inputRef,

        // Raw data
        rawResults,
        popularResults,
        total: searchQuery.data?.total ?? 0,
        popularSuggestions: searchQuery.data?.popular_suggestions ?? [],
        correctedQuery: searchQuery.data?.corrected_query,
        searchTimeMs: searchQuery.data?.search_time_ms ?? 0,

        // Cache control
        invalidateCache: () => posSearchService.invalidateCache(),
    };
}

export default usePOSSearch;
