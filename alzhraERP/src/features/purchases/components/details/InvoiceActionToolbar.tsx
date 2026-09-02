import React from 'react';
import { RotateCcw, Printer, Download, Share2 } from 'lucide-react';

interface InvoiceActionToolbarProps {
  invoiceExists: boolean;
  isReturn: boolean;
  isLoading: boolean;
  isExporting: boolean;
  onReturnClick: () => void;
  onPrint: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onShareWhatsApp: () => void;
  onClose: () => void;
}

interface ExportButtonsProps {
  invoiceExists: boolean;
  isLoading: boolean;
  isExporting: boolean;
  onPrint: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onShareWhatsApp: () => void;
}

interface PrintButtonProps {
  disabled: boolean;
  onPrint: () => void;
}

const PrintButton: React.FC<PrintButtonProps> = ({ disabled, onPrint }) => (
  <button
    type="button"
    onClick={onPrint}
    disabled={disabled}
    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:px-3.5 sm:py-2 sm:text-xs"
  >
    <Printer size={13} />
    <span>طباعة</span>
  </button>
);

const ExportButtonsGroup: React.FC<ExportButtonsProps> = ({
  invoiceExists,
  isLoading,
  isExporting,
  onPrint,
  onExportPDF,
  onExportExcel,
  onShareWhatsApp,
}) => {
  const isActionDisabled = isExporting || isLoading || !invoiceExists;

  return (
    <>
      <PrintButton disabled={isLoading || !invoiceExists} onPrint={onPrint} />

      <button
        type="button"
        onClick={onExportPDF}
        disabled={isActionDisabled}
        className="flex items-center gap-1 rounded-xl border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-[11px] font-bold text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60 sm:px-3.5 sm:py-2 sm:text-xs"
      >
        <Download size={13} />
        <span>PDF</span>
      </button>

      <button
        type="button"
        onClick={onExportExcel}
        disabled={isActionDisabled}
        className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 sm:px-3.5 sm:py-2 sm:text-xs"
      >
        <Share2 size={13} />
        <span>Excel</span>
      </button>

      <button
        type="button"
        onClick={onShareWhatsApp}
        disabled={isActionDisabled}
        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 disabled:opacity-50 sm:px-3.5 sm:py-2 sm:text-xs"
      >
        <span>واتساب</span>
      </button>
    </>
  );
};

export const InvoiceActionToolbar: React.FC<InvoiceActionToolbarProps> = ({
  invoiceExists,
  isReturn,
  isLoading,
  isExporting,
  onReturnClick,
  onPrint,
  onExportPDF,
  onExportExcel,
  onShareWhatsApp,
  onClose,
}) => {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        {invoiceExists && !isReturn && (
          <button
            type="button"
            onClick={onReturnClick}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-3 py-1.5 text-[11px] font-black text-white shadow-md shadow-rose-500/20 transition-all hover:from-rose-700 hover:to-amber-700 active:scale-95 sm:px-4 sm:py-2.5 sm:text-xs"
          >
            <RotateCcw size={13} />
            <span>إرجاع الفاتورة</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <ExportButtonsGroup
          invoiceExists={invoiceExists}
          isLoading={isLoading}
          isExporting={isExporting}
          onPrint={onPrint}
          onExportPDF={onExportPDF}
          onExportExcel={onExportExcel}
          onShareWhatsApp={onShareWhatsApp}
        />

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:px-5 sm:py-2 sm:text-xs"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
};
