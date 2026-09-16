import React from 'react';
import type { InvoiceCompanionData } from '../types';

interface InvoiceSummaryGridProps {
  data: InvoiceCompanionData;
}

export const InvoiceSummaryGrid: React.FC<InvoiceSummaryGridProps> = ({ data }) => {
  const rows = [
    { label: 'الفرع:', value: data.branch_name },
    { label: 'المستودع:', value: data.warehouse_name },
    { label: 'التاريخ:', value: data.issue_date },
    {
      label: 'العملة:',
      value:
        data.currency_code === 'SAR'
          ? 'ريال سعودي'
          : data.currency_code === 'YER'
            ? 'ريال يمني'
            : data.currency_code,
    },
    { label: 'المعادل:', value: data.exchange_rate.toFixed(2), isNumber: true },
    { label: 'طريقة الدفع:', value: data.payment_method },
    { label: 'عدد البنود:', value: data.items_count, isNumber: true },
    { label: 'مجموع الكميات:', value: data.total_quantity.toFixed(2), isNumber: true },
    { label: 'مجموع المصاريف:', value: data.expenses_amount.toFixed(2), isNumber: true },
    { label: 'إجمالي:', value: data.subtotal.toFixed(2), isNumber: true },
    { label: 'مجموع الخصميات:', value: data.discount_amount.toFixed(2), isNumber: true },
    { label: 'مجموع الإضافات:', value: data.additions_amount.toFixed(2), isNumber: true },
    { label: 'قيمة ضر. مضافه:', value: data.tax_amount.toFixed(2), isNumber: true },
    { label: 'إجمالي صافي:', value: data.net_total.toFixed(2), isNumber: true, isHighlight: true },
    { label: 'الدفعه:', value: data.paid_amount.toFixed(2), isNumber: true },
    {
      label: 'المتبقي:',
      value: data.remaining_amount.toFixed(2),
      isNumber: true,
      isAlert: data.remaining_amount > 0,
    },
    ...(data.estimated_profit !== undefined
      ? [
          {
            label: 'ربح الفاتورة:',
            value: `${data.estimated_profit.toFixed(2)} (${data.profit_percentage || 0}%)`,
            isNumber: true,
            isProfit: true,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col text-xs text-slate-800 dark:text-slate-100">
      {/* رأس الفاتورة الأزرق (مصمت ومميز) */}
      <div className="mb-3 rounded-lg bg-blue-600 p-3 text-center font-bold text-white shadow-sm dark:bg-blue-800">
        <div className="text-sm tracking-wide">فاتورة مبيع ، رقم: {data.invoice_number}</div>
      </div>

      {/* جدول شبكة الإكسل المحاسبية بخطوط واضحة */}
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full border-collapse text-xs">
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className={`border-b border-slate-300 last:border-b-0 hover:bg-blue-50/40 dark:border-slate-700 dark:hover:bg-slate-800/40 ${
                  row.isHighlight ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                }`}
              >
                {/* عمود القيمة (اليسار في RTL) */}
                <td
                  className={`border-e border-slate-300 p-2 text-start font-mono dark:border-slate-700 ${
                    row.isHighlight
                      ? 'text-sm font-bold text-blue-700 dark:text-blue-300'
                      : row.isAlert
                        ? 'font-bold text-rose-600 dark:text-rose-400'
                        : row.isProfit
                          ? 'font-bold text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                  }`}
                  style={{ width: '45%' }}
                >
                  {row.value}
                </td>

                {/* عمود العنوان (اليمين في RTL) */}
                <td
                  className="bg-slate-50/50 p-2 text-end font-semibold text-slate-700 dark:bg-slate-800/30 dark:text-slate-300"
                  style={{ width: '55%' }}
                >
                  {row.label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
