import React, { useRef, useState, useMemo } from 'react';
import { FileText, Printer, Loader2, Building2, Table as TableIcon } from 'lucide-react';
import Modal from '@/ui/base/Modal';
import { usePurchaseDetails } from '../hooks';
import { cn } from '../../../core/utils';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../../features/auth';
import { useFeedbackStore } from '../../../features/feedback/store';
import { useCompany } from '../../settings/hooks';
import PurchaseInvoicePrintTemplate, {
  type PurchasePrintItem,
} from './PurchaseInvoicePrintTemplate';
import { exportToPDF } from '../../../core/utils/pdfExporter';
import {
  exportInvoiceToExcel,
  generateInvoiceExcelBlob,
} from '../../../core/utils/invoiceExcelExporter';
import { shareSpreadsheet } from '../../../core/utils/shareUtils';
import { AdvancedReturnModal } from '../../returns/components/AdvancedReturnModal';
import { logger } from '../../../core/utils/logger';
import { InvoiceMetaCards, type PurchaseDetailInvoice } from './details/InvoiceMetaCards';
import { InvoiceItemsTable } from './details/InvoiceItemsTable';
import { InvoiceActionToolbar } from './details/InvoiceActionToolbar';

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
    setTimeout(() => {
      setCopiedSku(null);
    }, 2000);
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

      await shareSpreadsheet({
        blob,
        fileName: `فاتورة_شراء_${invoiceNumber}.xlsx`,
        shareTitle: `فاتورة مشتريات #${invoiceNumber}`,
        shareText: `مرفق فاتورة مشتريات رقم #${invoiceNumber} من ${companyName}`,
        fallbackText: `فاتورة مشتريات #${invoiceNumber} من ${companyName}\nالمورد: ${invoice.party?.name ?? 'مورد عام'}`,
        onDownloadFallback: () =>
          exportInvoiceToExcel({
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
          }),
      });
      showToast('تمت مشاركة الفاتورة بنجاح', 'success');
    } catch (error) {
      logger.error('PurchaseDetailsModal', 'Share WhatsApp failed', error);
      showToast('فشل في مشاركة الفاتورة عبر واتساب', 'error');
    } finally {
      setIsExporting(false);
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
        item.product?.name_ar?.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.product?.sku?.toLowerCase().includes(q)
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
          <InvoiceActionToolbar
            invoiceExists={Boolean(invoice)}
            isReturn={isReturn}
            isLoading={isLoading}
            isExporting={isExporting}
            onReturnClick={() => {
              if (invoice) {
                if (onReturn) {
                  onReturn(invoice.id, invoice.invoice_items ?? []);
                } else {
                  setIsReturnModalOpen(true);
                }
              }
            }}
            onPrint={handlePrint}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onShareWhatsApp={handleShareWhatsApp}
            onClose={onClose}
          />
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
                <span className="hidden sm:inline">جدول بيانات الأصناف (Excel Sheet View)</span>
                <span className="sm:hidden">بيانات الأصناف</span>
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
                <span className="hidden sm:inline">معاينة قالب الطباعة الرسمي (A4)</span>
                <span className="sm:hidden">قالب الطباعة</span>
              </button>
            </div>

            {activeTab === 'details' ? (
              <>
                <InvoiceMetaCards invoice={invoice} totalUnitsCount={totalUnitsCount} />

                <InvoiceItemsTable
                  invoice={invoice}
                  filteredItems={filteredItems}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  copiedSku={copiedSku}
                  onCopySku={handleCopySku}
                  totalUnitsCount={totalUnitsCount}
                  totalLinesAmount={totalLinesAmount}
                />
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
