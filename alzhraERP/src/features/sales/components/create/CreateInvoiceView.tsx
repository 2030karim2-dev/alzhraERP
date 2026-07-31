import React, { useState } from 'react';
import { useSalesStore } from '../../store';
import { useCreateInvoice, useNextInvoiceNumber } from '../../hooks/index';
import { useCompany } from '../../../settings/hooks';
import { useSettingsStore } from '../../../settings/settingsStore';
import { partiesService } from '../../../../features/parties/service';
import InvoiceHeader from './InvoiceHeader';
import InvoiceMeta from './InvoiceMeta';
import InteractiveInvoiceTable from './InteractiveInvoiceTable';
import InvoiceTotals from './InvoiceTotals';
import InvoiceActions from './InvoiceActions';
import PrintableInvoice from '../PrintableInvoice';
import { InvoiceStatus } from '../../types';
import PageLoader from '../../../../ui/base/PageLoader';
import ErrorDisplay from '../../../../ui/base/ErrorDisplay';

interface CreateInvoiceViewProps {
  onSuccess: () => void;
}

const CreateInvoiceView: React.FC<CreateInvoiceViewProps> = ({ onSuccess }) => {
  const { data: company, isLoading: companyLoading, error: companyError } = useCompany();
  const comp = company as { id: string;[key: string]: unknown } | null;
  const { data: nextInvoiceNumber, isLoading: numberLoading, error: numberError } = useNextInvoiceNumber();
  const {
    items, selectedCustomer, summary, resetCart, invoiceType, cashboxId, currency, exchangeRate,
    setMetadata, setCustomer
  } = useSalesStore();
  const { mutate: createInvoice, isPending } = useCreateInvoice();
  const { invoice: invoiceSettings } = useSettingsStore();

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
          console.error("Failed to load general customer:", error);
        }
      };
      loadGeneralCustomer(comp.id);
    } else if (selectedCustomer || !comp?.id) {
      // If already has a customer or no company yet, consider it initialized to prevent future overwrites
      if (comp?.id) isInitialized.current = true;
    }
  }, [comp?.id, invoiceSettings, selectedCustomer, setMetadata, setCustomer]);


  const [isPrinting, setIsPrinting] = useState(false);

  const handleSave = (status: InvoiceStatus) => {
    const validItems = items.filter(item => item.productId && item.name && item.quantity > 0);
    if (validItems.length === 0) return;

    createInvoice({
      partyId: selectedCustomer?.id || null,
      items: validItems.map(item => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        costPrice: 0,

        maxStock: 100
      })),
      discount: summary.discountAmount,
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

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
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
        <div className="bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 shadow-2xl rounded-none flex flex-col overflow-hidden">
          {comp && <InvoiceHeader company={comp} />}
          <InvoiceMeta invoiceNumber={nextInvoiceNumber as string} />
          <InteractiveInvoiceTable />
          <InvoiceTotals />
        </div>

        <div className="flex justify-end">
          <InvoiceActions onSave={handleSave} onPrint={handlePrint} isSaving={isPending} />
        </div>
      </div>

      {isPrinting && <PrintableInvoice invoice={invoiceForPrint} />}
    </>
  );
};

export default CreateInvoiceView;
