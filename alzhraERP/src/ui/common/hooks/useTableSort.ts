import { useState, useMemo, useCallback } from 'react';

export interface UseTableSortOptions {
    data: unknown[];
}

export interface UseTableSortReturn {
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
    handleSort: (key: string) => void;
    sortedData: unknown[];
}

export const useTableSort = ({
    data
}: UseTableSortOptions): UseTableSortReturn => {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Handle sort
    const handleSort = useCallback((key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig?.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    }, [sortConfig]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortConfig) return data;

        return [...data].sort((a, b) => {
            const aVal = (a as Record<string, unknown>)[sortConfig.key];
            const bVal = (b as Record<string, unknown>)[sortConfig.key];

            // Handle undefined/null cases
            if (aVal === bVal) return 0;
            if (aVal === undefined || aVal === null) return sortConfig.direction === 'asc' ? 1 : -1;
            if (bVal === undefined || bVal === null) return sortConfig.direction === 'asc' ? -1 : 1;

            return sortConfig.direction === 'asc'
                ? (aVal > bVal ? 1 : -1)
                : (aVal < bVal ? 1 : -1);
        });
    }, [data, sortConfig]);

    return {
        sortConfig,
        handleSort,
        sortedData
    };
};
