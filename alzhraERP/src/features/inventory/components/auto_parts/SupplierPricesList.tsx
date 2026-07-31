import React, { useState } from 'react';
import { Product } from '../../types';
import { useSupplierPrices, useSupplierPriceMutations } from '../../hooks/index';
import { useFeedbackStore } from '../../../feedback/store';
import { Plus, Building2, Truck, X } from 'lucide-react';
import { cn } from '../../../../core/utils';

interface SupplierPricesListProps {
    product: Product;
}

export const SupplierPricesList: React.FC<SupplierPricesListProps> = ({ product }) => {
    const { data: prices, isLoading } = useSupplierPrices(product.id);
    const { addSupplierPrice, isAdding: isSaving } = useSupplierPriceMutations(product.id);
    const { showToast } = useFeedbackStore();

    const [isAdding, setIsAdding] = useState(false);
    const [supplierId, setSupplierId] = useState('');
    const [costPrice, setCostPrice] = useState<number>(0);
    const [leadTime, setLeadTime] = useState<number | ''>('');
    const [partNumber, setPartNumber] = useState('');
    const [notes, setNotes] = useState('');

    const handleSave = async () => {
        if (!supplierId || costPrice <= 0) {
            showToast("الرجاء تحديد المورد وإدخال سعر التكلفة بشكل صحيح", 'warning');
            return;
        }

        await addSupplierPrice({
            supplier_id: supplierId,
            cost_price: Number(costPrice),
            ...(typeof leadTime === 'number' ? { lead_time_days: leadTime } : {}),
            supplier_part_number: partNumber,
            notes: notes
        });
        setIsAdding(false);
        resetForm();
    }

    const resetForm = () => {
        setSupplierId('');
        setCostPrice(0);
        setLeadTime('');
        setPartNumber('');
        setNotes('');
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950">
            {/* Toolbar */}
            <div className="flex justify-between items-center px-4 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 shrink-0">
                <h4 className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Building2 size={11} className="text-emerald-500" /> أسعار الموردين (التوريد)
                </h4>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={cn(
                        "flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded transition-colors",
                        isAdding ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 hover:bg-emerald-100"
                    )}
                >
                    {isAdding ? <><X size={10} /> إلغاء</> : <><Plus size={10} /> إضافة</>}
                </button>
            </div>

            {/* Add Section */}
            {isAdding && (
                <div className="p-2 bg-emerald-50/20 dark:bg-emerald-900/10 border-b border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-1">
                    <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                        <input
                            type="text"
                            value={supplierId}
                            onChange={(e) => setSupplierId(e.target.value)}
                            placeholder="ID المورد"
                            className="text-[9px] font-bold px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none h-7"
                        />
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">SR</span>
                            <input
                                type="number"
                                value={costPrice || ''}
                                onChange={(e) => setCostPrice(parseFloat(e.target.value))}
                                placeholder="التكلفة"
                                className="w-full text-[9px] font-bold pr-1.5 pl-6 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none h-7"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                        <input
                            type="text"
                            value={partNumber}
                            onChange={(e) => setPartNumber(e.target.value)}
                            placeholder="OEM #"
                            className="text-[9px] font-bold px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none h-7 font-mono"
                            dir="ltr"
                        />
                        <input
                            type="number"
                            value={leadTime}
                            onChange={(e) => setLeadTime(e.target.value === '' ? '' : parseInt(e.target.value))}
                            placeholder="الأيام"
                            className="text-[9px] font-bold px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none h-7"
                        />
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="ملاحظات..."
                            className="text-[9px] font-bold px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none h-7"
                        />
                    </div>
                    <button onClick={handleSave} disabled={isSaving} className="w-full bg-emerald-600 text-white text-[9px] font-bold py-1 hover:bg-emerald-700 transition-colors">
                        {isSaving ? 'جاري الحفظ...' : 'حفظ التسعيرة'}
                    </button>
                </div>
            )}

            {/* Main Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="text-right px-4 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-tight">المورد / التاريخ</th>
                            <th className="text-right px-4 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-tight">التكلفة</th>
                            <th className="text-right px-4 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-tight">مدة الحضور</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                        {isLoading ? (
                            <tr><td colSpan={3} className="text-center py-6 text-[9px] text-slate-400 font-bold uppercase tracking-widest">جاري التحميل...</td></tr>
                        ) : !prices || prices.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="text-center py-10 text-slate-300">
                                    <Building2 size={20} className="mx-auto mb-1.5 opacity-20" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">لا توجد تسعيرات</span>
                                </td>
                            </tr>
                        ) : (
                            prices.map((price) => (
                                <tr key={price.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="px-4 py-1.5">
                                        <div className="text-[10px] font-bold text-slate-900 dark:text-white capitalize leading-tight">
                                            {price.supplier_name || 'مورد عام'}
                                        </div>
                                        <div className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">
                                            {new Date(price.updated_at).toLocaleDateString('ar-SA')}
                                        </div>
                                    </td>
                                    <td className="px-4 py-1.5 whitespace-nowrap">
                                        <div className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            {price.cost_price.toFixed(2)} SR
                                        </div>
                                        <div className="text-[8px] text-slate-400 font-mono">
                                            {price.supplier_part_number || '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-1.5">
                                        {price.lead_time_days ? (
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-500">
                                                <Truck size={9} />
                                                {price.lead_time_days} يوم
                                            </div>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
