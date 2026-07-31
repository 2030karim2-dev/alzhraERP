import { useState, useMemo, useEffect } from 'react';

export interface UseTablePaginationOptions {
    enablePagination?: boolean;
    pageSize?: number;
    data: unknown[];
}

export interface UseTablePaginationReturn {
    currentPage: number;
    itemsPerPage: number;
    totalPages: number;
    paginatedData: unknown[];
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    setItemsPerPage: React.Dispatch<React.SetStateAction<number>>;
}

export const useTablePagination = ({
    enablePagination = true,
    pageSize = 20,
    data
}: UseTablePaginationOptions): UseTablePaginationReturn => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(pageSize);

    // Update items per page when pageSize changes
    useEffect(() => {
        setItemsPerPage(pageSize);
    }, [pageSize]);

    // Reset page when data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [data.length]);

    // Calculate total pages
    const totalPages = useMemo(() => {
        return Math.ceil(data.length / itemsPerPage);
    }, [data.length, itemsPerPage]);

    // Get paginated data
    const paginatedData = useMemo(() => {
        if (!enablePagination) return data;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    }, [data, currentPage, itemsPerPage, enablePagination]);

    return {
        currentPage,
        itemsPerPage,
        totalPages,
        paginatedData,
        setCurrentPage,
        setItemsPerPage
    };
};
