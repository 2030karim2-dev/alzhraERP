import React from 'react';
import type { PartyCompanionData } from '../types';

interface PartyCurrencyGridProps {
  data: PartyCompanionData;
}

export const PartyCurrencyGrid: React.FC<PartyCurrencyGridProps> = ({ data }) => {
  return (
    <div className="flex flex-col text-xs text-slate-800 dark:text-slate-100">
      {/* رأس البيانات (مصمت ومميز) */}
      <div className="mb-3 rounded-lg bg-blue-600 p-3 text-center font-bold text-white shadow-sm dark:bg-blue-800">
        <div className="text-sm tracking-wide">
          {data.code ? `${data.code} - ` : ''}
          {data.name}
          {data.phone ? ` / ${data.phone}` : ''}
        </div>
      </div>

      <div className="px-2 pb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span>{data.type === 'supplier' ? 'المورد:' : 'العميل:'}</span>{' '}
        <span className="font-bold text-slate-900 dark:text-white">{data.name}</span>
        {data.phone && <span className="ms-1">/ {data.phone}</span>}
      </div>

      {/* تفصيل العملات مفصولة بخطوط واضحة (مطابق تماماً للصورة 1) */}
      <div className="mt-2 space-y-3">
        {data.currencies.map(curr => {
          const isDebit = curr.balance_type === 'debit';
          const isCredit = curr.balance_type === 'credit';

          return (
            <div
              key={curr.currency_code}
              className="border-t border-slate-300 px-1 pt-2 dark:border-slate-700"
            >
              <div className="mb-1.5 flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                <span>العملة: {curr.currency_name}</span>
                <span className="text-[10px] font-normal text-slate-500">
                  {curr.currency_code === 'BASE' ? '(أساسي)' : curr.currency_code}
                </span>
              </div>

              {/* شبكة الإكسل لبيانات العملة */}
              <div className="grid grid-cols-2 gap-y-2 pe-2 font-mono text-xs">
                <span className="text-slate-600 dark:text-slate-400">مجموع مدين:</span>
                <span className="text-end font-semibold text-blue-600 dark:text-blue-400">
                  {curr.total_debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>

                <span className="text-slate-600 dark:text-slate-400">مجموع دائن:</span>
                <span className="text-end font-semibold text-emerald-600 dark:text-emerald-400">
                  {curr.total_credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>

                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {isDebit ? 'الرصيد مدين:' : isCredit ? 'الرصيد دائن:' : 'الرصيد:'}
                </span>
                <span
                  className={`text-end text-sm font-bold ${
                    isDebit
                      ? 'text-rose-600 dark:text-rose-400'
                      : isCredit
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {Math.abs(curr.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* الائتمان والشروط إن وجدت */}
      {(data.credit_limit || data.payment_terms_days) && (
        <div className="mt-4 border-t border-slate-300 pt-3 text-xs dark:border-slate-700">
          <div className="grid grid-cols-2 gap-2 px-1 text-slate-600 dark:text-slate-300">
            {data.credit_limit && (
              <>
                <span>سقف الائتمان:</span>
                <span className="text-end font-bold text-amber-600">
                  {data.credit_limit.toLocaleString('en-US')}
                </span>
              </>
            )}
            {data.payment_terms_days && (
              <>
                <span>أيام السداد:</span>
                <span className="text-end font-bold">{data.payment_terms_days} يوم</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* آخر فواتير للطرف */}
      {data.recent_invoices && data.recent_invoices.length > 0 && (
        <div className="mt-4 border-t border-slate-300 pt-3 dark:border-slate-700">
          <div className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            آخر العمليات:
          </div>
          <table className="w-full border-collapse border border-slate-300 text-center text-xs dark:border-slate-700">
            <thead>
              <tr className="divide-x divide-x-reverse divide-slate-300 bg-slate-100 text-slate-600 dark:divide-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <th className="border border-slate-300 p-1.5 dark:border-slate-700">الرقم</th>
                <th className="border border-slate-300 p-1.5 dark:border-slate-700">التاريخ</th>
                <th className="border border-slate-300 p-1.5 dark:border-slate-700">المبلغ</th>
                <th className="border border-slate-300 p-1.5 dark:border-slate-700">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {data.recent_invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50">
                  <td className="border border-slate-300 p-1.5 font-mono font-bold dark:border-slate-700">
                    {inv.invoice_number}
                  </td>
                  <td className="border border-slate-300 p-1.5 dark:border-slate-700">
                    {inv.issue_date}
                  </td>
                  <td className="border border-slate-300 p-1.5 font-mono font-bold text-blue-600 dark:border-slate-700 dark:text-blue-400">
                    {inv.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-300 p-1.5 dark:border-slate-700">
                    <span className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-semibold dark:bg-slate-800">
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
