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
  Search,
  Plus,
  Trash2,
  ShoppingBag,
  X,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import PageLoader from '../../../ui/base/PageLoader';
import { formatCurrency, cn } from '../../../core/utils';

interface SupplierContext {
  supplier: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    tax_number?: string | null;
    address?: string | null;
    commercial_registration?: string | null;
    payment_terms_days?: number | null;
  };
  company: {
    id: string;
    name_ar?: string | null;
    logo_url?: string | null;
    phone?: string | null;
    address?: string | null;
    tax_number?: string | null;
  };
  reorder_products: Array<{
    id: string;
    name_ar: string;
    sku: string;
    part_number?: string | null;
    brand?: string | null;
    size?: string | null;
    unit?: string | null;
    cost_price: number;
    sale_price: number;
    min_stock_level: number;
    current_stock: number;
    needs_reorder: boolean;
  }>;
  rfqs: Array<{
    id: string;
    rfq_number: string;
    title: string;
    status: string;
    submission_deadline?: string | null;
    delivery_date?: string | null;
    terms_and_conditions?: string | null;
    created_at: string;
    items?: Array<{
      id: string;
      product_id?: string | null;
      description: string;
      quantity: number;
      unit_of_measure?: string | null;
      target_unit_price?: number | null;
      oem_number?: string | null;
      notes?: string | null;
    }>;
  }>;
  quotations: Array<{
    id: string;
    quotation_number: string;
    status: string;
    issue_date: string;
    valid_until?: string | null;
    total_amount: number;
    currency_code: string;
    notes?: string | null;
    delivery_terms?: string | null;
    payment_terms?: string | null;
    created_at: string;
    items?: Array<{
      id: string;
      product_id?: string | null;
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }>;
  }>;
}

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

