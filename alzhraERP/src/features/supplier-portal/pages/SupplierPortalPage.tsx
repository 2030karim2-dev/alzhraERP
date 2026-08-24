import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Send, FileText } from 'lucide-react';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { supplierPortalService } from '../services/supplierPortalService';
import { exportProductCatalogToExcel } from '../services/excelEngine';
import { PortalHeader } from '../components/PortalHeader';
import { PortalStatsGrid } from '../components/PortalStatsGrid';
import { ProductsTab } from '../components/tabs/ProductsTab';
import { RFQsTab } from '../components/tabs/RFQsTab';
import { QuotationsTab } from '../components/tabs/QuotationsTab';
import { QuotationBuilderDrawer } from '../components/QuotationBuilderDrawer';
import { ExcelImportModal } from '../components/ExcelImportModal';
import { VendorComparisonModal } from '../components/VendorComparisonModal';
import { QuotationHistoryModal } from '../components/QuotationHistoryModal';
import type {
  VendorProductItem,
  VendorRFQ,
  VendorQuotation,
  QuotationItemDraft,
} from '../types';

export const SupplierPortalPage: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const companyId = user?.company_id || '';
  const { showToast } = useFeedbackStore();

  const [activeTab, setActiveTab] = useState<'products' | 'rfqs' | 'quotations'>('products');
  const [products, setProducts] = useState<VendorProductItem[]>([]);
  const [rfqs, setRfqs] = useState<VendorRFQ[]>([]);
  const [quotations, setQuotations] = useState<VendorQuotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selection & Modals State
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isQuotationDrawerOpen, setIsQuotationDrawerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [historyQuotation, setHistoryQuotation] = useState<{ id: string; number: string } | null>(null);
  const [quotationDraftItems, setQuotationDraftItems] = useState<QuotationItemDraft[]>([]);
  const [activeQuotationId, setActiveQuotationId] = useState<string | undefined>(undefined);

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);

    try {
      const [prods, rfqList, quoteList] = await Promise.all([
        supplierPortalService.getVendorProducts(companyId),
        supplierPortalService.getVendorRFQs(companyId),
        supplierPortalService.getVendorQuotations(companyId),
      ]);

      setProducts(prods);
      setRfqs(rfqList);
      setQuotations(quoteList);
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء تحميل بيانات البوابة', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, showToast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Handlers for Creating / Editing Quotations
  const handleOpenQuotationFromSelection = (selectedProds: VendorProductItem[]) => {
    const draftItems: QuotationItemDraft[] = selectedProds.map(p => ({
      product_id: p.product_id,
      product_name: p.product_name,
      oem_number: p.oem_number,
      vendor_sku: p.vendor_sku,
      quantity: 1,
      unit_of_measure: p.unit,
      unit_price: p.cost_price,
      discount_percentage: 0,
      discount_amount: 0,
      tax_percentage: 0,
      tax_amount: 0,
      net_unit_price: p.cost_price,
      total_price: p.cost_price,
      availability: 'in_stock',
      lead_time_days: p.lead_time_days,
      warranty_days: 30,
      vendor_notes: '',
    }));

    setQuotationDraftItems(draftItems);
    setActiveQuotationId(undefined);
    setIsQuotationDrawerOpen(true);
  };

  const handleOpenQuotationFromRFQ = (rfq: VendorRFQ) => {
    const draftItems: QuotationItemDraft[] = (rfq.items || []).map(item => ({
      rfq_item_id: item.rfq_item_id,
      product_id: item.product_id || '',
      product_name: item.product_name,
      oem_number: item.oem_number,
      quantity: item.quantity,
      unit_of_measure: item.unit_of_measure,
      unit_price: item.target_unit_price || 0,
      discount_percentage: 0,
      discount_amount: 0,
      tax_percentage: 0,
      tax_amount: 0,
      net_unit_price: item.target_unit_price || 0,
      total_price: (item.target_unit_price || 0) * item.quantity,
      availability: 'in_stock',
      lead_time_days: 3,
      warranty_days: 30,
      vendor_notes: '',
    }));

    setQuotationDraftItems(draftItems);
    setActiveQuotationId(undefined);
    setIsQuotationDrawerOpen(true);
  };

  const handleSubmitQuotation = async (payload: {
    items: QuotationItemDraft[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    currency: string;
    leadTimeDays: number;
    warrantyDays: number;
    validityDate: string | null;
    terms: string | null;
    notes: string | null;
  }) => {
    try {
      const quoteId = activeQuotationId || crypto.randomUUID();
      await supplierPortalService.submitQuotationRevision({
        companyId,
        quotationId: quoteId,
        items: payload.items,
        subtotal: payload.subtotal,
        discount: payload.discount,
        tax: 0,
        total: payload.total,
        currency: payload.currency,
        leadTimeDays: payload.leadTimeDays,
        warrantyDays: payload.warrantyDays,
        validityDate: payload.validityDate,
        terms: payload.terms,
        notes: payload.notes,
      });

      showToast('تم اعتماد وإرسال مراجعة عرض السعر بنجاح', 'success');
      setIsQuotationDrawerOpen(false);
      void fetchData();
    } catch (err: any) {
      showToast(err?.message || 'فشل إرسال عرض السعر', 'error');
    }
  };

  const handleExportCatalogExcel = async () => {
    if (products.length === 0) {
      showToast('لا توجد أصناف لتصديرها', 'warning');
      return;
    }
    showToast('جاري تصدير كتالوج الأصناف إلى Excel...', 'info');
    try {
      await exportProductCatalogToExcel({
        companyName: user?.company_name || 'Al-Zahra Smart ERP',
        currency: 'SAR',
        products,
      });
      showToast('تم تصدير الكتالوج بنجاح', 'success');
    } catch (err: any) {
      showToast(err?.message || 'فشل تصدير الكتالوج', 'error');
    }
  };

  const totalQuotationsValue = quotations.reduce((sum, q) => sum + q.total_amount, 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-6 space-y-6 overflow-y-auto">
      {/* Top Banner Header */}
      <PortalHeader
        isLoading={isLoading}
        onOpenComparisonModal={() => setIsComparisonModalOpen(true)}
        onOpenNewQuotationDrawer={() => {
          setQuotationDraftItems([]);
          setActiveQuotationId(undefined);
          setIsQuotationDrawerOpen(true);
        }}
        onRefresh={() => void fetchData()}
      />

      {/* KPI Stats Summary */}
      <PortalStatsGrid
        productsCount={products.length}
        rfqsCount={rfqs.length}
        quotationsCount={quotations.length}
        totalQuotationsValue={totalQuotationsValue}
        currency="SAR"
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'products'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>جدول المنتجات الذكي (Pro Data Grid)</span>
        </button>

        <button
          onClick={() => setActiveTab('rfqs')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rfqs'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>طلبات التسعير الموجهة (RFQs)</span>
        </button>

        <button
          onClick={() => setActiveTab('quotations')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'quotations'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>سجل عروض الأسعار والمراجعات ({quotations.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-[500px]">
        {activeTab === 'products' && (
          <ProductsTab
            products={products}
            currency="SAR"
            selectedIds={selectedProductIds}
            onSelectionChange={setSelectedProductIds}
            onCreateQuotation={handleOpenQuotationFromSelection}
            onExportExcel={handleExportCatalogExcel}
            onOpenImport={() => setIsImportModalOpen(true)}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'rfqs' && (
          <RFQsTab
            rfqs={rfqs}
            onOpenQuotationFromRFQ={handleOpenQuotationFromRFQ}
          />
        )}

        {activeTab === 'quotations' && (
          <QuotationsTab
            quotations={quotations}
            onOpenHistory={(id, num) => setHistoryQuotation({ id, number: num })}
            onEditQuotation={quote => {
              setQuotationDraftItems(quote.items);
              setActiveQuotationId(quote.quotation_id);
              setIsQuotationDrawerOpen(true);
            }}
          />
        )}
      </div>

      {/* Quotation Builder Drawer */}
      <QuotationBuilderDrawer
        isOpen={isQuotationDrawerOpen}
        onClose={() => setIsQuotationDrawerOpen(false)}
        initialItems={quotationDraftItems}
        allProducts={products}
        companyName={user?.company_name || 'Al-Zahra Smart ERP'}
        supplierName={user?.name || user?.full_name || 'المورد المعتمد'}
        {...(activeQuotationId ? { existingQuotationId: activeQuotationId } : {})}
        onSubmitQuotation={handleSubmitQuotation}
      />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        allProducts={products}
        onImportComplete={items => {
          setQuotationDraftItems(items);
          setIsQuotationDrawerOpen(true);
          showToast(`تم استيراد ${items.length} صنف بنجاح`, 'success');
        }}
      />

      {/* Vendor Comparison Matrix Modal */}
      <VendorComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        quotations={quotations}
        companyId={companyId}
        onConvertedSuccessfully={po => {
          showToast(`تم تحويل عرض السعر إلى أمر شراء بنجاح (${po.po_number})`, 'success');
          void fetchData();
        }}
      />

      {/* Quotation History & Revisions Timeline Modal */}
      {historyQuotation && (
        <QuotationHistoryModal
          isOpen={!!historyQuotation}
          onClose={() => setHistoryQuotation(null)}
          quotationId={historyQuotation.id}
          quotationNumber={historyQuotation.number}
        />
      )}
    </div>
  );
};

export default SupplierPortalPage;
