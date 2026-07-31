import React from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ClipboardCheck, User, List, Info } from 'lucide-react';
import { useItemMovement } from '../../hooks/index';
import { formatNumberDisplay, cn } from '../../../../core/utils';

interface Props {
    productId: string;
}

const HistorySection: React.FC<Props> = ({ productId }) => {
    const { data: movements, isLoading } = useItemMovement(productId);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            {/* Toolbar Header */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 shrink-0">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                    <List size={12} className="text-blue-500" /> سجل الحركة (Movement Log)
                </h4>
                <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 border border-blue-100 dark:border-blue-800">
                    آخر {movements?.length || 0} حركة
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="text-right px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight">العملية / المستند</th>
                            <th className="text-right px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight">المصدر / المستخدم</th>
                            <th className="text-right px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight">التاريخ والوقت</th>
                            <th className="text-right px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight">الكمية</th>
                            <th className="text-right px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight">الرصيد بعد</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="text-center py-8">
                                    <div className="flex flex-col items-center gap-2 opacity-40">
                                        <div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">تحميل السجل...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : !movements || movements.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-slate-300">
                                    <Info size={24} className="mx-auto mb-2 opacity-20" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">لا يوجد حركات مسجلة</span>
                                </td>
                            </tr>
                        ) : (
                            movements.map((mov: any) => (
                                <tr key={mov.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    {/* Operation */}
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {getTransactionIcon(mov.transaction_type, mov.reference_type)}
                                            <div>
                                                <div className="text-[11px] font-bold text-slate-900 dark:text-white uppercase font-mono">
                                                    {mov.document_number}
                                                </div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">
                                                    {mov.reference_type === 'transfer' ? 'تحويل مخزني' : mov.reference_type === 'audit' ? 'جرد سنوي' : mov.transaction_type === 'in' ? 'توريد / شراء' : 'صرف / بيع'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    {/* Source / User */}
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 capitalize">
                                            {mov.source_name || '---'}
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold mt-0.5">
                                            <User size={8} /> {mov.source_user?.split('@')[0]}
                                        </div>
                                    </td>

                                    {/* Date / Time */}
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <div className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                                            {new Date(mov.date).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </div>
                                        <div className="text-[9px] font-mono text-slate-400">
                                            {new Date(mov.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>

                                    {/* Quantity */}
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <span className={cn(
                                            "text-xs font-black font-mono",
                                            mov.transaction_type === 'in' ? 'text-emerald-500' : 'text-rose-500'
                                        )}>
                                            {mov.transaction_type === 'in' ? '+' : '-'}{formatNumberDisplay(mov.quantity)}
                                        </span>
                                    </td>

                                    {/* Balance After */}
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <div className="text-xs font-black font-mono text-slate-900 dark:text-slate-100">
                                            {formatNumberDisplay(mov.balance_after)}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Optional Small Notes Footer if movement has notes */}
            {movements?.some((m: any) => m.notes) && (
                <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                    <p className="text-[9px] text-slate-400 italic">ملاحظة: تظهر الملاحظات التفصيلية عند الوقوف على الصف في الأنظمة المتقدمة.</p>
                </div>
            )}
        </div>
    );
};

// Simplified Icons for Micro-UI
const getTransactionIcon = (type: string, ref: string) => {
    if (ref === 'transfer') return <RefreshCw size={12} className="text-blue-500" />;
    if (ref === 'audit') return <ClipboardCheck size={12} className="text-indigo-500" />;
    return type === 'in'
        ? <ArrowDownLeft size={12} className="text-emerald-500" />
        : <ArrowUpRight size={12} className="text-rose-500" />;
};

export default HistorySection;
