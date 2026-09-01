import React, { useRef, useState } from 'react';
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
  PackageCheck,
  Hash,
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
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `فاتورة_مشتريات_${invoice?.invoice_number ?? ''}`,
  });

  if (invoiceId === null) return null;

  const companyName =
    (company as { name_ar?: string; name?: string })?.name_ar ||
    (company as { name_ar?: string; name?: string })?.name ||
    user?.company_name ||
    'المؤسسة';

  const companyAddress = (company as { address?: string })?.address || '';
  const taxNumber = (company as { tax_number?: string })?.tax_number || '';
  const issuedByName = user?.full_name || user?.email || 'النظام';

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

  return (
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
            {onReturn && invoice && !isReturn && (
              <button
                type="button"
                onClick={() => onReturn(invoice.id, invoice.invoice_items ?? [])}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
              >
                <RotateCcw size={14} />
                <span>إرجاع مشتريات</span>
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
              <PackageCheck size={16} />
              <span>تفاصيل الفاتورة والأصناف الموردة</span>
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
                      {(invoice.invoice_items ?? []).length} صنف
                    </span>
                  </div>
                </div>
              </div>

              {/* Purchase Items Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[var(--app-surface)] shadow-xs dark:border-slate-700/80">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
                  <div className="flex items-center gap-2">
                    <PackageCheck size={16} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100">
                      الأصناف والبنود الموردة بالمستودع
                    </h3>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {invoice.invoice_items?.length ?? 0} عنصر
                  </span>
                </div>

                <div className="custom-scrollbar overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/75 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                        <th className="w-12 px-3 py-2.5 text-center">#</th>
                        <th className="min-w-[200px] px-4 py-2.5">الصنف والوصف</th>
                        <th className="w-24 px-3 py-2.5 text-center">الكمية</th>
                        <th className="w-28 px-3 py-2.5 text-center">سعر الشراء</th>
                        <th className="w-28 px-3 py-2.5 text-center">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(invoice.invoice_items ?? []).map((item, idx) => (
                        <tr
                          key={item.id || idx}
                          className="transition-colors hover:bg-blue-50/30 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-3 py-3 text-center font-mono text-xs font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {item.product?.name_ar ?? item.description ?? 'صنف بدون وصف'}
                            </div>
                            {item.product?.sku && (
                              <div className="py-0.2 mt-0.5 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                <Hash size={10} />
                                <span>{item.product.sku}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.quantity}
                          </td>
                          <td
                            className="px-3 py-3 text-center font-mono text-slate-700 dark:text-slate-300"
                            dir="ltr"
                          >
                            {formatCurrency(item.unit_price, invoice.currency_code ?? 'SAR')}
                          </td>
                          <td
                            className="px-3 py-3 text-center font-mono font-black text-slate-900 dark:text-slate-100"
                            dir="ltr"
                          >
                            {formatCurrency(item.total, invoice.currency_code ?? 'SAR')}
                          </td>
                        </tr>
                      ))}

                      {(!invoice.invoice_items || invoice.invoice_items.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center font-bold text-slate-400">
                            لا توجد أصناف مسجلة في هذه الفاتورة
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Financial Breakdown */}
                <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/60 sm:flex-row">
                  {invoice.notes ? (
                    <div className="w-full max-w-md text-xs text-slate-600 dark:text-slate-300">
                      <span className="mb-0.5 block font-black text-slate-400 dark:text-slate-500">
                        ملاحظات الفاتورة:
                      </span>
                      <p className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                        {invoice.notes}
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs italic text-slate-400">لا توجد ملاحظات إضافية</div>
                  )}

                  <div className="w-full space-y-1.5 text-xs sm:w-72">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>المجموع الفرعي:</span>
                      <span dir="ltr" className="font-mono font-bold">
                        {formatCurrency(
                          invoice.subtotal ?? invoice.total_amount,
                          invoice.currency_code ?? 'SAR'
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900 dark:border-slate-700 dark:text-slate-100">
                      <span>الإجمالي النهائي:</span>
                      <span
                        dir="ltr"
                        className="font-mono text-base text-blue-600 dark:text-blue-400"
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
  );
};

export default PurchaseDetailsModal;
