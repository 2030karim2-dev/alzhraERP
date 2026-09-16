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

      {/* المبالغ */}
      <div className="mb-4 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          المبالغ والتحصيل:
        </div>
        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr className="border-b border-slate-300 dark:border-slate-700">
              <td className="border-e border-slate-300 p-1.5 text-start font-mono font-bold text-blue-600 dark:border-slate-700 dark:text-blue-400">
                {data.net_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="bg-slate-50/50 p-1.5 text-end font-semibold text-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
                الصافي النهائي:
              </td>
            </tr>
            <tr className="border-b border-slate-300 dark:border-slate-700">
              <td className="border-e border-slate-300 p-1.5 text-start font-mono text-emerald-600 dark:border-slate-700 dark:text-emerald-400">
                {data.paid_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="bg-slate-50/50 p-1.5 text-end font-semibold text-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
                المدفوع للآن:
              </td>
            </tr>
            <tr>
              <td className="border-e border-slate-300 p-1.5 text-start font-mono font-bold text-rose-600 dark:border-slate-700 dark:text-rose-400">
                {data.remaining_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="bg-slate-50/50 p-1.5 text-end font-bold text-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
                المتبقي (الرصيد):
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ملاحظات وتفاصيل */}
      {(data.notes || data.customer_ref || data.created_by_name) && (
        <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
          <div className="mb-2 font-bold text-slate-700 dark:text-slate-300">
            ملاحظات وتفاصيل إضافية:
          </div>
          <div className="flex flex-col space-y-1.5">
            {data.created_by_name && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">تم الإنشاء بواسطة:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {data.created_by_name}
                </span>
              </div>
            )}
            {data.customer_ref && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">الرقم المرجعي للعميل:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {data.customer_ref}
                </span>
              </div>
            )}
            {data.notes && (
              <div className="mt-1 border-t border-slate-200 pt-1 dark:border-slate-700">
                <span className="mb-0.5 block text-[10px] text-slate-500">الملاحظات:</span>
                <span className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">
                  {data.notes}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
