import { useState, useMemo } from 'react';

export interface UseTableSearchOptions {
    data: unknown[];
}

export interface UseTableSearchReturn {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filteredData: unknown[];
}

export const useTableSearch = ({
    data
}: UseTableSearchOptions): UseTableSearchReturn => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter data based on search term
    const filteredData = useMemo(() => {
        if (!searchTerm) return data;

        const term = searchTerm.toLowerCase();
        return data.filter(item =>
            Object.values(item as Record<string, unknown>).some(val =>
                String(val).toLowerCase().includes(term)
            )
        );
    }, [data, searchTerm]);

    return {
        searchTerm,
        setSearchTerm,
        filteredData
    };
};
