import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Package,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Trash2,
  ShoppingBag,
  X,
  Printer,
  Copy,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { supplierPortalService } from '../services/supplierPortalService';
import { calculatePortalLineTotal } from '../services/quotationCalculator';
import PageLoader from '../../../ui/base/PageLoader';
import { formatCurrency, cn } from '../../../core/utils';
import ExcelTable, { type Column } from '../../../ui/common/ExcelTable';
import {
  SupplierQuotationPrintModal,
  type SupplierPrintQuotation,
} from '../components/SupplierQuotationPrintModal';
import type { PublicPortalContext, PublicPortalQuotation } from '../types';

type SupplierContext = PublicPortalContext;

interface DraftItem {
  product_id?: string | null;
  description: string;
  oem_number?: string | null;
  brand?: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  notes?: string | null;
}

type ReorderProductItem = SupplierContext['reorder_products'][0];

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

  // Filtered reorder products
  const filteredProducts = useMemo(() => {
    if (!context?.reorder_products) return [];
    return context.reorder_products.filter(p => {
      if (onlyNeedsReorder && !p.needs_reorder) return false;
      if (!productSearch.trim()) return true;
      const term = productSearch.toLowerCase().trim();
      return (
        p.name_ar.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.part_number && p.part_number.toLowerCase().includes(term)) ||
        (p.brand && p.brand.toLowerCase().includes(term))
      );
    });
  }, [context?.reorder_products, onlyNeedsReorder, productSearch]);

  // Add Single Product to Draft
  const handleAddProductToDraft = useCallback((product: ReorderProductItem) => {
    setDraftItems(prev => {
      const exists = prev.find(i => i.product_id === product.id);
      if (exists) {
        return prev.map(i =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      const suggestedQty = Math.max(1, product.min_stock_level * 2 - product.current_stock);
      return [
        ...prev,
        {
          product_id: product.id,
          description: product.name_ar,
          oem_number: product.part_number || null,
          brand: product.brand || null,
          quantity: suggestedQty,
          unit_price: product.cost_price || 0,
          discount_percent: 0,
          notes: null,
        },
      ];
    });
    setIsDrawerOpen(true);
  }, []);

  // Bulk Add Selected Products to Draft
  const handleBulkAddSelectedToDraft = useCallback(() => {
    if (!context?.reorder_products || selectedProductIds.size === 0) return;

    const selectedProds = context.reorder_products.filter(p => selectedProductIds.has(p.id));
    setDraftItems(prev => {
      const draftMap = new Map(prev.map(item => [item.product_id || item.description, item]));

      selectedProds.forEach(p => {
        if (!draftMap.has(p.id)) {
          const suggestedQty = Math.max(1, p.min_stock_level * 2 - p.current_stock);
          draftMap.set(p.id, {
            product_id: p.id,
            description: p.name_ar,
            oem_number: p.part_number || null,
            brand: p.brand || null,
            quantity: suggestedQty,
            unit_price: p.cost_price || 0,
            discount_percent: 0,
            notes: null,
          });
        }
      });

      return Array.from(draftMap.values());
    });

    setSelectedProductIds(new Set());
    setIsDrawerOpen(true);
  }, [context?.reorder_products, selectedProductIds]);

  // Add all RFQ items to Draft
  const handleLoadRFQIntoDraft = (rfq: SupplierContext['rfqs'][0]) => {
    const newItems: DraftItem[] = (rfq.items || []).map(item => ({
      product_id: item.product_id || null,
      description: item.description,
      oem_number: item.oem_number || null,
      brand: null,
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.target_unit_price) || 0,
      discount_percent: 0,
      notes: `بناءً على طلب التسعير: ${rfq.rfq_number}`,
    }));
    setDraftItems(newItems);
    setNotes(`عرض سعر لطلب التسعير رقم: ${rfq.rfq_number}`);
    setIsDrawerOpen(true);
  };

  // Re-quote from previous quotation
  const handleReQuoteFromHistory = (q: PublicPortalQuotation) => {
    const newItems: DraftItem[] = (q.items || []).map(item => ({
      product_id: item.product_id || null,
      description: item.description,
      oem_number: null,
      brand: null,
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      discount_percent: 0,
      notes: `تحديث/إعادة تسعير العرض السابق: ${q.quotation_number}`,
    }));
    setDraftItems(newItems);
    setNotes(`إعادة تقديم وتحديث للعرض رقم: ${q.quotation_number}`);
    setDeliveryTerms(q.delivery_terms || 'التسليم خلال 3 أيام عمل');
    setPaymentTerms(q.payment_terms || 'نقداً عند الاستلام');
    setIsDrawerOpen(true);
  };

  // Open Print Modal for Quotation
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
      const line = calculatePortalLineTotal(item.quantity, item.unit_price, item.discount_percent);
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
    setTimeout(() => setCopiedOem(null), 2000);
  };

  // ExcelTable Columns for Reorder Products
  const productColumns: Column<ReorderProductItem>[] = useMemo(
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
        width: '120px',
        align: 'center',
        accessor: row =>
          row.brand ? (
            <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
              {row.brand}
            </span>
          ) : (
            <span className="text-slate-600">---</span>
          ),
      },
      {
        header: 'حالة المخزون',
        width: '140px',
        align: 'center',
        accessor: row => {
          const isCritical = row.current_stock <= 0;
          const isLow = row.current_stock <= row.min_stock_level;

          return (
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  isCritical
                    ? 'border border-rose-800/50 bg-rose-950/60 text-rose-400'
                    : isLow
                      ? 'border border-amber-800/50 bg-amber-950/60 text-amber-400'
                      : 'border border-emerald-800/50 bg-emerald-950/60 text-emerald-400'
                )}
              >
                {isCritical ? 'نفد المخزون 🔴' : isLow ? 'منخفض جداً 🟡' : 'متوفر 🟢'}
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {row.current_stock} / حد: {row.min_stock_level}
              </span>
            </div>
          );
        },
      },
      {
        header: 'الكمية المقترحة',
        width: '110px',
        align: 'center',
        accessor: row => {
          const suggested = Math.max(1, row.min_stock_level * 2 - row.current_stock);
          return (
            <span className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-2 py-0.5 font-mono text-xs font-black text-amber-400">
              +{suggested} {row.unit || ''}
            </span>
          );
        },
      },
      {
        header: 'آخر تكلفة مرجعية',
        accessorKey: 'cost_price',
        sortKey: 'cost_price',
        width: '120px',
        align: 'center',
        accessor: row => (
          <span className="font-mono text-xs font-bold text-emerald-400">
            {formatCurrency(row.cost_price, 'SAR')}
          </span>
        ),
      },
      {
        header: 'إجراء',
        width: '110px',
        align: 'center',
        accessor: row => (
          <button
            type="button"
            onClick={() => handleAddProductToDraft(row)}
            className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-600/20 px-3 py-1.5 text-[11px] font-bold text-emerald-300 transition-all hover:bg-emerald-600 hover:text-white"
          >
            <Plus size={13} />
            <span>تسعير</span>
          </button>
        ),
      },
    ],
    [copiedOem, handleAddProductToDraft]
  );

  // ExcelTable Columns for Quotation History
  const quotationColumns: Column<PublicPortalQuotation>[] = useMemo(
    () => [
      {
        header: 'رقم العرض',
        accessorKey: 'quotation_number',
        sortKey: 'quotation_number',
        width: '150px',
        accessor: row => (
          <span className="font-mono text-xs font-black text-purple-400">
            {row.quotation_number}
          </span>
        ),
      },
      {
        header: 'تاريخ التقديم',
        accessorKey: 'issue_date',
        sortKey: 'issue_date',
        width: '120px',
        align: 'center',
        accessor: row => <span className="font-mono text-xs text-slate-300">{row.issue_date}</span>,
      },
      {
        header: 'عدد الأصناف',
        width: '100px',
        align: 'center',
        accessor: row => (
          <span className="text-xs font-bold text-white">{row.items?.length || 0} بنود</span>
        ),
      },
      {
        header: 'إجمالي القيمة',
        accessorKey: 'total_amount',
        sortKey: 'total_amount',
        width: '140px',
        align: 'center',
        accessor: row => (
          <span className="font-mono text-xs font-black text-emerald-400">
            {formatCurrency(row.total_amount, row.currency_code || 'SAR')}
          </span>
        ),
      },
      {
        header: 'الحالة',
        accessorKey: 'status',
        sortKey: 'status',
        width: '120px',
        align: 'center',
        accessor: row => (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[10px] font-bold',
              row.status === 'accepted' || row.status === 'approved'
                ? 'border border-emerald-700/50 bg-emerald-900/40 text-emerald-300'
                : row.status === 'rejected'
                  ? 'border border-rose-700/50 bg-rose-900/40 text-rose-300'
                  : 'border border-amber-700/50 bg-amber-900/40 text-amber-300'
            )}
          >
            {row.status === 'accepted' || row.status === 'approved'
              ? 'معتمد ✅'
              : row.status === 'rejected'
                ? 'مرفوض ❌'
                : 'قيد المراجعة ⏳'}
          </span>
        ),
      },
      {
        header: 'الإجراءات',
        width: '180px',
        align: 'center',
        accessor: row => (
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenPrintModal(row)}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-200 transition-all hover:border-purple-500 hover:text-purple-300"
              title="طباعة وتصدير PDF"
            >
              <Printer size={12} />
              <span>طباعة PDF</span>
            </button>
            <button
              type="button"
              onClick={() => handleReQuoteFromHistory(row)}
              className="flex items-center gap-1 rounded-lg border border-emerald-800/40 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-bold text-emerald-400 transition-all hover:bg-emerald-600 hover:text-white"
              title="إعادة تسعير العرض"
            >
              <RotateCcw size={12} />
              <span>إعادة تسعير</span>
            </button>
          </div>
        ),
      },
    ],
    []
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

  return (
    <div className="min-h-screen bg-slate-950 pb-20 font-sans text-slate-100" dir="rtl">
      {/* 1. Header & Identity Ambient Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Company Info */}
            <div className="flex items-center gap-3">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name_ar || ''}
                  className="h-10 w-10 rounded-xl border border-slate-700 bg-white object-contain p-1"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                  <Building2 size={20} />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-black text-white">
                    {company.name_ar || 'بوابة الموردين'}
                  </h1>
                  <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                    بوابة الموردين الذكية
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  {company.phone && <span dir="ltr">📞 {company.phone}</span>}
                  {company.tax_number && <span>• الضريبي: {company.tax_number}</span>}
                </div>
              </div>
            </div>

            {/* Supplier Greeting & Cart Quick Button */}
            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-slate-700/80 bg-slate-800/80 px-3.5 py-1.5 text-right">
                <span className="text-[10px] font-medium text-slate-400">المورد المعتمد:</span>
                <p className="text-xs font-black text-emerald-400">{supplier.name}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="relative flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-500"
              >
                <ShoppingBag size={16} />
                <span>عربة التسعير ({draftItems.length})</span>
                {draftItems.length > 0 && (
                  <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 font-mono text-[10px] font-bold text-white shadow-sm">
                    {draftItems.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="mx-auto max-w-7xl space-y-4 px-4 pt-4">
        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            onClick={() => {
              setActiveTab('reorder');
              setOnlyNeedsReorder(true);
            }}
            className={cn(
              'cursor-pointer rounded-2xl border p-4 transition-all',
              activeTab === 'reorder'
                ? 'border-emerald-500/50 bg-emerald-950/20 shadow-md shadow-emerald-500/5'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">أصناف تحتاج توريد وإعادة طلب</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Package size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-emerald-400">{reorderCount}</span>
              <span className="text-[10px] font-bold text-slate-400">صنف منخفض بالمخزون</span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('rfqs')}
            className={cn(
              'cursor-pointer rounded-2xl border p-4 transition-all',
              activeTab === 'rfqs'
                ? 'border-blue-500/50 bg-blue-950/20 shadow-md shadow-blue-500/5'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">طلبات التسعير النشطة (RFQs)</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <FileText size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-blue-400">{rfqs.length}</span>
              <span className="text-[10px] font-bold text-slate-400">طلب جاهز للتسعير</span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('quotations')}
            className={cn(
              'cursor-pointer rounded-2xl border p-4 transition-all',
              activeTab === 'quotations'
                ? 'border-purple-500/50 bg-purple-950/20 shadow-md shadow-purple-500/5'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">عروض الأسعار الموثقة</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-purple-400">
                {quotations.length}
              </span>
              <span className="text-[10px] font-bold text-slate-400">عرض موثق بالنظام</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('reorder')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all',
              activeTab === 'reorder'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            )}
          >
            <Package size={15} />
            <span>المنتجات المطلوب توريدها ({reorder_products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rfqs')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all',
              activeTab === 'rfqs'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            )}
          >
            <FileText size={15} />
            <span>طلبات التسعير ({rfqs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quotations')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all',
              activeTab === 'quotations'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            )}
          >
            <Clock size={15} />
            <span>أرشيف العروض ({quotations.length})</span>
          </button>
        </div>

        {/* Tab 1: Reorder Products List with ExcelTable */}
        {activeTab === 'reorder' && (
          <div className="space-y-3">
            {/* Filter and Bulk Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-md">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyNeedsReorder(prev => !prev)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all',
                    onlyNeedsReorder
                      ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
                      : 'border-slate-700 bg-slate-800 text-slate-300'
                  )}
                >
                  <AlertTriangle size={14} />
                  <span>أصناف إعادة الطلب فقط ({reorderCount})</span>
                </button>
              </div>

              {/* Bulk Add Button */}
              {selectedProductIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkAddSelectedToDraft}
                  className="flex animate-pulse items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition-all hover:from-emerald-500 hover:to-teal-500"
                >
                  <Sparkles size={15} />
                  <span>تسعير الأصناف المحددة ({selectedProductIds.size}) دفعة واحدة</span>
                </button>
              )}
            </div>

            {/* Modern ExcelTable for Products */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-1 shadow-2xl">
              <ExcelTable<ReorderProductItem>
                columns={productColumns}
                data={filteredProducts}
                title="جدول الأصناف المطلوب توريدها"
                subtitle="حدد الأصناف لتسعيرها جماعياً أو انقر تسعير لأي صنف مباشرة"
                colorTheme="green"
                showSearch={true}
                searchValue={productSearch}
                onSearchChange={setProductSearch}
                enableSelection={true}
                selectedRowIds={selectedProductIds}
                onSelectionChange={setSelectedProductIds}
                getRowId={p => p.id}
                enablePagination={true}
                pageSize={20}
                enableResize={true}
                resizeStorageKey="supplier_portal_reorder_table"
                emptyMessage="لا توجد أصناف مطابقة لخيارات البحث"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Active RFQs */}
        {activeTab === 'rfqs' && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {rfqs.length === 0 ? (
              <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-500">
                لا توجد طلبات تسعير نشطة موجهة إليكم حالياً
              </div>
            ) : (
              rfqs.map(rfq => (
                <div
                  key={rfq.id}
                  className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-all hover:border-blue-500/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-400">
                      {rfq.rfq_number}
                    </span>
                    <span className="rounded-md bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                      طلب نشط
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-white">{rfq.title}</h3>

                  <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span>عدد الأصناف المطلوبة:</span>
                      <strong className="text-white">{rfq.items?.length || 0} صنف</strong>
                    </div>
                    {rfq.submission_deadline && (
                      <div className="flex justify-between">
                        <span>آخر موعد للتقديم:</span>
                        <strong className="text-amber-400">
                          {rfq.submission_deadline.slice(0, 10)}
                        </strong>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLoadRFQIntoDraft(rfq)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-md transition-all hover:bg-blue-500"
                  >
                    <Send size={14} />
                    <span>تقديم عرض سعر لهذا الطلب</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Previous Quotations Archive with ExcelTable */}
        {activeTab === 'quotations' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-1 shadow-2xl">
            <ExcelTable<PublicPortalQuotation>
              columns={quotationColumns}
              data={quotations}
              title="أرشيف عروض الأسعار السابقة"
              subtitle="استعراض وطباعة أو إعادة تسعير عروض الأسعار الموثقة"
              colorTheme="indigo"
              showSearch={true}
              enablePagination={true}
              pageSize={15}
              enableResize={true}
              resizeStorageKey="supplier_portal_quotations_table"
              emptyMessage="لم يتم تقديم عروض أسعار سابقة بعد"
            />
          </div>
        )}
      </main>

      {/* 3. Quotation Builder Drawer (Slide-Over / Modal) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
          <div className="animate-in slide-in-from-left flex h-full w-full max-w-xl flex-col border-r border-slate-800 bg-slate-900 p-4 shadow-2xl duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShoppingBag size={18} />
                <h2 className="text-sm font-black text-white">إعداد وإرسال عرض السعر</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items List in Cart */}
            <div className="custom-scrollbar my-3 flex-1 space-y-3 overflow-y-auto">
              {draftItems.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center text-center text-slate-500">
                  <Package size={32} className="mb-2 opacity-40" />
                  <p className="text-xs">عربة التسعير فارغة حالياً</p>
                  <span className="mt-1 text-[10px] text-slate-600">
                    أضف أصنافاً من تبويب المنتجات أو طلبات التسعير
                  </span>
                </div>
              ) : (
                draftItems.map((item, idx) => {
                  const lineCalc = calculatePortalLineTotal(
                    item.quantity,
                    item.unit_price,
                    item.discount_percent
                  );

                  return (
                    <div
                      key={idx}
                      className="space-y-2.5 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-black text-white">{item.description}</h4>
                          {item.oem_number && (
                            <span className="font-mono text-[10px] text-slate-400">
                              OEM: {item.oem_number}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setDraftItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400">
                            الكمية المتاحة
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setDraftItems(prev =>
                                prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                              );
                            }}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400">
                            سعر الوحدة (ر.س)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setDraftItems(prev =>
                                prev.map((it, i) => (i === idx ? { ...it, unit_price: val } : it))
                              );
                            }}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-emerald-400 outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400">الإجمالي</label>
                          <div className="flex h-[30px] items-center rounded-xl border border-slate-800 bg-slate-950 px-2.5 font-mono text-xs font-black text-emerald-400">
                            {formatCurrency(lineCalc, 'SAR')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Terms & Conditions */}
              {draftItems.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400">
                      شروط التسليم / مدة التوصيل
                    </label>
                    <input
                      type="text"
                      value={deliveryTerms}
                      onChange={e => setDeliveryTerms(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400">شروط السداد</label>
                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={e => setPaymentTerms(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400">
                      ملاحظات إضافية للمشتريات
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      placeholder="أي ملاحظات حول الضمان، المنشأ، أو جودة القطع..."
                      className="mt-1 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer & Submit Action */}
            <div className="space-y-3 border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3">
                <span className="text-xs font-bold text-slate-400">إجمالي قيمة عرض السعر:</span>
                <span className="font-mono text-base font-black text-emerald-400">
                  {formatCurrency(draftTotal, 'SAR')}
                </span>
              </div>

              <button
                type="button"
                disabled={draftItems.length === 0 || isSubmitting}
                onClick={handleSubmitQuotation}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition-all hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>جاري إرسال العرض...</span>
                ) : (
                  <>
                    <Send size={16} />
                    <span>إرسال عرض السعر مباشرة لإدارة المشتريات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Success Modal */}
      {successResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-emerald-500/40 bg-slate-900 p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-base font-black text-white">تم استلام عرض السعر بنجاح!</h3>
            <p className="text-xs text-slate-400">
              تم توثيق عرض السعر في نظام المشتريات وسيتم مراجعته والتواصل معكم قريباً.
            </p>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300">
              رقم العرض: <strong className="text-emerald-400">{successResult.number}</strong>
            </div>

            <button
              type="button"
              onClick={() => {
                setSuccessResult(null);
                setIsDrawerOpen(false);
                setActiveTab('quotations');
              }}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
            >
              تم
            </button>
          </div>
        </div>
      )}

      {/* 5. Printable Quotation Modal */}
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
