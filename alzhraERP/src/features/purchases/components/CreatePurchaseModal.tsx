import React, { useCallback, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Save, Printer, Wallet } from 'lucide-react';
import { usePurchaseStore } from '../store';
import { useCreatePurchase } from '../hooks';
import { useCompany } from '../../settings/hooks';
import { useSettingsStore } from '../../settings/settingsStore';
import { useFeedbackStore } from '../../feedback/store';
import InvoiceHeader from '../../sales/components/create/InvoiceHeader';
import PurchaseMeta from './create/PurchaseMeta';
import InteractivePurchaseTable from './create/InteractivePurchaseTable';
import { formatCurrency } from '../../../core/utils';
import Button from '../../../ui/base/Button';
import DraftStatusBanner from '../../../ui/common/DraftStatusBanner';

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

const Totals: React.FC<{ totals: ReturnType<typeof usePurchaseStore.getState>['totals'] }> = ({
  totals,
}) => (
  <div className="border-t-2 border-gray-200 bg-[var(--app-surface)] p-2 dark:border-slate-800 max-md:border-t max-md:p-0.5 md:p-3 print:break-inside-avoid">
    <div className="flex justify-end">
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
              {formatCurrency(totals.subTotal)}
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
              {formatCurrency(totals.totalDiscount)}
            </span>
          </div>
        </div>
        <div className="relative flex items-center justify-between overflow-hidden bg-slate-950 p-4 text-white max-md:p-1.5">
          <div className="relative z-10">
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
              NET PURCHASE TOTAL
            </span>
            <h2 dir="ltr" className="font-mono text-3xl font-bold tracking-tighter max-md:text-xl">
              {formatCurrency(totals.grandTotal)}
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
    warehouseId,
    notes,
    currency,
    exchangeRate,
    setMetadata,
  } = usePurchaseStore();
  const { mutate: createPurchase, isPending } = useCreatePurchase();
  const { invoice: invoiceSettings } = useSettingsStore();
  const { showToast } = useFeedbackStore();
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
    createPurchase(
      {
        supplierId: supplier.id,
        invoiceNumber: hasText(invoiceNumber)
          ? invoiceNumber
          : `PUR-${String(Date.now()).slice(-6)}`,
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
      },
      {
        onSuccess: () => {
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
    resetCart,
    showToast,
    supplier,
    warehouseId,
  ]);

  const enteredItemsCount = items.filter(item => item.productId !== '').length;

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
        <Totals totals={totals} />
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
    </div>
  );
};

export default CreatePurchaseModal;
