import React, { useState } from 'react';
import { useParties, useStatement } from '../hooks';
import ExcelTable from '../../../ui/common/ExcelTable';
import { formatCurrency, cn } from '../../../core/utils';
import type { PartyType } from '../types';
import type { StatementMovement } from '../service';
import { useCompany } from '../../settings/hooks';
import { useInvoiceSettings } from '../../settings/settingsStore';
import { StatementControls } from './statement/StatementControls';
import { StatementSummaryCards } from './statement/StatementSummaryCards';
import { StatementPrintSheet } from './statement/StatementPrintSheet';

const StatementView: React.FC<{ partyType: PartyType }> = ({ partyType }) => {
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { data: parties } = useParties(partyType);
  const { data: statement, isLoading } = useStatement(selectedPartyId, partyType, {
    startDate,
    endDate,
  });

  const { data: settingsCompany } = useCompany();
  const invoiceSettings = useInvoiceSettings();

  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');

  const selectedParty = parties?.find(p => p.id === selectedPartyId);
  const movements = statement || [];

  const availableCurrencies = React.useMemo(() => {
    const set = new Set<string>();
    movements.forEach(m => {
      if (m.currency) set.add(m.currency);
    });
    return Array.from(set);
  }, [movements]);

  const filteredMovements = React.useMemo(() => {
    if (selectedCurrency === 'ALL') return movements;
    return movements.filter(m => m.currency === selectedCurrency);
  }, [movements, selectedCurrency]);

  const columns = [
    {
      header: 'التاريخ',
      accessor: (row: StatementMovement) => (
        <span dir="ltr" className="text-xs">
          {row.date}
        </span>
      ),
      width: '110px',
      align: 'center' as const,
    },
    {
      header: 'المرجع',
      accessor: (row: StatementMovement) => (
        <span dir="ltr" className="font-mono font-bold text-blue-600">
          {row.ref}
        </span>
      ),
      width: '110px',
      align: 'center' as const,
    },
    {
      header: 'نوع العملية',
      accessor: (row: StatementMovement) => (
        <span className="font-bold text-gray-700 dark:text-slate-300">{row.operation_type}</span>
      ),
      width: '120px',
      align: 'center' as const,
    },
    {
      header: 'البيان',
      accessor: (row: StatementMovement) => (
        <span className="line-clamp-1 text-xs text-gray-500" title={row.desc}>
          {row.desc}
        </span>
      ),
      align: 'right' as const,
    },
    {
      header: 'مدين',
      accessor: (row: StatementMovement) =>
        row.debit > 0 ? (
          <span dir="ltr" className="font-bold text-emerald-600">
            {formatCurrency(row.debit, row.currency)}
          </span>
        ) : (
          '-'
        ),
      width: '130px',
      align: 'center' as const,
    },
    {
      header: 'دائن',
      accessor: (row: StatementMovement) =>
        row.credit > 0 ? (
          <span dir="ltr" className="font-bold text-rose-600">
            {formatCurrency(row.credit, row.currency)}
          </span>
        ) : (
          '-'
        ),
      width: '130px',
      align: 'center' as const,
    },
    {
      header: 'الرصيد المتراكم',
      accessor: (row: StatementMovement) => (
        <span
          dir="ltr"
          className={cn(
            'font-mono font-bold',
            (row.balance || 0) >= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-rose-700 dark:text-rose-400'
          )}
        >
          {formatCurrency(row.balance || 0, row.currency)}
        </span>
      ),
      width: '150px',
      align: 'center' as const,
    },
  ];

  const company = {
    nameAr: invoiceSettings?.company_name_ar || settingsCompany?.name_ar || 'اسم الشركة',
    nameEn: invoiceSettings?.company_name_en || settingsCompany?.name_en || 'Company Name',
    address: invoiceSettings?.company_address || settingsCompany?.address || '',
    phone: invoiceSettings?.company_phone || settingsCompany?.phone || '',
    taxNumber: settingsCompany?.tax_number || '---',
    specialization: invoiceSettings?.company_specialization || '',
    headerText: invoiceSettings?.invoice_header_text || '',
  };

  return (
    <div className="print-area space-y-3 font-sans">
      <StatementControls
        partyType={partyType}
        parties={parties}
        selectedPartyId={selectedPartyId}
        onSelectPartyId={id => {
          setSelectedPartyId(id);
          setSelectedCurrency('ALL');
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
          <div className="p-20 text-center">جاري تحميل الكشف...</div>
        ) : (
          <>
            <StatementPrintSheet
              company={company}
              partyType={partyType}
              partyName={selectedParty?.name ?? ''}
            />

            {availableCurrencies.length > 1 && (
              <div className="no-print flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">
                  تصفية العملة:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCurrency('ALL');
                    }}
                    className={cn(
                      'rounded-lg px-3 py-1 text-xs font-bold transition-all',
                      selectedCurrency === 'ALL'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    جميع العملات
                  </button>
                  {availableCurrencies.map(curr => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => {
                        setSelectedCurrency(curr);
                      }}
                      className={cn(
                        'rounded-lg px-3 py-1 text-xs font-bold transition-all',
                        selectedCurrency === curr
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300'
                      )}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ExcelTable
              columns={columns}
              data={filteredMovements}
              title={`كشف حساب: ${selectedParty?.name}`}
              colorTheme={partyType === 'customer' ? 'green' : 'blue'}
            />

            <StatementSummaryCards movements={filteredMovements} partyType={partyType} />
          </>
        )
      ) : (
        <div className="no-print rounded-lg border-2 border-dashed bg-gray-50/50 p-20 text-center text-gray-400">
          يرجى اختيار جهة لعرض كشف الحساب
        </div>
      )}
    </div>
  );
};

export default StatementView;
