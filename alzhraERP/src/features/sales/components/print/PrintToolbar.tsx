import React from 'react';
import { Printer, LayoutTemplate, Palette, QrCode, Download } from 'lucide-react';
import type { HeaderLayoutMode } from './PrintDocumentHeader';

interface PrintToolbarProps {
  layoutMode: HeaderLayoutMode;
  onChangeLayout: (mode: HeaderLayoutMode) => void;
  accentColor: string;
  onChangeAccentColor: (color: string) => void;
  showQrCode: boolean;
  onToggleQrCode: () => void;
  onPrint: () => void;
  onExportPDF?: (() => void) | undefined;
  isExporting?: boolean | undefined;
}

const ACCENT_COLORS = [
  { label: 'كحلي ملكي', value: '#1F4E78' },
  { label: 'فاحم كلاسيكي', value: '#0f172a' },
  { label: 'زمردي رسمي', value: '#047857' },
  { label: 'نيلي أنيق', value: '#312e81' },
];

export const PrintToolbar: React.FC<PrintToolbarProps> = ({
  layoutMode,
  onChangeLayout,
  accentColor,
  onChangeAccentColor,
  showQrCode,
  onToggleQrCode,
  onPrint,
  onExportPDF,
  isExporting = false,
}) => {
  return (
    <aside
      aria-label="خيارات وأدوات الطباعة"
      className="no-print shadow-2xs mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50/90 p-2.5 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/90"
      dir="rtl"
    >
      {/* Left / Config Options */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Layout Selector */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-700">
          <LayoutTemplate size={14} className="text-slate-500 dark:text-slate-400" />
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
            الترويسة:
          </span>
          <select
            value={layoutMode}
            onChange={e => onChangeLayout(e.target.value as HeaderLayoutMode)}
            className="bg-transparent text-xs font-semibold text-slate-800 outline-none dark:text-slate-100"
          >
            <option value="modern-centered">عصري مركزي</option>
            <option value="classic-split">كلاسيكي متناظر</option>
            <option value="full-banner">بانر صوري كامل</option>
          </select>
        </div>

        {/* Accent Color Picker */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-700">
          <Palette size={14} className="text-slate-500 dark:text-slate-400" />
          <div className="mr-1 flex items-center gap-1">
            {ACCENT_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => onChangeAccentColor(c.value)}
                className={`h-4 w-4 rounded-full transition-transform ${
                  accentColor === c.value
                    ? 'scale-125 ring-2 ring-blue-500 ring-offset-1'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* QR Toggle */}
        <button
          type="button"
          onClick={onToggleQrCode}
          className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold transition-colors ${
            showQrCode
              ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'border-slate-200 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400'
          }`}
          title="إظهار أو إخفاء رمز الاستجابة السريعة (QR)"
        >
          <QrCode size={13} />
          <span>رمز QR</span>
        </button>
      </div>

      {/* Right / Actions */}
      <div className="flex items-center gap-2">
        {onExportPDF && (
          <button
            type="button"
            onClick={onExportPDF}
            disabled={isExporting}
            className="shadow-2xs flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            <Download size={13} />
            <span>{isExporting ? 'جاري التصدير...' : 'تحميل PDF'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onPrint}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-black text-white shadow-xs transition-all hover:bg-blue-500 active:scale-95"
        >
          <Printer size={14} />
          <span>طباعة المستند</span>
        </button>
      </div>
    </aside>
  );
};
