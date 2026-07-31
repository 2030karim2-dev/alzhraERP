import React from 'react';
import { CustomerDebtProfile } from '../../hooks/useDebtManagement';
import { ShieldAlert, TrendingUp, TrendingDown, Info, ShieldCheck, Flag } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';

interface Props {
  customers: CustomerDebtProfile[];
}


export const CustomerRiskTable: React.FC<Props> = ({ customers }) => {
    if (!customers || customers.length === 0) {
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
             <div className="flex justify-center mb-4">
                 <ShieldCheck className="w-12 h-12 text-green-500" />
             </div>
             <h3 className="text-lg font-bold text-gray-900">ملف العملاء الائتماني نشط وآمن</h3>
             <p className="text-sm text-gray-500 mt-2">لا توجد ديون مستحقة حالياً لتصنيف العملاء.</p>
          </div>
        );
    }

    const getRiskStyles = (level: string) => {
        switch (level) {
            case 'Reliable':
                return { badge: 'bg-green-100 text-green-800 border-green-200', icon: <TrendingUp className="w-4 h-4 text-green-600" /> };
            case 'Occasionally Late':
                return { badge: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Info className="w-4 h-4 text-blue-600" /> };
            case 'Frequently Late':
                return { badge: 'bg-orange-100 text-orange-800 border-orange-200', icon: <TrendingDown className="w-4 h-4 text-orange-600" /> };
            case 'High Risk':
                return { badge: 'bg-red-100 text-red-800 border-red-200', icon: <ShieldAlert className="w-4 h-4 text-red-600" /> };
            default:
                return { badge: 'bg-gray-100 text-gray-800 border-gray-200', icon: null };
        }
    };

    const getPriorityColor = (level: string) => {
        switch (level) {
            case 'High': return 'bg-red-100 text-red-800';
            case 'Medium': return 'bg-yellow-100 text-yellow-800';
            case 'Low': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getRiskTranslation = (level: string) => {
        switch (level) {
            case 'Reliable': return 'موثوق / ملتزم';
            case 'Occasionally Late': return 'تأخير عرضي';
            case 'Frequently Late': return 'تأخير متكرر';
            case 'High Risk': return 'عالي المخاطر';
            default: return level;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">تصنيف مخاطر العملاء</h3>
                  <p className="text-sm text-gray-500 mt-1">يعتمد التصنيف على تاريخ السداد المتأخر وحجم المبالغ المعلقة.</p>
                </div>
             </div>

             <div className="overflow-x-auto">
                 <table className="w-full text-right text-sm">
                     <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                         <tr>
                             <th className="px-6 py-4 font-semibold shrink-0">اسم العميل</th>
                             <th className="px-6 py-4 font-semibold">إجمالي الدين</th>
                             <th className="px-6 py-4 font-semibold text-red-600">المبلغ المتأخر</th>
                             <th className="px-6 py-4 font-semibold text-center shrink-0">مستوى الخطورة</th>
                             <th className="px-6 py-4 font-semibold text-center shrink-0">معامل الأولوية</th>
                             <th className="px-6 py-4 font-semibold w-1/3">توصية النظام</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {customers.map((customer) => {
                             const risk = getRiskStyles(customer.riskLevel);
                             const priorityColor = getPriorityColor(customer.priorityLevel);
                             const isHighRisk = customer.riskLevel === 'High Risk' || customer.riskLevel === 'Frequently Late';

                             return (
                                 <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                                     <td className="px-6 py-4 font-medium text-gray-900">
                                         {customer.name}
                                     </td>
                                     <td className="px-6 py-4 text-gray-700 font-medium whitespace-nowrap">
                                         {formatCurrency(customer.totalDebt)}
                                     </td>
                                     <td className={`px-6 py-4 font-bold whitespace-nowrap ${customer.overdueAmount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                         {formatCurrency(customer.overdueAmount)}
                                     </td>
                                     <td className="px-6 py-4 text-center">
                                         <div className="flex items-center justify-center gap-1.5">
                                             {risk.icon}
                                             <span className={`text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${risk.badge}`}>
                                                 {getRiskTranslation(customer.riskLevel)}
                                             </span>
                                         </div>
                                     </td>
                                     <td className="px-6 py-4 text-center">
                                         <div className="flex items-center justify-center gap-1">
                                             <Flag className={`w-3 h-3 ${customer.priorityLevel === 'High' ? 'text-red-600' : customer.priorityLevel === 'Medium' ? 'text-yellow-600' : 'text-blue-600'}`} />
                                             <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${priorityColor}`}>
                                                {customer.priorityLevel === 'High' ? 'أولوية قصوى' : customer.priorityLevel === 'Medium' ? 'أولوية متوسطة' : 'عادي'} ({customer.priorityScore})
                                             </span>
                                         </div>
                                     </td>
                                     <td className="px-6 py-4">
                                         <div className="flex flex-col gap-1">
                                             <span className={`text-sm ${isHighRisk ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                                {customer.recommendation}
                                             </span>
                                             {customer.overdueInvoicesCount > 0 && (
                                                <span className="text-xs text-red-500 font-medium">
                                                    لديه {customer.overdueInvoicesCount} {customer.overdueInvoicesCount === 1 ? 'فاتورة متأخرة' : 'فواتير متأخرة'}
                                                </span>
                                             )}
                                         </div>
                                     </td>
                                 </tr>
                             );
                         })}
                     </tbody>
                 </table>
             </div>
        </div>
    );
};
