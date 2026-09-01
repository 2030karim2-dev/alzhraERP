import { logger } from '../../../../core/utils/logger';
import React, { useState } from 'react';
import {
  FileText,
  Loader2,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import Modal from '@/ui/base/Modal';
import { exportToPDF } from '@/core/utils/pdfExporter';
import { exportInvoiceToExcel } from '@/core/utils/invoiceExcelExporter';
import PrintableInvoice from '../PrintableInvoice';
import { useInvoiceDetails } from '../../hooks/index';
import type { InvoiceDetailItem } from '../../api';
import { useCompany } from '@/features/settings/hooks';
import { useAuthStore } from '@/features/auth/store';
import { useInvoicePaymentStatus } from '../../hooks/useInvoicePaymentStatus';
import ReturnWizard from './ReturnWizard';
import type { Invoice, InvoiceItem } from '../../../returns/types';
import InvoiceItemsTable from './InvoiceItemsTable';
import InvoiceActionButtons from './InvoiceActionButtons';
import { ErrorBoundary } from '@/core/components/ErrorBoundary';
import { formatCurrency, cn } from '@/core/utils';

interface Props {
  invoiceId: string | null;
  onClose: () => void;
  onReturn?: (invoice: Invoice, items: InvoiceItem[]) => void;
}

const InvoiceDetailsModal: React.FC<Props> = ({ invoiceId, onClose, onReturn }) => {
  const { data: invoice, isLoading } = useInvoiceDetails(invoiceId);
  const { data: company } = useCompany();
  const { user } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const [showReturnSection, setShowReturnSection] = useState(false);
  const [showAlert, setShowAlert] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'preview'>('details');

  const printRef = React.useRef<HTMLDivElement>(null);
  const paymentInfo = useInvoicePaymentStatus(invoice);

  const issuedByName = user?.full_name || user?.email || 'غير محدد';

  const handleExportPDF = async () => {
    if (!printRef.current || !invoice) return;
    setIsExporting(true);
    try {
      await exportToPDF(printRef.current, `فاتورة-${invoice.invoice_number}`);
      setShowAlert({ type: 'success', message: 'تم تصدير الفاتورة بنجاح' });
    } catch {
      setShowAlert({ type: 'error', message: 'فشل في تصدير الفاتورة' });
    } finally {
      setIsExporting(false);
      setTimeout(() => setShowAlert(null), 3000);
    }
  };

  const handleExportExcel = async () => {
    if (!invoice || !company) return;
    const comp = company as Record<string, unknown>;
    const companyName = (comp?.name_ar ||
      comp?.name ||
      (comp as { company_name?: string }).company_name ||
      'الشركة') as string;
    await exportInvoiceToExcel({
      companyName,
      companyAddress: (comp?.address || '') as string,
      taxNumber: (comp?.tax_number || '') as string,
      invoiceNumber: invoice.invoice_number || '',
      issueDate: invoice.issue_date,
      customerName: invoice.parties?.name || 'عميل نقدي',
      issuedBy: issuedByName,
      items: (invoice.invoice_items || []).map((i: InvoiceDetailItem) => ({
        name: i.description || i.name || '---',
        quantity: i.quantity,
        unitPrice: i.unit_price,
        total: i.total,
      })),
      subtotal:
        ((invoice as Record<string, unknown>).subtotal as number) ||
        invoice.total_amount - (((invoice as Record<string, unknown>).tax_amount as number) || 0),
      totalAmount: invoice.total_amount,
    });
    setShowAlert({ type: 'success', message: 'تم تصدير ملف Excel بنجاح' });
    setTimeout(() => setShowAlert(null), 3000);
  };

  const handleReturnSubmit = (invoiceData: Invoice, items: InvoiceItem[]) => {
    if (onReturn) {
      onReturn(invoiceData, items);
      setTimeout(() => setShowAlert(null), 3000);
      setShowReturnSection(false);
    }
  };

  const handleAlert = (alertOptions: {
    type: 'success' | 'warning' | 'error';
    message: string;
  }) => {
    setShowAlert(alertOptions);
    if (alertOptions.type !== 'success') {
      setTimeout(() => setShowAlert(null), 3000);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!invoice) return;
    setIsExporting(true);
    try {
      const { generateInvoiceExcelBlob, exportInvoiceToExcel } =
        await import('../../../../core/utils/invoiceExcelExporter');
      const { shareSpreadsheet } = await import('../../../../core/utils/shareUtils');
      const comp = (company || {}) as Record<string, unknown>;
      const companyName = (comp?.name_ar ||
        comp?.name ||
        (comp as { company_name?: string }).company_name ||
        'الشركة') as string;
      const data = {
        companyName,
        companyAddress: (comp?.address || '') as string,
        taxNumber: (comp?.tax_number || '') as string,
        invoiceNumber: invoice.invoice_number || '',
        issueDate: invoice.issue_date,
        customerName: invoice.parties?.name || 'عميل نقدي',
        issuedBy: issuedByName,
        items: (invoice.invoice_items || []).map((i: InvoiceDetailItem) => ({
          name: i.description || i.name || '---',
          quantity: i.quantity,
          unitPrice: i.unit_price,
          total: i.total,
        })),
        subtotal:
          ((invoice as Record<string, unknown>).subtotal as number) ||
          invoice.total_amount - (((invoice as Record<string, unknown>).tax_amount as number) || 0),
        totalAmount: invoice.total_amount,
      };

      const blob = await generateInvoiceExcelBlob(data);
      await shareSpreadsheet({
        blob,
        fileName: `فاتورة_${data.invoiceNumber}.xlsx`,
        shareTitle: `فاتورة ${data.invoiceNumber}`,
        shareText: `مرفق فاتورة رقم ${data.invoiceNumber}`,
        fallbackText: `مرفق فاتورة رقم ${data.invoiceNumber}. يرجى الاطلاع على الملف المرفق.`,
        onDownloadFallback: () => exportInvoiceToExcel(data),
      });
    } catch (err) {
      logger.error('InvoiceDetailsModal', 'Share via WhatsApp failed', err);
      setShowAlert({ type: 'error', message: 'حدث خطأ أثناء المشاركة' });
    } finally {
      setIsExporting(false);
    }
  };

  // Prepare full data for PrintableInvoice
  const fullInvoiceData =
    invoice && company
      ? {
          ...invoice,
          company,
          party_name: invoice.parties?.name,
          issuedBy: issuedByName,
          items: (invoice.invoice_items || []).map((i: InvoiceDetailItem) => ({
            ...i,
            name: i.description,
            price: i.unit_price,
          })),
        }
      : null;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          label: 'مدفوع بالكامل',
          cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'posted':
        return {
          label: 'مرحّل',
          cls: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'partial':
      case 'partially_paid':
        return {
          label: 'مدفوع جزئياً',
          cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      default:
        return {
          label: 'مسودة',
          cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  return (
    <Modal
      isOpen={!!invoiceId}
      onClose={onClose}
      icon={FileText}
      title={invoice ? `فاتورة #${invoice.invoice_number || ''}` : 'تفاصيل الفاتورة'}
      description="عرض تفصيلي لبيانات ومنتجات الفاتورة"
      size="4xl"
      footer={
        <InvoiceActionButtons
          invoice={invoice}
          onClose={onClose}
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
          onShare={handleShareWhatsApp}
          onToggleReturn={() => setShowReturnSection(!showReturnSection)}
          isExporting={isExporting}
          issuedByName={issuedByName}
          printRef={printRef as React.RefObject<HTMLDivElement>}
        />
      }
    >
      <ErrorBoundary inline>
        {showAlert && (
          <div
            className={cn(
              'mb-3 flex items-center gap-2 rounded-lg p-2.5 text-xs font-bold',
              showAlert.type === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : showAlert.type === 'warning'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            )}
          >
            {showAlert.type === 'success' && <CheckCircle size={16} />}
            {showAlert.type === 'warning' && <AlertTriangle size={16} />}
            {showAlert.type === 'error' && <AlertTriangle size={16} />}
            <span>{showAlert.message}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 p-16 text-center">
            <Loader2 className="animate-spin text-blue-500" size={28} />
            <span className="text-xs font-bold text-slate-400">جاري تحميل بيانات الفاتورة...</span>
          </div>
        ) : invoice ? (
          <div className="space-y-3 p-1 sm:p-2">
            {/* Top Compact Tab Switcher */}
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={cn(
                  'flex-1 rounded-md py-1.5 transition-all',
                  activeTab === 'details'
                    ? 'bg-white font-black text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                تفاصيل البنود والمنتجات
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'flex-1 rounded-md py-1.5 transition-all',
                  activeTab === 'preview'
                    ? 'bg-white font-black text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                معاينة الطباعة
              </button>
            </div>

            {activeTab === 'details' ? (
              <>
                {/* Unified High-Density Info Cards Strip */}
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  {/* Customer */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                      <User size={13} className="text-blue-500" />
                      <span className="text-[10px] font-bold uppercase">العميل</span>
                    </div>
                    <p
                      className="truncate font-bold text-slate-800 dark:text-slate-100"
                      title={invoice.parties?.name || 'عميل نقدي'}
                    >
                      {invoice.parties?.name || 'عميل نقدي'}
                    </p>
                    {invoice.parties?.phone && (
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                        {invoice.parties.phone}
                      </p>
                    )}
                  </div>

                  {/* Date & Invoice # */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                      <Calendar size={13} className="text-purple-500" />
                      <span className="text-[10px] font-bold uppercase">التاريخ والرقم</span>
                    </div>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {invoice.issue_date}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      #{invoice.invoice_number}
                    </p>
                  </div>

                  {/* Payment & Status */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                      <CreditCard size={13} className="text-amber-500" />
                      <span className="text-[10px] font-bold uppercase">الحالة والدفع</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      <span
                        className={cn(
                          'py-0.2 rounded border px-1.5 text-[10px] font-bold',
                          statusBadge(invoice.status).cls
                        )}
                      >
                        {statusBadge(invoice.status).label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {invoice.payment_method === 'credit' ? 'آجل' : 'نقداً'}
                      </span>
                    </div>
                  </div>

                  {/* Amount Summary */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-2.5 dark:border-blue-900/60 dark:bg-blue-950/30">
                    <div className="mb-1 flex items-center gap-1.5 text-blue-500">
                      <DollarSign size={13} />
                      <span className="text-[10px] font-bold uppercase">المبلغ الإجمالي</span>
                    </div>
                    <p className="font-mono text-sm font-black text-blue-700 dark:text-blue-300">
                      {formatCurrency(invoice.total_amount, invoice.currency_code || 'SAR')}
                    </p>
                    {paymentInfo && paymentInfo.remaining > 0 && (
                      <p className="mt-0.5 font-mono text-[10px] font-bold text-rose-600">
                        متبقي:{' '}
                        {formatCurrency(paymentInfo.remaining, invoice.currency_code || 'SAR')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Return Banner (if return active) */}
                {showReturnSection && (
                  <div className="animate-in slide-in-from-top-2 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-900/20">
                    <div className="mb-1 flex items-center gap-2 text-rose-700 dark:text-rose-400">
                      <RotateCcw size={16} />
                      <h3 className="text-xs font-bold">إرجاع جزئي / كلي بنفس سعر الفاتورة</h3>
                    </div>
                    <p className="text-[11px] text-rose-600 dark:text-rose-300">
                      اختر الأصناف والكميات المراد إرجاعها للمخزون واسترداد قيمتها.
                    </p>
                  </div>
                )}

                {/* Invoice Items & Products */}
                {showReturnSection ? (
                  <ReturnWizard
                    invoice={invoice as unknown as Invoice}
                    onReturn={handleReturnSubmit}
                    onCancel={() => setShowReturnSection(false)}
                    onAlert={handleAlert}
                  />
                ) : (
                  <InvoiceItemsTable invoice={invoice} />
                )}
              </>
            ) : (
              <div className="custom-scrollbar flex max-h-[60vh] justify-center overflow-auto rounded-xl bg-slate-200 p-3 dark:bg-slate-900">
                <div className="w-full max-w-3xl shrink-0 border border-slate-300 bg-white shadow-lg">
                  <PrintableInvoice invoice={fullInvoiceData} />
                </div>
              </div>
            )}

            <div style={{ display: 'none' }}>
              <div ref={printRef} className="print-only">
                <PrintableInvoice invoice={fullInvoiceData} />
              </div>
            </div>
          </div>
        ) : null}
      </ErrorBoundary>
    </Modal>
  );
};

export default InvoiceDetailsModal;
