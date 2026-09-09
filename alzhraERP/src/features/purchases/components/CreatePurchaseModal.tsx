import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Save, Printer, Wallet, HandCoins } from 'lucide-react';
import { usePurchaseStore } from '../store';
import { useCreatePurchase } from '../hooks';
import { useCompany } from '../../settings/hooks';
import { useSettingsStore } from '../../settings/settingsStore';
import { useFeedbackStore } from '../../feedback/store';
import { usePaymentAccounts } from '../../accounting/hooks/index';
import { useWarehouses } from '../../inventory/hooks/useWarehouses';
import InvoiceHeader from '../../sales/components/create/InvoiceHeader';
import PurchaseMeta from './create/PurchaseMeta';
import InteractivePurchaseTable from './create/InteractivePurchaseTable';
import { formatCurrency } from '../../../core/utils';
import { getDefaultExchangeOperator } from '../../../core/utils/currencyUtils';
import Button from '../../../ui/base/Button';
import DraftStatusBanner from '../../../ui/common/DraftStatusBanner';
import { InvoiceConfirmationModal } from '../../../ui/common/InvoiceConfirmationModal';

interface Props {
  onSuccess: () => void;
}
const hasText = (value: string): boolean => value !== '';

interface PurchaseValidationContext {
  supplier: { id: string; name: string } | null;
  issueDate: string;
  warehouseId: string;
  invoiceType: string;
  cashboxId: string;
  validItems: ReturnType<typeof usePurchaseStore.getState>['items'];
}
const validatePurchase = ({
  supplier,
  issueDate,
  warehouseId,
  invoiceType,
  cashboxId,
  validItems,
}: PurchaseValidationContext): string | null => {
  if (supplier === null) return 'يرجى اختيار مورد أولاً';
  if (validItems.length === 0) return 'يرجى إضافة صنف واحد على الأقل بكمية وسعر صحيحين';
  if (!hasText(issueDate)) return 'يرجى تحديد تاريخ الفاتورة';
  if (!hasText(warehouseId)) return 'يرجى اختيار مستودع فعلي قبل اعتماد الفاتورة';
  if (validItems.some(item => item.discount < 0 || item.discount > item.quantity * item.costPrice))
    return 'يوجد خصم غير صالح؛ يجب ألا يتجاوز الخصم إجمالي الصنف';
  if (invoiceType === 'cash' && !hasText(cashboxId))
    return 'يرجى اختيار الصندوق / البنك للفاتورة النقدية';
  return null;
};

interface TotalsProps {
  totals: ReturnType<typeof usePurchaseStore.getState>['totals'];
  invoiceType: 'cash' | 'credit';
  paidAmount: number;
  currency: string;
  onPaidAmountChange: (value: number) => void;
}

