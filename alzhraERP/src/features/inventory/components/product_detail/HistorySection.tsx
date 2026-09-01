import React from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ClipboardCheck,
  User,
  List,
  Info,
} from 'lucide-react';
import { useItemMovement } from '../../hooks/index';
import { formatNumberDisplay, cn } from '../../../../core/utils';

interface Props {
  productId: string;
}

const HistorySection: React.FC<Props> = ({ productId }) => {
  const { data: movements, isLoading } = useItemMovement(productId);

  return (
    <div className="flex h-full flex-col border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      {/* Toolbar Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100/80 px-4 py-2 dark:border-slate-800 dark:bg-slate-800/80">
        <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
          <List size={12} className="text-blue-500" /> سجل الحركة (Movement Log)
        </h4>
        <div className="border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
          آخر {movements?.length || 0} حركة
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-tight text-slate-500">
                العملية / المستند
              </th>
              <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-tight text-slate-500">
                المصدر / المستخدم
              </th>
              <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-tight text-slate-500">
                التاريخ والوقت
              </th>
              <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-tight text-slate-500">
                الكمية
              </th>
              <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-tight text-slate-500">
                الرصيد بعد
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-40">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      تحميل السجل...
                    </span>
                  </div>
                </td>
              </tr>
            ) : !movements || movements.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-300">
                  <Info size={24} className="mx-auto mb-2 opacity-20" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    لا يوجد حركات مسجلة
                  </span>
                </td>
              </tr>
            ) : (
              movements.map((mov: any) => (
                <tr
                  key={mov.id}
                  className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
                >
                  {/* Operation */}
                  <td className="whitespace-nowrap px-4 py-2">
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(mov.transaction_type, mov.reference_type)}
                      <div>
                        <div className="font-mono text-[11px] font-bold uppercase text-slate-900 dark:text-white">
                          {mov.document_number}
                        </div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">
                          {mov.reference_type === 'transfer'
                            ? 'تحويل مخزني'
                            : mov.reference_type === 'audit'
                              ? 'جرد سنوي'
                              : mov.transaction_type === 'in'
                                ? 'توريد / شراء'
                                : 'صرف / بيع'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Source / User */}
                  <td className="whitespace-nowrap px-4 py-2">
                    <div className="text-[10px] font-bold capitalize text-slate-700 dark:text-slate-300">
                      {mov.source_name || '---'}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <User size={8} /> {mov.source_user?.split('@')[0]}
                    </div>
                  </td>

                  {/* Date / Time */}
                  <td className="whitespace-nowrap px-4 py-2">
                    <div className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {new Date(mov.date).toLocaleDateString('ar-SA-u-nu-latn', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {new Date(mov.date).toLocaleTimeString('ar-SA-u-nu-latn', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="whitespace-nowrap px-4 py-2">
                    <span
                      className={cn(
                        'font-mono text-xs font-black',
                        mov.transaction_type === 'in' ? 'text-emerald-500' : 'text-rose-500'
                      )}
                    >
                      {mov.transaction_type === 'in' ? '+' : '-'}
                      {formatNumberDisplay(mov.quantity)}
                    </span>
                  </td>

                  {/* Balance After */}
                  <td className="whitespace-nowrap px-4 py-2">
                    <div className="font-mono text-xs font-black text-slate-900 dark:text-slate-100">
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
        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-1.5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[10px] italic text-slate-400">
            ملاحظة: تظهر الملاحظات التفصيلية عند الوقوف على الصف في الأنظمة المتقدمة.
          </p>
        </div>
      )}
    </div>
  );
};

// Simplified Icons for Micro-UI
const getTransactionIcon = (type: string, ref: string) => {
  if (ref === 'transfer') return <RefreshCw size={12} className="text-blue-500" />;
  if (ref === 'audit') return <ClipboardCheck size={12} className="text-indigo-500" />;
  return type === 'in' ? (
    <ArrowDownLeft size={12} className="text-emerald-500" />
  ) : (
    <ArrowUpRight size={12} className="text-rose-500" />
  );
};

export default HistorySection;
