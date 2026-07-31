import React from 'react';
import { Calendar, Clock, User, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { cn, formatNumberDisplay } from '../../../../core/utils';
import Avatar from '../../../../ui/base/Avatar';

interface AuditLogTableProps {
    log: any[];
}

const AuditLogTable: React.FC<AuditLogTableProps> = ({ log }) => {
    return (
        <table className="w-full border-collapse text-right select-all">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-800 shadow-sm border-b-2 border-gray-200 dark:border-slate-700">
                <tr>
                    <th className="border border-gray-100 dark:border-slate-700 p-4 text-[10px] font-black text-gray-500 uppercase tracking-tighter w-16 text-center">#</th>
                    <th className="border border-gray-100 dark:border-slate-700 p-4 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-blue-500" />
                            التاريخ والوقت
                        </div>
                    </th>
                    <th className="border border-gray-100 dark:border-slate-700 p-4 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                            <Clock size={12} className="text-blue-500" />
                            نوع العملية / المرجع
                        </div>
                    </th>
                    <th className="border border-gray-100 dark:border-slate-700 p-4 text-[11px] font-bold text-gray-600 dark:text-gray-300">الجهة / المورد / العميل</th>
                    <th className="border border-gray-100 dark:border-slate-700 p-4 text-[11px] font-bold text-gray-600 dark:text-gray-300 text-center w-24">الحالة</th>
                    <th className="border border-gray-100 dark:border-slate-700 p-4 text-[11px] font-bold text-gray-600 dark:text-gray-300 text-left w-32">الكمية</th>
                    <th className="border border-gray-100 dark:border-slate-700 p-4 text-[11px] font-bold text-gray-600 dark:text-gray-300 text-left w-32">الرصيد بعدها</th>
                    <th className="border border-gray-100 dark:border-slate-700 p-4 text-[11px] font-bold text-gray-600 dark:text-gray-300 w-40">
                        <div className="flex items-center gap-2">
                            <User size={12} className="text-blue-500" />
                            المستخدم
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
                {log.map((entry: any, i: number) => {
                    const isIncoming = entry.transaction_type === 'in';
                    return (
                        <tr key={i} className="odd:bg-white even:bg-gray-50/30 dark:odd:bg-slate-900 dark:even:bg-slate-800/20 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-colors group">
                            <td className="border border-gray-50 dark:border-slate-800/60 p-4 text-center text-xs font-mono font-bold text-gray-400 group-hover:text-blue-500">
                                {log.length - i}
                            </td>
                            <td className="border border-gray-50 dark:border-slate-800/60 p-4 text-gray-600 dark:text-gray-400 text-[11px] whitespace-nowrap">
                                {new Date(entry.date).toLocaleString('en-GB', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit', hour12: true
                                })}
                            </td>
                            <td className="border border-gray-50 dark:border-slate-800/60 p-4">
                                <div className="font-black text-blue-700 dark:text-blue-400 mb-1">{entry.document_number}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                                    {entry.reference_type === 'invoice' || entry.reference_type?.includes('invoice') ? 'فاتورة إلكترونية' :
                                        entry.reference_type === 'transfer' ? 'مناقلة مخزنية' :
                                            entry.reference_type === 'audit' ? 'تسوية جردية' : 'مستند يدوي'}
                                </div>
                            </td>
                            <td className="border border-gray-50 dark:border-slate-800/60 p-4 text-[11px] font-black text-gray-700 dark:text-slate-200">
                                {entry.source_name || '--'}
                            </td>
                            <td className="border border-gray-50 dark:border-slate-800/60 p-4 text-center">
                                <div className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[10px] font-black uppercase tracking-tighter",
                                    isIncoming ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                )}>
                                    {isIncoming ? <ArrowDownLeft size={10} strokeWidth={3} /> : <ArrowUpRight size={10} strokeWidth={3} />}
                                    {isIncoming ? 'وارد' : 'صادر'}
                                </div>
                            </td>
                            <td dir="ltr" className={cn(
                                "border border-gray-50 dark:border-slate-800/60 p-4 text-left text-sm font-black font-mono",
                                isIncoming ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {isIncoming ? '+' : '-'}{formatNumberDisplay(Math.abs(entry.quantity))}
                            </td>
                            <td dir="ltr" className="border border-gray-50 dark:border-slate-800/60 p-4 text-left text-sm font-black font-mono text-gray-900 dark:text-white bg-blue-500/5 dark:bg-blue-500/10">
                                {formatNumberDisplay(entry.balance_after)}
                            </td>
                            <td className="border border-gray-50 dark:border-slate-800/60 p-4">
                                <div className="flex items-center gap-3">
                                    <Avatar name={entry.source_user || entry.created_by_name || 'System'} size="xs" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-700 dark:text-slate-200 truncate max-w-[100px]">
                                            {entry.source_user?.split('@')[0] || entry.created_by_name?.split(' ')[0] || 'النظام'}
                                        </span>
                                        <span className="text-[8px] text-gray-400 font-bold uppercase">المسؤول</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

export default AuditLogTable;
