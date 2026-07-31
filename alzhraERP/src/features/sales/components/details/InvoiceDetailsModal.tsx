
import React, { useState } from 'react';
import { FileText, Loader2, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import Modal from '@/ui/base/Modal';
import { exportToPDF } from '@/core/utils/pdfExporter';
import { exportInvoiceToExcel } from '@/core/utils/invoiceExcelExporter';
import PrintableInvoice from '../PrintableInvoice';
import { useInvoiceDetails } from '../../hooks/index';
import { useCompany } from '@/features/settings/hooks';
import { useAuthStore } from '@/features/auth/store';
import { useInvoicePaymentStatus } from '../../hooks/useInvoicePaymentStatus';
import InvoiceHealthBadge from './InvoiceHealthBadge';
import ReturnWizard from './ReturnWizard';
import InvoiceItemsTable from './InvoiceItemsTable';
import CompanyInfoSection from './CompanyInfoSection';
import CustomerInfoSection from './CustomerInfoSection';
import PaymentInfoSection from './PaymentInfoSection';
import InvoiceActionButtons from './InvoiceActionButtons';
import { ErrorBoundary } from '@/core/components/ErrorBoundary';

interface Props {
  invoiceId: string | null;
  onClose: () => void;
  onReturn?: (invoice: any, items: any[]) => void;
}

const InvoiceDetailsModal: React.FC<Props> = ({ invoiceId, onClose, onReturn }) => {
  const { data: invoice, isLoading } = useInvoiceDetails(invoiceId);
  const { data: company } = useCompany();
  const { user } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const [showReturnSection, setShowReturnSection] = useState(false);
  const [showAlert, setShowAlert] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  const printRef = React.useRef<HTMLDivElement>(null);
  const paymentInfo = useInvoicePaymentStatus(invoice);

  const issuedByName = user?.full_name || user?.email || 'غير محدد';

  const handleExportPDF = async () => {
    if (!printRef.current || !invoice) return;
    setIsExporting(true);
    try {
      await exportToPDF(printRef.current, `فاتورة-${invoice.invoice_number}`);
      setShowAlert({ type: 'success', message: 'تم تصدير الفاتورة بنجاح' });
    } catch (error) {
      setShowAlert({ type: 'error', message: 'فشل في تصدير الفاتورة' });
    } finally {
      setIsExporting(false);
      setTimeout(() => setShowAlert(null), 3000);
    }
  };

  const handleExportExcel = () => {
    if (!invoice || !company) return;
    const comp = company as Record<string, unknown>;
    exportInvoiceToExcel({
      companyName: (comp?.name || comp?.name_ar || 'الزهراء سمارت') as string,
      companyAddress: (comp?.address || '') as string,
      taxNumber: (comp?.tax_number || '') as string,
      invoiceNumber: invoice.invoice_number || '',
      issueDate: invoice.issue_date,
      customerName: (invoice.parties as any)?.name || 'عميل نقدي',
      issuedBy: issuedByName,
      items: (invoice.invoice_items || []).map((i: any) => ({
        name: i.description || i.name || '---',
        quantity: i.quantity,
        unitPrice: i.unit_price,
        total: i.total,
      })),
      subtotal: (invoice as Record<string, unknown>).subtotal as number || (invoice.total_amount - ((invoice as Record<string, unknown>).tax_amount as number || 0)),
      totalAmount: invoice.total_amount,
    });
    setShowAlert({ type: 'success', message: 'تم تصدير ملف Excel بنجاح' });
    setTimeout(() => setShowAlert(null), 3000);
  };

  const handleReturnSubmit = (invoiceData: any, items: any[]) => {
    if (onReturn) {
      onReturn(invoiceData, items);
      setTimeout(() => setShowAlert(null), 3000);
      setShowReturnSection(false);
    }
  };

  const handleAlert = (alertOptions: { type: 'success' | 'warning' | 'error'; message: string }) => {
    setShowAlert(alertOptions);
    if (alertOptions.type !== 'success') {
       setTimeout(() => setShowAlert(null), 3000);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!invoice) return;
    setIsExporting(true);
    try {
      const { generateInvoiceExcelBlob, exportInvoiceToExcel } = await import('../../../../core/utils/invoiceExcelExporter');
      const comp = company || { name: 'الزهراء لقطع الغيار' };
      const data = {
        companyName: (comp?.name || 'الزهراء لقطع الغيار') as string,
        companyAddress: (comp?.address || '') as string,
        taxNumber: (comp?.tax_number || '') as string,
        invoiceNumber: invoice.invoice_number || '',
        issueDate: invoice.issue_date,
        customerName: (invoice.parties as any)?.name || 'عميل نقدي',
        issuedBy: issuedByName,
        items: (invoice.invoice_items || []).map((i: any) => ({
          name: i.description || i.name || '---',
          quantity: i.quantity,
          unitPrice: i.unit_price,
          total: i.total,
        })),
        subtotal: (invoice as Record<string, unknown>).subtotal as number || (invoice.total_amount - ((invoice as Record<string, unknown>).tax_amount as number || 0)),
        totalAmount: invoice.total_amount,
      };

      const blob = generateInvoiceExcelBlob(data);
      const file = new File([blob], `فاتورة_${data.invoiceNumber}.xlsx`, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `فاتورة ${data.invoiceNumber}`,
          text: `مرفق فاتورة رقم ${data.invoiceNumber}`
        });
      } else {
        // Fallback
        exportInvoiceToExcel(data);
        const text = encodeURIComponent(`مرفق فاتورة رقم ${data.invoiceNumber}. يرجى الاطلاع على الملف المرفق.`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }
    } catch (err) {
      console.error('Share via WhatsApp failed', err);
      setShowAlert({ type: 'error', message: 'حدث خطأ أثناء المشاركة' });
    } finally {
      setIsExporting(false);
    }
  };

  // Prepare full data for PrintableInvoice
  const fullInvoiceData = invoice && company ? {
    ...invoice,
    company,
    party_name: invoice.parties?.name,
    issuedBy: issuedByName,
    items: invoice.invoice_items.map((i: any) => ({
      ...i,
      name: i.description,
      price: i.unit_price
    }))
  } : null;

  return (
    <Modal
      isOpen={!!invoiceId}
      onClose={onClose}
      icon={FileText}
      title="تفاصيل الفاتورة"
      description="عرض تفصيلي لعملية البيع المسجلة"
      size="4xl"
      footer={
        <InvoiceActionButtons
          invoice={invoice}
          onClose={onClose}
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
          onShareWhatsApp={handleShareWhatsApp}
          onToggleReturn={() => setShowReturnSection(!showReturnSection)}
          isExporting={isExporting}
          issuedByName={issuedByName}
          printRef={printRef as any}
        />
      }
    >
      <ErrorBoundary inline>
        {showAlert && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${showAlert.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
            showAlert.type === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
              'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
            {showAlert.type === 'success' && <CheckCircle size={18} />}
            {showAlert.type === 'warning' && <AlertTriangle size={18} />}
            {showAlert.type === 'error' && <AlertTriangle size={18} />}
            <span className="text-sm font-bold">{showAlert.message}</span>
          </div>
        )}

        {invoice && invoice.type !== 'return_sale' && onReturn && (
          <div className="flex justify-end px-4 mt-2">
            <button
              onClick={() => setShowReturnSection(true)}
              className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              title="بدء عملية المرتجع لهذه الفاتورة"
            >
              <RotateCcw size={16} />
              فتح واجهة المرتجع
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="p-20 text-center flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : invoice ? (
          <div className="p-4 space-y-4">
            <CompanyInfoSection company={company} user={user} />

            {showReturnSection && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 mb-2">
                  <RotateCcw size={20} />
                  <h3 className="font-bold">إرجاع جزئي - بنفس السعر</h3>
                </div>
                <p className="text-sm text-rose-600 dark:text-rose-300">
                  يمكنك اختيار أصناف وكميات محددة للإرجاع. سيتم استخدام سعر الفاتورة الأصلي.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomerInfoSection party={invoice.parties} />
              <PaymentInfoSection paymentInfo={paymentInfo} currencyCode={invoice.currency_code} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                <strong>التاريخ:</strong> {invoice.issue_date}
              </div>
              <div className="p-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                <strong>الحالة:</strong> {invoice.status}
              </div>
            </div>

            <InvoiceHealthBadge invoice={{
              number: invoice.invoice_number || '',
              total: invoice.total_amount || 0,
              itemCount: invoice.invoice_items?.length || 0,
              customerName: (invoice.parties as any)?.name || 'غير محدد',
              customerDebt: 0,
              avgInvoiceTotal: 0
            }} />

            {showReturnSection ? (
              <ReturnWizard 
                invoice={invoice} 
                onReturn={handleReturnSubmit} 
                onCancel={() => setShowReturnSection(false)}
                onAlert={handleAlert}
              />
            ) : (
              <InvoiceItemsTable invoice={invoice} />
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
