import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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

/** Number of quick-add chips shown by default before "show more" */
const CHIPS_VISIBLE_DEFAULT = 5;

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

export const QuickPartsToolbar: React.FC<QuickPartsToolbarProps> = ({
  templates,
  selectedCount,
  rowsCount,
  isImporting,
  isExporting,
  onAddFromTemplate,
  onOpenQuotation,
  onImportClick,
  onExport,
  onCopyWhatsApp,
}) => {
  const [showAllChips, setShowAllChips] = useState(false);
  const visibleTemplates = showAllChips ? templates : templates.slice(0, CHIPS_VISIBLE_DEFAULT);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">

        {/* ── Quick-add label ── */}
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
          إضافة سريعة:
        </span>

        {/* ── Quick-add chips ── */}
        {visibleTemplates.map((tmpl) => (
          <button
            key={tmpl.base}
            type="button"
            onClick={() => { onAddFromTemplate(tmpl); }}
            className="shrink-0 px-2.5 py-1 text-xs font-bold rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            + {tmpl.base}
          </button>
        ))}

        {/* ── Show more / less chips toggle ── */}
        {templates.length > CHIPS_VISIBLE_DEFAULT && (
          <button
            type="button"
            onClick={() => { setShowAllChips((v) => !v); }}
            className="shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-colors flex items-center gap-1"
          >
            {showAllChips ? (
              <><ChevronUp size={10} /> أقل</>
            ) : (
              <><ChevronDown size={10} /> +{templates.length - CHIPS_VISIBLE_DEFAULT} أكثر</>
            )}
          </button>
        )}

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* ── Pro actions (always visible, compact) ── */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenQuotation}
            disabled={selectedCount === 0}
            className="text-xs font-bold rounded-lg border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 px-2.5"
            title="إنشاء عرض أسعار من القطع المحددة"
          >
            <FileText size={13} className="ml-1 text-indigo-500" />
            عرض سعر
            {selectedCount > 0 && (
              <span className="mr-1 bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-[10px] font-bold px-1 rounded-full">
                {selectedCount}
              </span>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onImportClick}
            isLoading={isImporting}
            className="text-xs font-bold rounded-lg px-2.5"
            title="استيراد من ملف Excel أو CSV"
          >
            <Upload size={13} className="ml-1" />
            استيراد
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onExport}
            isLoading={isExporting}
            disabled={rowsCount === 0}
            className="text-xs font-bold rounded-lg border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-2.5"
            title="تصدير الجدول إلى Excel"
          >
            <Download size={13} className="ml-1 text-emerald-500" />
            Excel
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onCopyWhatsApp}
            disabled={rowsCount === 0}
            className="text-xs font-bold rounded-lg border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30 px-2.5"
            title="نسخ القطع كنص للواتساب"
          >
            <Share2 size={13} className="ml-1 text-green-500" />
            واتساب
          </Button>
        </div>
      </div>
    </div>
  );
};
