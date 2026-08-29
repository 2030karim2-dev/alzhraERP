// ============================================
// QuickAuditItemsTable — جدول أصناف التسوية السريعة (Excel Style)
// مع عرض بطاقات متجاوب للهاتف
// ============================================
import React from 'react';
import { ScanBarcode, X } from 'lucide-react';
import { useBreakpoint } from '../../../../lib/hooks/useBreakpoint';

export interface AdjustedItem {
    product_id: string;
    name_ar: string;
    sku: string;
    part_number?: string;
    brand?: string;
    alternative_numbers?: string;
    size?: string;
    warehouse_id: string;
    system_quantity: number;
    quantity: number;
}

interface Props {
    items: AdjustedItem[];
    onUpdateQuantity: (productId: string, qty: string) => void;
    onRemoveItem: (productId: string) => void;
}

const QuickAuditItemsTable: React.FC<Props> = ({ items, onUpdateQuantity, onRemoveItem }) => {
    const isDesktop = useBreakpoint('md');

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 text-center">
                <ScanBarcode size={48} className="text-gray-300 dark:text-gray-600 mb-4" strokeWidth={1} />
                <h3 className="font-bold text-gray-600 dark:text-gray-400">القائمة فارغة</h3>
                <p className="text-xs text-gray-500 mt-2 max-w-xs">
                    ابدأ بالبحث عن الأصناف أو مسح الباركود بعد تحديد المستودع لإنشاء تسوية سريعة
                </p>
            </div>
        );
    }

    // ── Mobile Card View ─────────────────────────────────────────────
    if (!isDesktop) {
        return (
            <div className="space-y-3">
                {items.map((item) => {
                    const difference = item.quantity - item.system_quantity;
                    const diffColor = difference > 0 ? 'text-emerald-500' : difference < 0 ? 'text-rose-500' : 'text-gray-300';
                    return (
                        <div key={item.product_id} className="bg-[var(--app-surface)] rounded-xl border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            {/* Header */}
                            <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b dark:border-slate-700 flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">{item.name_ar}</p>
                                    <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 mt-0.5">
                                        {item.part_number || item.sku}
                                    </p>
                                </div>
                                <button
                                    onClick={() => onRemoveItem(item.product_id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95"
                                >
                                    <X size={16} strokeWidth={3} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-3 space-y-2">
                                {item.brand && (
                                    <span className="inline-block bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                        {item.brand}
                                    </span>
                                )}

                                {/* Quantities */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg py-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">المخزون الحالي</p>
                                        <p className="font-mono font-black text-gray-500 dark:text-gray-300 text-lg leading-none">{item.system_quantity}</p>
                                    </div>
                                    <div className="text-center bg-blue-50/50 dark:bg-blue-900/10 rounded-lg py-2">
                                        <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">الجرد الفعلي</p>
                                        <input
                                            type="number"
                                            value={item.quantity === 0 ? '' : item.quantity}
                                            onChange={(e) => onUpdateQuantity(item.product_id, e.target.value)}
                                            onFocus={(e) => { if (item.quantity === 0) e.target.select(); }}
                                            className="w-full bg-white dark:bg-slate-950 border-2 border-blue-200 dark:border-blue-900/50 rounded-lg py-1 px-1 text-center font-bold font-mono text-blue-600 dark:text-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors outline-none leading-none text-lg"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="text-center bg-emerald-50/30 dark:bg-emerald-900/5 rounded-lg py-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">الفارق</p>
                                        <p className={`font-mono font-black text-lg leading-none ${diffColor}`}>
                                            {difference > 0 ? `+${difference}` : difference}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // ── Desktop Table View ───────────────────────────────────────────
    return (
        <div className="bg-[var(--app-surface)] rounded-xl shadow-lg border-2 border-slate-200 dark:border-slate-800 overflow-hidden max-w-full">
            <div className="overflow-x-auto custom-scrollbar bg-white dark:bg-slate-950">
                <table className="w-full text-right text-xs border-collapse max-md:min-w-0 min-w-[900px]">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-gray-100 font-black border-b-2 border-slate-200 dark:border-slate-700">
                            <th className="py-3 px-4 border-l border-slate-200 dark:border-slate-700 min-w-[200px] text-start">اسم القطعة</th>
                            <th className="py-3 px-4 border-l border-slate-200 dark:border-slate-700 w-[140px]">رقم القطعة</th>
                            <th className="py-3 px-4 border-l border-slate-200 dark:border-slate-700 w-[100px]">الماركة</th>
                            <th className="py-3 px-4 border-l border-slate-200 dark:border-slate-700 w-[150px]">الأرقام البديلة</th>
                            <th className="py-3 px-4 border-l border-slate-200 dark:border-slate-700 w-[80px] text-center">المقاس</th>
                            <th className="py-3 px-4 border-l border-slate-200 dark:border-slate-700 text-center w-[100px] bg-slate-100/30 dark:bg-slate-800/20">المخزون الحالي</th>
                            <th className="py-3 px-4 border-l border-slate-200 dark:border-slate-700 text-center w-[110px] bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 font-black">الجرد الفعلي</th>
                            <th className="py-3 px-4 border-l border-slate-200 dark:border-slate-700 text-center w-[90px]">الفارق</th>
                            <th className="py-3 px-4 w-12 text-center" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {items.map((item) => {
                            const difference = item.quantity - item.system_quantity;
                            const diffColor = difference > 0 ? 'text-emerald-500' : difference < 0 ? 'text-rose-500' : 'text-gray-300';
                            return (
                                <tr key={item.product_id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                    <td className="py-2 px-3 border-l border-slate-100 dark:border-slate-800 font-bold text-gray-900 dark:text-gray-100">{item.name_ar}</td>
                                    <td className="py-2 px-3 border-l border-slate-100 dark:border-slate-800 font-mono text-gray-600 dark:text-gray-400">{item.part_number || item.sku}</td>
                                    <td className="py-2 px-3 border-l border-slate-100 dark:border-slate-800">
                                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">{item.brand || '-'}</span>
                                    </td>
                                    <td className="py-2 px-3 border-l border-slate-100 dark:border-slate-800 text-[10px] text-gray-500 truncate max-w-[150px]" title={item.alternative_numbers}>
                                        {item.alternative_numbers || '-'}
                                    </td>
                                    <td className="py-2 px-3 border-l border-slate-100 dark:border-slate-800 text-center font-bold">{item.size || '-'}</td>
                                    <td className="py-2 px-3 border-l border-slate-100 dark:border-slate-800 text-center font-mono font-bold text-gray-400 bg-gray-50/30 dark:bg-slate-800/20">
                                        {item.system_quantity}
                                    </td>
                                    <td className="py-2 px-3 border-l border-slate-100 dark:border-slate-800 text-center bg-blue-50/20 dark:bg-blue-900/5">
                                        <input
                                            type="number"
                                            value={item.quantity === 0 ? '' : item.quantity}
                                            onChange={(e) => onUpdateQuantity(item.product_id, e.target.value)}
                                            onFocus={(e) => { if (item.quantity === 0) e.target.select(); }}
                                            className="w-20 bg-white dark:bg-slate-950 border-2 border-blue-100 dark:border-blue-900/50 rounded-md py-1.5 px-1 text-center font-bold font-mono text-blue-600 dark:text-blue-400 focus:border-blue-500 focus:ring-0 transition-colors outline-none"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className={`py-2 px-3 border-l border-slate-100 dark:border-slate-800 text-center font-bold font-mono ${diffColor}`}>
                                        {difference > 0 ? `+${difference}` : difference}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                        <button
                                            onClick={() => onRemoveItem(item.product_id)}
                                            className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100 max-md:opacity-100"
                                        >
                                            <X size={14} strokeWidth={3} />
                                        </button>
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

export default QuickAuditItemsTable;