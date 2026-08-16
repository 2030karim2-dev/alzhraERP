
import React, { useEffect } from 'react';
import { usePurchaseStore } from '../store';
// import { useTaxDiscountStore } from '../../settings/taxDiscountStore';
import { useCreatePurchase } from '../hooks';
import { useCompany } from '../../settings/hooks';
import { useSettingsStore } from '../../settings/settingsStore';
import { useFeedbackStore } from '../../feedback/store';
import InvoiceHeader from '../../sales/components/create/InvoiceHeader';
import PurchaseMeta from './create/PurchaseMeta';
import InteractivePurchaseTable from './create/InteractivePurchaseTable';
import { formatCurrency } from '../../../core/utils';
import { Save, Printer, Wallet } from 'lucide-react';
import Button from '../../../ui/base/Button';
import { useReactToPrint } from 'react-to-print';

interface Props {
  onSuccess: () => void;
}

const CreatePurchaseModal: React.FC<Props> = ({ onSuccess }) => {
  const { data: company } = useCompany();
  const {
    items, supplier, totals, resetCart, initializeItems,
    invoiceNumber, issueDate, invoiceType, cashboxId, warehouseId, notes, currency, exchangeRate,
    setMetadata
  } = usePurchaseStore();
  const { mutate: createPurchase, isPending } = useCreatePurchase();
  const { invoice: invoiceSettings } = useSettingsStore();
  const { showToast } = useFeedbackStore();
  
  const printRef = React.useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
      contentRef: printRef,
      documentTitle: `مسودة_فاتورة_مشتريات`,
  });

  useEffect(() => {
    initializeItems(6);

    // Apply defaults from settings
    if (invoiceSettings.default_currency) {
      setMetadata('currency', invoiceSettings.default_currency);
    }
    if (invoiceSettings.default_invoice_type) {
      setMetadata('invoiceType', invoiceSettings.default_invoice_type);
    }
  }, [initializeItems, invoiceSettings]);

  const handleSave = () => {
    const validItems = items.filter(i => i.productId && i.quantity > 0 && i.costPrice > 0);
    
    if (!supplier) {
      showToast('يرجى اختيار مورد أولاً', 'error');
      return;
    }
    if (validItems.length === 0) {
      showToast('يرجى إضافة صنف واحد على الأقل بكمية وسعر صحيحين', 'error');
      return;
    }
    if (!issueDate) {
      showToast('يرجى تحديد تاريخ الفاتورة', 'error');
      return;
    }
    if (!warehouseId) {
      showToast('يرجى اختيار مستودع فعلي قبل اعتماد الفاتورة', 'error');
      return;
    }

    const hasInvalidDiscount = validItems.some(item => item.discount < 0 || item.discount > (item.quantity * item.costPrice));
    if (hasInvalidDiscount) {
      showToast('يوجد خصم غير صالح؛ يجب ألا يتجاوز الخصم إجمالي الصنف', 'error');
      return;
    }

    // Validate: Cash purchases require a real cashbox account
    if (invoiceType === 'cash' && !cashboxId) {
      showToast('يرجى اختيار الصندوق / البنك للفاتورة النقدية', 'warning');
      return;
    }

    createPurchase({
      supplierId: supplier.id,
      invoiceNumber: invoiceNumber || `PUR-${Date.now().toString().slice(-6)}`,
      issueDate: issueDate,
      items: validItems.map(i => ({
        productId: i.productId,
        name: i.name,
        sku: i.sku,
        partNumber: i.partNumber || '',
        brand: i.brand || '',
        quantity: i.quantity,
        costPrice: i.costPrice,
        discount: i.discount,
        warehouseId,
        total: Math.max(0, (i.quantity * i.costPrice) - i.discount)
      })),
      status: 'posted',
      notes: notes.trim() || undefined,
      paymentMethod: invoiceType,
      cashAccountId: cashboxId,
      currency: currency,
      exchangeRate: exchangeRate
    }, {
      onSuccess: () => {
        resetCart();
        onSuccess();
      }
    });
  };

  return (
    <div className="max-w-none mx-auto space-y-3 max-md:space-y-0.5 animate-in fade-in duration-500 pt-2 max-md:pt-0 pb-24 max-md:pb-12 px-1 md:px-2">
      <div ref={printRef} className="bg-white dark:bg-slate-900 border-2 max-md:border dark:border-gray-100 dark:border-slate-800 shadow-2xl rounded-none flex flex-col overflow-visible">
        {company && <InvoiceHeader company={company} />}
        <PurchaseMeta />
        <InteractivePurchaseTable />

        {/* Totals Section */}
        <div className="p-2 max-md:p-0.5 md:p-3 bg-white dark:bg-slate-900 border-t-2 max-md:border-t border-gray-200 dark:border-slate-800 print:break-inside-avoid">
          <div className="flex justify-end">
            <div className="w-full md:w-80 flex flex-col">
              <div className="grid grid-cols-2 border dark:border-slate-800">
                <div className="p-2 max-md:p-0.5 border-l border-b dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-right">
                  <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest block">المجموع قبل الخصم</span>
                  <span dir="ltr" className="text-[11px] font-bold font-mono text-gray-600 dark:text-slate-400">{formatCurrency(totals.subTotal || 0)}</span>
                </div>
                <div className="p-2 max-md:p-0.5 border-b dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-right">
                  <span className="text-[7px] font-bold text-rose-400 uppercase tracking-widest block">إجمالي الخصومات</span>
                  <span dir="ltr" className="text-[11px] font-bold font-mono text-rose-600 dark:text-rose-400">{formatCurrency(totals.totalDiscount || 0)}</span>
                </div>
              </div>
              <div className="bg-slate-950 text-white p-4 max-md:p-1.5 flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                  <span className="text-[8px] font-bold text-blue-400 uppercase tracking-[0.2em] block">NET PURCHASE TOTAL</span>
                  <h2 dir="ltr" className="text-3xl max-md:text-xl font-bold font-mono tracking-tighter">
                    {formatCurrency(totals.grandTotal)}
                  </h2>
                </div>
                <div className="w-10 h-10 max-md:w-7 max-md:h-7 bg-rose-600 flex items-center justify-center shadow-lg"><Wallet size={20} className="max-md:w-4 max-md:h-4" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 max-md:gap-0.5 print:hidden">
        <Button onClick={() => handlePrint()} variant="outline" className="border-gray-200 text-gray-500 max-md:h-7 max-md:px-1.5 max-md:text-[9px]" leftIcon={<Printer size={14} />}>طباعة المستند</Button>
        <Button onClick={handleSave} isLoading={isPending} className="min-w-[140px] max-md:min-w-0 max-md:h-7 max-md:px-2 max-md:text-[9px]" leftIcon={<Save size={14} />}>اعتماد التوريد</Button>
      </div>
    </div>
  );
};

export default CreatePurchaseModal;
