import { useState, useMemo } from 'react';
import { exportReturnsToExcel } from '../../../core/utils/returnsExcelExporter';

export type SortField = 'issue_date' | 'total_amount' | 'party_name' | 'invoice_number';
export type SortDirection = 'asc' | 'desc';
export interface ReturnsListRow { id: string; party: { name: string | null } | null; invoice_number: string | null; return_reason: string | null; issue_date: string | null; created_at: string; total_amount: number | string | null; exchange_rate: number | string | null; status: string | null; notes: string | null; invoice_items: unknown[] | null; reference_invoice?: { invoice_number: string | null } | null; reference_invoice_id?: string | null; }
export interface ReturnsListFilters { status: string; startDate: string; endDate: string; minAmount: string; maxAmount: string; returnReason: string; }
interface ProcessOptions { returns: ReturnsListRow[] | undefined; filters: ReturnsListFilters; searchTerm: string; sortField: SortField; sortDirection: SortDirection; }
interface ExportReturnRow { invoiceNumber: string; issueDate: string; customerName: string; supplierName: string; referenceInvoice: string; returnReason: string; items: number; totalAmount: number; status: string; notes: string; }
interface ReturnsListViewModel { localSearchTerm: string; setLocalSearchTerm: (value: string) => void; showFilters: boolean; setShowFilters: (value: boolean) => void; filters: ReturnsListFilters; setFilters: (value: ReturnsListFilters) => void; sortField: SortField; setSortField: (value: SortField) => void; sortDirection: SortDirection; setSortDirection: (value: SortDirection) => void; processedReturns: ReturnsListRow[]; totalAmount: number; handleExportExcel: () => Promise<void>; clearFilters: () => void; hasActiveFilters: boolean; }

const amountInRange = (row: ReturnsListRow, filters: ReturnsListFilters): boolean => {
    const amount = Number(row.total_amount ?? 0);
    const minMatches = filters.minAmount === '' || amount >= Number(filters.minAmount);
    const maxMatches = filters.maxAmount === '' || amount <= Number(filters.maxAmount);
    return minMatches && maxMatches;
};
const asSearchText = (value: string | null): string => (value ?? '').toLowerCase();
const matchesSearch = (row: ReturnsListRow, searchTerm: string): boolean => {
    if (searchTerm === '') return true;
    const query = searchTerm.toLowerCase();
    const partyName = row.party === null ? '' : row.party.name;
    return asSearchText(partyName).includes(query) || asSearchText(row.invoice_number).includes(query) || asSearchText(row.return_reason).includes(query);
};
const matchesFilters = (row: ReturnsListRow, filters: ReturnsListFilters, searchTerm: string): boolean => amountInRange(row, filters) && matchesSearch(row, searchTerm);

const rowDate = (row: ReturnsListRow): number => new Date(row.issue_date ?? row.created_at).getTime();
const rowPartyName = (row: ReturnsListRow): string => row.party === null ? '' : (row.party.name ?? '');
const compareRows = (a: ReturnsListRow, b: ReturnsListRow, sortField: SortField): number => {
    if (sortField === 'issue_date') return rowDate(a) - rowDate(b);
    if (sortField === 'total_amount') return Number(a.total_amount ?? 0) - Number(b.total_amount ?? 0);
    if (sortField === 'party_name') return rowPartyName(a).localeCompare(rowPartyName(b));
    return (a.invoice_number ?? '').localeCompare(b.invoice_number ?? '');
};

const sortRows = (sortField: SortField, sortDirection: SortDirection) => (a: ReturnsListRow, b: ReturnsListRow): number => {
    const comparison = compareRows(a, b, sortField);
    return sortDirection === 'asc' ? comparison : -comparison;
};
const processReturns = ({ returns, filters, searchTerm, sortField, sortDirection }: ProcessOptions): ReturnsListRow[] => {
    if (returns === undefined) return [];
    return [...returns].filter(row => matchesFilters(row, filters, searchTerm)).sort(sortRows(sortField, sortDirection));
};
const getPartyName = (row: ReturnsListRow, type: 'sales' | 'purchase'): string => {
    const name = rowPartyName(row);
    if (name !== '') return name;
    return type === 'sales' ? 'عميل نقدي' : 'مورد نقدي';
};
const exportNames = (row: ReturnsListRow, type: 'sales' | 'purchase'): { customerName: string; supplierName: string } => {
    if (type === 'sales') return { customerName: getPartyName(row, type), supplierName: '' };
    return { customerName: '', supplierName: getPartyName(row, type) };
};
const textOrEmpty = (value: string | null): string => value ?? '';
const exportDate = (row: ReturnsListRow): string => new Date(row.issue_date ?? row.created_at).toLocaleDateString('ar-SA-u-nu-latn');
const exportItems = (row: ReturnsListRow): number => row.invoice_items === null ? 0 : row.invoice_items.length;
const exportAmount = (row: ReturnsListRow): number => Number(row.total_amount ?? 0) * Number(row.exchange_rate ?? 1);
const toExportRow = (row: ReturnsListRow, type: 'sales' | 'purchase'): ExportReturnRow => {
    const names = exportNames(row, type);
    return { invoiceNumber: textOrEmpty(row.invoice_number), issueDate: exportDate(row), ...names, referenceInvoice: '', returnReason: textOrEmpty(row.return_reason), items: exportItems(row), totalAmount: exportAmount(row), status: row.status ?? 'draft', notes: textOrEmpty(row.notes) };
};
const initialFilters = (): ReturnsListFilters => ({ status: '', startDate: '', endDate: '', minAmount: '', maxAmount: '', returnReason: '' });

export const useReturnsListView = (returns: ReturnsListRow[] | undefined, type: 'sales' | 'purchase', getFilteredAmount?: (rows: ReturnsListRow[]) => number): ReturnsListViewModel => {
    const [localSearchTerm, setLocalSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<ReturnsListFilters>(initialFilters);
    const [sortField, setSortField] = useState<SortField>('issue_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const processedReturns = useMemo(() => processReturns({ returns, filters, searchTerm: localSearchTerm, sortField, sortDirection }), [returns, filters, localSearchTerm, sortField, sortDirection]);
    const totalAmount = useMemo(() => getFilteredAmount?.(processedReturns) ?? processedReturns.reduce((sum, row) => sum + Number(row.total_amount ?? 0) * Number(row.exchange_rate ?? 1), 0), [processedReturns, getFilteredAmount]);
    const handleExportExcel = async (): Promise<void> => { if (processedReturns.length === 0) return; await exportReturnsToExcel({ companyName: 'Al-Zahra', returns: processedReturns.map(row => toExportRow(row, type)), summary: { totalReturns: totalAmount, totalAmount, averageAmount: totalAmount / processedReturns.length, count: processedReturns.length }, type }); };
    const clearFilters = (): void => { setFilters(initialFilters()); setLocalSearchTerm(''); };
    const hasActiveFilters = Object.values(filters).some(value => value !== '') || localSearchTerm !== '';
    return { localSearchTerm, setLocalSearchTerm, showFilters, setShowFilters, filters, setFilters, sortField, setSortField, sortDirection, setSortDirection, processedReturns, totalAmount, handleExportExcel, clearFilters, hasActiveFilters };
};
