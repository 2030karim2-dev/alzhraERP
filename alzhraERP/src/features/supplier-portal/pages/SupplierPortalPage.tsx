import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  FileText,
  Layers,
  Plus,
  RefreshCw,
  Scale,
  Send,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { formatCurrency } from '../../../core/utils';
import { supplierPortalService } from '../services/supplierPortalService';
import { exportProductCatalogToExcel } from '../services/excelEngine';
import { SupplierProductDataGrid } from '../components/SupplierProductDataGrid';
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

  // Handlers
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
      tax_percentage: 15,
      tax_amount: 0,
      net_unit_price: p.cost_price,
      total_price: p.cost_price * 1.15,
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
      tax_percentage: 15,
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
        tax: payload.tax,
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

  const handleImportedExcelItems = (items: QuotationItemDraft[]) => {
    setQuotationDraftItems(items);
    setIsQuotationDrawerOpen(true);
    showToast(`تم استيراد ${items.length} صنف بنجاح`, 'success');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-6 space-y-6 overflow-y-auto">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-indigo-950/20 border border-indigo-800/40">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              بوابة الموردين والتوريد الذكي (Supplier Portal)
            </h1>
            <p className="text-xs text-indigo-200 mt-1">
              إدارة المنتجات، طلبات التسعير، عروض الأسعار التفاعلية، ومصفوفة المقارنة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsComparisonModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-600/30 transition-all active:scale-95"
          >
            <Scale className="w-4 h-4" />
            <span>مصفوفة المقارنة الذكية</span>
          </button>

          <button
            onClick={() => {
              setQuotationDraftItems([]);
              setActiveQuotationId(undefined);
              setIsQuotationDrawerOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء عرض سعر جديد</span>
          </button>

          <button
            onClick={() => void fetchData()}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              الأصناف المعتمدة
            </span>
            <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
              {products.length}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              طلبات التسعير (RFQs)
            </span>
            <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
              {rfqs.length}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              عروض الأسعار المرفوعة
            </span>
            <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
              {quotations.length}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              إجمالي قيمة العروض
            </span>
            <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400" dir="ltr">
              {formatCurrency(
                quotations.reduce((sum, q) => sum + q.total_amount, 0),
                'SAR'
              )}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

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

      {/* Tab Content Panels */}
      <div className="flex-1 min-h-[500px]">
        {activeTab === 'products' && (
          <SupplierProductDataGrid
            products={products}
            currency="SAR"
            selectedIds={selectedProductIds}
            onSelectionChange={setSelectedProductIds}
            onCreateQuotation={handleOpenQuotationFromSelection}
            onExportExcel={async () => {
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
            }}
            onOpenImport={() => setIsImportModalOpen(true)}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'rfqs' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              طلبات التسعير الحالية (RFQs)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rfqs.map(rfq => (
                <div
                  key={rfq.rfq_id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {rfq.rfq_number}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold">
                        {rfq.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {rfq.title}
                    </h4>

                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <span>عدد البنود: {rfq.items_count}</span>
                      <span>•</span>
                      <span>آخر موعد: {rfq.submission_deadline.slice(0, 10)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenQuotationFromRFQ(rfq)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>رد وتقديم عرض سعر</span>
                  </button>
                </div>
              ))}
            </div>

            {rfqs.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <Send className="w-12 h-12 stroke-[1.5] mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  لا توجد طلبات تسعير نشطة حالياً
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'quotations' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-800 dark:text-slate-200">
              عروض الأسعار المعتمدة والمراجعات
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {quotations.map(quote => (
                <div
                  key={quote.quotation_id}
                  className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold text-xs">
                      #{quote.current_revision_number}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {quote.quotation_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                          {quote.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {quote.supplier_name} • {quote.items.length} أصناف
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <span className="font-mono font-bold text-base text-slate-900 dark:text-white block" dir="ltr">
                        {formatCurrency(quote.total_amount, quote.currency)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        صالح حتى: {quote.valid_until || '---'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setHistoryQuotation({
                          id: quote.quotation_id,
                          number: quote.quotation_number,
                        });
                      }}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                    >
                      سجل المراجعات
                    </button>

                    <button
                      onClick={() => {
                        setQuotationDraftItems(quote.items);
                        setActiveQuotationId(quote.quotation_id);
                        setIsQuotationDrawerOpen(true);
                      }}
                      className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:text-indigo-400 rounded-xl text-xs font-bold transition-all"
                    >
                      تعديل / مراجعة
                    </button>
                  </div>
                </div>
              ))}

              {quotations.length === 0 && (
                <div className="py-16 text-center text-slate-400">
                  <FileText className="w-12 h-12 stroke-[1.5] mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    لا توجد عروض أسعار مسجلة
                  </p>
                </div>
              )}
            </div>
          </div>
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
        onImportComplete={handleImportedExcelItems}
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
