import React, { useState, useMemo } from 'react';
import { useParties, useStatement } from '../hooks';
import { formatCurrency, cn } from '../../../core/utils';
import type { PartyType } from '../types';
import type { StatementMovement } from '../service';
import { useCompany } from '../../settings/hooks';
import { useInvoiceSettings } from '../../settings/settingsStore';
import { StatementControls } from './statement/StatementControls';
import { StatementSummaryCards } from './statement/StatementSummaryCards';
import { StatementPrintSheet } from './statement/StatementPrintSheet';
import { StatementTransactionDetailRow } from './statement/StatementTransactionDetailRow';
import { StatementSelectedActionsBar } from './statement/StatementSelectedActionsBar';
import InvoiceDetailsModal from '../../sales/components/details/InvoiceDetailsModal';
import { BondVoucherModal } from '../../bonds/components/BondVoucherModal';
import type { Bond } from '../../bonds/types';
import { bondsService } from '../../bonds/service';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  CheckSquare,
  Square,
} from 'lucide-react';

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

  const handleApplyColorToSelected = (color: string | null) => {
    setRowColors(prev => {
      const next = new Map(prev);
      selectedRowIds.forEach(id => {
        if (color) {
          next.set(id, color);
        } else {
          next.delete(id);
        }
      });
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
            <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  تصفية العملة:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCurrency('ALL')}
                  className={cn(
                    'rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                    selectedCurrency === 'ALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  جميع العملات
                </button>
                {availableCurrencies.map(curr => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setSelectedCurrency(curr)}
                    className={cn(
                      'rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                      selectedCurrency === curr
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    {curr}
                  </button>
                ))}
              </div>

              {/* Quick Search inside Table */}
              <div className="relative min-w-[220px]">
                <Search
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="بحث برقم المرجع أو البيان..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-800 dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Interactive Statement Excel Data Grid */}
            <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-[var(--app-border)] text-right">
                  <thead>
                    <tr className="border-b border-[var(--app-border)] bg-slate-100/90 text-[11px] font-bold text-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
                      {/* Checkbox All */}
                      <th className="no-print w-10 border-l border-[var(--app-border)] p-3 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="text-slate-500 transition-colors hover:text-blue-600"
                          title="تحديد / إلغاء تحديد الكل"
                        >
                          {isAllSelected ? (
                            <CheckSquare size={16} className="text-blue-600" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </th>
                      {/* Expander Column */}
                      <th className="no-print w-8 border-l border-[var(--app-border)] p-3 text-center" />
                      <th className="w-28 border-l border-[var(--app-border)] p-3 text-center">
                        التاريخ
                      </th>
                      <th className="w-28 border-l border-[var(--app-border)] p-3 text-center">
                        المرجع
                      </th>
                      <th className="w-28 border-l border-[var(--app-border)] p-3 text-center">
                        نوع العملية
                      </th>
                      <th className="border-l border-[var(--app-border)] p-3">البيان والتفاصيل</th>
                      <th className="w-28 border-l border-[var(--app-border)] p-3 text-center">
                        حالة السداد
                      </th>
                      <th className="w-28 border-l border-[var(--app-border)] p-3 text-center">
                        مدين (+)
                      </th>
                      <th className="w-28 border-l border-[var(--app-border)] p-3 text-center">
                        دائن (-)
                      </th>
                      <th className="w-36 border-l border-[var(--app-border)] p-3 text-center">
                        الرصيد المتراكم
                      </th>
                      <th className="no-print w-20 p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-border)] text-xs">
                    {filteredMovements.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-12 text-center italic text-slate-400">
                          لا توجد حركات مسجلة لهذا الحساب وفق المعايير المحددة.
                        </td>
                      </tr>
                    ) : (
                      filteredMovements.map((row, idx) => {
                        const isExpanded = expandedRowIds.has(row.id);
                        const isSelected = selectedRowIds.has(row.id);
                        const customColor = rowColors.get(row.id);

                        // Highlighting styling
                        const highlightClass =
                          customColor === 'emerald'
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-r-4 border-r-emerald-500'
                            : customColor === 'rose'
                              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-r-4 border-r-rose-500'
                              : customColor === 'amber'
                                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-r-4 border-r-amber-500'
                                : customColor === 'blue'
                                  ? 'bg-blue-50/70 dark:bg-blue-950/30 border-r-4 border-r-blue-500'
                                  : isSelected
                                    ? 'bg-blue-50/40 dark:bg-blue-950/20'
                                    : idx % 2 === 0
                                      ? 'bg-transparent'
                                      : 'bg-slate-50/40 dark:bg-slate-900/30';

                        // Payment Status Meta
                        const statusBadge =
                          row.payment_status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <CheckCircle2 size={10} />
                              خالص
                            </span>
                          ) : row.payment_status === 'partially_paid' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                              <Clock size={10} />
                              جزئي
                            </span>
                          ) : row.payment_status === 'unpaid' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                              <AlertCircle size={10} />
                              غير مسدد
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              تسوية
                            </span>
                          );

                        const isRowHiddenInPrint = isPrintingSelectedOnly && !isSelected;

                        return (
                          <React.Fragment key={row.id}>
                            <tr
                              className={cn(
                                'cursor-pointer transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/50',
                                highlightClass,
                                isRowHiddenInPrint && 'print:hidden'
                              )}
                              onClick={() => handleToggleRowExpand(row.id)}
                            >
                              {/* Selection Checkbox */}
                              <td
                                className="no-print border-l border-[var(--app-border)] p-3 text-center"
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={e => handleToggleRowSelection(row.id, e)}
                                  className="text-slate-400 transition-colors hover:text-blue-600"
                                >
                                  {isSelected ? (
                                    <CheckSquare size={16} className="text-blue-600" />
                                  ) : (
                                    <Square size={16} />
                                  )}
                                </button>
                              </td>

                              {/* Expander Chevron */}
                              <td className="no-print border-l border-[var(--app-border)] p-3 text-center text-slate-400">
                                {row.reference_id ? (
                                  <button
                                    type="button"
                                    onClick={e => handleToggleRowExpand(row.id, e)}
                                    className="rounded p-1 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown size={14} className="text-blue-600" />
                                    ) : (
                                      <ChevronRight
                                        size={14}
                                        className="rotate-180 text-slate-400"
                                      />
                                    )}
                                  </button>
                                ) : (
                                  <span className="inline-block w-4" />
                                )}
                              </td>

                              {/* Date */}
                              <td
                                className="whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center font-mono text-xs text-slate-600 dark:text-slate-300"
                                dir="ltr"
                              >
                                {row.date}
                              </td>

                              {/* Reference No */}
                              <td
                                className="whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center font-mono font-bold text-blue-600"
                                dir="ltr"
                              >
                                {row.ref}
                              </td>

                              {/* Operation Type & Currency */}
                              <td className="whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {row.operation_type}
                                  </span>
                                  <span className="font-mono text-[10px] font-bold text-slate-400">
                                    {row.currency}
                                  </span>
                                </div>
                              </td>

                              {/* Description */}
                              <td className="border-l border-[var(--app-border)] p-3 text-slate-600 dark:text-slate-300">
                                <span className="line-clamp-1" title={row.desc}>
                                  {row.desc}
                                </span>
                              </td>

                              {/* Status Badge */}
                              <td className="whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center">
                                {statusBadge}
                              </td>

                              {/* Debit */}
                              <td
                                className="whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center font-mono font-bold text-emerald-600"
                                dir="ltr"
                              >
                                {row.debit > 0 ? formatCurrency(row.debit, row.currency) : '-'}
                              </td>

                              {/* Credit */}
                              <td
                                className="whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center font-mono font-bold text-rose-600"
                                dir="ltr"
                              >
                                {row.credit > 0 ? formatCurrency(row.credit, row.currency) : '-'}
                              </td>

                              {/* Balance */}
                              <td
                                className={cn(
                                  'whitespace-nowrap border-l border-[var(--app-border)] p-3 text-center font-mono font-bold',
                                  (row.balance || 0) >= 0
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-rose-700 dark:text-rose-400'
                                )}
                                dir="ltr"
                              >
                                {formatCurrency(row.balance || 0, row.currency)}
                              </td>

                              {/* Individual Row Actions */}
                              <td
                                className="no-print p-3 text-center"
                                onClick={e => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  {row.reference_id && (
                                    <button
                                      type="button"
                                      onClick={() => handlePrintSingleTransaction(row)}
                                      title="عرض المستند والطباعة"
                                      className="rounded p-1 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40"
                                    >
                                      <Printer size={13} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={e => handleToggleRowExpand(row.id, e)}
                                    title="عرض تفاصيل البنود"
                                    className="rounded p-1 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40"
                                  >
                                    <Eye size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expandable Line Items Details */}
                            {isExpanded && !isRowHiddenInPrint && (
                              <tr className="bg-slate-50/80 dark:bg-slate-900/60 print:hidden">
                                <td colSpan={11} className="p-3 pr-10">
                                  <StatementTransactionDetailRow
                                    movement={row}
                                    partyName={selectedParty?.name || ''}
                                    onOpenInvoiceModal={invId => setActiveInvoiceId(invId)}
                                    onOpenBondModal={(bondId, mov) =>
                                      handleOpenBondModal(bondId, mov)
                                    }
                                  />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

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

      {/* Invoice Details Modal */}
      {activeInvoiceId && (
        <InvoiceDetailsModal invoiceId={activeInvoiceId} onClose={() => setActiveInvoiceId(null)} />
      )}

      {/* Bond Voucher Modal */}
      {activeBond && (
        <BondVoucherModal
          isOpen={isBondModalOpen}
          bond={activeBond}
          onClose={() => {
            setIsBondModalOpen(false);
            setActiveBond(null);
          }}
        />
      )}
    </div>
  );
};

export default StatementView;
