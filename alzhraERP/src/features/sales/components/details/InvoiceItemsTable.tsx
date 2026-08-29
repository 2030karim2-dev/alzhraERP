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
      <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center my-3 bg-slate-50/50 dark:bg-slate-800/30">
        <Package size={28} className="mx-auto text-slate-400 mb-2 opacity-60" />
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
          لا توجد أصناف مسجلة في بنود هذه الفاتورة
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          تم قيد الفاتورة بمبلغ إجمالي قدره {formatCurrency(invoice?.total_amount || 0, invoice?.currency_code || 'SAR')}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 custom-scrollbar">
        <table className="w-full text-xs border-collapse text-right">
          <thead className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold">
            <tr>
              <th className="py-2 px-3 text-center w-10">#</th>
              <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700">الصنف / الوصف</th>
              <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-center w-28">رقم القطعة / SKU</th>
              <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-center w-20">الكمية</th>
              <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-left w-24">السعر</th>
              <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-left w-28">الإجمالي</th>
              <th className="py-2 px-3 text-center w-24">المرتجع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
            {items.map((item: any, index: number) => {
              const partNumber = item.product?.part_number || item.product?.sku || item.part_number || item.sku || '---';
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
                  <td className="py-2 px-3 text-center font-mono text-slate-400 text-[11px]">
                    {index + 1}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 font-bold">
                    <div className="flex flex-col">
                      <span className="text-xs">{name}</span>
                      {item.product?.brand && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          الماركة: {item.product.brand}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      {partNumber}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-md font-bold font-mono text-xs">
                      {formatNumberDisplay(item.quantity)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-left font-mono border-r border-slate-200 dark:border-slate-700">
                    {formatCurrency(item.unit_price, invoice.currency_code || 'SAR')}
                  </td>
                  <td className="py-2 px-3 text-left font-bold font-mono text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">
                    {formatCurrency(item.total || item.quantity * item.unit_price, invoice.currency_code || 'SAR')}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {item.returned_at ? (
                      <span className="text-[10px] bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">
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
        <div className="w-72 bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>مجموع البنود:</span>
            <span dir="ltr" className="font-mono font-bold">
              {formatCurrency(
                Number((invoice as any).subtotal) || Number(invoice.total_amount) || 0,
                invoice.currency_code || 'SAR'
              )}
            </span>
          </div>
          {Number((invoice as any).tax_amount) > 0 && (
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>ضريبة القيمة المضافة:</span>
              <span dir="ltr" className="font-mono font-bold text-amber-600">
                {formatCurrency((invoice as any).tax_amount, invoice.currency_code || 'SAR')}
              </span>
            </div>
          )}
          {Number((invoice as any).discount_amount) > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>الخصم:</span>
              <span dir="ltr" className="font-mono font-bold">
                -{formatCurrency((invoice as any).discount_amount, invoice.currency_code || 'SAR')}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black pt-1.5 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
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
