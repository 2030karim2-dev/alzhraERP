import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Copy, CheckCircle2 } from 'lucide-react';
import { supplierPortalService } from '../services/supplierPortalService';
import PageLoader from '../../../ui/base/PageLoader';
import { formatCurrency } from '../../../core/utils';
import type { Column } from '../../../ui/common/ExcelTable';
import {
  SupplierQuotationPrintModal,
  type SupplierPrintQuotation,
} from '../components/SupplierQuotationPrintModal';
import type { PublicPortalContext, PublicPortalQuotation } from '../types';
import { PortalHeader } from '../components/public/PortalHeader';
import { ReorderCatalogTab, type ReorderProductItem } from '../components/public/ReorderCatalogTab';
import { RfqsListTab } from '../components/public/RfqsListTab';
import { QuotationHistoryTab } from '../components/public/QuotationHistoryTab';
import { PortalDraftDrawer, type DraftItem } from '../components/public/PortalDraftDrawer';

type SupplierContext = PublicPortalContext;

export const PublicSupplierPortalPage: React.FC = () => {
  const { token: urlToken } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const token = urlToken || searchParams.get('token') || '';

  const [context, setContext] = useState<SupplierContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tabs: 'reorder' | 'rfqs' | 'quotations'
  const [activeTab, setActiveTab] = useState<'reorder' | 'rfqs' | 'quotations'>('reorder');

  // Search & Filter for Products
  const [productSearch, setProductSearch] = useState('');
  const [onlyNeedsReorder, setOnlyNeedsReorder] = useState(true);

  // Bulk Selection
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // Quotation Submission Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [deliveryTerms, setDeliveryTerms] = useState('التسليم خلال 3 أيام عمل');
  const [paymentTerms, setPaymentTerms] = useState('نقداً عند الاستلام');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{ number: string; total: number } | null>(
    null
  );

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintQuotation, setSelectedPrintQuotation] =
    useState<SupplierPrintQuotation | null>(null);

  // Copy OEM feedback
  const [copiedOem, setCopiedOem] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!token) {
      setErrorMessage('رمز الوصول مفقود. يرجى استخدام الرابط الخاص بكم.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await supplierPortalService.getPublicPortalContext(token.trim());
      setContext(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'رابط البوابة غير صالح أو منتهي الصلاحية';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchContext();
  }, [fetchContext]);

  // Add a product to the draft drawer
  const handleAddProductToDraft = (product: ReorderProductItem) => {
    setDraftItems(prev => {
      const existingIdx = prev.findIndex(item => item.product_id === product.id);
      if (existingIdx >= 0) {
        return prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          description: product.name_ar,
          oem_number: product.part_number,
          brand: product.brand,
          quantity: 1,
          unit_price: Number(product.cost_price || 0),
          discount_percent: 0,
        },
      ];
    });
    setIsDrawerOpen(true);
  };

  // Bulk add selected products to draft
  const handleBulkAddSelectedToDraft = () => {
    if (!context || selectedProductIds.size === 0) return;
    const selectedList = context.reorder_products.filter(p => selectedProductIds.has(p.id));

    setDraftItems(prev => {
      const updated = [...prev];
      for (const p of selectedList) {
        const existing = updated.find(item => item.product_id === p.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          updated.push({
            product_id: p.id,
            description: p.name_ar,
            oem_number: p.part_number,
            brand: p.brand,
            quantity: 1,
            unit_price: Number(p.cost_price || 0),
            discount_percent: 0,
          });
        }
      }
      return updated;
    });

    setSelectedProductIds(new Set());
    setIsDrawerOpen(true);
  };

  // Load RFQ items into draft
  const handleLoadRFQIntoDraft = (rfq: SupplierContext['rfqs'][0]) => {
    if (!rfq.items || rfq.items.length === 0) return;
    setDraftItems(
      rfq.items.map(it => ({
        product_id: it.product_id ?? null,
        description: it.description,
        oem_number: it.oem_number ?? null,
        brand: null,
        quantity: it.quantity,
        unit_price: it.target_unit_price || 0,
        discount_percent: 0,
        notes: it.notes || null,
      }))
    );
    if (rfq.delivery_date) {
      setDeliveryTerms(`التسليم المطلوب بحلول ${rfq.delivery_date}`);
    }
    setIsDrawerOpen(true);
  };

  // Re-quote from previous quotation
  const handleReQuoteFromHistory = (q: PublicPortalQuotation) => {
    if (!q.items || q.items.length === 0) return;
    setDraftItems(
      q.items.map(it => ({
        product_id: it.product_id ?? null,
        description: it.description,
        oem_number: null,
        brand: null,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_percent: 0,
        notes: null,
      }))
    );
    if (q.delivery_terms) setDeliveryTerms(q.delivery_terms);
    if (q.payment_terms) setPaymentTerms(q.payment_terms);
    setIsDrawerOpen(true);
  };

  // Open Print Modal for a quotation
  const handleOpenPrintModal = (q: PublicPortalQuotation) => {
    setSelectedPrintQuotation({
      id: q.id,
      quotation_number: q.quotation_number,
      issue_date: q.issue_date,
      valid_until: q.valid_until,
      total_amount: q.total_amount,
      currency_code: q.currency_code || 'SAR',
      status: q.status,
      notes: q.notes,
      delivery_terms: q.delivery_terms,
      items: q.items
        ? q.items.map(it => ({
            id: it.id,
            product_id: it.product_id ?? null,
            description: it.description,
            oem_number: null,
            brand: null,
            quantity: it.quantity,
            unit_price: it.unit_price,
            discount_percent: 0,
            total: it.total,
            notes: null,
          }))
        : undefined,
    });
    setIsPrintModalOpen(true);
  };

  // Calculate Draft Totals
  const draftTotal = useMemo(() => {
    return draftItems.reduce((sum, item) => {
      const line = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
      return sum + line;
    }, 0);
  }, [draftItems]);

  // Submit Quotation
  const handleSubmitQuotation = async () => {
    if (draftItems.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل في عرض السعر');
      return;
    }

    const hasZeroPrice = draftItems.some(i => i.unit_price <= 0);
    if (hasZeroPrice) {
      if (!window.confirm('بعض الأصناف بسعر 0، هل ترغب في المتابعة؟')) return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: draftItems.map(item => ({
          product_id: item.product_id || null,
          description: item.description,
          oem_number: item.oem_number || null,
          brand: item.brand || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          notes: item.notes || null,
        })),
        notes,
        delivery_terms: deliveryTerms,
        payment_terms: paymentTerms,
        currency_code: 'SAR',
      };

      const result = await supplierPortalService.submitPublicQuotation(token.trim(), payload);
      setSuccessResult({
        number: result.quotation_number,
        total: result.total_amount,
      });
      setDraftItems([]);
      void fetchContext();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل إرسال عرض السعر';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy OEM Number to clipboard
  const handleCopyOEM = (oem: string) => {
    void navigator.clipboard.writeText(oem);
    setCopiedOem(oem);
    setTimeout(() => {
      setCopiedOem(null);
    }, 2000);
  };

  // ExcelTable Columns for Reorder Products
  const productColumns: Array<Column<ReorderProductItem>> = useMemo(
    () => [
      {
        header: 'الصنف / الوصف',
        accessorKey: 'name_ar',
        sortKey: 'name_ar',
        width: '260px',
        accessor: row => (
          <div className="flex items-center gap-2 text-right">
            {row.needs_reorder && (
              <span
                className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-500"
                title="مطلوب إعادة طلب عاجل"
              />
            )}
            <div>
              <p className="text-xs font-bold text-white">{row.name_ar}</p>
              <span className="font-mono text-[10px] text-slate-400">SKU: {row.sku}</span>
            </div>
          </div>
        ),
      },
      {
        header: 'رقم القطعة (OEM)',
        accessorKey: 'part_number',
        sortKey: 'part_number',
        width: '160px',
        align: 'center',
        accessor: row =>
          row.part_number ? (
            <button
              type="button"
              onClick={() => handleCopyOEM(row.part_number!)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-200 transition-all hover:border-emerald-500 hover:text-emerald-400"
              title="انقر لنسخ رقم القطعة"
            >
              <span>{row.part_number}</span>
              {copiedOem === row.part_number ? (
                <CheckCircle2 size={11} className="text-emerald-400" />
              ) : (
                <Copy size={11} className="opacity-60" />
              )}
            </button>
          ) : (
            <span className="font-mono text-slate-600">---</span>
          ),
      },
      {
        header: 'الماركة',
        accessorKey: 'brand',
        sortKey: 'brand',
        width: '110px',
        align: 'center',
        accessor: row => (
          <span className="text-xs font-semibold text-slate-300">{row.brand || '---'}</span>
        ),
      },
      {
        header: 'المقاس / الحجم',
        accessorKey: 'size',
        width: '100px',
        align: 'center',
        accessor: row => (
          <span className="text-xs font-medium text-slate-400">{row.size || '---'}</span>
        ),
      },
      {
        header: 'الوحدة',
        accessorKey: 'unit',
        width: '80px',
        align: 'center',
        accessor: row => (
          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
            {row.unit || 'حبة'}
          </span>
        ),
      },
      {
        header: 'الرصيد المتاح',
        accessorKey: 'current_stock',
        sortKey: 'current_stock',
        width: '100px',
        align: 'center',
        accessor: row => (
          <span
            className={`font-mono text-xs font-bold ${
              row.needs_reorder ? 'text-rose-400' : 'text-slate-300'
            }`}
          >
            {row.current_stock}
          </span>
        ),
      },
      {
        header: 'الحد الأدنى',
        accessorKey: 'min_stock_level',
        width: '90px',
        align: 'center',
        accessor: row => (
          <span className="font-mono text-xs text-slate-400">{row.min_stock_level || 0}</span>
        ),
      },
      {
        header: 'سعر التكلفة الاسترشادي',
        accessorKey: 'cost_price',
        sortKey: 'cost_price',
        width: '140px',
        align: 'center',
        accessor: row => (
          <span className="font-mono text-xs font-bold text-slate-200">
            {formatCurrency(Number(row.cost_price || 0), 'SAR')}
          </span>
        ),
      },
      {
        header: 'الإجراء',
        width: '110px',
        align: 'center',
        accessor: row => (
          <button
            type="button"
            onClick={() => handleAddProductToDraft(row)}
            className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-black text-emerald-400 transition-all hover:bg-emerald-600 hover:text-white"
          >
            + تسعير
          </button>
        ),
      },
    ],
    [copiedOem]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <PageLoader />
      </div>
    );
  }

  if (errorMessage || !context) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100"
        dir="rtl"
      >
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-lg font-black text-white">تعذر الدخول إلى بوابة الموردين</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{errorMessage}</p>
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-[11px] text-slate-400">
            يرجى التواصل مع إدارة المشتريات لتزويدكم برابط وصول حديث ومباشر.
          </div>
        </div>
      </div>
    );
  }

  const { supplier, company, reorder_products, rfqs, quotations } = context;
  const reorderCount = reorder_products.filter(p => p.needs_reorder).length;

  const filteredProducts = onlyNeedsReorder
    ? reorder_products.filter(p => p.needs_reorder)
    : reorder_products;

  return (
    <div className="min-h-screen bg-slate-950 pb-20 font-sans text-slate-100" dir="rtl">
      <PortalHeader
        company={company}
        supplier={supplier}
        draftCount={draftItems.length}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reorderCount={reorderCount}
        rfqsCount={rfqs.length}
        quotationsCount={quotations.length}
        onSelectReorderTab={() => {
          setActiveTab('reorder');
          setOnlyNeedsReorder(true);
        }}
      />

      <main className="mx-auto max-w-7xl space-y-4 px-4 pt-4">
        {activeTab === 'reorder' && (
          <ReorderCatalogTab
            products={filteredProducts}
            reorderCount={reorderCount}
            onlyNeedsReorder={onlyNeedsReorder}
            setOnlyNeedsReorder={setOnlyNeedsReorder}
            selectedProductIds={selectedProductIds}
            setSelectedProductIds={setSelectedProductIds}
            onBulkAddSelectedToDraft={handleBulkAddSelectedToDraft}
            productSearch={productSearch}
            setProductSearch={setProductSearch}
            productColumns={productColumns}
          />
        )}

        {activeTab === 'rfqs' && <RfqsListTab rfqs={rfqs} onQuoteRfq={handleLoadRFQIntoDraft} />}

        {activeTab === 'quotations' && (
          <QuotationHistoryTab
            quotations={quotations}
            onOpenPrintModal={handleOpenPrintModal}
            onReQuote={handleReQuoteFromHistory}
          />
        )}
      </main>

      <PortalDraftDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        draftItems={draftItems}
        setDraftItems={setDraftItems}
        deliveryTerms={deliveryTerms}
        setDeliveryTerms={setDeliveryTerms}
        paymentTerms={paymentTerms}
        setPaymentTerms={setPaymentTerms}
        notes={notes}
        setNotes={setNotes}
        draftTotal={draftTotal}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmitQuotation}
        successResult={successResult}
        onSuccessDismiss={() => {
          setSuccessResult(null);
          setIsDrawerOpen(false);
          setActiveTab('quotations');
        }}
      />

      <SupplierQuotationPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedPrintQuotation(null);
        }}
        quotation={selectedPrintQuotation}
        context={context}
      />
    </div>
  );
};

export default PublicSupplierPortalPage;
