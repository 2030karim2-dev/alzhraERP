import React from 'react';
import { formatCurrency } from '../../../../core/utils';
import { ReportView, ReturnsType } from '../../hooks/useReturnsReport';

interface Props {
    reportView: ReportView;
    filteredSalesReturns: any[];
    filteredPurchaseReturns: any[];
    type: ReturnsType;
}

const ReturnsTransactionsTable: React.FC<Props> = ({ reportView, filteredSalesReturns, filteredPurchaseReturns, type }) => {
    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'posted': return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
            case 'draft': return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
            case 'paid': return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
            case 'cancelled': return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
            default: return 'bg-slate-500/10 text-slate-600 border border-slate-500/20';
        }
    };

    // Get reason text in Arabic
    const getReasonText = (reason: string) => {
        const reasonMap: Record<string, string> = {
            'defective': 'منتج تالف',
            'not_as_described': 'غير مطابق',
            'wrong_item': 'صنف خاطئ',
            'quality_issue': 'مشكلة جودة',
            'changed_mind': 'تغيير رأي',
            'expired': 'منتهي الصلاحية',
            'other': 'أخرى'
        };
        return reasonMap[reason] || reason || '-';
    };

    return (
        <div className="glass-panel bento-item bg-white/40 dark:bg-slate-900/40 border-none shadow-2xl backdrop-blur-3xl overflow-hidden mt-8">
            <div className="p-8 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white mb-1 uppercase tracking-tighter">
                        {reportView === 'overview' ? 'سجل العمليات التفصيلي' :
                            reportView === 'sales' ? 'سجل مرتجعات المبيعات' :
                                'سجل مرتجعات المشتريات'}
                    </h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Granular Transactional Intelligence Ledger</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Records:</span>
                    <span className="px-3 py-1 bg-rose-500/10 text-rose-600 rounded-full text-[10px] font-black">
                        {(reportView === 'overview'
                            ? filteredSalesReturns.length + filteredPurchaseReturns.length
                            : reportView === 'sales' ? filteredSalesReturns.length : filteredPurchaseReturns.length)}
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                    <thead>
                        <tr className="bg-slate-100/50 dark:bg-slate-800/80">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">الرقم المرجعي</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">طابع التاريخ</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{type === 'purchase' ? 'المورد المؤسسي' : 'العميل المستفيد'}</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">الفاتورة الأصلية</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">تحليل العلة</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-left">التدفق المالي</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">الوضع الحالي</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {(reportView === 'overview'
                            ? [...filteredSalesReturns, ...filteredPurchaseReturns]
                            : reportView === 'sales' ? filteredSalesReturns : filteredPurchaseReturns
                        ).slice(0, 20).map((item: any, index: number) => (
                            <tr key={index} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300">
                                <td className="px-8 py-5">
                                    <span className="text-sm font-black text-slate-800 dark:text-white tracking-tighter group-hover:text-blue-500 transition-colors">
                                        {item.invoice_number}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-sm font-bold text-slate-500 font-mono">
                                    {item.issue_date || 'N/A'}
                                </td>
                                <td className="px-8 py-5 text-sm font-black text-slate-700 dark:text-slate-300">
                                    {item.party?.name || '-'}
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-bold text-slate-500 border border-slate-200/50 dark:border-slate-700/50">
                                        {item.reference_invoice?.invoice_number || 'Internal'}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">
                                    {getReasonText(item.return_reason)}
                                </td>
                                <td className="px-8 py-5 text-left">
                                    <span className="text-base font-black text-slate-800 dark:text-white font-mono tracking-tighter">
                                        {formatCurrency(Number(item.total_amount) || 0)}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${getStatusColor(item.status)}`}>
                                        {item.status === 'draft' ? 'Draft' :
                                            item.status === 'posted' ? 'Verified' :
                                                item.status === 'paid' ? 'Settled' :
                                                    item.status === 'cancelled' ? 'Void' : item.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {(reportView === 'overview'
                ? [...filteredSalesReturns, ...filteredPurchaseReturns]
                : reportView === 'sales' ? filteredSalesReturns : filteredPurchaseReturns
            ).length > 20 && (
                    <div className="p-8 text-center bg-slate-50/30 dark:bg-slate-900/30 border-t border-slate-200/50 dark:border-slate-700/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Showing limited view (Top 20 of {(reportView === 'overview'
                                ? filteredSalesReturns.length + filteredPurchaseReturns.length
                                : reportView === 'sales' ? filteredSalesReturns.length : filteredPurchaseReturns.length)} intelligence nodes)
                        </p>
                    </div>
                )}
        </div>
    );
};

export default ReturnsTransactionsTable;
