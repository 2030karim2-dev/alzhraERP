import React from 'react';
import { Download, FileSpreadsheet, RotateCcw, Loader2, Share2 } from 'lucide-react';
import ShareButton from '@/ui/common/ShareButton';
import { formatCurrency as shareFmtCur } from '@/core/utils';

interface InvoiceActionButtonsProps {
  invoice: any;
  onClose: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onShareWhatsApp?: () => void;
  onToggleReturn: () => void;
  isExporting: boolean;
  issuedByName: string;
  printRef: React.RefObject<HTMLDivElement>;
}

const InvoiceActionButtons: React.FC<InvoiceActionButtonsProps> = ({
  invoice,
  onClose,
  onExportPDF,
  onExportExcel,
  onShareWhatsApp,
  onToggleReturn,
  isExporting,
  issuedByName,
  printRef
}) => {
  if (!invoice) return null;

  return (
    <div className="flex gap-2 w-full">
      <button onClick={onClose} className="flex-1 py-3 text-sm font-bold bg-gray-100 dark:bg-slate-800 rounded-lg uppercase tracking-widest text-gray-600 dark:text-slate-400">إغلاق</button>
      
      {onShareWhatsApp ? (
        <button
          onClick={onShareWhatsApp}
          disabled={isExporting}
          className="flex-1 py-3 text-sm font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-colors border border-emerald-200 dark:border-emerald-800/50"
        >
          {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
          مشاركة الإكسل
        </button>
      ) : (
        <ShareButton
          size="md"
          showLabel
          elementRef={printRef as any}
          title={`مشاركة فاتورة #${invoice.invoice_number}`}
          eventType="sale_invoice"
          message={`🧾 فاتورة بيع #${invoice.invoice_number}\n━━━━━━━━━━━━━━\n👤 العميل: ${invoice.parties?.name || 'عميل نقدي'}\n💰 الإجمالي: ${shareFmtCur(invoice.total_amount || 0, invoice.currency_code || 'SAR')}\n📅 التاريخ: ${invoice.issue_date}\n📦 عدد الأصناف: ${invoice.invoice_items?.length || 0}\n👨‍💼 صدرت بواسطة: ${issuedByName}`}
        />
      )}
      <button
        onClick={onExportExcel}
        className="flex-1 py-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-colors"
      >
        <FileSpreadsheet size={18} />
        Excel
      </button>
      <button
        onClick={onExportPDF}
        disabled={isExporting}
        className="flex-[2] py-3 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-colors"
      >
        {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
        تصدير PDF
      </button>
      <button
        onClick={onToggleReturn}
        className="flex-1 py-3 text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-colors"
        disabled={invoice.type === 'return_sale'}
      >
        <RotateCcw size={18} />
        {invoice.type === 'return_sale' ? 'مرتجع' : 'إرجاع'}
      </button>
    </div>
  );
};

export default InvoiceActionButtons;
