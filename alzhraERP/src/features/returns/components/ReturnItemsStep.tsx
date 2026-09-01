import React, { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Package, AlertCircle, ShoppingCart, RefreshCw } from 'lucide-react';
import InvoiceItemsList from './InvoiceItemsList';
import InvoiceSelector from './InvoiceSelector';
import GlobalItemSearch from './GlobalItemSearch';
import type { Invoice } from '../types';
import {
  buildReturnItem,
  mergeReturnItem,
  removeReturnItem,
  setReturnQuantity,
  hasReturnableItems,
  type ReturnItemDraft,
} from '../utils/returnHelpers';

interface ReturnItemsStepProps {
  invoices: Invoice[];
  isLoadingInvoices: boolean;
}

export const ReturnItemsStep: React.FC<ReturnItemsStepProps> = ({
  invoices,
  isLoadingInvoices,
}) => {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

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
    items.forEach(item => {
      qtyMap[item.id] = item.returnQuantity;
    });
    return qtyMap;
  }, [items]);

  const selectedItemsMap = useMemo(() => {
    const selMap: Record<string, boolean> = {};
    items.forEach(item => {
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
      newItems = mergeReturnItem(
        newItems,
        buildReturnItem(invoiceItem, Math.max(1, initialQty ?? 1))
      );
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

  const handleSelectAll = (selectAll: boolean) => {
    if (!selectedInvoice) return;
    if (selectAll) {
      const allItems = (selectedInvoice.invoice_items || []).map(invoiceItem =>
        buildReturnItem(invoiceItem, invoiceItem.quantity)
      );
      setValue('items', allItems, { shouldValidate: true });
    } else {
      setValue('items', [], { shouldValidate: true });
    }
  };

  const isAllSelected = useMemo(() => {
    const invItems = selectedInvoice?.invoice_items || [];
    return (
      invItems.length > 0 &&
      invItems.every(invItem => {
        const match = items.find(i => i.id === invItem.id);
        return match && match.returnQuantity === invItem.quantity;
      })
    );
  }, [selectedInvoice, items]);

  return (
    <div className="space-y-6">
      {/* Global Item Search - Excel Like Table */}
      {!isLoadingInvoices && invoices.length > 0 && (
        <GlobalItemSearch invoices={invoices} onItemSelect={handleInvoiceSelect} />
      )}

      {/* Step 1: Select Invoice */}
      <div className="rounded-2xl border-2 border-slate-100 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800 max-md:p-3">
        <div className="flex flex-col gap-6 max-md:gap-3 md:flex-row md:items-start">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 max-md:gap-2">
              <ShoppingCart size={20} />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">الفاتورة الأصلية</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              اختر الفاتورة المراد إرجاع أصناف منها.
            </p>
          </div>
          <div className="w-full flex-1 space-y-1">
            <InvoiceSelector
              invoices={invoices}
              selectedInvoiceId={selectedInvoiceId}
              onSelectInvoice={handleInvoiceSelect}
              placeholder={isLoadingInvoices ? 'جاري التحميل...' : 'اضغط لاختيار الفاتورة...'}
            />
            {errors.invoiceId && (
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-500 max-md:gap-1">
                <AlertCircle size={12} />
                {errors.invoiceId.message as string}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Step 2: Select Items */}
      {selectedInvoiceId && (
        <div className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border-2 border-slate-100 bg-white p-6 shadow-sm duration-500 dark:border-slate-700/50 dark:bg-slate-800 max-md:p-3">
          <div className="mb-4 flex flex-col items-start justify-between gap-4 max-md:gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 max-md:gap-2">
                <Package size={20} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">أصناف الفاتورة</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                حدد الأصناف والكميات المراد إرجاعها (استخدم الأسهم ↑↓ للتنقل)
              </p>
            </div>

            {selectedInvoice && (
              <button
                type="button"
                onClick={() => {
                  handleSelectAll(!isAllSelected);
                }}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold shadow-sm transition-all active:scale-95 max-md:gap-2 ${
                  isAllSelected
                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                }`}
              >
                <RefreshCw
                  size={14}
                  className={isAllSelected ? 'rotate-180 transition-transform' : ''}
                />
                <span>{isAllSelected ? 'إلغاء تحديد الكل' : 'إرجاع كامل المنتجات بالفاتورة'}</span>
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
              onSelectAll={handleSelectAll}
            />
            {errors.items && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20 max-md:gap-2 max-md:p-3">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                  {(errors.items.message as string) || 'يرجى مراجعة الأصناف المحددة'}
                </p>
              </div>
            )}

            {/* Selected Items Summary for Quick Return */}
            {hasReturnableItems(items) && (
              <div className="animate-in fade-in slide-in-from-top-4 mt-6 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 p-4 duration-300 dark:border-indigo-900/50 dark:bg-indigo-900/10 max-md:p-4">
                <div className="flex flex-col items-center justify-between gap-4 max-md:gap-4 md:flex-row">
                  <div className="w-full flex-1 space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-700 dark:text-indigo-400 max-md:gap-2">
                      <ShoppingCart size={16} />
                      ملخص الأصناف المحددة للإرجاع
                    </h4>
                    <div className="flex flex-wrap gap-2 max-md:gap-2">
                      {items
                        .filter((i: ReturnItemDraft) => i.returnQuantity > 0)
                        .map((item: ReturnItemDraft, idx: number) => (
                          <span
                            key={`${item.id}-${idx}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm dark:border-indigo-800 dark:bg-slate-800 dark:text-slate-300 max-md:gap-1.5"
                          >
                            <span className="max-w-[120px] truncate" title={item.name}>
                              {item.name}
                            </span>
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                              {item.returnQuantity}x
                            </span>
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-[var(--app-surface)] p-2 shadow-sm dark:border-indigo-800/60 max-md:gap-3 max-md:p-2.5 md:w-auto md:justify-end">
                    <div className="px-2 text-right">
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        إجمالي المرتجع
                      </p>
                      <p className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: selectedInvoice?.currency_code || 'SAR',
                        }).format(
                          items.reduce(
                            (sum: number, item: ReturnItemDraft) =>
                              sum + item.returnQuantity * item.unitPrice,
                            0
                          )
                        )}
                      </p>
                    </div>
                    <div className="mx-1 hidden h-10 w-px bg-slate-200 dark:bg-slate-700 sm:block"></div>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-95 dark:shadow-indigo-900/20 max-md:gap-2"
                      onClick={() => {
                        // تعيين سبب افتراضي عند الإرجاع السريع ثم إرسال النموذج
                        // عبر requestSubmit حتى تمر التحققات (Zod) وتُعرض الأخطاء عند الحاجة
                        if (!watch('returnReason')) {
                          setValue('returnReason', 'إرجاع سريع للعميل/المورد', {
                            shouldValidate: true,
                          });
                        }
                        (
                          document.getElementById('advanced-return-form') as HTMLFormElement | null
                        )?.requestSubmit();
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
