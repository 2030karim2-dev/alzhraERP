import React from 'react';
import { FileText, Upload, Download, Share2 } from 'lucide-react';
import Button from '../../../ui/base/Button';

/** A single 1-click quick part template. */
export interface QuickPartTemplate {
  base: string;
  oem: string;
  mfr: string;
  spec: string;
}

/** Pre-defined common parts for rapid 1-click addition. */
export const QUICK_PARTS_TEMPLATES: QuickPartTemplate[] = [
  { base: 'بلاكات', oem: '', mfr: 'DENSO', spec: 'طقم 4 حبات' },
  { base: 'فحمات فرامل أمامية', oem: '', mfr: 'TOYOTA', spec: 'طقم أمامي' },
  { base: 'فحمات فرامل خلفية', oem: '', mfr: 'TOYOTA', spec: 'طقم خلفي' },
  { base: 'فلتر زيت', oem: '', mfr: 'TOYOTA', spec: 'سيفون أصلي' },
  { base: 'فلتر هواء', oem: '', mfr: 'TOYOTA', spec: 'فلتر شوية' },
  { base: 'فلتر مكيف', oem: '', mfr: 'TOYOTA', spec: 'فلتر صالون' },
  { base: 'مساعدات أمامية', oem: '', mfr: 'KYB', spec: 'يمين / يسار' },
  { base: 'دينمو', oem: '', mfr: 'DENSO', spec: '12V' },
  { base: 'سلف', oem: '', mfr: 'DENSO', spec: 'أصلي' },
  { base: 'سير مكينة', oem: '', mfr: 'BANDO', spec: '6PK' },
  { base: 'طرمبة ماء', oem: '', mfr: 'AISIN', spec: 'مع الوجوه' },
];

interface QuickPartsToolbarProps {
  templates: QuickPartTemplate[];
  selectedCount: number;
  rowsCount: number;
  isImporting: boolean;
  isExporting: boolean;
  onAddFromTemplate: (tmpl: QuickPartTemplate) => void;
  onOpenQuotation: () => void;
  onImportClick: () => void;
  onExport: () => void;
  onCopyWhatsApp: () => void;
}

/* ──────────────────────────────────────────────────────────────────
   Small presentational pieces — each stays under the 50-line and
   complexity-10 ceilings enforced by the ESLint configuration.
   ────────────────────────────────────────────────────────────────── */

interface QuickTemplatesChipsProps {
  templates: QuickPartTemplate[];
  onAddFromTemplate: (tmpl: QuickPartTemplate) => void;
}

const QuickTemplatesChips: React.FC<QuickTemplatesChipsProps> = ({ templates, onAddFromTemplate }) => (
  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">إضافة سريعة:</span>
    {templates.map((tmpl) => (
      <button
        key={tmpl.base}
        type="button"
        onClick={() => {
          onAddFromTemplate(tmpl);
        }}
        className="shrink-0 px-3 py-1 text-xs font-bold rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
      >
        + {tmpl.base}
      </button>
    ))}
  </div>
);

interface ProToolsButtonsProps {
  selectedCount: number;
  rowsCount: number;
  isImporting: boolean;
  isExporting: boolean;
  onOpenQuotation: () => void;
  onImportClick: () => void;
  onExport: () => void;
  onCopyWhatsApp: () => void;
}

const ProToolsButtons: React.FC<ProToolsButtonsProps> = ({ selectedCount, rowsCount, isImporting, isExporting, onOpenQuotation, onImportClick, onExport, onCopyWhatsApp }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <Button
      size="sm"
      variant="outline"
      onClick={onOpenQuotation}
      disabled={selectedCount === 0}
      className="text-xs font-bold rounded-lg border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 shadow-sm"
      title="إنشاء عرض أسعار للعميل مباشرة من هذه القطع دون إدخالها للمخزون"
    >
      <FileText size={13} className="ml-1 text-indigo-600 dark:text-indigo-400" />
      إنشاء عرض سعر ({selectedCount})
    </Button>
    <Button
      size="sm"
      variant="outline"
      onClick={onImportClick}
      isLoading={isImporting}
      className="text-xs font-bold rounded-lg border-slate-300 dark:border-slate-700"
      title="استيراد أسطر قطع من ملف Excel أو CSV"
    >
      <Upload size={13} className="ml-1 text-slate-600 dark:text-slate-300" />
      استيراد Excel/CSV
    </Button>
    <Button
      size="sm"
      variant="outline"
      onClick={onExport}
      isLoading={isExporting}
      disabled={rowsCount === 0}
      className="text-xs font-bold rounded-lg border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
      title="تصدير جدول القطع بالكامل إلى ملف Excel منسق"
    >
      <Download size={13} className="ml-1 text-emerald-600 dark:text-emerald-400" />
      تصدير Excel
    </Button>
    <Button
      size="sm"
      variant="outline"
      onClick={onCopyWhatsApp}
      disabled={rowsCount === 0}
      className="text-xs font-bold rounded-lg border-green-300 dark:border-green-800 text-green-800 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
      title="نسخ قائمة القطع كنص منسق للواتساب أو عروض الأسعار"
    >
      <Share2 size={13} className="ml-1 text-green-600 dark:text-green-400" />
      نسخ للواتساب
    </Button>
  </div>
);

export const QuickPartsToolbar: React.FC<QuickPartsToolbarProps> = ({ templates, selectedCount, rowsCount, isImporting, isExporting, onAddFromTemplate, onOpenQuotation, onImportClick, onExport, onCopyWhatsApp }) => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <QuickTemplatesChips templates={templates} onAddFromTemplate={onAddFromTemplate} />
    <ProToolsButtons selectedCount={selectedCount} rowsCount={rowsCount} isImporting={isImporting} isExporting={isExporting} onOpenQuotation={onOpenQuotation} onImportClick={onImportClick} onExport={onExport} onCopyWhatsApp={onCopyWhatsApp} />
  </div>
);
