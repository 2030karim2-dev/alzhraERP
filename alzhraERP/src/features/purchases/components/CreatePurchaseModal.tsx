
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

interface Props {
  onSuccess: () => void;
}

const CreatePurchaseModal: React.FC<Props> = ({ onSuccess }) => {
  const { data: company } = useCompany();
  const {
    items, supplier, totals, resetCart, initializeItems,
    invoiceNumber, issueDate, invoiceType, cashboxId, currency, exchangeRate,
    setMetadata
  } = usePurchaseStore();
  const { mutate: createPurchase, isPending } = useCreatePurchase();
  const { invoice: invoiceSettings } = useSettingsStore();
  const { showToast } = useFeedbackStore();

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
    const validItems = items.filter(i => i.productId && i.quantity > 0);
    if (validItems.length === 0 || !supplier) return;

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

        total: (i.quantity * i.costPrice) - i.discount
      })),
      status: 'posted',
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
    <div className="max-w-none mx-auto space-y-3 animate-in fade-in duration-500 pt-2 pb-24 px-1 md:px-2">
      <div className="bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 shadow-2xl rounded-none flex flex-col overflow-hidden">
        {company && <InvoiceHeader company={company} />}
        <PurchaseMeta />
        <InteractivePurchaseTable />

        {/* Totals Section */}
        <div className="p-2 md:p-3 bg-white dark:bg-slate-900 border-t-2 border-gray-200 dark:border-slate-800">
          <div className="flex justify-end">
            <div className="w-full md:w-80 flex flex-col">
              <div className="grid grid-cols-2 border dark:border-slate-800">
                <div className="p-2 border-l dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-right">
                  <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest block">إجمالي الفاتورة</span>
                  <span dir="ltr" className="text-[11px] font-bold font-mono text-gray-700 dark:text-slate-300">{formatCurrency(totals.grandTotal)}</span>
                </div>

              </div>
              <div className="bg-slate-950 text-white p-4 flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                  <span className="text-[8px] font-bold text-blue-400 uppercase tracking-[0.2em] block">NET PURCHASE TOTAL</span>
                  <h2 dir="ltr" className="text-3xl font-bold font-mono tracking-tighter">
                    {formatCurrency(totals.grandTotal)}
                  </h2>
                </div>
                <div className="w-10 h-10 bg-rose-600 flex items-center justify-center shadow-lg"><Wallet size={20} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" className="border-gray-200 text-gray-500" leftIcon={<Printer size={14} />}>طباعة المستند</Button>
        <Button onClick={handleSave} isLoading={isPending} className="min-w-[140px]" leftIcon={<Save size={14} />}>اعتماد التوريد</Button>
      </div>
    </div>
  );
};

export default CreatePurchaseModal;
