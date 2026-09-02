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
    <div className="glass-panel bento-item mt-8 overflow-hidden border-none bg-white/40 shadow-2xl backdrop-blur-3xl dark:bg-slate-900/40 max-md:mt-3">
      <div className="flex items-center justify-between border-b border-slate-200/50 bg-slate-50/50 p-8 dark:border-slate-700/50 dark:bg-slate-800/50 max-md:p-4">
        <div>
          <h4 className="mb-1 text-sm font-black uppercase tracking-tighter text-slate-800 dark:text-white">
            {reportView === 'overview'
              ? 'سجل العمليات التفصيلي'
              : reportView === 'sales'
                ? 'سجل مرتجعات المبيعات'
                : 'سجل مرتجعات المشتريات'}
          </h4>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Granular Transactional Intelligence Ledger
          </p>
        </div>
        <div className="flex items-center max-md:gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Active Records:
          </span>
          <span className="rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-black text-rose-600">
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
            <tr className="bg-slate-100/50 dark:bg-slate-800/80">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 max-md:px-3">
                الرقم المرجعي
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 max-md:px-3">
                طابع التاريخ
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 max-md:px-3">
                {type === 'purchase' ? 'المورد المؤسسي' : 'العميل المستفيد'}
              </th>
              <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 max-md:px-3">
                الفاتورة الأصلية
              </th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 max-md:px-3">
                تحليل العلة
              </th>
              <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 max-md:px-3">
                التدفق المالي
              </th>
              <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 max-md:px-3">
                الوضع الحالي
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {(reportView === 'overview'
              ? [...filteredSalesReturns, ...filteredPurchaseReturns]
              : reportView === 'sales'
                ? filteredSalesReturns
                : filteredPurchaseReturns
            )
              .slice(0, 20)
              .map((item, index) => (
                <tr
                  key={index}
                  className="group transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-8 py-5 max-md:px-3">
                    <span className="text-sm font-black tracking-tighter text-slate-800 transition-colors group-hover:text-blue-500 dark:text-white">
                      {item.invoice_number}
                    </span>
                  </td>
                  <td className="px-8 py-5 font-mono text-sm font-bold text-slate-500 max-md:px-3">
                    {item.issue_date || 'N/A'}
                  </td>
                  <td className="px-8 py-5 text-sm font-black text-slate-700 dark:text-slate-300 max-md:px-3">
                    {item.party?.name || '-'}
                  </td>
                  <td className="px-8 py-5 text-center max-md:px-3">
                    <span className="rounded-lg border border-slate-200/50 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:border-slate-700/50 dark:bg-slate-900">
                      {item.reference_invoice?.invoice_number || 'Internal'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400 max-md:px-3">
                    {getReasonText(item.return_reason ?? '')}
                  </td>
                  <td className="px-8 py-5 text-left max-md:px-3">
                    <span className="font-mono text-base font-black tracking-tighter text-slate-800 dark:text-white">
                      {formatCurrency(Number(item.total_amount) || 0)}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center max-md:px-3">
                    <span
                      className={`rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${getStatusColor(item.status ?? '')}`}
                    >
                      {item.status === 'draft'
                        ? 'Draft'
                        : item.status === 'posted'
                          ? 'Verified'
                          : item.status === 'paid'
                            ? 'Settled'
                            : item.status === 'cancelled'
                              ? 'Void'
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
        <div className="border-t border-slate-200/50 bg-slate-50/30 p-8 text-center dark:border-slate-700/50 dark:bg-slate-900/30 max-md:p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Showing limited view (Top 20 of{' '}
            {reportView === 'overview'
              ? filteredSalesReturns.length + filteredPurchaseReturns.length
              : reportView === 'sales'
                ? filteredSalesReturns.length
                : filteredPurchaseReturns.length}{' '}
            intelligence nodes)
          </p>
        </div>
      )}
    </div>
  );
};

export default ReturnsTransactionsTable;
