import { useState, useMemo } from 'react';
import { useSalesReturns } from '../../sales/hooks/useSalesReturns';
import { usePurchaseReturns } from '../../purchases/hooks/usePurchaseReturns';
import { exportReturnsToExcel } from '../../../core/utils/returnsExcelExporter';

export type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom';
export type ReturnsType = 'all' | 'sales' | 'purchase';
export type ReportView = 'overview' | 'sales' | 'purchase';

export interface FilterState {
    dateRange: DateRange;
    type: ReturnsType;
    status: string;
    reason: string;
    startDate?: string;
    endDate?: string;
}

export const useReturnsReport = () => {
    const [filters, setFilters] = useState<FilterState>({
        dateRange: 'month',
        type: 'all',
        status: 'all',
        reason: 'all'
    });
    const [reportView, setReportView] = useState<ReportView>('overview');

    // Calculate date range
    const dateRange = useMemo(() => {
        const now = new Date();
        let startDate: string;
        let endDate: string = now.toISOString().split('T')[0];

        switch (filters.dateRange) {
            case 'today':
                startDate = endDate;
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
                break;
            case 'year':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
                break;
            case 'custom':
                startDate = filters.startDate || endDate;
                endDate = filters.endDate || endDate;
                break;
            default:
                startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
        }

        return { startDate, endDate };
    }, [filters.dateRange, filters.startDate, filters.endDate]);

    // Fetch data
    const { data: salesReturns, isLoading: salesLoading } = useSalesReturns({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
    });

    const { data: purchaseReturns, isLoading: purchaseLoading } = usePurchaseReturns();

    // Filter returns based on status and reason
    const filteredSalesReturns = useMemo(() => {
        if (!salesReturns) return [];
        return salesReturns.filter((r: any) => {
            if (filters.status !== 'all' && r.status !== filters.status) return false;
            if (filters.reason !== 'all' && r.return_reason !== filters.reason) return false;
            return true;
        });
    }, [salesReturns, filters.status, filters.reason]);

    const filteredPurchaseReturns = useMemo(() => {
        if (!purchaseReturns) return [];
        return purchaseReturns.filter((r: any) => {
            if (filters.status !== 'all' && r.status !== filters.status) return false;
            if (filters.reason !== 'all' && r.return_reason !== filters.reason) return false;
            return true;
        });
    }, [purchaseReturns, filters.status, filters.reason]);

    // Calculate statistics
    const stats = useMemo(() => {
        const salesTotal = filteredSalesReturns.reduce((sum: number, r: any) => sum + (Number(r.total_amount) || 0), 0);
        const purchaseTotal = filteredPurchaseReturns.reduce((sum: number, r: any) => sum + (Number(r.total_amount) || 0), 0);

        return {
            salesCount: filteredSalesReturns.length,
            salesTotal,
            salesAvg: filteredSalesReturns.length > 0 ? salesTotal / filteredSalesReturns.length : 0,
            purchaseCount: filteredPurchaseReturns.length,
            purchaseTotal,
            purchaseAvg: filteredPurchaseReturns.length > 0 ? purchaseTotal / filteredPurchaseReturns.length : 0,
            totalCount: filteredSalesReturns.length + filteredPurchaseReturns.length,
            totalAmount: salesTotal + purchaseTotal
        };
    }, [filteredSalesReturns, filteredPurchaseReturns]);

    // Reason distribution for pie chart
    const reasonDistribution = useMemo(() => {
        const reasonMap: Record<string, number> = {};
        const returns = filters.type === 'sales' ? filteredSalesReturns :
            filters.type === 'purchase' ? filteredPurchaseReturns :
                [...filteredSalesReturns, ...filteredPurchaseReturns];

        returns.forEach((r: any) => {
            const reason = r.return_reason || 'أخرى';
            reasonMap[reason] = (reasonMap[reason] || 0) + (Number(r.total_amount) || 0);
        });

        return Object.entries(reasonMap).map(([name, value]) => ({ name, value }));
    }, [filteredSalesReturns, filteredPurchaseReturns, filters.type]);

    // Monthly trends for line chart
    const monthlyTrends = useMemo(() => {
        const monthMap: Record<string, { sales: number; purchase: number }> = {};
        const now = new Date();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthMap[key] = { sales: 0, purchase: 0 };
        }

        // Aggregate sales returns
        filteredSalesReturns.forEach((r: any) => {
            const date = new Date(r.issue_date || r.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthMap[key]) {
                monthMap[key].sales += Number(r.total_amount) || 0;
            }
        });

        // Aggregate purchase returns
        filteredPurchaseReturns.forEach((r: any) => {
            const date = new Date(r.issue_date || r.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthMap[key]) {
                monthMap[key].purchase += Number(r.total_amount) || 0;
            }
        });

        return Object.entries(monthMap).map(([month, data]) => ({
            month,
            ...data
        }));
    }, [filteredSalesReturns, filteredPurchaseReturns]);

    // Top parties
    const topParties = useMemo(() => {
        const partyMap: Record<string, { name: string; count: number; total: number }> = {};
        const returns = filters.type === 'sales' ? filteredSalesReturns :
            filters.type === 'purchase' ? filteredPurchaseReturns :
                [...filteredSalesReturns, ...filteredPurchaseReturns];

        returns.forEach((r: any) => {
            const partyName = r.party?.name || 'غير معروف';
            if (!partyMap[partyName]) {
                partyMap[partyName] = { name: partyName, count: 0, total: 0 };
            }
            partyMap[partyName].count += 1;
            partyMap[partyName].total += Number(r.total_amount) || 0;
        });

        return Object.values(partyMap)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [filteredSalesReturns, filteredPurchaseReturns, filters.type]);

    // Export to Excel
    const handleExportExcel = () => {
        const returns = filters.type === 'sales' ? filteredSalesReturns :
            filters.type === 'purchase' ? filteredPurchaseReturns :
                [...filteredSalesReturns, ...filteredPurchaseReturns];

        const excelData = {
            companyName: 'Al-Zahra Smart',
            returns: returns.map((r: any) => ({
                invoiceNumber: r.invoice_number,
                issueDate: r.issue_date,
                customerName: r.party?.name,
                referenceInvoice: r.reference_invoice?.invoice_number,
                returnReason: r.return_reason,
                items: r.invoice_items?.length || 0,
                totalAmount: Number(r.total_amount) || 0,
                status: r.status,
                notes: r.notes
            })),
            summary: {
                // @ts-ignore
                totalReturns: stats.totalAmount,
                // @ts-ignore
                totalAmount: stats.totalAmount,
                // @ts-ignore
                averageAmount: stats.totalCount > 0 ? stats.totalAmount / stats.totalCount : 0,
                // @ts-ignore
                count: stats.totalCount
            },
            type: filters.type === 'all' ? 'sales' : filters.type
        };

        exportReturnsToExcel(excelData);
    };

    return {
        filters,
        setFilters,
        reportView,
        setReportView,
        salesLoading,
        purchaseLoading,
        filteredSalesReturns,
        filteredPurchaseReturns,
        stats,
        reasonDistribution,
        monthlyTrends,
        topParties,
        handleExportExcel
    };
};
