import React, { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Package,  AlertCircle, ShoppingCart, RefreshCw } from 'lucide-react';
import InvoiceItemsList from './InvoiceItemsList';
import InvoiceSelector from './InvoiceSelector';
import GlobalItemSearch from './GlobalItemSearch';
import { Invoice } from '../types';
import {
    buildReturnItem,
    mergeReturnItem,
    removeReturnItem,
    setReturnQuantity,
    hasReturnableItems,
    type ReturnItemDraft
} from '../utils/returnHelpers';

interface ReturnItemsStepProps {
    invoices: Invoice[];
    isLoadingInvoices: boolean;
}

export const ReturnItemsStep: React.FC<ReturnItemsStepProps> = ({
    invoices,
    isLoadingInvoices
}) => {
    const { watch, setValue, formState: { errors } } = useFormContext();

    const selectedInvoiceId = watch('invoiceId');
    const items: ReturnItemDraft[] = watch('items') || [];

    const selectedInvoice = useMemo(() => {
        return invoices.find(inv => inv.id === selectedInvoiceId);
    }, [invoices, selectedInvoiceId]);

    // Derived states for InvoiceItemsList
    // المفتاح الموحد هو item.id (معرّف سطر الفاتورة) — يطابق المفتاح
    // الذي يقرأه InvoiceItemsList عبر returnQuantities[item.id]
    const returnQuantities = useMemo(() => {
        const qtyMap: Record<string, number> = {};
        items.forEach((item) => {
            qtyMap[item.id] = item.returnQuantity;
        });
        return qtyMap;
    }, [items]);

    const selectedItemsMap = useMemo(() => {
        const selMap: Record<string, boolean> = {};
        items.forEach((item) => {
            selMap[item.id] = true;
        });
        return selMap;
    }, [items]);

    const handleInvoiceSelect = (id: string) => {
        setValue('invoiceId', id, { shouldValidate: true });
        // Reset items when invoice changes
        setValue('items', [], { shouldValidate: true });
    };

    /**
     * تحديد/إلغاء تحديد صنف.
     * initialQty: كمية ابتدائية تُستخدم عند إضافة الصنف لأول مرة
     * (تُمرَّر من حقل الكمية حتى لا تُفقد القيمة المدخلة).
     */
    const handleItemSelect = (itemId: string, isSelected: boolean, initialQty?: number) => {
        if (!selectedInvoice) return;

        const invoiceItem = selectedInvoice.invoice_items?.find(i => i.id === itemId);
        if (!invoiceItem) return;

        let newItems: ReturnItemDraft[] = items;

        if (isSelected) {
            newItems = mergeReturnItem(newItems, buildReturnItem(invoiceItem, Math.max(1, initialQty ?? 1)));
        } else {
            newItems = removeReturnItem(newItems, itemId);
        }

        setValue('items', newItems, { shouldValidate: true });
    };

    const handleQuantityChange = (itemId: string, quantity: number, _maxQty?: number) => {
        if (!selectedInvoice) return;

        const newItems = setReturnQuantity(items, itemId, quantity);

        setValue('items', newItems, { shouldValidate: true });
    };

    return (
        <div className="space-y-6">
            {/* Global Item Search - Excel Like Table */}
            {!isLoadingInvoices && invoices.length > 0 && (
                <GlobalItemSearch
                    invoices={invoices}
                    onItemSelect={handleInvoiceSelect}
                />
            )}

            {/* Step 1: Select Invoice */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-md:p-3 border-2 border-slate-100 dark:border-slate-700/50 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start gap-6 max-md:gap-3">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 max-md:gap-2 text-indigo-600 dark:text-indigo-400">
                            <ShoppingCart size={20} />
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">الفاتورة الأصلية</h3>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            اختر الفاتورة المراد إرجاع أصناف منها.
                        </p>
                    </div>
                    <div className="flex-1 w-full space-y-1">
                        <InvoiceSelector
                            invoices={invoices}
                            selectedInvoiceId={selectedInvoiceId}
                            onSelectInvoice={handleInvoiceSelect}
                            placeholder={isLoadingInvoices ? 'جاري التحميل...' : 'اضغط لاختيار الفاتورة...'}
                        />
                        {errors.invoiceId && (
                            <p className="text-xs font-bold text-red-500 flex items-center gap-1 max-md:gap-1 mt-1">
                                <AlertCircle size={12} />
                                {errors.invoiceId.message as string}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Step 2: Select Items */}
            {selectedInvoiceId && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-md:p-3 border-2 border-slate-100 dark:border-slate-700/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 max-md:gap-4 mb-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 max-md:gap-2 text-indigo-600 dark:text-indigo-400">
                                <Package size={20} />
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">أصناف الفاتورة</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                حدد الأصناف والكميات المراد إرجاعها (استخدم الأسهم ↑↓ للتنقل)
                            </p>
                        </div>

                        {selectedInvoice && (
                            <button
                                type="button"
                                onClick={() => {
                                    const allItems = (selectedInvoice.invoice_items || []).map(invoiceItem =>
                                        buildReturnItem(invoiceItem, invoiceItem.quantity)
                                    );
                                    setValue('items', allItems, { shouldValidate: true });
                                }}
                                className="flex items-center gap-2 max-md:gap-2 px-4 py-2 text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all active:scale-95"
                            >
                                <RefreshCw size={14} />
                                إرجاع كامل الفاتورة
                            </button>
                        )}
                    </div>

                    <div className="mt-4">
                        <InvoiceItemsList
                            items={selectedInvoice?.invoice_items || []}
                            invoiceCurrency={selectedInvoice?.currency_code || 'SAR'}
                            selectedItems={selectedItemsMap}
                            returnQuantities={returnQuantities}
                            onItemSelect={handleItemSelect}
                            onQuantityChange={handleQuantityChange}
                        />
                        {errors.items && (
                            <div className="mt-3 p-3 max-md:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 max-md:gap-2">
                                <AlertCircle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                                    {errors.items.message as string || 'يرجى مراجعة الأصناف المحددة'}
                                </p>
                            </div>
                        )}

                        {/* Selected Items Summary for Quick Return */}
                        {hasReturnableItems(items) && (
                            <div className="mt-6 border-2 border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 max-md:p-4 bg-indigo-50/50 dark:bg-indigo-900/10 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-md:gap-4">
                                    <div className="flex-1 w-full space-y-2">
                                        <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2 max-md:gap-2">
                                            <ShoppingCart size={16} />
                                            ملخص الأصناف المحددة للإرجاع
                                        </h4>
                                        <div className="flex flex-wrap gap-2 max-md:gap-2">
                                            {items.filter((i: ReturnItemDraft) => i.returnQuantity > 0).map((item: ReturnItemDraft, idx: number) => (
                                                <span key={`${item.id}-${idx}`} className="inline-flex items-center gap-1 max-md:gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                                                    <span className="truncate max-w-[120px]" title={item.name}>{item.name}</span>
                                                    <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded font-mono text-[10px]">{item.returnQuantity}x</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-3 max-md:gap-3 w-full md:w-auto shrink-0 bg-[var(--app-surface)] p-2 max-md:p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-800/60 shadow-sm">
                                        <div className="text-right px-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">إجمالي المرتجع</p>
                                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedInvoice?.currency_code || 'SAR' }).format(
                                                    items.reduce((sum: number, item: ReturnItemDraft) => sum + (item.returnQuantity * item.unitPrice), 0)
                                                )}
                                            </p>
                                        </div>
                                        <div className="w-px h-10 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
                                        <button
                                            type="button"
                                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 text-sm font-bold rounded-xl transition-all flex items-center gap-2 max-md:gap-2"
                                            onClick={() => {
                                                // تعيين سبب افتراضي عند الإرجاع السريع ثم إرسال النموذج
                                                // عبر requestSubmit حتى تمر التحققات (Zod) وتُعرض الأخطاء عند الحاجة
                                                if (!watch('returnReason')) {
                                                    setValue('returnReason', 'إرجاع سريع للعميل/المورد', { shouldValidate: true });
                                                }
                                                (document.getElementById('advanced-return-form') as HTMLFormElement | null)?.requestSubmit();
                                            }}
                                        >
                                            موافقة وإرجاع
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
