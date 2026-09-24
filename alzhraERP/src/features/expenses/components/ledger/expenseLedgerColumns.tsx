/* eslint-disable max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import type { Account, LedgerEntry } from '../../../accounting/types';
import { isDebitNormalAccount } from '../../../accounting/utils/ledgerBalance';
import { formatCurrency, formatNumberDisplay } from '@/core/utils';

export function getExpenseLedgerColumns(selectedAccount?: Account | null) {
  const code = selectedAccount?.code || '';
  const name = selectedAccount?.name || '';
  const isDebitNormal = isDebitNormalAccount(selectedAccount?.type);
  const isEmployeeOrCustody =
    code.startsWith('140') ||
    name.includes('راتب') ||
    name.includes('عهدة') ||
    name.includes('سلفة');
  const isRentAccount = code.startsWith('240') || name.includes('إيجار') || name.includes('ايجار');
  const isCashbox = code.startsWith('101') || code.startsWith('102') || name.includes('صندوق');

  const debitTitle = isRentAccount
    ? 'عليه (+) سحبيات مبيعات / دفعات'
    : isEmployeeOrCustody
      ? 'عليه (+) صرف سلفة / نقدية / عهدة'
      : isCashbox
        ? 'وارد للصندوق (إيداع +)'
        : 'عليه (+) صرف / استحقاق';

  const creditTitle = isRentAccount
    ? 'له (-) استحقاق الإيجار الشهري'
    : isEmployeeOrCustody
      ? 'له (-) استحقاق راتب / تسديد عهدة'
      : isCashbox
        ? 'منصرف من الصندوق (دفع -)'
        : 'له (-) سداد / تسوية';

  return [
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
              <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                {row.party_name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: debitTitle,
      accessor: (row: LedgerEntry) => (
        <div className="space-y-0.5 text-left">
          <div
            dir="ltr"
            className={`font-mono text-xs font-bold ${
              row.debit_amount > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-gray-300 dark:text-slate-600'
            }`}
          >
            {row.debit_amount > 0 ? formatCurrency(row.debit_amount) : '-'}
          </div>
          {row.debit_amount > 0 && (
            <div className="flex items-center gap-1">
              <span className="rounded bg-rose-50 px-1 py-0.5 text-[10px] font-extrabold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                عليه (+)
              </span>
            </div>
          )}
          {row.foreign_amount &&
          row.foreign_amount > 0 &&
          Math.abs(row.debit_amount - row.foreign_amount) > 0.01 ? (
            <div
              dir="ltr"
              className="font-mono text-[10px] font-semibold text-rose-700/80 dark:text-rose-400/80"
            >
              ({formatCurrency(row.foreign_amount, row.currency_code)})
            </div>
          ) : null}
        </div>
      ),
      className: 'w-36',
      footer: (data: LedgerEntry[]) => (
        <div className="flex flex-col items-start gap-0.5 text-left">
          <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">
            إجمالي عليه (+)
          </span>
          <span dir="ltr" className="font-mono text-xs font-black text-rose-700 dark:text-rose-400">
            {formatCurrency(data.reduce((sum, row) => sum + (row.debit_amount || 0), 0))}
          </span>
        </div>
      ),
    },
    {
      header: creditTitle,
      accessor: (row: LedgerEntry) => (
        <div className="space-y-0.5 text-left">
          <div
            dir="ltr"
            className={`font-mono text-xs font-bold ${
              row.credit_amount > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-300 dark:text-slate-600'
            }`}
          >
            {row.credit_amount > 0 ? formatCurrency(row.credit_amount) : '-'}
          </div>
          {row.credit_amount > 0 && (
            <div className="flex items-center gap-1">
              <span className="rounded bg-emerald-50 px-1 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                له (-)
              </span>
            </div>
          )}
          {row.foreign_amount &&
          row.foreign_amount > 0 &&
          Math.abs(row.credit_amount - row.foreign_amount) > 0.01 ? (
            <div
              dir="ltr"
              className="font-mono text-[10px] font-semibold text-emerald-700/80 dark:text-emerald-400/80"
            >
              ({formatCurrency(row.foreign_amount, row.currency_code)})
            </div>
          ) : null}
        </div>
      ),
      className: 'w-36',
      footer: (data: LedgerEntry[]) => (
        <div className="flex flex-col items-start gap-0.5 text-left">
          <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">
            إجمالي له (-)
          </span>
          <span
            dir="ltr"
            className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400"
          >
            {formatCurrency(data.reduce((sum, row) => sum + (row.credit_amount || 0), 0))}
          </span>
        </div>
      ),
    },
    {
      header: 'الرصيد التراكمي (له / عليه)',
      accessor: (row: LedgerEntry) => {
        const isCredit = isDebitNormal ? row.balance < 0 : row.balance > 0;
        const isZero = Math.abs(row.balance) < 0.001;
        const isForeign = Boolean(
          row.foreign_balance !== undefined && row.currency_code && row.currency_code !== 'SAR'
        );

        if (isZero) {
          return (
            <div className="py-1 text-left">
              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-bold text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                متزن (خالص)
              </span>
            </div>
          );
        }

        const badgeText = isCredit ? 'له' : 'عليه';

        return (
          <div className="space-y-0.5 text-left">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                  isCredit
                    ? 'border border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'border border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                }`}
              >
                {badgeText}
              </span>
              <span
                dir="ltr"
                className={`font-mono text-xs font-black ${
                  isCredit
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {isForeign
                  ? formatCurrency(Math.abs(row.foreign_balance ?? 0), row.currency_code)
                  : formatCurrency(Math.abs(row.balance))}
              </span>
            </div>
            {isForeign && (
              <div dir="ltr" className="font-mono text-[10px] text-gray-400">
                ≈ {formatCurrency(Math.abs(row.balance), 'SAR')}
              </div>
            )}
          </div>
        );
      },
      className: 'w-44 bg-gray-50/50 dark:bg-slate-800/40',
      footer: (data: LedgerEntry[]) => {
        const lastRow = data.length > 0 ? data[data.length - 1] : null;
        const finalBal = lastRow ? lastRow.balance : 0;
        const isCredit = isDebitNormal ? finalBal < 0 : finalBal > 0;
        const isZero = Math.abs(finalBal) < 0.001;

        return (
          <div className="flex flex-col items-start gap-0.5 text-left">
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">
              صافي الرصيد
            </span>
            {isZero ? (
              <span className="text-xs font-bold text-gray-500">متزن (خالص)</span>
            ) : (
              <div className="flex items-center gap-1">
                <span
                  className={`rounded px-1 text-[10px] font-black ${
                    isCredit
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {isCredit ? 'له' : 'عليه'}
                </span>
                <span
                  dir="ltr"
                  className={`font-mono text-xs font-black ${
                    isCredit
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {formatCurrency(Math.abs(finalBal))}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
  ];
}
