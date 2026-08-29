import React, { useRef } from 'react';
import { useSalesStore } from '../../store';
import { useCreateInvoice, useNextInvoiceNumber } from '../../hooks/index';
import { useCompany } from '../../../settings/hooks';
import { useSettingsStore } from '../../../settings/settingsStore';
import { useFeedbackStore } from '../../../feedback/store';
import { partiesService } from '../../../../features/parties/service';
import InvoiceHeader from './InvoiceHeader';
import InvoiceMeta from './InvoiceMeta';
import InteractiveInvoiceTable from './InteractiveInvoiceTable';
import InvoiceTotals from './InvoiceTotals';
import InvoiceActions from './InvoiceActions';
import PrintableInvoice from '../PrintableInvoice';
import type { InvoiceStatus } from '../../types';
import PageLoader from '../../../../ui/base/PageLoader';
import ErrorDisplay from '../../../../ui/base/ErrorDisplay';
import { useReactToPrint } from 'react-to-print';
import { logger } from '../../../../core/utils/logger';

interface CreateInvoiceViewProps {
  onSuccess: () => void;
}

const CreateInvoiceView: React.FC<CreateInvoiceViewProps> = ({ onSuccess }) => {
  const { data: company, isLoading: companyLoading, error: companyError } = useCompany();
  const comp = company as { id: string;[key: string]: unknown } | null;
  const { data: nextInvoiceNumber, isLoading: numberLoading, error: numberError } = useNextInvoiceNumber();
  const {
    items, selectedCustomer, summary, resetCart, invoiceType, cashboxId, warehouseId, currency, exchangeRate, notes,
    setMetadata, setCustomer
  } = useSalesStore();
  const { mutate: createInvoice, isPending } = useCreateInvoice();
  const { invoice: invoiceSettings } = useSettingsStore();
  const { showToast } = useFeedbackStore();

  // Ref للطباعة
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `فاتورة_${nextInvoiceNumber || 'مسودة'}`,
  });

  // Apply defaults on mount
  const isInitialized = React.useRef(false);

  React.useEffect(() => {
    if (isInitialized.current) return;

    // 1. Set default currency and invoice type from settings
    if (invoiceSettings?.default_currency) {
      setMetadata('currency', invoiceSettings.default_currency);
    }
    if (invoiceSettings?.default_invoice_type) {
      setMetadata('invoiceType', invoiceSettings.default_invoice_type);
    }

    // 2. Load "General Customer" ONLY on first mount if none selected
    if (!selectedCustomer && comp?.id) {
      isInitialized.current = true; // Mark as initialized immediately
      const loadGeneralCustomer = async (companyId: string) => {
        try {
          const generalCustomer = await partiesService.getOrCreateGeneralParty(companyId, 'customer');

          // Re-check selectedCustomer from store to avoid overwriting a fast user selection
          const currentStoreState = (useSalesStore.getState()).selectedCustomer;

          if (!currentStoreState && generalCustomer) {
            setCustomer({
              id: generalCustomer.id,
              name: generalCustomer.name,
              phone: generalCustomer.phone || ''
            });
          }
        } catch (error) {
          logger.error('CreateInvoiceView', 'Failed to load general customer', error);
        }
      };
      loadGeneralCustomer(comp.id);
    } else if (selectedCustomer || !comp?.id) {
      if (comp?.id) isInitialized.current = true;
    }
  }, [comp?.id, invoiceSettings, selectedCustomer, setMetadata, setCustomer]);

  const handleSave = (status: InvoiceStatus) => {
    // [FIX #2] تحقق من وجود عميل محدد
    if (!selectedCustomer) {
      showToast('يرجى اختيار عميل أولاً', 'error');
      return;
    }

    // [FIX #1] تحقق من الكمية والسعر معاً
    const validItems = items.filter(item =>
      item.productId && item.name && item.quantity > 0 && item.price > 0
    );
    if (validItems.length === 0) {
      showToast('يرجى إضافة صنف واحد على الأقل بكمية وسعر صحيحين', 'error');
      return;
    }

    // تحقق إضافي: الفاتورة النقدية تحتاج صندوقاً
    if (invoiceType === 'cash' && !cashboxId) {
      showToast('يرجى اختيار حساب الصندوق / البنك للفاتورة النقدية', 'warning');
      return;
    }

    createInvoice({
      partyId: selectedCustomer?.id || null,
      customerName: selectedCustomer?.name || 'عميل نقدي',
      items: validItems.map(item => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        costPrice: item.costPrice || 0,
        warehouseId,
        // [FIX #3] maxStock من بيانات المنتج الحقيقية لا قيمة ثابتة
        maxStock: item.warehouse_distribution
          ? item.warehouse_distribution.reduce((sum, w) => sum + w.quantity, 0)
          : 9999,
      })),
      discount: summary.discountAmount,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      status: status,
      type: 'sale' as const,
      paymentMethod: invoiceType,
      treasuryAccountId: cashboxId,
      currency: currency || 'SAR',
      exchangeRate: (currency === 'SAR') ? 1 : (exchangeRate || 1)
    }, {
      onSuccess: () => {
        resetCart();
        onSuccess();
      },
    });
  };

  const invoiceForPrint = {
    company: company,
    invoice_number: nextInvoiceNumber || '...',
    issue_date: new Date().toISOString().split('T')[0],
    party_name: selectedCustomer?.name || 'عميل نقدي',
    items: items.filter(i => i.name),
    total_amount: summary.totalAmount,
    tax_amount: 0,
    currency_code: currency || 'SAR',
  };

  if (companyLoading || numberLoading) return <PageLoader />;
  if (companyError || numberError) return <ErrorDisplay error={(companyError || numberError)?.message || null} variant="full" />;

  return (
    <>
      <div className="max-w-none mx-auto space-y-3 animate-in fade-in duration-500 pt-2 pb-24">
        {/* [FIX #4] printRef يستهدف محتوى الفاتورة فقط */}
        <div className="bg-[var(--app-surface)] border-2 border-gray-100 dark:border-slate-800 shadow-2xl rounded-none flex flex-col overflow-hidden">
          {comp && <InvoiceHeader company={comp} />}
          <InvoiceMeta invoiceNumber={nextInvoiceNumber!} />
          <InteractiveInvoiceTable />
          <InvoiceTotals notes={notes} onNotesChange={(value) => { setMetadata('notes', value); }} />
        </div>

        <div className="flex justify-end">
          <InvoiceActions onSave={handleSave} onPrint={() => { handlePrint(); }} isSaving={isPending} />
        </div>
      </div>

      {/* [FIX #4] PrintableInvoice مخفي دائماً ومرتبط بـ ref للطباعة الصحيحة */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          <PrintableInvoice invoice={invoiceForPrint} />
        </div>
      </div>
    </>
  );
};

export default CreateInvoiceView;
