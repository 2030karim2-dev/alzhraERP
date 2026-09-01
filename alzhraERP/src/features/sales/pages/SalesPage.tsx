import React, { useState } from 'react';
import { ShoppingBag, Plus, History, RefreshCw, BarChart3, FileText } from 'lucide-react';
import MicroHeader from '@/ui/base/MicroHeader';
import CreateInvoiceView from '@/features/sales/components/create/CreateInvoiceView';
import InvoiceListView from '@/features/sales/components/list/InvoiceListView';
import SalesReturnsView from '@/features/sales/components/Returns/SalesReturnsView';
import SalesAnalyticsView from '@/features/sales/components/Analytics/SalesAnalyticsView';
import QuotationsTab from '@/features/sales/components/quotations/QuotationsTab';
import InvoiceDetailsModal from '@/features/sales/components/details/InvoiceDetailsModal';
import { useInvoices, useCreateSalesReturn } from '@/features/sales/hooks/index';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { logger } from '@/core/utils/logger';
import { useAIPrefillStore } from '@/features/ai/store';
import { useSalesStore } from '@/features/sales/store';

type SalesViewTab = 'create' | 'list' | 'returns' | 'analytics' | 'quotations';

const SalesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SalesViewTab>('list');
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();
  const createSalesReturn = useCreateSalesReturn();
  const { refetch: refetchInvoices } = useInvoices();

  const TABS = [
    { id: 'list' as const, label: t('sales_log'), icon: History },
    { id: 'create' as const, label: t('new_sale'), icon: Plus },
    { id: 'returns' as const, label: t('returns'), icon: RefreshCw },
    { id: 'quotations' as const, label: t('quotations'), icon: FileText },
    { id: 'analytics' as const, label: t('analytics'), icon: BarChart3 },
  ];

  // AI Prefill: consume pending sales invoice intent
  const consumePrefill = useAIPrefillStore((s: any) => s.consumePrefill);
  React.useEffect(() => {
    const aiData = consumePrefill(['create_sales_invoice', 'create_return_sale']);
    if (aiData && aiData.entities) {
      const { resetCart, setCustomer, setMetadata, calculateTotals } = useSalesStore.getState();
      resetCart();
      const entities = aiData.entities;
      if (entities.partyName) {
        // id فارغ عمداً: معرف وهمي قد يسبب خطأ مفتاح أجنبي عند الحفظ،
        // والعربة تقبل partyId فارغ (يعامل كعميل نقدي مع الاحتفاظ بالاسم)
        setCustomer({ id: '', name: entities.partyName });
      }
      if (entities.paymentMethod) {
        setMetadata('invoiceType', entities.paymentMethod === 'credit' ? 'credit' : 'cash');
      }
      if (entities.items && entities.items.length > 0) {
        const newItems = entities.items.map((item: any) => ({
          id: crypto.randomUUID(),
          productId: item.productId || '',
          sku: item.sku || '',
          name: item.productName || 'صنف غير محدد',
          partNumber: item.productCode || '',
          brand: item.manufacturer || '',
          quantity: item.quantity || 1,
          basePrice: item.unitPrice || 0,
          price: item.unitPrice || 0,
          discount: 0,
          costPrice: 0,
        }));
        useSalesStore.setState({ items: newItems });
        calculateTotals();
      }
      setActiveTab('create');
    }
  }, [consumePrefill, useSalesStore, setActiveTab]);

  const handleReturnAction = async (invoice: any, items: any[]) => {
    if (!invoice || items.length === 0) return;

    logger.debug('SalesPage', 'Processing return', {
      invoiceId: invoice.id,
      itemCount: items.length,
    });

    try {
      await createSalesReturn.mutateAsync({
        invoiceId: invoice.id,
        partyId: invoice.party?.id || invoice.party_id || '',
        paymentMethod: invoice.payment_method || 'cash',
        items: items.map(item => ({
          productId: item.product_id || item.productId || item.id,
          name: item.description || item.name || item.product?.name_ar || 'صنف مرتجع',
          quantity: Number(item.quantity ?? item.returnQuantity ?? 1),
          unitPrice: Number(item.unit_price ?? item.unitPrice ?? 0),
          costPrice: Number(item.cost_price ?? item.costPrice ?? 0),
        })),
        returnReason: 'مرتجع مبيعات',
        status: 'posted',
        issueDate: new Date().toISOString().split('T')[0],
        currency: invoice.currency_code || invoice.currency || 'SAR',
        exchangeRate: invoice.exchange_rate ?? 1,
        notes: `مرتجع للفاتورة #${invoice.invoice_number || ''}`,
      });
      setViewInvoiceId(null);
      refetchInvoices();
    } catch (error) {
      logger.error('SalesPage', 'Return failed', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'create':
        return <CreateInvoiceView onSuccess={() => setActiveTab('list')} />;
      case 'list':
        return (
          <InvoiceListView
            viewType="sale"
            searchTerm={searchTerm}
            onViewDetails={setViewInvoiceId}
          />
        );
      case 'returns':
        return <SalesReturnsView searchTerm={searchTerm} onViewDetails={setViewInvoiceId} />;
      case 'quotations':
        return <QuotationsTab onConvertToInvoice={() => setActiveTab('create')} />;
      case 'analytics':
        return <SalesAnalyticsView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-slate-950">
      <MicroHeader
        title={t('sales_management')}
        icon={ShoppingBag}
        iconColor="text-emerald-600"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={id => setActiveTab(id as SalesViewTab)}
        searchPlaceholder={t('search_in_sales_or_customers')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />
      <div className="custom-scrollbar flex-1 overflow-y-auto px-2 pb-16 pt-2">
        <div className="mx-auto max-w-none">{renderContent()}</div>
      </div>
      <InvoiceDetailsModal
        invoiceId={viewInvoiceId}
        onClose={() => setViewInvoiceId(null)}
        onReturn={handleReturnAction}
      />
    </div>
  );
};

export default SalesPage;
