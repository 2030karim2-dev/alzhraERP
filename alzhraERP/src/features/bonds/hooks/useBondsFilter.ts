/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import { useMemo, useState } from 'react';
import type { Bond } from '../types';
import type { DatePreset } from '@/core/types/invoiceSearch';

export type BondSortBy = 'date' | 'amount' | 'number';
export type BondSortOrder = 'asc' | 'desc';
export type BondPaymentMethodFilter = 'all' | 'cash' | 'bank';

export interface UseBondsFilterReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  dateFrom: string | undefined;
  setDateFrom: (date?: string) => void;
  dateTo: string | undefined;
  setDateTo: (date?: string) => void;
  currencyFilter: string;
  setCurrencyFilter: (currency: string) => void;
  paymentMethodFilter: BondPaymentMethodFilter;
  setPaymentMethodFilter: (method: BondPaymentMethodFilter) => void;
  sortBy: BondSortBy;
  setSortBy: (sortBy: BondSortBy) => void;
  sortOrder: BondSortOrder;
  setSortOrder: (order: BondSortOrder) => void;
  displayedBonds: Bond[];
  hasActiveFilters: boolean;
  handleResetFilters: () => void;
}

export function useBondsFilter(bonds: Bond[] | undefined): UseBondsFilterReturn {
  const [searchTerm, setSearchTerm] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<BondPaymentMethodFilter>('all');
  const [sortBy, setSortBy] = useState<BondSortBy>('date');
  const [sortOrder, setSortOrder] = useState<BondSortOrder>('desc');

  const displayedBonds = useMemo(() => {
    if (!bonds) return [];
    let result = [...bonds];

    // Search term
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        b =>
          (b.payment_number || '').toLowerCase().includes(term) ||
          (b.description || '').toLowerCase().includes(term) ||
          (b.party_name || '').toLowerCase().includes(term) ||
          (b.account_name || '').toLowerCase().includes(term)
      );
    }

    // Payment method filter
    if (paymentMethodFilter !== 'all') {
      result = result.filter(b => b.payment_method === paymentMethodFilter);
    }

    // Currency filter
    if (currencyFilter !== 'all') {
      result = result.filter(
        b => (b.currency_code || '').toUpperCase() === currencyFilter.toUpperCase()
      );
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter(b => b.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(b => b.date <= dateTo);
    }

    // Multi-field Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'amount') {
        cmp = (a.amount || 0) - (b.amount || 0);
      } else if (sortBy === 'number') {
        cmp = (a.payment_number || '').localeCompare(b.payment_number || '', undefined, {
          numeric: true,
        });
      } else {
        const dateA = new Date(a.date).getTime() || 0;
        const dateB = new Date(b.date).getTime() || 0;
        cmp = dateA - dateB;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [bonds, searchTerm, paymentMethodFilter, currencyFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const hasActiveFilters = Boolean(
    (searchTerm && searchTerm.trim() !== '') ||
    paymentMethodFilter !== 'all' ||
    currencyFilter !== 'all' ||
    datePreset !== 'all' ||
    dateFrom ||
    dateTo ||
    sortBy !== 'date' ||
    sortOrder !== 'desc'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setPaymentMethodFilter('all');
    setCurrencyFilter('all');
    setDatePreset('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSortBy('date');
    setSortOrder('desc');
  };

  return {
    searchTerm,
    setSearchTerm,
    datePreset,
    setDatePreset,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    currencyFilter,
    setCurrencyFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    displayedBonds,
    hasActiveFilters,
    handleResetFilters,
  };
}
