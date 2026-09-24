import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Sparkles,
  Wallet,
  UserCheck,
  Building2,
  Receipt,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useAccounts, useLedger } from '../../accounting/hooks';
import type { LedgerEntry } from '../../accounting/types';
import ExcelTable from '../../../ui/common/ExcelTable';
import { formatCurrency, formatNumberDisplay } from '../../../core/utils';
import SearchableAccountSelector from '../../../ui/common/SearchableAccountSelector';
import ShareButton from '../../../ui/common/ShareButton';
import EmptyState from '../../../ui/base/EmptyState';
import Button from '../../../ui/base/Button';
import { getLedgerBalanceLabel } from '../../accounting/utils/ledgerBalance';
import { useExpenseCategories } from '../hooks';
import type { DatePreset } from '../../../core/types/invoiceSearch';
import { getDateRangeForPreset } from '../../../core/utils/dateUtils';
import { exportToCSV } from '../../../lib/exportUtils';

interface Props {
  initialAccountId?: string | null;
  onBackToList?: () => void;
}

const DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'all', label: 'كل الفترات' },
  { id: 'today', label: 'اليوم' },
  { id: 'this_week', label: 'آخر 7 أيام' },
  { id: 'this_month', label: 'هذا الشهر' },
  { id: 'last_month', label: 'الشهر الماضي' },
  { id: 'custom', label: 'مخصص' },
];

