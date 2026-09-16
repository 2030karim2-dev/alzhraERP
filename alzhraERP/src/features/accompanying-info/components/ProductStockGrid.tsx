import React from 'react';
import type { ProductCompanionData } from '../types';

interface ProductStockGridProps {
  data: ProductCompanionData;
}

export const ProductStockGrid: React.FC<ProductStockGridProps> = ({ data }) => {
  return (
    <div className="flex flex-col text-xs text-slate-800 dark:text-slate-100">
      {/* رأس الصنف الأزرق */}
      <div className="mb-3 rounded-lg bg-blue-600 p-3 text-center font-bold text-white shadow-sm dark:bg-blue-800">
        <div className="text-sm tracking-wide">
          {data.part_number ? `${data.part_number} - ` : ''}
          {data.name_ar}
          {data.brand ? ` / ${data.brand}` : ''}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-slate-200 px-2 pb-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <span>
          الوحدة: <strong className="text-slate-900 dark:text-white">{data.unit}</strong>
        </span>
        <span>
          إجمالي المخزون:{' '}
          <strong
            className={`font-mono text-sm ${
              data.total_stock > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {data.total_stock.toLocaleString('en-US')}
          </strong>
        </span>
      </div>

      {/* جدول أرصدة المستودعات الحية */}
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          توزيع الرصيد عبر المستودعات:
        </div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <th className="border-e border-slate-300 p-1.5 text-start dark:border-slate-700">
                المستودع
              </th>
              <th className="border-e border-slate-300 p-1.5 text-center dark:border-slate-700">
                الفرع
              </th>
              <th className="p-1.5 text-end font-bold">الرصيد الحي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {data.warehouses_stock.length > 0 ? (
              data.warehouses_stock.map((st, idx) => (
                <tr key={idx} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40">
                  <td className="border-e border-slate-300 p-1.5 font-medium dark:border-slate-700">
                    {st.warehouse_name}
                  </td>
                  <td className="border-e border-slate-300 p-1.5 text-center text-slate-500 dark:border-slate-700">
                    {st.branch_name || '-'}
                  </td>
                  <td
                    className={`p-1.5 text-end font-mono font-bold ${
                      st.quantity > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {st.quantity.toLocaleString('en-US')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-2 text-center text-slate-400">
                  لا يوجد رصيد مسجل في أي مستودع
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* شبكة الأسعار والتكاليف بنمط الإكسل */}
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          الأسعار والتكلفة (ر.س):
        </div>
        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr className="border-b border-slate-300 dark:border-slate-700">
              <td className="w-1/2 border-e border-slate-300 p-1.5 text-start font-mono font-bold text-blue-600 dark:border-slate-700 dark:text-blue-400">
                {data.sale_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="w-1/2 bg-slate-50/50 p-1.5 text-end font-semibold text-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
                سعر البيع:
              </td>
            </tr>
            <tr className="border-b border-slate-300 dark:border-slate-700">
              <td className="border-e border-slate-300 p-1.5 text-start font-mono text-amber-600 dark:border-slate-700">
                {data.min_allowed_price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="bg-slate-50/50 p-1.5 text-end font-semibold text-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
                أدنى حد للبيع:
              </td>
            </tr>
            {data.cost_price !== undefined && (
              <tr className="border-b border-slate-300 dark:border-slate-700">
                <td className="border-e border-slate-300 p-1.5 text-start font-mono text-slate-700 dark:border-slate-700 dark:text-slate-300">
                  {data.cost_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="bg-slate-50/50 p-1.5 text-end font-semibold text-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
                  متوسط التكلفة:
                </td>
              </tr>
            )}
            <tr>
              <td className="border-e border-slate-300 p-1.5 text-start font-mono text-slate-600 dark:border-slate-700 dark:text-slate-400">
                {data.purchase_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="bg-slate-50/50 p-1.5 text-end font-semibold text-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
                سعر الشراء:
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* البدائل إن وجدت */}
      {data.alternatives && data.alternatives.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-300 bg-white p-3 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 font-bold text-slate-700 dark:text-slate-300">
            أرقام القطع البديلة:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.alternatives.map((alt, idx) => (
              <span
                key={idx}
                className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {alt}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
