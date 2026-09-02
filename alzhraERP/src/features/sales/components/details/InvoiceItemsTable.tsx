import React from 'react';
import { formatCurrency, formatNumberDisplay } from '../../../../core/utils';
import { Package } from 'lucide-react';

interface Props {
  invoice: any;
}

const InvoiceItemsTable: React.FC<Props> = ({ invoice }) => {
  const items = invoice?.invoice_items || [];

  if (!items || items.length === 0) {
    return (
      <div className="my-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/30">
        <Package size={28} className="mx-auto mb-2 text-slate-400 opacity-60" />
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
          لا توجد أصناف مسجلة في بنود هذه الفاتورة
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          تم قيد الفاتورة بمبلغ إجمالي قدره{' '}
          {formatCurrency(invoice?.total_amount || 0, invoice?.currency_code || 'SAR')}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="custom-scrollbar overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full min-w-[560px] border-collapse text-right text-xs sm:min-w-full">
          <thead className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
            <tr>
              <th className="w-10 px-3 py-2 text-center">#</th>
              <th className="border-r border-slate-200 px-3 py-2 dark:border-slate-700">
                الصنف / الوصف
              </th>
              <th className="w-28 border-r border-slate-200 px-3 py-2 text-center dark:border-slate-700">
                رقم القطعة / SKU
              </th>
              <th className="w-20 border-r border-slate-200 px-3 py-2 text-center dark:border-slate-700">
                الكمية
              </th>
              <th className="w-24 border-r border-slate-200 px-3 py-2 text-left dark:border-slate-700">
                السعر
              </th>
              <th className="w-28 border-r border-slate-200 px-3 py-2 text-left dark:border-slate-700">
                الإجمالي
              </th>
              <th className="w-24 px-3 py-2 text-center">المرتجع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 dark:divide-slate-800 dark:text-slate-200">
            {items.map((item: any, index: number) => {
              const partNumber =
                item.product?.part_number ||
                item.product?.sku ||
                item.part_number ||
                item.sku ||
                '---';
              const name = item.description || item.product?.name_ar || item.name || 'صنف بدون اسم';

              return (
                <tr
                  key={item.id || index}
                  className={`transition-colors ${
                    index % 2 === 0
                      ? 'bg-[var(--app-surface)]'
                      : 'bg-slate-50/60 dark:bg-slate-800/40'
                  } hover:bg-blue-50/50 dark:hover:bg-blue-900/20`}
                >
                  <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-400">
                    {index + 1}
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2 font-bold dark:border-slate-700">
                    <div className="flex flex-col">
                      <span className="text-xs">{name}</span>
                      {item.product?.brand && (
                        <span className="text-[10px] font-normal text-slate-400">
                          الماركة: {item.product.brand}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2 text-center font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                      {partNumber}
                    </span>
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2 text-center dark:border-slate-700">
                    <span className="inline-flex items-center justify-center rounded-md bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                      {formatNumberDisplay(item.quantity)}
                    </span>
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2 text-left font-mono dark:border-slate-700">
                    {formatCurrency(item.unit_price, invoice.currency_code || 'SAR')}
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2 text-left font-mono font-bold text-emerald-600 dark:border-slate-700 dark:text-emerald-400">
                    {formatCurrency(
                      item.total || item.quantity * item.unit_price,
                      invoice.currency_code || 'SAR'
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {item.returned_at ? (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                        مرتجع
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Compact Financial Summary footer */}
      <div className="flex justify-end pt-2">
        <div className="w-full space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/80 sm:w-72">
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>مجموع البنود:</span>
            <span dir="ltr" className="font-mono font-bold">
              {formatCurrency(
                Number(invoice.subtotal) || Number(invoice.total_amount) || 0,
                invoice.currency_code || 'SAR'
              )}
            </span>
          </div>
          {Number(invoice.tax_amount) > 0 && (
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>ضريبة القيمة المضافة:</span>
              <span dir="ltr" className="font-mono font-bold text-amber-600">
                {formatCurrency(invoice.tax_amount, invoice.currency_code || 'SAR')}
              </span>
            </div>
          )}
          {Number(invoice.discount_amount) > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>الخصم:</span>
              <span dir="ltr" className="font-mono font-bold">
                -{formatCurrency(invoice.discount_amount, invoice.currency_code || 'SAR')}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-black text-slate-900 dark:border-slate-700 dark:text-slate-100">
            <span>الصافي النهائي:</span>
            <span dir="ltr" className="font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(invoice.total_amount, invoice.currency_code || 'SAR')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceItemsTable;
