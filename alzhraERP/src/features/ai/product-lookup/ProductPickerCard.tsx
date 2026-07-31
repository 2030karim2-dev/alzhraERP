/**
 * AI Module - Product Picker Card
 * Interactive UI for selecting from multiple matching products.
 */
import React, { useState } from 'react';
import { Package, Tag, Factory, Ruler, CheckCircle2, AlertTriangle } from 'lucide-react';
import { LookupResult, ProductMatch } from '../core/types';

interface ProductPickerCardProps {
    lookupResults: LookupResult[];
    onComplete: (selectedProducts: { product: ProductMatch; quantity: number }[]) => void;
    onCancel: () => void;
}

export const ProductPickerCard: React.FC<ProductPickerCardProps> = ({
    lookupResults,
    onComplete,
    onCancel,
}) => {
    const [selections, setSelections] = useState<Record<number, ProductMatch | null>>(() => {
        const initial: Record<number, ProductMatch | null> = {};
        lookupResults.forEach((r, i) => {
            initial[i] = r.selectedProduct || null;
        });
        return initial;
    });

    const handleSelect = (resultIndex: number, product: ProductMatch) => {
        setSelections(prev => ({ ...prev, [resultIndex]: product }));
    };

    const selectableResults = lookupResults.filter(r => r.matches.length > 0);
    const selectedCount = Object.values(selections).filter(Boolean).length;

    const handleConfirm = () => {
        const selected = lookupResults
            .map((r, i) => selections[i] ? { product: selections[i]!, quantity: r.requestedQty } : null)
            .filter(Boolean) as { product: ProductMatch; quantity: number }[];
        if (selected.length > 0) onComplete(selected);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 shadow-lg p-4 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm border-b dark:border-gray-700 pb-3">
                <Package className="w-5 h-5" />
                <span>اختيار المنتجات من قاعدة البيانات</span>
                <span className="mr-auto text-xs font-normal text-gray-500">
                    ({lookupResults.length} صنف)
                </span>
            </div>

            {lookupResults.map((result, resultIdx) => (
                <div key={resultIdx} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                    {/* Item Header */}
                    <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 flex items-center gap-2 text-sm">
                        <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 w-6 h-6 rounded flex items-center justify-center text-xs font-bold">
                            {result.requestedQty}x
                        </span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {result.searchTerm}
                        </span>
                        {result.matches.length === 0 && (
                            <span className="mr-auto flex items-center gap-1 text-amber-600 text-xs">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                لم يتم العثور على نتائج
                            </span>
                        )}
                        {result.matches.length === 1 && (
                            <span className="mr-auto flex items-center gap-1 text-emerald-600 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                تم التحديد تلقائياً
                            </span>
                        )}
                        {result.matches.length > 1 && (
                            <span className="mr-auto text-xs text-blue-600 font-medium">
                                {result.matches.length} خيار متاح — اختر واحداً
                            </span>
                        )}
                    </div>

                    {/* Product Options */}
                    {result.matches.length > 0 && (
                        <div className="divide-y dark:divide-gray-700">
                            {result.matches.map((product) => {
                                const isSelected = selections[resultIdx]?.id === product.id;
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => handleSelect(resultIdx, product)}
                                        className={`w-full text-right p-3 flex items-start gap-3 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                                            isSelected
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-r-4 border-emerald-500'
                                                : ''
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                                            isSelected
                                                ? 'border-emerald-500 bg-emerald-500'
                                                : 'border-gray-300 dark:border-gray-600'
                                        }`}>
                                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                        </div>

                                        <div className="flex-grow min-w-0">
                                            <div className="font-bold text-gray-900 dark:text-white text-sm">
                                                {product.name}
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-1.5">
                                                {product.part_number && product.part_number !== '---' && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                                        <Tag className="w-3 h-3" />
                                                        {product.part_number}
                                                    </span>
                                                )}
                                                {product.brand && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                                        <Factory className="w-3 h-3" />
                                                        {product.brand}
                                                    </span>
                                                )}
                                                {product.size && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                                                        <Ruler className="w-3 h-3" />
                                                        {product.size}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-shrink-0 text-left space-y-1">
                                            <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                {product.selling_price.toFixed(2)}
                                            </div>
                                            <div className={`text-[10px] font-medium ${
                                                product.stock_quantity > 0
                                                    ? 'text-gray-500'
                                                    : 'text-rose-500'
                                            }`}>
                                                {product.stock_quantity > 0
                                                    ? `متوفر: ${product.stock_quantity}`
                                                    : 'نفد المخزون'
                                                }
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            ))}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t dark:border-gray-700">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    إلغاء
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={selectedCount === 0}
                    className="px-5 py-2 text-sm font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                    <CheckCircle2 className="w-4 h-4" />
                    تأكيد الاختيار ({selectedCount}/{selectableResults.length}) وإنشاء الفاتورة
                </button>
            </div>
        </div>
    );
};
