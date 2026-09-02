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

  const selectedParty = parties?.find(p => p.id === selectedPartyId);
  const movements = statement || [];

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
            {formatCurrency(row.debit)}
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
            {formatCurrency(row.credit)}
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
            (row.balance || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
          )}
        >
          {formatCurrency(row.balance || 0)}
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
        onSelectPartyId={setSelectedPartyId}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        statement={movements}
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

            <ExcelTable
              columns={columns}
              data={movements}
              title={`كشف حساب: ${selectedParty?.name}`}
              colorTheme={partyType === 'customer' ? 'green' : 'blue'}
            />

            <StatementSummaryCards movements={movements} />
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
