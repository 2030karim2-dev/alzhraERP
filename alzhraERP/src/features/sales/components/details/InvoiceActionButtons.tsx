import React from 'react';
import { Download, FileSpreadsheet, RotateCcw, Loader2, Share2, X } from 'lucide-react';
import type { InvoiceWithDetails } from '../../api';

interface InvoiceActionButtonsProps {
  invoice: InvoiceWithDetails | null | undefined;
  onClose: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onShare?: (() => void) | undefined;
  onToggleReturn: () => void;
  isExporting: boolean;
  issuedByName: string;
  printRef: React.RefObject<HTMLDivElement>;
}

interface ExportGroupProps {
  onExportPDF: () => void;
  onExportExcel: () => void;
  onShare?: (() => void) | undefined;
  isExporting: boolean;
}

const ExportGroup: React.FC<ExportGroupProps> = ({
  onExportPDF,
  onExportExcel,
  onShare,
  isExporting,
}) => (
  <div className="flex flex-1 flex-wrap items-center gap-1 sm:gap-1.5">
    {onShare !== undefined && (
      <button
        type="button"
        onClick={onShare}
        disabled={isExporting}
        className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-700 shadow-xs transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 sm:flex-none"
        title="مشاركة عبر واتساب"
      >
        {isExporting ? <Loader2 className="animate-spin" size={14} /> : <Share2 size={14} />}
        <span>مشاركة</span>
      </button>
    )}

    <button
      type="button"
      onClick={onExportExcel}
      disabled={isExporting}
      className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-emerald-300/80 bg-emerald-600 px-2.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-500 disabled:opacity-50 sm:flex-none"
      title="تصدير إلى Excel"
    >
      <FileSpreadsheet size={14} />
      <span>Excel</span>
    </button>

    <button
      type="button"
      onClick={onExportPDF}
      disabled={isExporting}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-md shadow-blue-500/20 transition-colors hover:bg-blue-500 disabled:opacity-50 sm:flex-none"
      title="تصدير ملف PDF"
    >
      {isExporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
      <span>PDF</span>
    </button>
  </div>
);

const ReturnButton: React.FC<{ isReturn: boolean; onToggleReturn: () => void }> = ({
  isReturn,
  onToggleReturn,
}) => (
  <button
    type="button"
    onClick={onToggleReturn}
    disabled={isReturn}
    className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-bold text-rose-700 shadow-xs transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50 sm:flex-none"
  >
    <RotateCcw size={14} />
    <span>{isReturn ? 'مرتجع' : 'إرجاع'}</span>
  </button>
);

const InvoiceActionButtons: React.FC<InvoiceActionButtonsProps> = ({
  invoice,
  onClose,
  onExportPDF,
  onExportExcel,
  onShare,
  onToggleReturn,
  isExporting,
}) => {
  if (!invoice) return null;

  const isReturn = invoice.type === 'sale_return';

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-1.5 sm:gap-2">
      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <X size={14} />
          <span>إغلاق</span>
        </button>

        <ReturnButton isReturn={isReturn} onToggleReturn={onToggleReturn} />
      </div>

      <ExportGroup
        onExportPDF={onExportPDF}
        onExportExcel={onExportExcel}
        onShare={onShare}
        isExporting={isExporting}
      />
    </div>
  );
};

export default InvoiceActionButtons;
