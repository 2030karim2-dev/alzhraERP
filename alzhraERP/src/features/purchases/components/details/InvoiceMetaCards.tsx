import React from 'react';
import { User, Phone, MapPin, Calendar, CreditCard, DollarSign } from 'lucide-react';
import { cn, formatCurrency } from '../../../../core/utils';
import type { PurchasePrintInvoice } from '../PurchaseInvoicePrintTemplate';

export interface PurchaseDetailInvoice extends PurchasePrintInvoice {
  id: string;
  company_id: string;
  party_id: string | null;
  payment_method: string | null;
  status: string;
  type?: string;
  currency_code?: string | null;
  exchange_rate?: number | null;
  tax_amount?: number | null;
  discount_amount?: number | null;
  paid_amount?: number | null;
  remaining_amount?: number | null;
}

interface InvoiceMetaCardsProps {
  invoice: PurchaseDetailInvoice;
  totalUnitsCount: number;
}

interface StatusBadgeInfo {
  label: string;
  cls: string;
}

const statusBadge = (status: string): StatusBadgeInfo => {
  switch (status) {
    case 'paid':
      return {
        label: 'مدفوعة بالكامل',
        cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      };
    case 'posted':
      return {
        label: 'مرحّلة ومستلمة',
        cls: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      };
    case 'partial':
    case 'partially_paid':
      return {
        label: 'مدفوعة جزئياً',
        cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      };
    case 'cancelled':
    case 'void':
      return {
        label: 'ملغاة',
        cls: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      };
    default:
      return {
        label: 'مسودة',
        cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      };
  }
};

interface PartyInfo {
  name: string;
  phone: string | null;
  address: string | null;
}

const getPartyInfo = (party: PurchaseDetailInvoice['party']): PartyInfo => {
  if (!party) {
    return { name: 'مورد عام', phone: null, address: null };
  }
  const name =
    typeof party.name === 'string' && party.name.trim().length > 0 ? party.name : 'مورد عام';
  const phone =
    typeof party.phone === 'string' && party.phone.trim().length > 0 ? party.phone : null;
  const address =
    typeof party.address === 'string' && party.address.trim().length > 0 ? party.address : null;
  return { name, phone, address };
};

const SupplierCard: React.FC<{ invoice: PurchaseDetailInvoice }> = ({ invoice }) => {
  const { name, phone, address } = getPartyInfo(invoice.party);

  return (
    <div className="col-span-2 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 shadow-xs dark:border-slate-700/80 dark:bg-slate-800/60 sm:col-span-1 sm:p-3">
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
          <User size={13} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-wider">المورد</span>
        </div>
        <p
          className="truncate text-xs font-bold text-slate-900 dark:text-slate-100 sm:text-sm"
          title={name}
        >
          {name}
        </p>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-slate-200/60 pt-1.5 text-[10px] text-slate-500 dark:border-slate-700/40 dark:text-slate-400 sm:text-[11px]">
        {phone !== null && (
          <div className="flex items-center gap-1">
            <Phone size={11} className="text-slate-400" />
            <span dir="ltr" className="font-mono">
              {phone}
            </span>
          </div>
        )}
        {address !== null && (
          <div className="flex items-center gap-1 truncate">
            <MapPin size={11} className="shrink-0 text-slate-400" />
            <span className="truncate">{address}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const DatesCard: React.FC<{ invoice: PurchaseDetailInvoice }> = ({ invoice }) => {
  const dueDate = invoice.due_date ?? invoice.issue_date;
  return (
    <div className="col-span-1 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 shadow-xs dark:border-slate-700/80 dark:bg-slate-800/60 sm:p-3">
      <div>
        <div className="mb-1 flex items-center gap-1 text-slate-400 dark:text-slate-500">
          <Calendar size={13} className="text-purple-500" />
          <span className="text-[10px] font-black uppercase tracking-wider">التواريخ</span>
        </div>
        <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">التوريد:</span>
          <span dir="ltr" className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {invoice.issue_date}
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[10px] dark:border-slate-700/40 sm:text-[11px]">
        <span className="text-slate-500 dark:text-slate-400">الاستحقاق:</span>
        <span dir="ltr" className="font-mono font-bold text-slate-700 dark:text-slate-300">
          {dueDate}
        </span>
      </div>
    </div>
  );
};

const StatusCard: React.FC<{ invoice: PurchaseDetailInvoice }> = ({ invoice }) => {
  const badge = statusBadge(invoice.status);
  const paymentMethodLabel =
    invoice.payment_method === 'cash'
      ? 'نقداً'
      : invoice.payment_method === 'credit'
        ? 'آجل'
        : 'تحويل';

  return (
    <div className="col-span-1 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 shadow-xs dark:border-slate-700/80 dark:bg-slate-800/60 sm:p-3">
      <div>
        <div className="mb-1 flex items-center gap-1 text-slate-400 dark:text-slate-500">
          <CreditCard size={13} className="text-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-wider">الحالة والدفع</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'rounded-lg border px-1.5 py-0.5 text-[10px] font-black sm:text-xs',
              badge.cls
            )}
          >
            {badge.label}
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[10px] dark:border-slate-700/40 sm:text-[11px]">
        <span className="text-slate-500 dark:text-slate-400">السداد:</span>
        <span className="font-bold text-slate-800 dark:text-slate-200">{paymentMethodLabel}</span>
      </div>
    </div>
  );
};

const TotalCard: React.FC<{ invoice: PurchaseDetailInvoice; totalUnitsCount: number }> = ({
  invoice,
  totalUnitsCount,
}) => {
  const itemsCount = (invoice.invoice_items ?? []).length;
  const currencyCode = invoice.currency_code ?? 'SAR';

  return (
    <div className="col-span-2 flex flex-col justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 shadow-xs dark:border-blue-900/60 dark:bg-blue-950/40 sm:col-span-1 sm:p-3">
      <div>
        <div className="mb-1 flex items-center gap-1 text-blue-600 dark:text-blue-400">
          <DollarSign size={13} />
          <span className="text-[10px] font-black uppercase tracking-wider">إجمالي الفاتورة</span>
        </div>
        <p
          dir="ltr"
          className="font-mono text-base font-black text-blue-700 dark:text-blue-300 sm:text-lg"
        >
          {formatCurrency(invoice.total_amount, currencyCode)}
        </p>
      </div>
      <div className="mt-1.5 flex items-center justify-between border-t border-blue-200/60 pt-1.5 text-[10px] dark:border-blue-800/40 sm:text-[11px]">
        <span className="text-blue-700/80 dark:text-blue-400">عدد الأصناف:</span>
        <span className="font-mono font-bold text-blue-900 dark:text-blue-200">
          {itemsCount} صنف ({totalUnitsCount} وحدة)
        </span>
      </div>
    </div>
  );
};

export const InvoiceMetaCards: React.FC<InvoiceMetaCardsProps> = ({ invoice, totalUnitsCount }) => {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
      <SupplierCard invoice={invoice} />
      <DatesCard invoice={invoice} />
      <StatusCard invoice={invoice} />
      <TotalCard invoice={invoice} totalUnitsCount={totalUnitsCount} />
    </div>
  );
};
