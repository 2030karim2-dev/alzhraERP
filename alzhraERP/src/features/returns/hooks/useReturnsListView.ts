import { useState, useMemo } from 'react';
import { exportReturnsToExcel } from '../../../core/utils/returnsExcelExporter';

export type SortField = 'issue_date' | 'total_amount' | 'party_name' | 'invoice_number';
export type SortDirection = 'asc' | 'desc';

export const useReturnsListView = (returns: any[] | undefined, type: 'sales' | 'purchase', getFilteredAmount?: (returns: any[]) => number) => {
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
        returnReason: '',
    });
    const [sortField, setSortField] = useState<SortField>('issue_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const processedReturns = useMemo(() => {
        if (!returns) return [];

        let filtered = [...returns];

        // Apply amount filters
        if (filters.minAmount) {
            filtered = filtered.filter(r => (Number(r.total_amount) || 0) >= Number(filters.minAmount));
        }
        if (filters.maxAmount) {
            filtered = filtered.filter(r => (Number(r.total_amount) || 0) <= Number(filters.maxAmount));
        }

        // Apply search term if present
        if (localSearchTerm) {
            const lowerQuery = localSearchTerm.toLowerCase();
            filtered = filtered.filter(r => 
                (r.party?.name || '').toLowerCase().includes(lowerQuery) ||
                (r.invoice_number || '').toLowerCase().includes(lowerQuery) ||
                (r.return_reason || '').toLowerCase().includes(lowerQuery)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'issue_date':
                    comparison = new Date(a.issue_date || a.created_at).getTime() - new Date(b.issue_date || b.created_at).getTime();
                    break;
                case 'total_amount':
                    comparison = (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0);
                    break;
                case 'party_name':
                    comparison = (a.party?.name || '').localeCompare(b.party?.name || '');
                    break;
                case 'invoice_number':
                    comparison = (a.invoice_number || '').localeCompare(b.invoice_number || '');
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [returns, filters, sortField, sortDirection, localSearchTerm]);

    const totalAmount = useMemo(() => {
        if (getFilteredAmount) {
            return getFilteredAmount(processedReturns);
        }
        return processedReturns.reduce((sum, r) => {
            const amount = Number(r.total_amount) || 0;
            const rate = Number(r.exchange_rate) || 1;
            return sum + (amount * rate);
        }, 0);
    }, [processedReturns, getFilteredAmount]);

    const handleExportExcel = () => {
        if (!processedReturns.length) return;

        exportReturnsToExcel({
            companyName: 'Al-Zahra',
            returns: processedReturns.map((r: any) => ({
                invoiceNumber: r.invoice_number || '',
                issueDate: new Date(r.issue_date || r.created_at).toLocaleDateString('ar-SA'),
                customerName: type === 'sales' ? (r.party?.name || 'عميل نقدي') : '',
                supplierName: type === 'purchase' ? (r.party?.name || 'مورد نقدي') : '',
                referenceInvoice: '',
                returnReason: r.return_reason || '',
                items: r.invoice_items?.length || 0,
                totalAmount: (Number(r.total_amount) || 0) * (Number(r.exchange_rate) || 1),
                status: r.status || 'draft',
                notes: r.notes || '',
            })),
            summary: {
                totalReturns: totalAmount,
                totalAmount: totalAmount,
                averageAmount: processedReturns.length > 0 ? totalAmount / processedReturns.length : 0,
                count: processedReturns.length,
            },
            type,
        });
    };

    const clearFilters = () => {
        setFilters({
            status: '',
            startDate: '',
            endDate: '',
            minAmount: '',
            maxAmount: '',
            returnReason: '',
        });
        setLocalSearchTerm('');
    };

    const hasActiveFilters = Boolean(
        filters.status || filters.startDate || filters.endDate ||
        filters.minAmount || filters.maxAmount || filters.returnReason || localSearchTerm
    );

    return {
        localSearchTerm, setLocalSearchTerm,
        showFilters, setShowFilters,
        filters, setFilters,
        sortField, setSortField,
        sortDirection, setSortDirection,
        processedReturns,
        totalAmount,
        handleExportExcel,
        clearFilters,
        hasActiveFilters
    };
};
