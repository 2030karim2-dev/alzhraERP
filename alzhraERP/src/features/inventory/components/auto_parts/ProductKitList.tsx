import React, { useState } from 'react';
import { Product } from '../../types';
import { useKitComponents, useKitMutations } from '../../hooks/index';
import { Plus, Package, Trash2, Layers, X } from 'lucide-react';
import ProductSearch from '../../../../features/sales/components/create/ProductSearch';
import { cn } from '../../../../core/utils';

interface ProductKitListProps {
    product: Product;
}

export const ProductKitList: React.FC<ProductKitListProps> = ({ product }) => {
    const { data: kitItems, isLoading } = useKitComponents(product.id);
    const { addKitComponent, removeKitComponent, isAdding: isSaving } = useKitMutations(product.id);

    const [isAdding, setIsAdding] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [quantity, setQuantity] = useState<number>(1);

    const handleSave = async () => {
        if (!selectedProduct || quantity <= 0) return;
        await addKitComponent({
            component_product_id: selectedProduct.productId,
            quantity: quantity
        });
        setIsAdding(false);
        setSelectedProduct(null);
        setQuantity(1);
    }

    const isAKit = kitItems && kitItems.length > 0;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950">
            {/* Toolbar */}
            <div className="flex justify-between items-center px-4 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 shrink-0">
                <h4 className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-2">
                    <Layers size={11} className="text-indigo-500" /> مكونات الباقة (Kit)
                </h4>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={cn(
                        "flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded transition-colors",
                        isAdding ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 hover:bg-indigo-100"
                    )}
                >
                    {isAdding ? <><X size={10} /> إلغاء</> : <><Plus size={10} /> إضافة</>}
                </button>
            </div>

            {/* Add Section */}
            {isAdding && (
                <div className="p-2 bg-indigo-50/20 dark:bg-indigo-900/10 border-b border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-1">
                    {!selectedProduct ? (
                        <div className="scale-90 origin-top">
                            <ProductSearch onSelectProduct={setSelectedProduct} />
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-2 py-1 border border-indigo-100 dark:border-indigo-800">
                                <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300">{selectedProduct.name}</span>
                                <button onClick={() => setSelectedProduct(null)} className="text-[8px] font-bold text-rose-500 uppercase">تغيير</button>
                            </div>
                            <div className="flex gap-1.5">
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                    placeholder="الكمية"
                                    className="w-20 text-[9px] font-bold px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none h-7"
                                />
                                <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-indigo-600 text-white text-[9px] font-bold py-1 hover:bg-indigo-700 transition-colors">
                                    {isSaving ? 'جاري الحفظ...' : 'اعتماد الكمية'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Main Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="text-right px-4 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-tight">القطعة (المكون)</th>
                            <th className="text-right px-4 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-tight w-20">الكمية</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                        {isLoading ? (
                            <tr><td colSpan={3} className="text-center py-6 text-[9px] text-slate-400 font-bold uppercase tracking-widest">جاري التحميل...</td></tr>
                        ) : !isAKit ? (
                            <tr>
                                <td colSpan={3} className="text-center py-10 text-slate-300">
                                    <Package size={20} className="mx-auto mb-1.5 opacity-20" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">ليس منتج تجميعي</span>
                                </td>
                            </tr>
                        ) : (
                            kitItems.map((item) => (
                                <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="px-4 py-1.5">
                                        <div className="text-[10px] font-bold text-slate-900 dark:text-white capitalize leading-tight">
                                            {item.component_product?.name_ar || item.component_product?.name}
                                        </div>
                                        <div className="text-[8px] text-slate-400 font-mono font-bold uppercase tracking-tight">
                                            SKU: {item.component_product?.sku}
                                        </div>
                                    </td>
                                    <td className="px-4 py-1.5 whitespace-nowrap">
                                        <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                            {item.quantity} ×
                                        </span>
                                    </td>
                                    <td className="px-2 py-1.5 text-left">
                                        <button
                                            onClick={() => { if (window.confirm('إزالة من الباقة؟')) removeKitComponent(item.id) }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-all"
                                        >
                                            <Trash2 size={11} />
                                        </button>
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
