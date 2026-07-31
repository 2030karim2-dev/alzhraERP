import React, { useState } from 'react';
import { Product } from '../../types';
import { useCrossReferences, useCrossReferenceMutations } from '../../hooks/index';
import { Plus, Link as LinkIcon, Trash2, X } from 'lucide-react';
import ProductSearch from '../../../../features/sales/components/create/ProductSearch';
import { cn } from '../../../../core/utils';

interface CrossReferenceListProps {
    product: Product;
}

export const CrossReferenceList: React.FC<CrossReferenceListProps> = ({ product }) => {
    const { data: references, isLoading } = useCrossReferences(product.id);
    const { addCrossReference, removeCrossReference, isAdding: isSaving } = useCrossReferenceMutations(product.id);

    const [isAdding, setIsAdding] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [matchQuality, setMatchQuality] = useState('exact');
    const [notes, setNotes] = useState('');

    const getMatchQualityDetails = (quality: string) => {
        switch (quality) {
            case 'exact': return { color: 'text-emerald-600 dark:text-emerald-400', label: 'مطابق' };
            case 'partial': return { color: 'text-amber-600 dark:text-amber-400', label: 'جزئي' };
            case 'interchangeable': return { color: 'text-blue-600 dark:text-blue-400', label: 'تبادلي' };
            default: return { color: 'text-slate-600 dark:text-slate-400', label: quality };
        }
    }

    const handleSave = async () => {
        if (!selectedProduct) return;
        await addCrossReference({
            alternative_product_id: selectedProduct.productId,
            match_quality: matchQuality,
            notes: notes
        });
        setIsAdding(false);
        setSelectedProduct(null);
        setNotes('');
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950">
            {/* Toolbar */}
            <div className="flex justify-between items-center px-4 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 shrink-0">
                <h4 className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-2">
                    <LinkIcon size={11} className="text-blue-500" /> البدائل والارتباطات
                </h4>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={cn(
                        "flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded transition-colors",
                        isAdding ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20" : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 hover:bg-blue-100"
                    )}
                >
                    {isAdding ? <><X size={10} /> إلغاء</> : <><Plus size={10} /> إضافة</>}
                </button>
            </div>

            {/* Add Section */}
            {isAdding && (
                <div className="p-2 bg-blue-50/20 dark:bg-blue-900/10 border-b border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-1">
                    {!selectedProduct ? (
                        <div className="scale-90 origin-top">
                            <ProductSearch onSelectProduct={setSelectedProduct} />
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-2 py-1 border border-blue-100 dark:border-blue-800">
                                <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300">{selectedProduct.name}</span>
                                <button onClick={() => setSelectedProduct(null)} className="text-[8px] font-bold text-rose-500 uppercase">تغيير</button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                <select
                                    value={matchQuality}
                                    onChange={(e) => setMatchQuality(e.target.value)}
                                    className="text-[9px] font-bold px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none h-7"
                                >
                                    <option value="exact">مطابق تماماً</option>
                                    <option value="partial">تعديل بسيط</option>
                                    <option value="interchangeable">تبادلي</option>
                                </select>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="ملاحظات..."
                                    className="text-[9px] font-bold px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none h-7"
                                />
                            </div>
                            <button onClick={handleSave} disabled={isSaving} className="w-full bg-blue-600 text-white text-[9px] font-bold py-1 hover:bg-blue-700 transition-colors">
                                {isSaving ? 'جاري الحفظ...' : 'حفظ الارتباط'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Main Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="text-right px-4 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-tight">المنتج البديل</th>
                            <th className="text-right px-4 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-tight">التوافق</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                        {isLoading ? (
                            <tr><td colSpan={3} className="text-center py-6 text-[9px] text-slate-400 font-bold uppercase tracking-widest">جاري التحميل...</td></tr>
                        ) : !references || references.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="text-center py-10 text-slate-300">
                                    <LinkIcon size={20} className="mx-auto mb-1.5 opacity-20" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">لا توجد بدائل</span>
                                </td>
                            </tr>
                        ) : (
                            references.map((ref) => {
                                const quality = getMatchQualityDetails(ref.match_quality);
                                return (
                                    <tr key={ref.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="px-4 py-1.5">
                                            <div className="text-[10px] font-bold text-slate-900 dark:text-white capitalize leading-tight">
                                                {ref.alternative_product?.name_ar || ref.alternative_product?.name}
                                            </div>
                                            <div className="text-[8px] text-slate-400 font-mono font-bold uppercase tracking-tight">
                                                SKU: {ref.alternative_product?.sku}
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5 whitespace-nowrap">
                                            <span className={cn("inline-flex items-center px-1.5 py-0.5 text-[8px] font-bold border border-transparent", quality.color)}>
                                                {quality.label}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5 whitespace-nowrap text-left">
                                            <button
                                                onClick={() => { if (window.confirm('فك الارتباط؟')) removeCrossReference(ref.id) }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-all"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