const Totals: React.FC<TotalsProps> = ({
  totals,
  invoiceType,
  paidAmount,
  currency,
  onPaidAmountChange,
}) => (
  <div className="border-t-2 border-gray-200 bg-[var(--app-surface)] p-2 dark:border-slate-800 max-md:border-t max-md:p-0.5 md:p-3 print:break-inside-avoid">
    <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row">
      {/* Partial Payment Section for Credit Purchases */}
      {invoiceType === 'credit' ? (
        <div className="flex-1 rounded-xl border border-amber-200/80 bg-amber-50/50 p-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <HandCoins size={14} className="text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                سداد دفعة نقدية للمورد (اختياري للآجل)
              </span>
            </div>
            <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300">
              المتبقي آجل:{' '}
              {formatCurrency(Math.max(0, totals.grandTotal - (paidAmount || 0)), currency)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                max={totals.grandTotal}
                step="any"
                placeholder="0.00"
                value={paidAmount > 0 ? paidAmount : ''}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  onPaidAmountChange(isNaN(val) || val < 0 ? 0 : val);
                }}
                className="w-full rounded-lg border border-amber-300/80 bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-amber-700/60 dark:bg-slate-900 dark:text-slate-100"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                {currency}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPaidAmountChange(totals.grandTotal)}
                className="rounded-md bg-amber-200/70 px-2 py-1.5 text-[10px] font-bold text-amber-900 transition-colors hover:bg-amber-300 dark:bg-amber-900/60 dark:text-amber-200"
              >
                كامل
              </button>
              <button
                type="button"
                onClick={() => onPaidAmountChange(Math.round((totals.grandTotal / 2) * 100) / 100)}
                className="rounded-md bg-amber-200/70 px-2 py-1.5 text-[10px] font-bold text-amber-900 transition-colors hover:bg-amber-300 dark:bg-amber-900/60 dark:text-amber-200"
              >
                50%
              </button>
              {paidAmount > 0 && (
                <button
                  type="button"
                  onClick={() => onPaidAmountChange(0)}
                  className="rounded-md bg-rose-100 px-2 py-1.5 text-[10px] font-bold text-rose-700 transition-colors hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300"
                >
                  إلغاء
                </button>
              )}
            </div>
          </div>

          {paidAmount > totals.grandTotal && (
            <span className="mt-1 block text-[10px] font-bold text-rose-600">
              * تنبيه: مبلغ الدفعة أكبر من إجمالي الفاتورة (
              {formatCurrency(totals.grandTotal, currency)})
            </span>
          )}
        </div>
      ) : (
        <div className="hidden flex-1 md:block" />
      )}

      {/* Totals Breakdown Column */}
      <div className="flex w-full flex-col md:w-80">
        <div className="grid grid-cols-2 border dark:border-slate-800">
          <div className="border-b border-l bg-gray-50 p-2 text-right dark:border-slate-800 dark:bg-slate-950 max-md:p-0.5">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              المجموع قبل الخصم
            </span>
            <span
              dir="ltr"
              className="font-mono text-[11px] font-bold text-gray-600 dark:text-slate-400"
            >
              {formatCurrency(totals.subTotal, currency)}
            </span>
          </div>
          <div className="border-b bg-gray-50 p-2 text-right dark:border-slate-800 dark:bg-slate-950 max-md:p-0.5">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-rose-400">
              إجمالي الخصومات
            </span>
            <span
              dir="ltr"
              className="font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400"
            >
              {formatCurrency(totals.totalDiscount, currency)}
            </span>
          </div>
        </div>
        <div className="relative flex items-center justify-between overflow-hidden bg-slate-950 p-4 text-white max-md:p-1.5">
          <div className="relative z-10">
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
              صافي الفاتورة
            </span>
            <h2 dir="ltr" className="font-mono text-3xl font-bold tracking-tighter max-md:text-xl">
              {formatCurrency(totals.grandTotal, currency)}
            </h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center bg-rose-600 shadow-lg max-md:h-7 max-md:w-7">
            <Wallet size={20} className="max-md:h-4 max-md:w-4" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CreatePurchaseModal: React.FC<Props> = ({ onSuccess }) => {
  const { data: company } = useCompany();
  const {
    items,
    supplier,
    totals,
    resetCart,
    initializeItems,
    invoiceNumber,
    issueDate,
    invoiceType,
    cashboxId,
    paidAmount,
    warehouseId,
    notes,
    currency,
    exchangeRate,
    setMetadata,
  } = usePurchaseStore();
  const { mutate: createPurchase, isPending } = useCreatePurchase();
  const { invoice: invoiceSettings } = useSettingsStore();
  const { showToast } = useFeedbackStore();
  const { data: rawCashAccounts } = usePaymentAccounts();
  const { data: rawWarehouses } = useWarehouses();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'مسودة_فاتورة_مشتريات',
  });

  useEffect(() => {
    initializeItems(6);
    const defCurrency = invoiceSettings.default_currency || 'SAR';
    setMetadata('currency', defCurrency);
    if (defCurrency === 'SAR') {
      setMetadata('exchangeRate', 1);
    }
    setMetadata('invoiceType', invoiceSettings.default_invoice_type);
  }, [
    initializeItems,
    invoiceSettings.default_currency,
    invoiceSettings.default_invoice_type,
    setMetadata,
  ]);

  useEffect((): (() => void) => {
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      const hasWork = items.some(item => item.productId !== '' && item.quantity > 0);
      if (hasWork) {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return (): void => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [items]);

  const handleSave = useCallback((): void => {
    const validItems = items.filter(
      item => item.productId !== '' && item.quantity > 0 && item.costPrice > 0
    );
    const validationError = validatePurchase({
      supplier,
      issueDate,
      warehouseId,
      invoiceType,
      cashboxId,
      validItems,
    });
    if (validationError !== null) {
      showToast(
        validationError,
        invoiceType === 'cash' && !hasText(cashboxId) ? 'warning' : 'error'
      );
      return;
    }
    if (supplier === null) return;

    if (invoiceType === 'credit' && (paidAmount || 0) > totals.grandTotal) {
      showToast('مبلغ الدفعة المسددة لا يمكن أن يتجاوز إجمالي الفاتورة', 'error');
      return;
    }

    if (invoiceType === 'credit' && (paidAmount || 0) > 0 && !hasText(cashboxId)) {
      showToast('يرجى اختيار الصندوق / البنك لسداد الدفعة النقدية', 'warning');
      return;
    }

    setShowConfirmModal(true);
  }, [
    cashboxId,
    invoiceType,
    issueDate,
    items,
    paidAmount,
    showToast,
    supplier,
    totals.grandTotal,
    warehouseId,
  ]);

  const executeConfirm = useCallback((): void => {
    if (!supplier || isPending) return;
    const validItems = items.filter(
      item => item.productId !== '' && item.quantity > 0 && item.costPrice > 0
    );

    createPurchase(
      {
        supplierId: supplier.id,
        invoiceNumber: hasText(invoiceNumber) ? invoiceNumber : '',
        issueDate,
        items: validItems.map(item => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          partNumber: item.partNumber,
          brand: item.brand,
          quantity: item.quantity,
          costPrice: item.costPrice,
          discount: item.discount,
          warehouseId,
          total: Math.max(0, item.quantity * item.costPrice - item.discount),
        })),
        status: 'posted',
        notes: hasText(notes.trim()) ? notes.trim() : undefined,
        paymentMethod: invoiceType,
        cashAccountId: cashboxId,
        currency,
        exchangeRate: currency === 'SAR' ? 1 : exchangeRate,
        paidAmount: invoiceType === 'credit' ? paidAmount || 0 : 0,
      },
      {
        onSuccess: () => {
          setShowConfirmModal(false);
          resetCart();
          onSuccess();
        },
      }
    );
  }, [
    cashboxId,
    createPurchase,
    currency,
    exchangeRate,
    invoiceNumber,
    invoiceType,
    issueDate,
    items,
    notes,
    onSuccess,
    paidAmount,
    resetCart,
    supplier,
    warehouseId,
  ]);

  const enteredItemsCount = items.filter(item => item.productId !== '').length;

  const selectedCashbox = (
    rawCashAccounts as Array<{ id: string; name_ar: string }> | undefined
  )?.find(acc => acc.id === cashboxId);
  const selectedWarehouse = (
    rawWarehouses as Array<{ id: string; name_ar: string }> | undefined
  )?.find(w => w.id === warehouseId);

  const confirmationItems = items
    .filter(item => item.productId !== '' && item.quantity > 0 && item.costPrice > 0)
    .map(item => ({
      name: item.name,
      sku: item.sku,
      partNumber: item.partNumber,
      brand: item.brand,
      quantity: item.quantity,
      price: item.costPrice,
      discount: item.discount,
      total: Math.max(0, item.quantity * item.costPrice - item.discount),
    }));

  return (
    <div className="animate-in fade-in mx-auto max-w-none space-y-2 px-1 pb-24 pt-1 duration-500 max-md:space-y-1.5 max-md:pb-12 max-md:pt-0 sm:space-y-3 sm:pt-2 md:px-2">
      <DraftStatusBanner
        itemCount={enteredItemsCount}
        onClearDraft={resetCart}
        entityName={supplier?.name}
      />
      <div
        ref={printRef}
        className="flex flex-col overflow-hidden rounded-2xl border-2 bg-[var(--app-surface)] shadow-2xl dark:border-gray-100 dark:border-slate-800 max-md:border"
      >
        {company && (
          <div className="hidden md:block">
            <InvoiceHeader company={company} documentTypeTitle="فاتورة توريد مشتريات" />
          </div>
        )}
        <PurchaseMeta />
        <InteractivePurchaseTable />
        <Totals
          totals={totals}
          invoiceType={invoiceType}
          paidAmount={paidAmount}
          currency={currency}
          onPaidAmountChange={val => setMetadata('paidAmount', val)}
        />
      </div>
      <div className="flex flex-wrap justify-end gap-1.5 sm:gap-2 print:hidden">
        <Button
          onClick={() => {
            handlePrint();
          }}
          variant="outline"
          className="flex-1 border-gray-200 text-xs text-gray-500 sm:flex-none"
          leftIcon={<Printer size={14} />}
        >
          طباعة المستند
        </Button>
        <Button
          onClick={handleSave}
          isLoading={isPending}
          className="w-full min-w-0 text-xs sm:w-auto sm:min-w-[140px]"
          leftIcon={<Save size={14} />}
        >
          اعتماد التوريد
        </Button>
      </div>

      {/* Interactive Invoice Confirmation Modal */}
      <InvoiceConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeConfirm}
        isSubmitting={isPending}
        mode="purchase"
        invoiceNumber={invoiceNumber || undefined}
        partyName={supplier?.name || 'مورد غير محدد'}
        invoiceType={invoiceType}
        currency={currency}
        exchangeRate={currency === 'SAR' ? 1 : exchangeRate}
        exchangeOperator={getDefaultExchangeOperator(currency)}
        cashboxName={selectedCashbox?.name_ar}
        warehouseName={selectedWarehouse?.name_ar}
        items={confirmationItems}
        subtotal={totals.subTotal}
        discount={totals.totalDiscount}
        total={totals.grandTotal}
        paidAmount={invoiceType === 'credit' ? paidAmount : undefined}
        notes={notes}
      />
    </div>
  );
};

export default CreatePurchaseModal;
