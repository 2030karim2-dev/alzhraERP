import React from 'react';
import { formatCurrency, formatNumberDisplay } from '../../../../core/utils';

interface Props {
  invoice: any;
}

const InvoiceItemsTable: React.FC<Props> = ({ invoice }) => {
  return (
    <>
      <table className="w-full text-sm border-collapse border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden mt-4 text-center">
        <thead className="bg-gray-100 dark:bg-slate-800 border-b-2 border-gray-300 dark:border-slate-600">
          <tr>
            <th className="p-3 font-bold text-right border-r border-gray-200 dark:border-slate-700 whitespace-nowrap">رقم القطعة</th>
            <th className="p-3 font-bold text-right border-r border-gray-200 dark:border-slate-700">الصنف</th>
            <th className="p-3 font-bold text-center border-r border-gray-200 dark:border-slate-700">الكمية</th>
            <th className="p-3 font-bold text-center border-r border-gray-200 dark:border-slate-700">السعر</th>
            <th className="p-3 font-bold text-center border-r border-gray-200 dark:border-slate-700">الإجمالي</th>
            <th className="p-3 font-bold text-center">تاريخ الإرجاع</th>
          </tr>
        </thead>
        <tbody>
          {invoice.invoice_items?.map((item: any, index: number) => (
            <tr key={item.id} className={`border-b border-gray-200 dark:border-slate-700 ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50 dark:bg-slate-800/50'}`}>
              <td className="p-3 border-r border-gray-200 dark:border-slate-700 font-mono text-xs whitespace-nowrap">{item.product?.part_number || item.product?.sku || '---'}</td>
              <td className="p-3 font-bold border-r border-gray-200 dark:border-slate-700 text-right">{item.description}</td>
              <td className="p-3 text-center border-r border-gray-200 dark:border-slate-700">
                <span className="inline-flex items-center justify-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-bold">
                  {formatNumberDisplay(item.quantity)}
                </span>
              </td>
              <td className="p-3 text-left font-mono border-r border-gray-200 dark:border-slate-700">
                {formatCurrency(item.unit_price, invoice.currency_code || 'SAR')}
              </td>
              <td className="p-3 text-left font-bold font-mono border-r border-gray-200 dark:border-slate-700">
                {formatCurrency(item.total, invoice.currency_code || 'SAR')}
              </td>
              <td className="p-3 text-center">
                {item.returned_at ? (
                  <span className="text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-2 py-1 rounded">
                    {item.returned_at}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="flex justify-end pt-4">
        <div className="w-64 space-y-2">
          <div className="flex justify-between font-bold p-2 border-b border-gray-200 dark:border-slate-700">
            <span>المجموع:</span>
            <span dir="ltr" className="font-mono">{formatCurrency(((invoice as Record<string, unknown>).subtotal) as number, invoice.currency_code || 'SAR')}</span>
          </div>
          <div className="flex justify-between text-lg font-bold bg-blue-600 text-white p-3 rounded-lg">
            <span>الإجمالي:</span>
            <span dir="ltr" className="font-mono">{formatCurrency(invoice.total_amount, invoice.currency_code || 'SAR')}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceItemsTable;
