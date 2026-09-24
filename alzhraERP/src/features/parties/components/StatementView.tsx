/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/consistent-type-imports, @typescript-eslint/array-type, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unnecessary-condition */
import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../../auth/store';
import { bondsService } from '../../bonds/service';
import type { Bond } from '../../bonds/types';
import { useCompany } from '../../settings/hooks';
import { useInvoiceSettings } from '../../settings/settingsStore';
import { useParties, useStatement } from '../hooks';
import type { StatementMovement } from '../service';
import type { PartyType } from '../types';
import { StatementControls } from './statement/StatementControls';
import { StatementDocumentModals } from './statement/StatementDocumentModals';
import { StatementMovementsTable } from './statement/StatementMovementsTable';
import { StatementPrintSheet } from './statement/StatementPrintSheet';
import { StatementSelectedActionsBar } from './statement/StatementSelectedActionsBar';
import { StatementSummaryCards } from './statement/StatementSummaryCards';
import { StatementToolbar } from './statement/StatementToolbar';

interface StatementViewProps {
  partyType: PartyType;
  initialPartyId?: string | undefined;
}

const StatementView: React.FC<StatementViewProps> = ({ partyType, initialPartyId }) => {
  const [selectedPartyId, setSelectedPartyId] = useState<string>(initialPartyId || '');

  React.useEffect(() => {
    if (initialPartyId) {
      setSelectedPartyId(initialPartyId);
    }
  }, [initialPartyId]);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Row selection & highlighting
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [rowColors, setRowColors] = useState<Map<string, string>>(new Map());
  const [activeColorPickerRowId, setActiveColorPickerRowId] = useState<string | null>(null);
  const [isPrintingSelectedOnly, setIsPrintingSelectedOnly] = useState(false);

  // Modals for single document view/print
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [activeBond, setActiveBond] = useState<Bond | null>(null);
  const [isBondModalOpen, setIsBondModalOpen] = useState(false);

  const { data: parties } = useParties(partyType);
  const { data: statement, isLoading } = useStatement(selectedPartyId, partyType, {
    startDate,
    endDate,
    currencyCode: selectedCurrency,
  });

  const { data: settingsCompany } = useCompany();
  const invoiceSettings = useInvoiceSettings();

  const companyId = settingsCompany?.id || useAuthStore.getState().user?.company_id || 'default_co';
  const storageKey = selectedPartyId
    ? `erp_statement_row_colors_${companyId}_${selectedPartyId}`
    : null;

  // Load persisted row colors whenever selectedPartyId or companyId changes
  React.useEffect(() => {
    if (!storageKey) {
      setRowColors(new Map());
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        setRowColors(new Map(Object.entries(parsed)));
      } else {
        setRowColors(new Map());
      }
    } catch (err) {
      console.error('Failed to load statement row colors from storage:', err);
      setRowColors(new Map());
    }
  }, [storageKey]);

  // Click outside to close active row color picker
  React.useEffect(() => {
    if (!activeColorPickerRowId) return;
    const handleClickOutside = () => setActiveColorPickerRowId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeColorPickerRowId]);

  const saveRowColorsToStorage = (updatedMap: Map<string, string>) => {
    if (!storageKey) return;
    try {
      if (updatedMap.size === 0) {
        localStorage.removeItem(storageKey);
      } else {
        const obj = Object.fromEntries(updatedMap.entries());
        localStorage.setItem(storageKey, JSON.stringify(obj));
      }
    } catch (err) {
      console.error('Failed to save statement row colors to storage:', err);
    }
  };

  const selectedParty = parties?.find(p => p.id === selectedPartyId);
  const movements = useMemo(() => statement || [], [statement]);

  // Extract all currencies present in movements
  const availableCurrencies = useMemo(() => {
    const set = new Set<string>();
    movements.forEach(m => {
      if (m.currency) set.add(m.currency);
    });
    return Array.from(set);
  }, [movements]);

  // Filter movements by currency & text search
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (selectedCurrency !== 'ALL' && m.currency !== selectedCurrency) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const refMatch = m.ref?.toLowerCase().includes(query);
        const descMatch = m.desc?.toLowerCase().includes(query);
        const opMatch = m.operation_type?.toLowerCase().includes(query);
        if (!refMatch && !descMatch && !opMatch) return false;
      }
      return true;
    });
  }, [movements, selectedCurrency, searchQuery]);

  // Selected movements objects
  const selectedMovements = useMemo(() => {
    return filteredMovements.filter(m => selectedRowIds.has(m.id));
  }, [filteredMovements, selectedRowIds]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedRowIds.size === filteredMovements.length && filteredMovements.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredMovements.map(m => m.id)));
    }
  };

  const handleToggleRowSelection = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleRowExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleApplyColorToSingleRow = (movement: StatementMovement, color: string | null) => {
    setRowColors(prev => {
      const next = new Map(prev);
      const keys = [movement.id, movement.reference_id, movement.ref].filter(Boolean) as string[];
      keys.forEach(k => {
        if (color) {
          next.set(k, color);
        } else {
          next.delete(k);
        }
      });
      saveRowColorsToStorage(next);
      return next;
    });
    setActiveColorPickerRowId(null);
  };

  const handleApplyColorToSelected = (color: string | null) => {
    setRowColors(prev => {
      const next = new Map(prev);
      selectedRowIds.forEach(id => {
        const mov = filteredMovements.find(m => m.id === id);
        const keys = [id, mov?.reference_id, mov?.ref].filter(Boolean) as string[];
        keys.forEach(k => {
          if (color) {
            next.set(k, color);
          } else {
            next.delete(k);
          }
        });
      });
      saveRowColorsToStorage(next);
      return next;
    });
  };

  // Open full bond modal
  const handleOpenBondModal = async (bondId: string, movement: StatementMovement) => {
    try {
      const bond = await bondsService.getBondById(bondId);
      if (bond) {
        setActiveBond(bond);
        setIsBondModalOpen(true);
        return;
      }
    } catch {
      // Fallback bond construct below
    }

    // Fallback bond construct
    setActiveBond({
      id: bondId,
      payment_number: movement.ref,
      date: movement.date,
      description: movement.desc || '',
      amount: movement.debit || movement.credit,
      currency_code: movement.currency,
      type: movement.debit > 0 ? 'receipt' : 'payment',
      party_name: selectedParty?.name || '',
      account_name: '',
      status: 'posted',
    });
    setIsBondModalOpen(true);
  };

  const handlePrintSingleTransaction = (m: StatementMovement) => {
    if (!m.reference_id) return;
    const type = m.reference_type || m.type;
    if (type?.includes('invoice')) {
      setActiveInvoiceId(m.reference_id);
    } else if (type?.includes('bond') || type?.includes('receipt') || type?.includes('payment')) {
      handleOpenBondModal(m.reference_id, m);
    }
  };

  const handlePrintSelectedStatement = () => {
    setIsPrintingSelectedOnly(true);
    setTimeout(() => {
      window.print();
      setIsPrintingSelectedOnly(false);
    }, 150);
  };

  const handleExportSelectedExcel = async () => {
    if (!selectedParty || !statement) return;
    const { exportStatementToExcel } = await import('../utils/statementExcelExporter');
    const companyObj = {
      name_ar: company.nameAr,
      address: company.address,
      phone: company.phone,
      tax_number: company.taxNumber,
    };

    const entries = selectedMovements.map(r => ({
      date: r.date,
      operation_type: r.operation_type ?? '',
      reference_no: r.ref,
      desc: r.desc,
      debit: Number(r.debit) || 0,
      credit: Number(r.credit) || 0,
      balance: Number(r.balance) || 0,
      payment_status: r.payment_status,
      currency: r.currency,
    }));

    await exportStatementToExcel(companyObj, selectedParty.name, entries, {
      currencyCode: selectedMovements[0]?.currency || 'SAR',
      partyType: partyType === 'supplier' ? 'supplier' : 'customer',
      dateFrom: startDate,
      dateTo: endDate,
    });
  };

  const company = {
    nameAr:
      invoiceSettings?.company_name_ar || settingsCompany?.name_ar || 'منظومة الزهراء المحاسبية',
    nameEn: invoiceSettings?.company_name_en || settingsCompany?.name_en || 'Al-Zahra ERP',
    address: invoiceSettings?.company_address || settingsCompany?.address || '',
    phone: invoiceSettings?.company_phone || settingsCompany?.phone || '',
    taxNumber: settingsCompany?.tax_number || '---',
    specialization: invoiceSettings?.company_specialization || '',
    headerText: invoiceSettings?.invoice_header_text || '',
  };

  const isAllSelected =
    filteredMovements.length > 0 && selectedRowIds.size === filteredMovements.length;

  return (
    <div className="print-area space-y-4 font-sans">
      {/* Top Statement Controls */}
      <StatementControls
        partyType={partyType}
        parties={parties}
        selectedPartyId={selectedPartyId}
        onSelectPartyId={id => {
          setSelectedPartyId(id);
          setSelectedCurrency('ALL');
          setSelectedRowIds(new Set());
          setExpandedRowIds(new Set());
        }}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        statement={filteredMovements}
        companyNameAr={company.nameAr}
      />

      {selectedPartyId ? (
        isLoading ? (
          <div className="flex flex-col items-center gap-3 p-20 text-center text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm font-bold">جاري تدقيق واستخراج كشف الحساب من قاعدة البيانات...</p>
          </div>
        ) : (
          <>
            {/* Print Header View */}
            <StatementPrintSheet
              company={company}
              partyType={partyType}
              partyName={selectedParty?.name ?? ''}
              printSubtitle={
                isPrintingSelectedOnly
                  ? `كشف حساب مالي (${selectedMovements.length} معاملات محددة)`
                  : undefined
              }
            />

            {/* Currency Filter & Search Toolbar (Screen Only) */}
            <StatementToolbar
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
              availableCurrencies={availableCurrencies}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            {/* Interactive Statement Excel Data Grid */}
            <StatementMovementsTable
              filteredMovements={filteredMovements}
              selectedRowIds={selectedRowIds}
              expandedRowIds={expandedRowIds}
              rowColors={rowColors}
              activeColorPickerRowId={activeColorPickerRowId}
              isPrintingSelectedOnly={isPrintingSelectedOnly}
              partyName={selectedParty?.name || ''}
              isAllSelected={isAllSelected}
              onToggleSelectAll={handleToggleSelectAll}
              onToggleRowSelection={handleToggleRowSelection}
              onToggleRowExpand={handleToggleRowExpand}
              onOpenColorPicker={setActiveColorPickerRowId}
              onApplyColorToSingleRow={handleApplyColorToSingleRow}
              onPrintSingleTransaction={handlePrintSingleTransaction}
              onOpenInvoiceModal={setActiveInvoiceId}
              onOpenBondModal={handleOpenBondModal}
            />

            {/* Financial Summary Cards with Multi-Currency & Proper Tafqeet */}
            <StatementSummaryCards
              movements={filteredMovements}
              partyType={partyType}
              activeCurrency={selectedCurrency}
            />

            {/* Floating Action Bar for Selected Rows */}
            <StatementSelectedActionsBar
              selectedMovements={selectedMovements}
              selectedParty={selectedParty}
              partyType={partyType}
              companyName={company.nameAr}
              onClearSelection={() => setSelectedRowIds(new Set())}
              onApplyColor={handleApplyColorToSelected}
              onPrintSingleTransaction={handlePrintSingleTransaction}
              onPrintSelectedStatement={handlePrintSelectedStatement}
              onExportSelectedExcel={handleExportSelectedExcel}
            />
          </>
        )
      ) : (
        <div className="no-print rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-20 text-center font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900/20">
          يرجى اختيار جهة لعرض كشف الحساب وتفاصيل المعاملات
        </div>
      )}

      {/* Document Modals (Invoice & Bond) */}
      <StatementDocumentModals
        activeInvoiceId={activeInvoiceId}
        onCloseInvoiceModal={() => setActiveInvoiceId(null)}
        activeBond={activeBond}
        isBondModalOpen={isBondModalOpen}
        onCloseBondModal={() => {
          setIsBondModalOpen(false);
          setActiveBond(null);
        }}
      />
    </div>
  );
};

export default StatementView;
