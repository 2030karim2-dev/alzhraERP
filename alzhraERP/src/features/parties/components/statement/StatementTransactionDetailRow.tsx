import React, { useEffect, useState } from 'react';
import { Loader2, Package, CheckCircle2, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import {
  partiesService,
  type StatementMovement,
  type StatementTransactionDetails,
} from '../../service';
import { formatCurrency } from '../../../../core/utils';

interface Props {
  movement: StatementMovement;
  partyName?: string | undefined;
  onOpenInvoiceModal?: (invoiceId: string) => void;
  onOpenBondModal?: (bondId: string, movement: StatementMovement) => void;
}

export const StatementTransactionDetailRow: React.FC<Props> = ({
  movement,
  partyName: _partyName,
  onOpenInvoiceModal,
  onOpenBondModal,
}) => {
  const [details, setDetails] = useState<StatementTransactionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!movement.reference_id || !movement.reference_type) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    partiesService
      .getTransactionDetails(movement.reference_type, movement.reference_id)
      .then(res => {
        if (isMounted) {
          setDetails(res);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err?.message || 'تعذر تحميل تفاصيل الحركة');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [movement.reference_id, movement.reference_type]);

  if (!movement.reference_id || !movement.reference_type) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
        حركة محاسبية عامة لا ترتبط بمستند خارجي مستقل. البيان: {movement.desc || '—'}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50/40 p-6 text-xs text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300">
        <Loader2 size={16} className="animate-spin" />
        <span>جاري تحميل تفاصيل وبنود المعاملة ({movement.ref})...</span>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
        <AlertCircle size={15} />
        <span>{error || 'لا تتوفر تفاصيل إضافية لهذه المعاملة'}</span>
      </div>
    );
  }

  // 1. Invoices
  if (details.kind === 'invoice') {
    const items = details.items || [];
    return (
      <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/90 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              بنود الفاتورة ({details.invoice_number})
            </span>
            <span className="text-[10px] text-slate-500">({items.length} أصناف)</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              الإجمالي:{' '}
              <strong className="font-mono text-slate-900 dark:text-white" dir="ltr">
                {formatCurrency(details.total_amount || 0, details.currency_code)}
              </strong>
            </span>
            {details.paid_amount !== undefined && details.paid_amount > 0 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                المدفوع:{' '}
                <strong className="font-mono" dir="ltr">
                  {formatCurrency(details.paid_amount, details.currency_code)}
                </strong>
              </span>
            )}
            {details.remaining_amount !== undefined && details.remaining_amount > 0 && (
              <span className="text-xs text-rose-600 dark:text-rose-400">
                المتبقي:{' '}
                <strong className="font-mono" dir="ltr">
                  {formatCurrency(details.remaining_amount, details.currency_code)}
                </strong>
              </span>
            )}

            {onOpenInvoiceModal && movement.reference_id && (
              <button
                type="button"
                onClick={() => onOpenInvoiceModal(movement.reference_id!)}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300"
              >
                <span>عرض الفاتورة والطباعة</span>
                <ArrowRight size={12} className="rotate-180" />
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="py-2 text-center text-xs italic text-slate-500">
            لا توجد بنود مسجلة داخل الفاتورة.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
            <table className="w-full border-collapse border border-slate-300 text-right text-xs dark:border-slate-700">
              <thead>
                <tr className="bg-slate-100/90 text-[10px] font-bold text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                  <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                    #
                  </th>
                  <th className="border border-slate-300 px-3 py-2 dark:border-slate-700">
                    الصنف / الوصف
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                    رقم القطعة / SKU
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                    الكمية
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                    سعر الوحدة
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                    الخصم
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                    الإجمالي
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="border border-slate-300 px-3 py-1.5 text-center font-mono text-[10px] text-slate-400 dark:border-slate-700">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-200">
                      {it.item_name}
                    </td>
                    <td className="border border-slate-300 px-3 py-1.5 text-center font-mono text-[11px] text-slate-500 dark:border-slate-700">
                      {it.part_number || it.sku || '—'}
                    </td>
                    <td className="border border-slate-300 px-3 py-1.5 text-center font-mono font-bold text-blue-600 dark:border-slate-700">
                      {it.quantity}
                    </td>
                    <td
                      className="border border-slate-300 px-3 py-1.5 text-center font-mono dark:border-slate-700"
                      dir="ltr"
                    >
                      {formatCurrency(it.unit_price, details.currency_code)}
                    </td>
                    <td
                      className="border border-slate-300 px-3 py-1.5 text-center font-mono text-slate-500 dark:border-slate-700"
                      dir="ltr"
                    >
                      {it.discount_amount
                        ? formatCurrency(it.discount_amount, details.currency_code)
                        : '—'}
                    </td>
                    <td
                      className="border border-slate-300 px-3 py-1.5 text-center font-mono font-bold text-slate-900 dark:border-slate-700 dark:text-white"
                      dir="ltr"
                    >
                      {formatCurrency(it.total_amount, details.currency_code)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // 2. Bonds (Payment / Receipt)
  if (details.kind === 'bond') {
    const allocations = details.allocations || [];
    return (
      <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/90 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              تفاصيل السند ({details.payment_number || movement.ref})
            </span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {details.type === 'receipt' ? 'سند قبض' : 'سند صرف'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              طريقة الدفع:{' '}
              <strong className="text-slate-800 dark:text-slate-100">
                {details.payment_method === 'cash'
                  ? 'نقداً'
                  : details.payment_method === 'bank'
                    ? 'تحويل بنكي'
                    : details.payment_method || 'نقداً'}
              </strong>
            </span>
            {details.account_name && (
              <span className="text-xs text-slate-600 dark:text-slate-300">
                الحساب:{' '}
                <strong className="text-slate-800 dark:text-slate-100">
                  {details.account_name}
                </strong>
              </span>
            )}
            {onOpenBondModal && movement.reference_id && (
              <button
                type="button"
                onClick={() => onOpenBondModal(movement.reference_id!, movement)}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300"
              >
                <span>عرض وطباعة السند</span>
                <ArrowRight size={12} className="rotate-180" />
              </button>
            )}
          </div>
        </div>

        {allocations.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              الفواتير المسواة بهذا السند:
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
              <table className="w-full border-collapse border border-slate-300 text-right text-xs dark:border-slate-700">
                <thead>
                  <tr className="bg-slate-100/90 text-[10px] font-bold text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                    <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                      #
                    </th>
                    <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                      رقم الفاتورة
                    </th>
                    <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                      تاريخ الفاتورة
                    </th>
                    <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                      إجمالي الفاتورة
                    </th>
                    <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                      المبلغ المسوّى بالسند
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((al, idx) => (
                    <tr
                      key={al.allocation_id || idx}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <td className="border border-slate-300 px-3 py-1.5 text-center font-mono text-[10px] text-slate-400 dark:border-slate-700">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 text-center font-mono font-bold text-blue-600 dark:border-slate-700">
                        {al.invoice_number}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 text-center font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300">
                        {al.invoice_date || '—'}
                      </td>
                      <td
                        className="border border-slate-300 px-3 py-1.5 text-center font-mono font-semibold dark:border-slate-700"
                        dir="ltr"
                      >
                        {al.invoice_total
                          ? formatCurrency(al.invoice_total, details.currency_code)
                          : '—'}
                      </td>
                      <td
                        className="border border-slate-300 px-3 py-1.5 text-center font-mono font-bold text-emerald-600 dark:border-slate-700"
                        dir="ltr"
                      >
                        {formatCurrency(al.allocated_amount, details.currency_code)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Manual Journal Entries
  if (details.kind === 'journal') {
    const lines = details.lines || [];
    return (
      <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/90 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              بنود القيد المحاسبي (
              {details.entry_number ? `JV-${details.entry_number}` : movement.ref})
            </span>
            <span className="text-[10px] text-slate-500">({lines.length} أسطر)</span>
          </div>
          {details.entry_date && (
            <span className="text-xs text-slate-600 dark:text-slate-300">
              التاريخ: <strong className="font-mono">{details.entry_date}</strong>
            </span>
          )}
        </div>

        {lines.length === 0 ? (
          <p className="py-2 text-center text-xs italic text-slate-500">
            لا توجد أسطر مفصلة لهذا القيد.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
            <table className="w-full border-collapse border border-slate-300 text-right text-xs dark:border-slate-700">
              <thead>
                <tr className="bg-slate-100/90 text-[10px] font-bold text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                  <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                    #
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                    رقم الحساب
                  </th>
                  <th className="border border-slate-300 px-3 py-2 dark:border-slate-700">
                    اسم الحساب
                  </th>
                  <th className="border border-slate-300 px-3 py-2 dark:border-slate-700">
                    البيان
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                    مدين (+)
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-center dark:border-slate-700">
                    دائن (-)
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="border border-slate-300 px-3 py-1.5 text-center font-mono text-[10px] text-slate-400 dark:border-slate-700">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 px-3 py-1.5 text-center font-mono font-bold text-blue-600 dark:border-slate-700">
                      {l.account_code || '—'}
                    </td>
                    <td className="border border-slate-300 px-3 py-1.5 font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-200">
                      {l.account_name || '—'}
                    </td>
                    <td className="border border-slate-300 px-3 py-1.5 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                      {l.description || '—'}
                    </td>
                    <td
                      className="border border-slate-300 px-3 py-1.5 text-center font-mono font-bold text-emerald-600 dark:border-slate-700"
                      dir="ltr"
                    >
                      {l.debit > 0 ? formatCurrency(l.debit, l.currency_code || 'SAR') : '—'}
                    </td>
                    <td
                      className="border border-slate-300 px-3 py-1.5 text-center font-mono font-bold text-rose-600 dark:border-slate-700"
                      dir="ltr"
                    >
                      {l.credit > 0 ? formatCurrency(l.credit, l.currency_code || 'SAR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // 4. Opening Balance / General
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
      <p>
        <strong>تفاصيل القيد:</strong> {movement.desc || 'رصيد افتتاحي مسجل للطرف'}
      </p>
    </div>
  );
};