export const ExpenseLedgerView: React.FC<Props> = ({ initialAccountId, onBackToList }) => {
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useExpenseCategories();

  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId || '');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [accountFilterType, setAccountFilterType] = useState<
    'all' | 'expense' | 'employee' | 'cash'
  >('all');

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
    if (accountFilterType === 'cash') {
      return accounts.filter(
        a => a.code.startsWith('101') || a.code.startsWith('102') || a.name.includes('صندوق')
      );
    }
    return accounts;
  }, [accounts, accountFilterType]);

  // Opening & Closing calculations
  const ledgerMetrics = useMemo(() => {
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
    const headers = ['التاريخ', 'رقم القيد', 'البيان', 'الطرف', 'مدين', 'دائن', 'الرصيد'];
    const exportData = ledger.map(r => ({
      date: r.date,
      entry_no: r.entry_number > 0 ? `#${r.entry_number}` : '-',
      desc: r.description,
      party: r.party_name || '-',
      debit: r.debit_amount,
      credit: r.credit_amount,
      balance: r.balance,
    }));
    exportToCSV(exportData, `كشف_حساب_${selectedAccount.code}_${selectedAccount.name}`, headers);
  };

  const handlePrint = () => {
    window.print();
  };

  const columns = [
    {
      header: 'التاريخ',
      accessor: (row: LedgerEntry) => (
        <span dir="ltr" className="font-mono text-xs font-bold text-gray-700 dark:text-slate-300">
          {row.date}
        </span>
      ),
      width: '110px',
    },
    {
      header: 'رقم القيد',
      accessor: (row: LedgerEntry) =>
        row.entry_number > 0 ? (
          <span dir="ltr" className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
            #{formatNumberDisplay(row.entry_number)}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
      width: '90px',
    },
    {
      header: 'البيان والتفاصيل',
      accessor: (row: LedgerEntry) => {
        const isReversal =
          row.reference_type?.includes('void') ||
          row.reference_type?.includes('return') ||
          row.description.includes('عكس');

        return (
          <div className="flex flex-wrap items-center gap-1.5 py-0.5">
            <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
              {row.description}
            </span>
            {isReversal && (
              <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black text-amber-800 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                قيد عكسي
              </span>
            )}
            {row.party_name && (
              <span className="py-0.2 rounded-md border border-blue-200 bg-blue-50 px-1.5 text-[10px] font-bold text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                {row.party_name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'مدين (صرف / استحقاق)',
      accessor: (row: LedgerEntry) => (
        <div className="space-y-0.5 text-left">
          <div
            dir="ltr"
            className={`font-mono text-xs font-bold ${
              row.debit_amount > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-300 dark:text-slate-600'
            }`}
          >
            {row.debit_amount > 0 ? formatCurrency(row.debit_amount) : '-'}
          </div>
          {row.foreign_amount &&
          row.foreign_amount > 0 &&
          Math.abs(row.debit_amount - row.foreign_amount) > 0.01 ? (
            <div
              dir="ltr"
              className="font-mono text-[10px] font-semibold text-emerald-700/80 dark:text-emerald-400/80"
            >
              ({formatCurrency(row.foreign_amount, row.currency_code)})
            </div>
          ) : null}
        </div>
      ),
      className: 'w-32',
      footer: (data: LedgerEntry[]) => (
        <span
          dir="ltr"
          className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400"
        >
          {formatCurrency(data.reduce((sum, row) => sum + (row.debit_amount || 0), 0))}
        </span>
      ),
    },
    {
      header: 'دائن (سداد / تسوية)',
      accessor: (row: LedgerEntry) => (
        <div className="space-y-0.5 text-left">
          <div
            dir="ltr"
            className={`font-mono text-xs font-bold ${
              row.credit_amount > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-gray-300 dark:text-slate-600'
            }`}
          >
            {row.credit_amount > 0 ? formatCurrency(row.credit_amount) : '-'}
          </div>
          {row.foreign_amount &&
          row.foreign_amount > 0 &&
          Math.abs(row.credit_amount - row.foreign_amount) > 0.01 ? (
            <div
              dir="ltr"
              className="font-mono text-[10px] font-semibold text-rose-700/80 dark:text-rose-400/80"
            >
              ({formatCurrency(row.foreign_amount, row.currency_code)})
            </div>
          ) : null}
        </div>
      ),
      className: 'w-32',
      footer: (data: LedgerEntry[]) => (
        <span dir="ltr" className="font-mono text-xs font-bold text-rose-700 dark:text-rose-400">
          {formatCurrency(data.reduce((sum, row) => sum + (row.credit_amount || 0), 0))}
        </span>
      ),
    },
    {
      header: 'الرصيد التراكمي',
      accessor: (row: LedgerEntry) => {
        const { label: balanceLabel, isCredit } = getLedgerBalanceLabel(
          row.balance,
          row.accountType
        );
        const isForeign = Boolean(
          row.foreign_balance !== undefined && row.currency_code && row.currency_code !== 'SAR'
        );

        return (
          <div className="space-y-0.5 text-left">
            <span
              className={`flex items-center gap-1 text-xs font-bold ${
                isCredit ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              <span>{balanceLabel}</span>
              <span dir="ltr" className="font-mono">
                {isForeign
                  ? formatCurrency(Math.abs(row.foreign_balance!), row.currency_code)
                  : formatCurrency(Math.abs(row.balance))}
              </span>
            </span>
            {isForeign && (
              <div dir="ltr" className="font-mono text-[10px] text-gray-400">
                ≈ {formatCurrency(Math.abs(row.balance), 'SAR')}
              </div>
            )}
          </div>
        );
      },
      className: 'w-36 bg-gray-50/50 dark:bg-slate-800/40',
    },
  ];

  return (
    <div className="print-area flex flex-col space-y-4">
      {/* Printable Header - Visible only on Print */}
      <div className="mb-4 hidden border-b pb-4 text-center print:block">
        <h2 className="text-xl font-bold">كشف حساب تفصيلي - سجل الأستاذ العام</h2>
        {selectedAccount && (
          <p className="text-sm font-bold text-gray-700">
            الحساب: {selectedAccount.name} ({selectedAccount.code}) | العملة:{' '}
            {selectedAccount.currency_code || 'SAR'}
          </p>
        )}
        <p className="text-xs text-gray-500">
          الفترة: {dateFrom || 'البداية'} إلى {dateTo || 'الآن'} | تاريخ الطباعة:{' '}
          {new Date().toLocaleDateString('ar-SA')}
        </p>
      </div>

      {/* Control Toolbar - Hidden on Print */}
      <div className="no-print flex flex-col gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onBackToList && (
              <button
                type="button"
                onClick={onBackToList}
                className="flex items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 text-xs font-bold text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]"
              >
                <ArrowRight size={14} />
                <span>العودة للقائمة</span>
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <FileText size={16} />
              </span>
              <div>
                <h3 className="text-xs font-black text-[var(--app-text)]">
                  كشف حساب تفصيلي للمصروفات والعهد
                </h3>
                <p className="text-[10px] text-[var(--app-text-secondary)]">
                  حركات دفتر الأستاذ العام، الرصيد الافتتاحي، وتتبع الأرصدة
                </p>
              </div>
            </div>
          </div>

          {/* Quick Account Scope Filter Tabs */}
          <div className="flex rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-0.5">
            <button
              type="button"
              onClick={() => {
                setAccountFilterType('all');
              }}
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                accountFilterType === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountFilterType('expense');
              }}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                accountFilterType === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
              }`}
            >
              <Receipt size={12} />
              <span>مصروفات (5xxx)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountFilterType('employee');
              }}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                accountFilterType === 'employee'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
              }`}
            >
              <UserCheck size={12} />
              <span>مستحقات ورواتب (140xxx)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountFilterType('cash');
              }}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                accountFilterType === 'cash'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
              }`}
            >
              <Wallet size={12} />
              <span>الصناديق (101xxx)</span>
            </button>
          </div>
        </div>

        {/* Account Selector & Date Range Row */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          {/* Searchable Account Selector */}
          <div className="lg:col-span-5">
            <SearchableAccountSelector
              accounts={filteredAccounts}
              selectedId={selectedAccountId}
              onSelect={setSelectedAccountId}
              placeholder="ابحث برقم أو اسم الحساب المراد كشفه..."
              className="w-full"
            />
          </div>

          {/* Date Presets */}
          <div className="flex flex-wrap items-center gap-1 lg:col-span-4">
            {DATE_PRESETS.map(preset => {
              const isActive = datePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setDatePreset(preset.id);
                    const range = getDateRangeForPreset(preset.id);
                    setDateFrom(range.from);
                    setDateTo(range.to);
                  }}
                  className={`rounded-md px-2 py-1 text-[11px] font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-[var(--app-bg)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Action Buttons: Print, Share, Export */}
          <div className="flex items-center justify-end gap-2 lg:col-span-3">
            {selectedAccount && ledger.length > 0 && (
              <>
                <ShareButton
                  size="sm"
                  showLabel
                  eventType="ledger"
                  title={`كشف حساب ${selectedAccount.name}`}
                  message={`📒 كشف حساب مالي - ${selectedAccount.name} (${selectedAccount.code})\n━━━━━━━━━━━━━━\n📗 إجمالي المدين: ${formatCurrency(ledgerMetrics.totalDebit)}\n📕 إجمالي الدائن: ${formatCurrency(ledgerMetrics.totalCredit)}\n💰 الرصيد النهائي: ${formatCurrency(ledgerMetrics.closingBalance)}\n📅 الفترة: من ${dateFrom || 'البداية'} إلى ${dateTo || 'الآن'}`}
                />
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                  leftIcon={<Printer size={13} />}
                >
                  طباعة
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Custom Date Pickers when preset is custom */}
        {datePreset === 'custom' && (
          <div className="border-[var(--app-border)]/60 flex flex-wrap items-center gap-3 border-t pt-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--app-text-secondary)]">من تاريخ:</span>
              <input
                type="date"
                value={dateFrom || ''}
                onChange={e => {
                  setDateFrom(e.target.value);
                }}
                className="h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--app-text-secondary)]">إلى تاريخ:</span>
              <input
                type="date"
                value={dateTo || ''}
                onChange={e => {
                  setDateTo(e.target.value);
                }}
                className="h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
              />
            </div>
          </div>
        )}

        {/* Quick Category Chips: Clicking a category maps immediately to its account */}
        {categories.length > 0 && (
          <div className="border-[var(--app-border)]/40 flex flex-wrap items-center gap-1.5 border-t pt-2">
            <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--app-text-secondary)]">
              <Sparkles size={11} className="text-amber-500" />
              <span>فئات المصروفات الشائعة:</span>
            </span>
            {categories.map((cat: any) => {
              if (!cat.account_id) return null;
              const isSelected = selectedAccountId === cat.account_id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedAccountId(cat.account_id);
                  }}
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300'
                      : 'border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text-secondary)] hover:border-blue-400 hover:text-[var(--app-text)]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Account Header Summary & KPI Cards */}
      {selectedAccount && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-[var(--app-surface)] p-3.5 shadow-xs dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]">
              الحساب المحدد
            </p>
            <h4 className="truncate text-sm font-black text-[var(--app-text)]">
              {selectedAccount.name}
            </h4>
            <p dir="ltr" className="font-mono text-xs font-bold text-blue-600">
              {selectedAccount.code} • {selectedAccount.currency_code || 'SAR'}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5 shadow-xs dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              إجمالي المدين (صرف)
            </p>
            <h4
              dir="ltr"
              className="font-mono text-base font-black text-emerald-700 dark:text-emerald-400"
            >
              {formatCurrency(ledgerMetrics.totalDebit)}
            </h4>
            <p className="text-[10px] font-semibold text-emerald-600">
              {ledgerMetrics.count} حركة مقيدة
            </p>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-3.5 shadow-xs dark:border-rose-900/30 dark:bg-rose-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
              إجمالي الدائن (تسوية)
            </p>
            <h4
              dir="ltr"
              className="font-mono text-base font-black text-rose-700 dark:text-rose-400"
            >
              {formatCurrency(ledgerMetrics.totalCredit)}
            </h4>
            <p className="text-[10px] font-semibold text-rose-600">تسويات وعكوسات</p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3.5 shadow-xs dark:border-blue-900/30 dark:bg-blue-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
              الرصيد الختامي
            </p>
            <h4
              dir="ltr"
              className="font-mono text-base font-black text-blue-700 dark:text-blue-400"
            >
              {formatCurrency(Math.abs(ledgerMetrics.closingBalance))}
            </h4>
            <p className="text-[10px] font-bold text-blue-600">
              {ledgerMetrics.closingBalance >= 0 ? 'رصيد مدين' : 'رصيد دائن'}
            </p>
          </div>
        </div>
      )}

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
