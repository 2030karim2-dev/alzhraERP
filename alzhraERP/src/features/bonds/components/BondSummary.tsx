import React from 'react';
import { cn, formatCurrency } from '../../../core/utils';
import type { BondType } from '../types';

interface PartyLike {
  name?: string | null;
}
interface AccountLike {
  name?: string | null;
}

interface BondSummaryProps {
  type: BondType;
  themeTitle: string;
  counterpartyType: string;
  enteredAmount: number;
  selectedCurrency: string;
  selectedCashAccount: AccountLike | null | undefined;
  selectedCounterpartyAccount: AccountLike | null | undefined;
  selectedParty: PartyLike | null | undefined;
  selectedInvoiceId: string | null | undefined;
}

interface SummaryRowProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ label, value, valueClassName }) => (
  <div className="flex items-center justify-between text-slate-500">
    <span>{label}</span>
    <span className={cn('font-bold text-slate-900 dark:text-white', valueClassName)}>{value}</span>
  </div>
);

const UNSET_LABEL = 'لم يُحدد بعد';

/** Resolve the counterparty display name for the summary row. */
const resolveCounterpartyName = (
  counterpartyType: string,
  selectedParty: PartyLike | null | undefined,
  selectedCounterpartyAccount: AccountLike | null | undefined
): string => {
  const name =
    counterpartyType === 'party' ? selectedParty?.name : selectedCounterpartyAccount?.name;
  return name ?? UNSET_LABEL;
};

/** True when a specific invoice is linked for settlement. */
const hasLinkedInvoice = (invoiceId: string | null | undefined): boolean =>
  invoiceId !== undefined && invoiceId !== null && invoiceId !== '';

const NET_AMOUNT_TONE: Record<BondType, string> = {
  receipt: 'text-emerald-600',
  payment: 'text-rose-600',
  transfer: 'text-rose-600',
};

/** Executive summary card shown before the bond is committed. */
export const BondSummary: React.FC<BondSummaryProps> = ({
  type,
  themeTitle,
  counterpartyType,
  enteredAmount,
  selectedCurrency,
  selectedCashAccount,
  selectedCounterpartyAccount,
  selectedParty,
  selectedInvoiceId,
}) => {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30 sm:rounded-3xl sm:p-5">
      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
        ملخص السند قبل الاعتماد
      </h4>
      <div className="space-y-2 text-xs">
        <SummaryRow label="نوع العملية:" value={themeTitle} />
        <SummaryRow
          label="الطرف المقابل:"
          value={resolveCounterpartyName(
            counterpartyType,
            selectedParty,
            selectedCounterpartyAccount
          )}
        />
        <SummaryRow label="الصندوق / البنك:" value={selectedCashAccount?.name ?? UNSET_LABEL} />
        {hasLinkedInvoice(selectedInvoiceId) && (
          <SummaryRow
            label="الفاتورة المرتبطة:"
            value="نعم (محددة للسداد)"
            valueClassName="font-mono font-bold text-blue-600 dark:text-blue-400"
          />
        )}
        <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
          <span className="font-bold text-slate-700 dark:text-slate-300">المبلغ الصافي:</span>
          <span
            className={cn(
              'font-mono text-base font-black',
              // eslint-disable-next-line security/detect-object-injection -- type is a closed BondType union key
              NET_AMOUNT_TONE[type]
            )}
          >
            {formatCurrency(enteredAmount, selectedCurrency)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BondSummary;
