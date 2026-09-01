import React, { useRef, useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Loader2,
  Building2,
  Share2,
  Calendar,
  CreditCard,
  DollarSign,
  User,
  Phone,
  MapPin,
  RotateCcw,
  Download,
  Hash,
  Search,
  Copy,
  Check,
  Table as TableIcon,
  Layers,
} from 'lucide-react';
import Modal from '@/ui/base/Modal';
import { usePurchaseDetails } from '../hooks';
import { cn, formatCurrency } from '../../../core/utils';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../../features/auth';
import { useFeedbackStore } from '../../../features/feedback/store';
import { useCompany } from '../../settings/hooks';
import PurchaseInvoicePrintTemplate, {
  type PurchasePrintInvoice,
  type PurchasePrintItem,
} from './PurchaseInvoicePrintTemplate';
import { exportToPDF } from '../../../core/utils/pdfExporter';
import {
  exportInvoiceToExcel,
  generateInvoiceExcelBlob,
} from '../../../core/utils/invoiceExcelExporter';
import { AdvancedReturnModal } from '../../returns/components/AdvancedReturnModal';
import { logger } from '../../../core/utils/logger';

interface PurchaseDetailInvoice extends PurchasePrintInvoice {
  id: string;
  company_id: string;
  party_id: string | null;
  payment_method: string | null;
  status: string;
  type?: string;
  currency_code?: string | null;
  exchange_rate?: number | null;
  tax_amount?: number | null;
  discount_amount?: number | null;
  paid_amount?: number | null;
  remaining_amount?: number | null;
}

interface PurchaseDetailsModalProps {
  invoiceId: string | null;
  onClose: () => void;
  onReturn?: (invoiceId: string, items: PurchasePrintItem[]) => void;
}

