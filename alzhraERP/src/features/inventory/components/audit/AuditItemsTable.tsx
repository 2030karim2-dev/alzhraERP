import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { Trash2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { formatNumberDisplay } from '../../../../core/utils';
import { cn } from '../../../../core/utils';

interface Props {
    items: any[];
    register: UseFormRegister<any>;
    filter: string;
    category?: string | null;
    isCompleted: boolean;
    onRemoveItem?: (itemId: string) => void;
}

const AuditItemsTable: React.FC<Props> = ({ items, register, filter, category, isCompleted, onRemoveItem }) => {

    const filteredFields = items.map((item, index) => ({ ...item, index })).filter(field => {
        const product = field.products;
        if (!product) return false;
        const term = filter.toLowerCase();
        const matchesSearch = !filter ||
            (product.name?.toLowerCase().includes(term) ||
             product.sku?.toLowerCase().includes(term) ||
             product.part_number?.toLowerCase().includes(term));
        const matchesCategory = !category || product.category === category;
        return matchesSearch && matchesCategory;
    });

    const showActions = !isCompleted && !!onRemoveItem;

    // Footer stats
    const totalExpected = filteredFields.reduce((sum, f) => sum + (Number(f.expected_quantity) || 0), 0);
    const totalCounted = filteredFields.reduce((sum, f) => {
        const v = f.counted_quantity;
        return (v !== null && v !== undefined && v !== '') ? sum + Number(v) : sum;
    }, 0);
    const totalDiff = filteredFields.reduce((sum, f) => {
        const v = f.counted_quantity;
        if (v !== null && v !== undefined && v !== '') {
            return sum + (Number(v) - Number(f.expected_quantity));
        }
        return sum;
    }, 0);
    const countedCount = filteredFields.filter(f => f.counted_quantity !== null && f.counted_quantity !== undefined && f.counted_quantity !== '').length;
    const pendingCount = filteredFields.length - countedCount;

    if (filteredFields.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 text-center">
                <Clock size={32} className="text-gray-300 dark:text-slate-600 mb-3" strokeWidth={1.5} />
                <p className="text-sm font-bold text-gray-500 dark:text-slate-500">لا توجد أصناف مطابقة</p>
                <p className="text-xs text-gray-400 dark:text-slate-600 mt-1">جرّب تغيير فلتر البحث أو الفئة</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden rounded-xl">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right text-xs border-collapse">
                    <thead className="bg-slate-800 dark:bg-slate-900 text-white font-bold border-b-2 border-slate-700 uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                            <th className="p-3 w-10 text-center border-l border-slate-700">#</th>
                            <th className="p-3 border-l border-slate-700 min-w-[180px]">اسم الصنف</th>
                            <th className="p-3 border-l border-slate-700 w-28 text-center hidden md:table-cell">رقم القطعة</th>
                            <th className="p-3 border-l border-slate-700 w-20 text-center hidden lg:table-cell">المقاس</th>
                            <th className="p-3 border-l border-slate-700 w-20 text-center hidden lg:table-cell">الفئة</th>
                            <th className="p-3 border-l border-slate-700 w-28 text-center bg-blue-900/30">الكمية الدفترية</th>
                            <th className="p-3 border-l border-slate-700 w-36 text-center bg-emerald-900/30 text-emerald-300">الكمية الفعلية ✏️</th>
                            <th className="p-3 text-center w-24 border-l border-slate-700">الفرق</th>
                            {showActions && <th className="p-3 text-center w-12">حذف</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                        {filteredFields.map((field, index) => {
                            const product = field.products;
                            const isCounted = field.counted_quantity !== null && field.counted_quantity !== undefined && field.counted_quantity !== '';
                            const diff = isCounted
                                ? Number(field.counted_quantity) - Number(field.expected_quantity)
                                : null;

                            return (
                                <tr key={field.id} className={cn(
                                    "transition-colors",
                                    !isCounted && "bg-amber-50/30 dark:bg-amber-900/5",
                                    diff !== null && diff !== 0
                                        ? (diff > 0 ? "bg-emerald-50/40 dark:bg-emerald-900/10" : "bg-rose-50/40 dark:bg-rose-900/10")
                                        : (isCounted ? "hover:bg-gray-50/50 dark:hover:bg-slate-800/30" : "")
                                )}>
                                    <td className="p-3 text-center font-mono text-gray-400 border-l dark:border-slate-800 text-[10px]">{index + 1}</td>
                                    <td className="p-3 border-l dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            {isCounted
                                                ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                                : <Clock size={12} className="text-amber-400 shrink-0 animate-pulse" />
                                            }
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-900 dark:text-slate-100 truncate">{product?.name}</p>
                                                {product?.brand && (
                                                    <span className="text-[9px] font-bold text-blue-500">{product.brand}</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center font-mono font-bold text-gray-600 dark:text-slate-400 border-l dark:border-slate-800 hidden md:table-cell">
                                        <span className={cn(!product?.part_number && "text-gray-300 dark:text-slate-700 text-[9px] font-normal italic")}>
                                            {product?.part_number || 'غير متوفر'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center font-mono font-bold text-gray-500 dark:text-slate-500 border-l dark:border-slate-800 hidden lg:table-cell">
                                        {product?.size || '—'}
                                    </td>
                                    <td className="p-3 text-center border-l dark:border-slate-800 hidden lg:table-cell">
                                        <span className="text-[9px] font-bold bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full">
                                            {product?.category || 'عام'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center font-mono font-black text-blue-600 dark:text-blue-400 text-lg border-l dark:border-slate-800 bg-blue-50/30 dark:bg-blue-900/5">
                                        {formatNumberDisplay(field.expected_quantity)}
                                    </td>
                                    <td className="p-2 text-center border-l dark:border-slate-800 bg-emerald-50/20 dark:bg-emerald-900/5">
                                        <input
                                            type="number"
                                            {...register(`items.${field.index}.counted_quantity`, { valueAsNumber: true })}
                                            className="w-full h-14 bg-white dark:bg-slate-950 border-2 border-emerald-200 dark:border-emerald-900/50 rounded-xl text-center font-mono font-black text-2xl text-gray-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                                            readOnly={isCompleted}
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className={cn(
                                        "p-3 text-center font-mono font-black text-lg border-l dark:border-slate-800",
                                        diff === null ? 'text-gray-300 dark:text-slate-700' :
                                        diff > 0 ? 'text-emerald-500' :
                                        diff < 0 ? 'text-rose-500' : 'text-gray-400'
                                    )}>
                                        {diff !== null ? (diff > 0 ? `+${diff}` : diff) : '—'}
                                    </td>
                                    {showActions && (
                                        <td className="p-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => onRemoveItem!(field.id)}
                                                className="text-rose-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all active:scale-95 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40"
                                                title="إزالة من الجلسة"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>

                    {/* ── Footer Row ── */}
                    <tfoot className="bg-slate-100 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-700">
                        <tr className="text-xs font-black">
                            <td colSpan={2} className="p-3 border-l dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-600 dark:text-slate-300">
                                        الإجمالي: <span className="text-blue-600 dark:text-blue-400">{filteredFields.length} صنف</span>
                                    </span>
                                    {pendingCount > 0 && (
                                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                            <Clock size={10} /> {pendingCount} متبقٍ
                                        </span>
                                    )}
                                    {countedCount > 0 && (
                                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 size={10} /> {countedCount} مجرود
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td colSpan={3} className="p-3 text-center hidden md:table-cell border-l dark:border-slate-700 text-gray-400"></td>
                            <td className="p-3 text-center font-mono text-blue-600 dark:text-blue-400 border-l dark:border-slate-700 bg-blue-50/30">
                                {formatNumberDisplay(totalExpected)}
                            </td>
                            <td className="p-3 text-center font-mono text-emerald-600 dark:text-emerald-400 border-l dark:border-slate-700 bg-emerald-50/20">
                                {formatNumberDisplay(totalCounted)}
                            </td>
                            <td className={cn(
                                "p-3 text-center font-mono text-lg border-l dark:border-slate-700",
                                totalDiff > 0 ? "text-emerald-600" : totalDiff < 0 ? "text-rose-600" : "text-gray-400"
                            )}>
                                {totalDiff > 0 ? `+${totalDiff}` : totalDiff !== 0 ? totalDiff : '—'}
                            </td>
                            {showActions && <td />}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Mobile: discrepancy summary */}
            {filteredFields.some(f => {
                const v = f.counted_quantity;
                return v !== null && v !== undefined && v !== '' && Number(v) !== Number(f.expected_quantity);
            }) && (
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-rose-50/30 dark:bg-rose-900/5 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        يوجد فروقات في {filteredFields.filter(f => {
                            const v = f.counted_quantity;
                            return v !== null && v !== undefined && v !== '' && Number(v) !== Number(f.expected_quantity);
                        }).length} صنف — راجع الأرقام قبل الإغلاق
                    </p>
                </div>
            )}
        </div>
    );
};

export default AuditItemsTable;