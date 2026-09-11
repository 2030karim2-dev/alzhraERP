import React from 'react';
import { formatCurrency } from '../../../../core/utils';
import type { ReportView, ReturnsType } from '../../hooks/useReturnsReport';
import type { ReturnReportRow } from '../../hooks/returnsNormalizers';

interface Props {
  reportView: ReportView;
  filteredSalesReturns: ReturnReportRow[];
  filteredPurchaseReturns: ReturnReportRow[];
  type: ReturnsType;
}

const ReturnsTransactionsTable: React.FC<Props> = ({
  reportView,
  filteredSalesReturns,
  filteredPurchaseReturns,
  type,
}) => {
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'draft':
        return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'paid':
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      case 'cancelled':
        return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 border border-slate-500/20';
    }
  };

  // Get reason text in Arabic
  const getReasonText = (reason: string) => {
    const reasonMap: Record<string, string> = {
      defective: 'منتج تالف',
      not_as_described: 'غير مطابق',
      wrong_item: 'صنف خاطئ',
      quality_issue: 'مشكلة جودة',
      changed_mind: 'تغيير رأي',
      expired: 'منتهي الصلاحية',
      other: 'أخرى',
    };
    return reasonMap[reason] || reason || '-';
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] p-3.5 sm:p-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-white">
            {reportView === 'overview'
              ? 'سجل العمليات التفصيلي'
              : reportView === 'sales'
                ? 'سجل مرتجعات المبيعات'
                : 'سجل مرتجعات المشتريات'}
          </h4>
          <p className="text-[10px] font-semibold text-slate-400">بيانات حركات الإرجاع المسجلة</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400">عدد الحركات:</span>
          <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">
            {reportView === 'overview'
              ? filteredSalesReturns.length + filteredPurchaseReturns.length
              : reportView === 'sales'
                ? filteredSalesReturns.length
                : filteredPurchaseReturns.length}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-right">
          <thead>
            <tr className="border-b border-[var(--app-border)] bg-[var(--app-surface-hover)]">
              <th className="px-3.5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                رقم المرجع
              </th>
              <th className="px-3.5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                التاريخ
              </th>
              <th className="px-3.5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                {type === 'purchase' ? 'المورد' : 'العميل'}
              </th>
              <th className="px-3.5 py-2.5 text-center text-xs font-bold text-slate-600 dark:text-slate-300">
                الفاتورة الأصلية
              </th>
              <th className="px-3.5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                سبب الإرجاع
              </th>
              <th className="px-3.5 py-2.5 text-left text-xs font-bold text-slate-600 dark:text-slate-300">
                المبلغ الإجمالي
              </th>
              <th className="px-3.5 py-2.5 text-center text-xs font-bold text-slate-600 dark:text-slate-300">
                الحالة
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)]">
            {(reportView === 'overview'
              ? [...filteredSalesReturns, ...filteredPurchaseReturns]
              : reportView === 'sales'
                ? filteredSalesReturns
                : filteredPurchaseReturns
            )
              .slice(0, 20)
              .map((item, index) => (
                <tr key={index} className="transition-colors hover:bg-[var(--app-surface-hover)]">
                  <td className="px-3.5 py-2.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      {item.invoice_number}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-xs text-slate-500">
                    {item.issue_date || '—'}
                  </td>
                  <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {item.party?.name || '—'}
                  </td>
                  <td className="px-3.5 py-2.5 text-center">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {item.reference_invoice?.invoice_number || 'داخلي'}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-400">
                    {getReasonText(item.return_reason ?? '')}
                  </td>
                  <td className="px-3.5 py-2.5 text-left">
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-white">
                      {formatCurrency(Number(item.total_amount) || 0)}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-center">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${getStatusColor(item.status ?? '')}`}
                    >
                      {item.status === 'draft'
                        ? 'مسودة'
                        : item.status === 'posted'
                          ? 'مرحّل'
                          : item.status === 'paid'
                            ? 'مدفوع'
                            : item.status === 'cancelled'
                              ? 'ملغي'
                              : item.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {(reportView === 'overview'
        ? [...filteredSalesReturns, ...filteredPurchaseReturns]
        : reportView === 'sales'
          ? filteredSalesReturns
          : filteredPurchaseReturns
      ).length > 20 && (
        <div className="border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] p-3 text-center">
          <p className="text-xs font-semibold text-slate-400">
            عرض أول 20 حركة من إجمالي{' '}
            {reportView === 'overview'
              ? filteredSalesReturns.length + filteredPurchaseReturns.length
              : reportView === 'sales'
                ? filteredSalesReturns.length
                : filteredPurchaseReturns.length}{' '}
            حركة مسجلة
          </p>
        </div>
      )}
    </div>
  );
};

export default ReturnsTransactionsTable;
