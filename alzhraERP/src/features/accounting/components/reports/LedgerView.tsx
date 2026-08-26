import React, { useState } from 'react';
import { useAccounts, useLedger } from '../../hooks/index';
import { LedgerEntry } from '../../types/index';
import ExcelTable from '../../../../ui/common/ExcelTable';
import { formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import { Loader2, FileText } from 'lucide-react';
import EmptyState from '../../../../ui/base/EmptyState';
import ShareButton from '../../../../ui/common/ShareButton';
import SearchableAccountSelector from '../../../../ui/common/SearchableAccountSelector';
import { getLedgerBalanceLabel } from '../../utils/ledgerBalance';

interface Props {
  dateRange: { from: string; to: string };
  accountId?: string | null;
  showAccountSelector?: boolean;
}

const LedgerView: React.FC<Props> = ({ dateRange, accountId, showAccountSelector = true }) => {
  const { data: accounts } = useAccounts();
  const [internalAccountId, setInternalAccountId] = useState<string>('');

  // Determine effective account ID: prop takes precedence
  const effectiveAccountId = accountId || internalAccountId;

  const { data: ledger, isLoading } = useLedger(
    effectiveAccountId || null,
    dateRange.from,
    dateRange.to
  );

  const selectedAccount = accounts?.find(a => a.id === effectiveAccountId);

  const columns = [
    { header: 'التاريخ', accessor: (row: LedgerEntry) => <span dir="ltr" className="font-mono text-xs">{row.date}</span>, width: 'w-24' },
    { header: 'رقم القيد', accessor: (row: LedgerEntry) => row.entry_number > 0 ? <span dir="ltr" className="font-mono text-xs text-blue-600 hover:underline cursor-pointer">#{formatNumberDisplay(row.entry_number)}</span> : '-', width: 'w-24' },
    { header: 'البيان', accessor: (row: LedgerEntry) => <span className="text-xs font-semibold">{row.description}</span>, className: 'text-right min-w-[200px]' },
    { header: 'العميل / المورد', accessor: (row: LedgerEntry) => row.party_name ? <span className="text-xs font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md dark:bg-blue-900/30 dark:text-blue-300">{row.party_name}</span> : <span className="text-gray-400">-</span>, className: 'text-right min-w-[150px]' },
    {
      header: 'مدين',
      accessor: () => null,
      cell: ({ row }: { row: { original: LedgerEntry } }) => (
        <div className="text-left space-y-0.5">
          <div dir="ltr" className={`font-mono text-xs font-bold ${row.original.debit_amount > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
            {row.original.debit_amount > 0 ? formatCurrency(row.original.debit_amount) : '-'}
          </div>
          {row.original.foreign_amount && row.original.foreign_amount > 0 && Math.abs(row.original.debit_amount - row.original.foreign_amount) > 0.01 && (
            <div dir="ltr" className="text-[9px] text-gray-400 font-mono">
              ({formatCurrency(row.original.foreign_amount, row.original.currency_code)})
            </div>
          )}
        </div>
      ),
      className: 'w-28',
      footer: (data: LedgerEntry[]) => <span dir="ltr" className="font-mono text-xs font-bold text-emerald-700">{formatCurrency(data.reduce((sum, row) => sum + row.debit_amount, 0))}</span>
    },
    {
      header: 'دائن',
      accessor: () => null,
      cell: ({ row }: { row: { original: LedgerEntry } }) => (
        <div className="text-left space-y-0.5">
          <div dir="ltr" className={`font-mono text-xs font-bold ${row.original.credit_amount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {row.original.credit_amount > 0 ? formatCurrency(row.original.credit_amount) : '-'}
          </div>
          {row.original.foreign_amount && row.original.foreign_amount > 0 && Math.abs(row.original.credit_amount - row.original.foreign_amount) > 0.01 && (
            <div dir="ltr" className="text-[9px] text-gray-400 font-mono">
              ({formatCurrency(row.original.foreign_amount, row.original.currency_code)})
            </div>
          )}
        </div>
      ),
      className: 'w-28',
      footer: (data: LedgerEntry[]) => <span dir="ltr" className="font-mono text-xs font-bold text-red-700">{formatCurrency(data.reduce((sum, row) => sum + row.credit_amount, 0))}</span>
    },
    {
      header: 'الرصيد',
      accessor: (row: LedgerEntry) => {
        // get_account_ledger returns a sign-normalised running balance; the
        // label depends on the account nature (asset/expense vs credit-normal)
        const { label: balanceLabel, isCredit } = getLedgerBalanceLabel(row.balance, row.accountType);
        return (
          <div className="text-left">
            <span className={`flex items-center  max-md:gap-1 text-xs font-bold ${isCredit ? 'text-red-600' : 'text-blue-600'}`}>
              <span>{balanceLabel}</span>
              <span dir="ltr" className="font-mono">{formatCurrency(Math.abs(row.balance))}</span>
            </span>
          </div>
        );
      },
      className: 'w-28 bg-gray-50/50 dark:bg-slate-800/50'
    },
  ];

  return (
    <div className="space-y-4 print-area h-full flex flex-col">
      {/* Show dropdown only if explicitly requested and no account is forced */}
      {showAccountSelector && !accountId && (
        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] p-2 max-md:p-1 flex items-center gap-3 max-md:gap-2 no-print shadow-sm">
          <SearchableAccountSelector
            accounts={accounts || []}
            selectedId={internalAccountId}
            onSelect={setInternalAccountId}
            placeholder="-- اختر حساباً لعرض كشف الحساب --"
            className="flex-1"
          />
          {effectiveAccountId && ledger && ledger.length > 0 && (
            <ShareButton
              size="sm"
              showLabel
              eventType="ledger"
              title={`مشاركة كشف حساب ${selectedAccount?.name}`}
              message={`📒 دفتر الأستاذ - كشف حساب\n━━━━━━━━━━━━━━\n📋 الحساب: ${selectedAccount?.name} (${selectedAccount?.code})\n📗 إجمالي المدين: ${formatCurrency(ledger.reduce((s: number, r: LedgerEntry) => s + r.debit_amount, 0))}\n📕 إجمالي الدائن: ${formatCurrency(ledger.reduce((s: number, r: LedgerEntry) => s + r.credit_amount, 0))}\n💰 الرصيد النهائي: ${formatCurrency(ledger[ledger.length - 1]?.balance || 0)}\n📅 الفترة: من ${dateRange.from} إلى ${dateRange.to}`}
            />
          )}
        </div>
      )}

      {effectiveAccountId ? (
        isLoading ? (
          <div className="flex-1 flex items-center justify-center p-12 max-md:p-5"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
        ) : (
          <div className="flex-1 min-h-[480px] flex flex-col overflow-hidden border border-[var(--app-border)] shadow-sm">
            <ExcelTable
              columns={columns}
              data={ledger || []}
              title={`كشف حساب: ${selectedAccount?.name} (${selectedAccount?.code})`}
              colorTheme="blue"
            />
          </div>
        )
      ) : (
        !accountId && (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={FileText}
              title="دفتر الأستاذ العام"
              description="يعرض هذا التقرير كشف حساب تفصيلي لكل حساب في شجرة الحسابات. يرجى اختيار حساب من القائمة أعلاه."
            />
          </div>
        )
      )}
    </div>
  );
};

export default LedgerView;