export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  invoiceId,
  onClose,
  onReturn,
}) => {
  const { data, isLoading } = usePurchaseDetails(invoiceId);
  const invoice = (data ?? null) as PurchaseDetailInvoice | null;
  const { user } = useAuth();
  const { data: company } = useCompany();
  const { showToast } = useFeedbackStore();

  const [activeTab, setActiveTab] = useState<'details' | 'preview'>('details');
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `فاتورة_مشتريات_${invoice?.invoice_number ?? ''}`,
  });

  const companyName =
    (company as { name_ar?: string; name?: string })?.name_ar ||
    (company as { name_ar?: string; name?: string })?.name ||
    user?.company_name ||
    'المؤسسة';

  const companyAddress = (company as { address?: string })?.address || '';
  const taxNumber = (company as { tax_number?: string })?.tax_number || '';
  const issuedByName = user?.full_name || user?.email || 'النظام';

  const handleCopySku = (sku: string) => {
    void navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
    showToast('تم نسخ رمز الصنف', 'info');
  };

  const handleExportPDF = async () => {
    if (!printRef.current || !invoice) return;
    setIsExporting(true);
    try {
      await exportToPDF(printRef.current, `فاتورة-مشتريات-${invoice.invoice_number ?? invoice.id}`);
      showToast('تم تصدير الفاتورة إلى PDF بنجاح', 'success');
    } catch (error) {
      logger.error('PurchaseDetailsModal', 'Export PDF failed', error);
      showToast('فشل في تصدير ملف PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!invoice) return;
    setIsExporting(true);
    try {
      const invoiceNumber = invoice.invoice_number ?? '';
      const items = (invoice.invoice_items ?? []).map(item => ({
        name: item.product?.name_ar ?? item.description ?? 'صنف غير محدد',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
      }));

      await exportInvoiceToExcel({
        companyName,
        companyAddress,
        taxNumber,
        invoiceNumber,
        issueDate: invoice.issue_date,
        customerName: invoice.party?.name ?? 'مورد عام',
        issuedBy: issuedByName,
        items,
        subtotal: invoice.subtotal ?? invoice.total_amount,
        totalAmount: invoice.total_amount,
      });

      showToast('تم تصدير ملف Excel بنجاح', 'success');
    } catch (error) {
      logger.error('PurchaseDetailsModal', 'Export Excel failed', error);
      showToast('فشل في تصدير ملف Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!invoice) return;
    setIsExporting(true);
    try {
      const invoiceNumber = invoice.invoice_number ?? '';
      const items = (invoice.invoice_items ?? []).map(item => ({
        name: item.product?.name_ar ?? item.description ?? 'صنف غير محدد',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
      }));

      const blob = await generateInvoiceExcelBlob({
        companyName,
        companyAddress,
        taxNumber,
        invoiceNumber,
        issueDate: invoice.issue_date,
        customerName: invoice.party?.name ?? 'مورد عام',
        issuedBy: issuedByName,
        items,
        subtotal: invoice.subtotal ?? invoice.total_amount,
        totalAmount: invoice.total_amount,
      });

      const file = new File([blob], `فاتورة_شراء_${invoiceNumber}.xlsx`, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `فاتورة مشتريات #${invoiceNumber}`,
          text: `مرفق فاتورة مشتريات رقم #${invoiceNumber} من ${companyName}`,
        });
        showToast('تمت مشاركة الفاتورة بنجاح', 'success');
      } else {
        await exportInvoiceToExcel({
          companyName,
          companyAddress,
          taxNumber,
          invoiceNumber,
          issueDate: invoice.issue_date,
          customerName: invoice.party?.name ?? 'مورد عام',
          issuedBy: issuedByName,
          items,
          subtotal: invoice.subtotal ?? invoice.total_amount,
          totalAmount: invoice.total_amount,
        });
        const text = encodeURIComponent(
          `فاتورة مشتريات #${invoiceNumber} من ${companyName}\nالمورد: ${invoice.party?.name ?? 'مورد عام'}\nالإجمالي: ${formatCurrency(invoice.total_amount, invoice.currency_code ?? 'SAR')}`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      logger.error('PurchaseDetailsModal', 'Share WhatsApp failed', error);
      showToast('فشل في مشاركة الفاتورة عبر واتساب', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          label: 'مدفوعة بالكامل',
          cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'posted':
        return {
          label: 'مرحّلة ومستلمة',
          cls: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'partial':
      case 'partially_paid':
        return {
          label: 'مدفوعة جزئياً',
          cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'cancelled':
      case 'void':
        return {
          label: 'ملغاة',
          cls: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        };
      default:
        return {
          label: 'مسودة',
          cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  const isReturn = invoice?.type === 'purchase_return';

  // Filter items in Excel view
  const filteredItems = useMemo(() => {
    const items = invoice?.invoice_items ?? [];
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      item =>
        (item.product?.name_ar && item.product.name_ar.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.product?.sku && item.product.sku.toLowerCase().includes(q))
    );
  }, [invoice?.invoice_items, searchQuery]);

  // Totals calculations for Excel summary row
  const totalUnitsCount = useMemo(() => {
    return (invoice?.invoice_items ?? []).reduce((acc, item) => acc + (item.quantity || 0), 0);
  }, [invoice?.invoice_items]);

  const totalLinesAmount = useMemo(() => {
    return (invoice?.invoice_items ?? []).reduce((acc, item) => acc + (item.total || 0), 0);
  }, [invoice?.invoice_items]);

  if (invoiceId === null) return null;

  return (
    <>
      <Modal
        isOpen={Boolean(invoiceId)}
        onClose={onClose}
        icon={Building2}
        title={
          invoice
            ? `${isReturn ? 'مرتجع مشتريات' : 'فاتورة مشتريات'} #${invoice.invoice_number || '---'}`
            : 'تفاصيل فاتورة الشراء'
        }
        description={
          invoice?.party?.name
            ? `المورد: ${invoice.party.name} • تاريخ التوريد: ${invoice.issue_date}`
            : 'عرض تفصيلي لبنود التوريد والأصناف وحسابات المورد'
        }
        size="5xl"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {invoice && !isReturn && (
                <button
                  type="button"
                  onClick={() => {
                    if (onReturn) {
                      onReturn(invoice.id, invoice.invoice_items ?? []);
                    } else {
                      setIsReturnModalOpen(true);
                    }
                  }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-rose-500/20 transition-all hover:from-rose-700 hover:to-amber-700 active:scale-95"
                >
                  <RotateCcw size={15} />
                  <span>إرجاع الفاتورة (مرتجع مشتريات)</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={isLoading || !invoice}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Printer size={15} />
                <span>طباعة فورية</span>
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExporting || isLoading || !invoice}
                className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
              >
                <Download size={15} />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExporting || isLoading || !invoice}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
              >
                <Share2 size={15} />
                <span>Excel</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={isExporting || isLoading || !invoice}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                <span>واتساب</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        }
      >
        {isLoading ? (
          <div className="flex h-72 flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="animate-spin text-blue-600" size={36} />
            <p className="text-xs font-bold">جاري جلب تفاصيل وبيانات الفاتورة...</p>
          </div>
        ) : !invoice ? (
          <div className="py-20 text-center text-slate-400">
            <FileText size={56} className="mx-auto mb-3 opacity-20" />
            <p className="text-base font-bold">تعذر العثور على بيانات فاتورة الشراء المطلوبة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Segmented Tab Control */}
            <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold dark:border-slate-700/60 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 transition-all duration-200',
                  activeTab === 'details'
                    ? 'bg-white font-black text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                )}
              >
                <TableIcon size={16} />
                <span>جدول بيانات الأصناف (Excel Sheet View)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 transition-all duration-200',
                  activeTab === 'preview'
                    ? 'bg-white font-black text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                )}
              >
                <Printer size={16} />
                <span>معاينة قالب الطباعة الرسمي (A4)</span>
              </button>
            </div>

            {activeTab === 'details' ? (
              <>
                {/* Top High-Density 4-Cards Strip */}
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  {/* 1. Supplier Card */}
                  <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-xs dark:border-slate-700/80 dark:bg-slate-800/60">
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                        <User size={14} className="text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          المورد
                        </span>
                      </div>
                      <p
                        className="truncate text-sm font-bold text-slate-900 dark:text-slate-100"
                        title={invoice.party?.name ?? 'مورد عام'}
                      >
                        {invoice.party?.name ?? 'مورد عام'}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-col gap-1 border-t border-slate-200/60 pt-2 text-[11px] text-slate-500 dark:border-slate-700/40 dark:text-slate-400">
                      {invoice.party?.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400" />
                          <span dir="ltr" className="font-mono">
                            {invoice.party.phone}
                          </span>
                        </div>
                      )}
                      {invoice.party?.address && (
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin size={12} className="shrink-0 text-slate-400" />
                          <span className="truncate">{invoice.party.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Dates & Doc Number */}
                  <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-xs dark:border-slate-700/80 dark:bg-slate-800/60">
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                        <Calendar size={14} className="text-purple-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          التواريخ والتوثيق
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          تاريخ التوريد:
                        </span>
                        <span
                          dir="ltr"
                          className="font-mono font-bold text-slate-800 dark:text-slate-200"
                        >
                          {invoice.issue_date}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px] dark:border-slate-700/40">
                      <span className="text-slate-500 dark:text-slate-400">تاريخ الاستحقاق:</span>
                      <span
                        dir="ltr"
                        className="font-mono font-bold text-slate-700 dark:text-slate-300"
                      >
                        {invoice.due_date ?? invoice.issue_date}
                      </span>
                    </div>
                  </div>

                  {/* 3. Payment & Method Status */}
                  <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-xs dark:border-slate-700/80 dark:bg-slate-800/60">
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                        <CreditCard size={14} className="text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          الحالة وطريقة الدفع
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'rounded-lg border px-2 py-0.5 text-xs font-black',
                            statusBadge(invoice.status).cls
                          )}
                        >
                          {statusBadge(invoice.status).label}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px] dark:border-slate-700/40">
                      <span className="text-slate-500 dark:text-slate-400">طريقة السداد:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {invoice.payment_method === 'cash'
                          ? 'نقداً'
                          : invoice.payment_method === 'credit'
                            ? 'آجل'
                            : 'تحويل بنكي'}
                      </span>
                    </div>
                  </div>

                  {/* 4. Financial Grand Total */}
                  <div className="flex flex-col justify-between rounded-2xl border border-blue-200 bg-blue-50/60 p-3 shadow-xs dark:border-blue-900/60 dark:bg-blue-950/40">
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <DollarSign size={14} />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          إجمالي الفاتورة
                        </span>
                      </div>
                      <p
                        dir="ltr"
                        className="font-mono text-lg font-black text-blue-700 dark:text-blue-300"
                      >
                        {formatCurrency(invoice.total_amount, invoice.currency_code ?? 'SAR')}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-blue-200/60 pt-2 text-[11px] dark:border-blue-800/40">
                      <span className="text-blue-700/80 dark:text-blue-400">عدد الأصناف:</span>
                      <span className="font-mono font-bold text-blue-900 dark:text-blue-200">
                        {(invoice.invoice_items ?? []).length} صنف ({totalUnitsCount} وحدة)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Excel-Grade Spreadsheet Product Table */}
                <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-[var(--app-surface)] shadow-md dark:border-slate-700">
                  {/* Excel Sheet Ribbon Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-gradient-to-r from-slate-100 via-slate-50 to-emerald-50/40 px-4 py-2.5 dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-emerald-950/20">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-600 p-1.5 text-white shadow-xs">
                        <TableIcon size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100">
                            ورقة أصناف الفاتورة (Sheet 1)
                          </h3>
                          <span className="rounded-md border border-emerald-200 bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            {filteredItems.length} صف
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          جدول بيانات توريد المخزون مع إحداثيات الأعمدة وحسابات الأسعار
                        </span>
                      </div>
                    </div>

                    {/* Quick Table Search */}
                    <div className="relative min-w-[240px]">
                      <Search
                        className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500"
                        size={14}
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="بحث في الأصناف أو SKU..."
                        className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Spreadsheet Grid View */}
                  <div className="custom-scrollbar overflow-x-auto">
                    <table className="w-full border-collapse text-right font-sans text-xs">
                      {/* Excel Column Coordinates (A, B, C, D, E, F, G) */}
                      <thead>
                        <tr className="select-none border-b border-slate-300 bg-slate-200/90 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                          <th className="w-10 border-l border-slate-300 bg-slate-300/60 py-1 text-center dark:border-slate-700 dark:bg-slate-950"></th>
                          <th className="w-36 border-l border-slate-300 px-3 py-1 text-center dark:border-slate-700">
                            A
                          </th>
                          <th className="min-w-[220px] border-l border-slate-300 px-4 py-1 text-center dark:border-slate-700">
                            B
                          </th>
                          <th className="w-24 border-l border-slate-300 px-3 py-1 text-center dark:border-slate-700">
                            C
                          </th>
                          <th className="w-28 border-l border-slate-300 px-3 py-1 text-center dark:border-slate-700">
                            D
                          </th>
                          <th className="w-24 border-l border-slate-300 px-3 py-1 text-center dark:border-slate-700">
                            E
                          </th>
                          <th className="w-24 border-l border-slate-300 px-3 py-1 text-center dark:border-slate-700">
                            F
                          </th>
                          <th className="w-32 px-3 py-1 text-center">G</th>
                        </tr>

                        {/* Column Names Row */}
                        <tr className="border-b-2 border-slate-300 bg-slate-100 text-[11px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <th className="dark:bg-slate-850 w-10 border-l border-slate-300 bg-slate-200/50 px-2 py-2.5 text-center dark:border-slate-700">
                            #
                          </th>
                          <th className="border-l border-slate-300 px-3 py-2.5 dark:border-slate-700">
                            كود الصنف (SKU)
                          </th>
                          <th className="border-l border-slate-300 px-4 py-2.5 dark:border-slate-700">
                            اسم المنتج والوصف
                          </th>
                          <th className="border-l border-slate-300 px-3 py-2.5 text-center dark:border-slate-700">
                            الكمية
                          </th>
                          <th className="border-l border-slate-300 px-3 py-2.5 text-center dark:border-slate-700">
                            سعر الشراء
                          </th>
                          <th className="border-l border-slate-300 px-3 py-2.5 text-center dark:border-slate-700">
                            الخصم
                          </th>
                          <th className="border-l border-slate-300 px-3 py-2.5 text-center dark:border-slate-700">
                            الضريبة
                          </th>
                          <th className="px-3 py-2.5 text-center">الإجمالي الصافي</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80">
                        {filteredItems.map((item, idx) => {
                          const sku = item.product?.sku || '---';
                          const isCopied = copiedSku === sku;

                          return (
                            <tr
                              key={item.id || idx}
                              className={cn(
                                'group transition-colors hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20',
                                idx % 2 === 0
                                  ? 'bg-white dark:bg-slate-900/60'
                                  : 'bg-slate-50/60 dark:bg-slate-800/40'
                              )}
                            >
                              {/* Row Index */}
                              <td className="dark:bg-slate-850 select-none border-l border-slate-200 bg-slate-100/50 px-2 py-2 text-center font-mono text-[11px] font-bold text-slate-400 group-hover:bg-emerald-100/50 group-hover:text-emerald-700 dark:border-slate-700 dark:text-slate-500 dark:group-hover:bg-emerald-900/40 dark:group-hover:text-emerald-300">
                                {idx + 1}
                              </td>

                              {/* Column A: SKU / Barcode */}
                              <td className="border-l border-slate-200 px-3 py-2 dark:border-slate-700">
                                {item.product?.sku ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCopySku(item.product!.sku!)}
                                    title="انقر لنسخ رمز الصنف"
                                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 transition-colors hover:bg-blue-100 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-900/40"
                                  >
                                    <Hash size={11} className="text-slate-400" />
                                    <span>{item.product.sku}</span>
                                    {isCopied ? (
                                      <Check size={11} className="text-emerald-600" />
                                    ) : (
                                      <Copy
                                        size={11}
                                        className="text-slate-400 opacity-0 transition-opacity group-hover:inline group-hover:opacity-100"
                                      />
                                    )}
                                  </button>
                                ) : (
                                  <span className="font-mono text-[11px] text-slate-400">---</span>
                                )}
                              </td>

                              {/* Column B: Name & Description */}
                              <td className="border-l border-slate-200 px-4 py-2 dark:border-slate-700">
                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                  {item.product?.name_ar ?? item.description ?? 'صنف بدون وصف'}
                                </div>
                                {item.description &&
                                  item.product?.name_ar &&
                                  item.description !== item.product.name_ar && (
                                    <div className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                                      {item.description}
                                    </div>
                                  )}
                              </td>

                              {/* Column C: Quantity */}
                              <td className="border-l border-slate-200 px-3 py-2 text-center font-mono font-bold text-slate-900 dark:border-slate-700 dark:text-slate-100">
                                <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                                  {item.quantity}
                                </span>
                              </td>

                              {/* Column D: Unit Price */}
                              <td
                                className="border-l border-slate-200 px-3 py-2 text-center font-mono text-slate-700 dark:border-slate-700 dark:text-slate-300"
                                dir="ltr"
                              >
                                {formatCurrency(item.unit_price, invoice.currency_code ?? 'SAR')}
                              </td>

                              {/* Column E: Discount */}
                              <td
                                className="border-l border-slate-200 px-3 py-2 text-center font-mono text-slate-500 dark:border-slate-700 dark:text-slate-400"
                                dir="ltr"
                              >
                                0.00
                              </td>

                              {/* Column F: Tax */}
                              <td
                                className="border-l border-slate-200 px-3 py-2 text-center font-mono text-slate-500 dark:border-slate-700 dark:text-slate-400"
                                dir="ltr"
                              >
                                {formatCurrency(item.total * 0.15, invoice.currency_code ?? 'SAR')}
                              </td>

                              {/* Column G: Total Amount */}
                              <td
                                className="bg-emerald-50/20 px-3 py-2 text-center font-mono font-black text-slate-900 dark:bg-emerald-950/10 dark:text-slate-100"
                                dir="ltr"
                              >
                                {formatCurrency(item.total, invoice.currency_code ?? 'SAR')}
                              </td>
                            </tr>
                          );
                        })}

                        {filteredItems.length === 0 && (
                          <tr>
                            <td
                              colSpan={8}
                              className="py-10 text-center text-xs font-bold text-slate-400"
                            >
                              لا توجد أصناف مطابقة لعملية البحث الحالية
                            </td>
                          </tr>
                        )}
                      </tbody>

                      {/* Excel Formula Summary Row (Σ SUM) */}
                      <tfoot>
                        <tr className="border-t-2 border-slate-300 bg-gradient-to-r from-slate-200 via-slate-100 to-emerald-100/60 text-xs font-black dark:border-slate-700 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950/40">
                          <td className="border-l border-slate-300 bg-slate-300/80 px-2 py-2 text-center font-mono font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                            Σ
                          </td>
                          <td className="border-l border-slate-300 px-3 py-2 font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300">
                            إجمالي الورقة ({filteredItems.length} صنف)
                          </td>
                          <td className="border-l border-slate-300 px-4 py-2 font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            مجموع الكميات الموردة
                          </td>
                          <td
                            className="border-l border-slate-300 px-3 py-2 text-center font-mono font-black text-blue-700 dark:border-slate-700 dark:text-blue-300"
                            dir="ltr"
                          >
                            {totalUnitsCount} وحدة
                          </td>
                          <td className="border-l border-slate-300 px-3 py-2 text-center text-slate-400 dark:border-slate-700">
                            -
                          </td>
                          <td
                            className="border-l border-slate-300 px-3 py-2 text-center font-mono text-slate-600 dark:border-slate-700 dark:text-slate-400"
                            dir="ltr"
                          >
                            0.00
                          </td>
                          <td
                            className="border-l border-slate-300 px-3 py-2 text-center font-mono text-slate-600 dark:border-slate-700 dark:text-slate-400"
                            dir="ltr"
                          >
                            {formatCurrency(
                              totalLinesAmount * 0.15,
                              invoice.currency_code ?? 'SAR'
                            )}
                          </td>
                          <td
                            className="bg-emerald-50 px-3 py-2 text-center font-mono text-sm font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                            dir="ltr"
                          >
                            {formatCurrency(totalLinesAmount, invoice.currency_code ?? 'SAR')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Bottom Sheet Summary Footnote */}
                  <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80 sm:flex-row">
                    {invoice.notes ? (
                      <div className="w-full max-w-md text-xs text-slate-600 dark:text-slate-300">
                        <span className="mb-0.5 block font-black text-slate-400 dark:text-slate-500">
                          ملاحظات الفاتورة:
                        </span>
                        <p className="rounded-lg border border-slate-200 bg-white p-2 font-medium dark:border-slate-700 dark:bg-slate-900">
                          {invoice.notes}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs italic text-slate-400">
                        <Layers size={14} className="text-slate-400" />
                        <span>جميع الأصناف مسجلة ومطابقة لأمر الشراء والتوريد المخزني</span>
                      </div>
                    )}

                    <div className="w-full space-y-1.5 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xs dark:border-slate-700 dark:bg-slate-900 sm:w-80">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>المجموع الفرعي (قبل الضريبة):</span>
                        <span dir="ltr" className="font-mono font-bold">
                          {formatCurrency(
                            invoice.subtotal ?? invoice.total_amount,
                            invoice.currency_code ?? 'SAR'
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900 dark:border-slate-700 dark:text-slate-100">
                        <span>الإجمالي النهائي المستحق:</span>
                        <span
                          dir="ltr"
                          className="font-mono text-base text-emerald-600 dark:text-emerald-400"
                        >
                          {formatCurrency(invoice.total_amount, invoice.currency_code ?? 'SAR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Print Preview Tab */
              <div className="custom-scrollbar flex max-h-[65vh] justify-center overflow-auto rounded-2xl border border-slate-300 bg-slate-200 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="w-full max-w-3xl shrink-0 rounded-sm border border-slate-300 bg-white p-2 text-black shadow-2xl">
                  <PurchaseInvoicePrintTemplate ref={printRef} invoice={invoice} />
                </div>
              </div>
            )}

            {/* Hidden print container for physical print and PDF export */}
            <div style={{ display: 'none' }}>
              <div ref={printRef} className="print-only">
                <PurchaseInvoicePrintTemplate invoice={invoice} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Embedded Advanced Return Modal for 1-Click Purchase Return */}
      {invoice && (
        <AdvancedReturnModal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          returnType="purchase"
          initialInvoiceId={invoice.id}
          partyId={invoice.party_id ?? undefined}
          partyName={invoice.party?.name ?? undefined}
          onSuccess={() => {
            setIsReturnModalOpen(false);
            showToast('تم تسجيل مرتجع المشتريات وتحديث المخزون بنجاح', 'success');
            onClose();
          }}
        />
      )}
    </>
  );
};

export default PurchaseDetailsModal;
