/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/consistent-type-imports, @typescript-eslint/array-type, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unnecessary-condition */
import React, { useMemo, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { exportToCSV } from '@/lib/exportUtils';
import EmptyState from '@/ui/base/EmptyState';
import ExcelTable from '@/ui/common/ExcelTable';
import { useAccounts, useLedger } from '../../accounting/hooks';
import { isDebitNormalAccount } from '../../accounting/utils/ledgerBalance';
import { useExpenseCategories } from '../hooks';
import { ExpenseLedgerPrintHeader } from './ledger/ExpenseLedgerPrintHeader';
import { ExpenseLedgerSummaryCards } from './ledger/ExpenseLedgerSummaryCards';
import { ExpenseLedgerToolbar } from './ledger/ExpenseLedgerToolbar';
import { getExpenseLedgerColumns } from './ledger/expenseLedgerColumns';
import type { AccountFilterType, LedgerMetrics } from './ledger/types';
import type { DatePreset } from '@/core/types/invoiceSearch';

interface Props {
  initialAccountId?: string | null;
  onBackToList?: () => void;
}

export const ExpenseLedgerView: React.FC<Props> = ({ initialAccountId, onBackToList }) => {
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useExpenseCategories();

  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId || '');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [accountFilterType, setAccountFilterType] = useState<AccountFilterType>('all');

  // Sync and resolve initial account ID if prop changes or on initial load
  React.useEffect(() => {
    if (initialAccountId && accounts.length > 0) {
      // 1. Direct match with account ID
      const directAcc = accounts.find(a => a.id === initialAccountId);
      if (directAcc) {
        setSelectedAccountId(directAcc.id);
        return;
      }
      // 2. Match via expense category
      const matchedCat = categories.find((c: any) => c.id === initialAccountId);
      if (matchedCat && matchedCat.account_id) {
        const catAcc = accounts.find(a => a.id === matchedCat.account_id);
        if (catAcc) {
          setSelectedAccountId(catAcc.id);
          return;
        }
      }
    }

    // If no valid account is selected, auto-select the best operational expense account
    if (
      accounts.length > 0 &&
      (!selectedAccountId || !accounts.some(a => a.id === selectedAccountId))
    ) {
      const defaultExp =
        accounts.find(a => a.code === '5600') ||
        accounts.find(a => a.code === '5300') ||
        accounts.find(a => a.code === '5400') ||
        accounts.find(a => a.code.startsWith('5')) ||
        accounts[0];
      if (defaultExp) {
        setSelectedAccountId(defaultExp.id);
      }
    }
  }, [initialAccountId, accounts, categories, selectedAccountId]);

  const { data: ledger = [], isLoading: isLoadingLedger } = useLedger(
    selectedAccountId || null,
    dateFrom,
    dateTo
  );

  const selectedAccount = useMemo(
    () => accounts.find(a => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  // Filter accounts for the selector tabs
  const filteredAccounts = useMemo(() => {
    if (accountFilterType === 'expense') {
      return accounts.filter(a => a.type === 'expense' || a.code.startsWith('5'));
    }
    if (accountFilterType === 'employee') {
      return accounts.filter(a => a.code.startsWith('140') || a.name.includes('راتب'));
    }
    if (accountFilterType === 'rent') {
      return accounts.filter(
        a => a.code.startsWith('240') || a.name.includes('إيجار') || a.name.includes('ايجار')
      );
    }
    if (accountFilterType === 'cash') {
      return accounts.filter(
        a => a.code.startsWith('101') || a.code.startsWith('102') || a.name.includes('صندوق')
      );
    }
    return accounts;
  }, [accounts, accountFilterType]);

  // Opening & Closing calculations
  const ledgerMetrics: LedgerMetrics = useMemo(() => {
    const totalDebit = ledger.reduce((sum, r) => sum + (r.debit_amount || 0), 0);
    const totalCredit = ledger.reduce((sum, r) => sum + (r.credit_amount || 0), 0);
    const lastRow = ledger.length > 0 ? ledger[ledger.length - 1] : null;
    const closingBalance = lastRow ? lastRow.balance : 0;
    const closingForeignBalance = lastRow ? lastRow.foreign_balance : undefined;

    return {
      totalDebit,
      totalCredit,
      closingBalance,
      closingForeignBalance,
      count: ledger.length,
    };
  }, [ledger]);

  const handleExport = () => {
    if (!selectedAccount || ledger.length === 0) return;
    const headers = [
      'التاريخ',
      'رقم القيد',
      'البيان والتفاصيل',
      'الطرف',
      'عليه (صرف +)',
      'له (سداد -)',
      'الرصيد التراكمي (له / عليه)',
    ];
    const isDebitNormal = isDebitNormalAccount(selectedAccount.type);
    const exportData = ledger.map(r => {
      const isCredit = isDebitNormal ? r.balance < 0 : r.balance > 0;
      const isZero = Math.abs(r.balance) < 0.001;
      const statusText = isZero ? 'متزن' : isCredit ? 'له' : 'عليه';
      return {
        date: r.date,
        entry_no: r.entry_number > 0 ? `#${r.entry_number}` : '-',
        desc: r.description,
        party: r.party_name || '-',
        debit: r.debit_amount,
        credit: r.credit_amount,
        balance: `${statusText}: ${Math.abs(r.balance)}`,
      };
    });
    exportToCSV(exportData, `كشف_حساب_${selectedAccount.code}_${selectedAccount.name}`, headers);
  };

  const handlePrint = () => {
    window.print();
  };

  const columns = useMemo(() => getExpenseLedgerColumns(selectedAccount), [selectedAccount]);

  return (
    <div className="print-area flex flex-col space-y-4">
      {/* Printable Header - Visible only on Print */}
      <ExpenseLedgerPrintHeader
        selectedAccount={selectedAccount}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

      {/* Control Toolbar - Hidden on Print */}
      <ExpenseLedgerToolbar
        onBackToList={onBackToList}
        accountFilterType={accountFilterType}
        setAccountFilterType={setAccountFilterType}
        filteredAccounts={filteredAccounts}
        selectedAccountId={selectedAccountId}
        setSelectedAccountId={setSelectedAccountId}
        datePreset={datePreset}
        setDatePreset={setDatePreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        selectedAccount={selectedAccount}
        ledgerLength={ledger.length}
        ledgerMetrics={ledgerMetrics}
        onPrint={handlePrint}
        categories={categories}
      />

      {/* Selected Account Header Summary & KPI Cards */}
      <ExpenseLedgerSummaryCards selectedAccount={selectedAccount} ledgerMetrics={ledgerMetrics} />

      {/* Ledger Table */}
      {selectedAccountId ? (
        isLoadingLedger ? (
          <div className="flex min-h-[360px] flex-1 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <div className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xs">
            <ExcelTable
              columns={columns}
              data={ledger}
              colorTheme="blue"
              title={
                selectedAccount
                  ? `كشف حساب: ${selectedAccount.name} (${selectedAccount.code})`
                  : 'كشف الحساب'
              }
              onExport={handleExport}
            />
          </div>
        )
      ) : (
        <EmptyState
          icon={Building2}
          title="اختر حساباً لعرض كشف الحساب التفصيلي"
          description="يمكنك اختيار أي حساب مصروفات تشغيلية، أو حساب موظف (مستحقات رواتب)، أو حساب صندوق نقدي لمراجعة حركاته ودفتر الأستاذ."
        />
      )}
    </div>
  );
};

export default ExpenseLedgerView;