export const PublicSupplierPortalPage: React.FC = () => {
  const { token: urlToken } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const token = urlToken || searchParams.get('token') || '';

  const [context, setContext] = useState<SupplierContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tabs: 'reorder' | 'rfqs' | 'quotations'
  const [activeTab, setActiveTab] = useState<'reorder' | 'rfqs' | 'quotations'>('reorder');

  // Search & Filter
  const [productSearch, setProductSearch] = useState('');
  const [onlyNeedsReorder, setOnlyNeedsReorder] = useState(true);

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

  const fetchContext = useCallback(async () => {
    if (!token) {
      setErrorMessage('رمز الوصول مفقود. يرجى استخدام الرابط الخاص بكم.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await (supabase as any).rpc('get_supplier_portal_context', {
        p_token: token.trim(),
      });

      if (error) throw error;
      setContext(data as unknown as SupplierContext);
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

  // Add Product to Draft
  const handleAddProductToDraft = (product: SupplierContext['reorder_products'][0]) => {
    setDraftItems(prev => {
      const exists = prev.find(i => i.product_id === product.id);
      if (exists) {
        return prev.map(i =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          description: product.name_ar,
          oem_number: product.part_number || null,
          brand: product.brand || null,
          quantity: 1,
          unit_price: product.cost_price || 0,
          discount_percent: 0,
          notes: null,
        },
      ];
    });
    setIsDrawerOpen(true);
  };

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

  // Calculate Draft Totals
  const draftTotal = useMemo(() => {
    return draftItems.reduce((sum, item) => {
      const sub = item.quantity * item.unit_price;
      const discount = (sub * (item.discount_percent || 0)) / 100;
      return sum + (sub - discount);
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

      const { data, error } = await (supabase as any).rpc('submit_supplier_portal_quotation', {
        p_token: token.trim(),
        p_payload: payload,
      });

      if (error) throw error;

      const result = data as { quotation_number: string; total_amount: number };
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
                    بوابة الموردين
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
              <span className="text-xs font-bold text-slate-400">عروض الأسعار السابقة</span>
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

        {/* Tab 1: Reorder Products List */}
        {activeTab === 'reorder' && (
          <div className="space-y-3">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="relative min-w-[260px] flex-1">
                <Search
                  size={15}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="ابحث باسم الصنف، رقم القطعة (OEM)، أو الماركة..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-3 pr-9 text-xs font-bold text-white outline-none placeholder:text-slate-500 focus:border-emerald-500"
                />
              </div>

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
            </div>

            {/* Products Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 font-bold text-slate-400">
                      <th className="p-3">الصنف / الوصف</th>
                      <th className="p-3 text-center">رقم القطعة (OEM)</th>
                      <th className="p-3 text-center">الماركة</th>
                      <th className="p-3 text-center">المخزون الحالي</th>
                      <th className="p-3 text-center">حد الطلب</th>
                      <th className="p-3 text-center">آخر تكلفة</th>
                      <th className="p-3 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          لا توجد أصناف مطابقة لخيارات البحث
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(prod => (
                        <tr key={prod.id} className="transition-colors hover:bg-slate-800/40">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {prod.needs_reorder && (
                                <span className="flex h-2 w-2 animate-pulse rounded-full bg-rose-500" />
                              )}
                              <div>
                                <p className="font-bold text-white">{prod.name_ar}</p>
                                <span className="font-mono text-[10px] text-slate-400">
                                  SKU: {prod.sku}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-300">
                            {prod.part_number || '---'}
                          </td>
                          <td className="p-3 text-center">
                            {prod.brand ? (
                              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                                {prod.brand}
                              </span>
                            ) : (
                              '---'
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={cn(
                                'font-mono font-bold',
                                prod.current_stock <= prod.min_stock_level
                                  ? 'text-rose-400'
                                  : 'text-emerald-400'
                              )}
                            >
                              {prod.current_stock} {prod.unit || ''}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-400">
                            {prod.min_stock_level}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-400">
                            {formatCurrency(prod.cost_price, 'SAR')}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleAddProductToDraft(prod)}
                              className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-600/20 px-3 py-1.5 text-[11px] font-bold text-emerald-300 transition-all hover:bg-emerald-600 hover:text-white"
                            >
                              <Plus size={13} />
                              <span>تسعير الصنف</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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

        {/* Tab 3: Previous Quotations Archive */}
        {activeTab === 'quotations' && (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 font-bold text-slate-400">
                    <th className="p-3">رقم العرض</th>
                    <th className="p-3 text-center">تاريخ التقديم</th>
                    <th className="p-3 text-center">عدد الأصناف</th>
                    <th className="p-3 text-center">إجمالي القيمة</th>
                    <th className="p-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {quotations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        لم يتم تقديم عروض أسعار سابقة بعد
                      </td>
                    </tr>
                  ) : (
                    quotations.map(q => (
                      <tr key={q.id} className="transition-colors hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-purple-400">
                          {q.quotation_number}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-400">{q.issue_date}</td>
                        <td className="p-3 text-center font-bold text-white">
                          {q.items?.length || 0} صنف
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-400">
                          {formatCurrency(q.total_amount, q.currency_code || 'SAR')}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={cn(
                              'rounded-md px-2.5 py-1 text-[10px] font-bold',
                              q.status === 'accepted' || q.status === 'approved'
                                ? 'bg-emerald-900/40 text-emerald-300'
                                : q.status === 'rejected'
                                  ? 'bg-rose-900/40 text-rose-300'
                                  : 'bg-amber-900/40 text-amber-300'
                            )}
                          >
                            {q.status === 'accepted' || q.status === 'approved'
                              ? 'معتمد ✅'
                              : q.status === 'rejected'
                                ? 'مرفوض'
                                : 'قيد المراجعة ⏳'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
                draftItems.map((item, idx) => (
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
                          {formatCurrency(item.quantity * item.unit_price, 'SAR')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
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
    </div>
  );
};

export default PublicSupplierPortalPage;
