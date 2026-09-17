import React, { useMemo, useState } from 'react';
import { Sparkles, Clipboard, Trash2, CheckCircle2, Zap } from 'lucide-react';
import {
  parseCatalogVehicleText,
  type ExtractedCatalogVehicle,
} from '../../../utils/catalogTextExtractor';
import type { ManualVehicleFieldsProps } from './types';
import { buildDraftPatch } from './catalogPatch';

interface CatalogChip {
  label: string;
  value: string;
  strongClass: string;
}

/** يبني شارات الاستخلاص من الحقول الحاضرة فقط (بديل سلسلة الشروط المتداخلة). */
function buildCatalogChips(data: ExtractedCatalogVehicle): CatalogChip[] {
  const candidates: Array<[string, string | null | undefined, string]> = [
    ['الشاصي', data.vin, 'text-emerald-600 dark:text-emerald-400'],
    ['الماركة', data.makeAr ?? data.make ?? null, 'text-blue-600 dark:text-blue-400'],
    ['الموديل', data.model, 'text-purple-600 dark:text-purple-400'],
    ['كود الموديل', data.modelCode, 'text-amber-600 dark:text-amber-400'],
    ['المحرك', data.engine, 'text-teal-600 dark:text-teal-400'],
    ['السنة', data.year, 'text-slate-900 dark:text-white'],
    ['فترة الإنتاج', data.productionRange, 'text-slate-700 dark:text-slate-300'],
    ['كود اللون', data.colorCode, 'text-pink-600 dark:text-pink-400'],
    ['كود الفرش', data.trimCode, 'text-cyan-600 dark:text-cyan-400'],
    ['الفئة', data.grade, 'text-indigo-600 dark:text-indigo-400'],
    ['السوق', data.market, 'text-indigo-600 dark:text-indigo-400'],
  ];
  return candidates.flatMap(([label, value, strongClass]) =>
    typeof value === 'string' && value.length > 0 ? [{ label, value, strongClass }] : []
  );
}

const CHIP_CLASS =
  'rounded-md border border-slate-300 bg-white px-2 py-0.5 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';

function Chip({ chip }: { chip: CatalogChip }): React.ReactElement {
  return (
    <span className={CHIP_CLASS}>
      {chip.label}: <strong className={chip.strongClass}>{chip.value}</strong>
    </span>
  );
}

function CatalogToolbar({
  onPaste,
  onClear,
  hasText,
}: {
  onPaste: () => void;
  onClear: () => void;
  hasText: boolean;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white shadow-xs">
          <Sparkles size={13} />
        </div>
        <div>
          <h4 className="text-xs font-black text-slate-900 dark:text-white">
            المستخرج الذكي لبيانات الكتالوجات (PartSouq / EPC AI Parser)
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            الصق نص الكتالوج الخام أو الرابط ليتم تنظيفه واستخلاص مواصفات المركبة فوراً
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPaste}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs transition-all hover:bg-blue-500"
          title="لصق المحتوى من الحافظة وتحليله مباشرة"
        >
          <Clipboard size={12} />
          <span>لصق واستخراج تلقائي</span>
        </button>

        {hasText && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg p-1 text-slate-400 transition-all hover:bg-slate-200 hover:text-rose-500 dark:hover:bg-slate-800 dark:hover:text-rose-400"
            title="مسح النص"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function ExtractionPanel({
  extractedData,
  onApply,
}: {
  extractedData: ExtractedCatalogVehicle;
  onApply: () => void;
}): React.ReactElement {
  return (
    <div className="mt-2 space-y-2 rounded-xl border border-emerald-300 bg-emerald-50/80 p-2 text-right dark:border-emerald-800/60 dark:bg-emerald-950/30">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-1.5 dark:border-emerald-800/40">
        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-400">
          <CheckCircle2 size={13} />
          <span>
            تم استخلاص {extractedData.extractedFieldsCount} مواصفات بنجاح (دقة{' '}
            {extractedData.confidenceScore}%)
          </span>
        </span>

        <button
          type="button"
          onClick={onApply}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white shadow-xs transition-all hover:bg-emerald-500"
        >
          <Zap size={12} />
          <span>تطبيق كافة المواصفات في النموذج</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
        {buildCatalogChips(extractedData).map(chip => (
          <Chip key={chip.label} chip={chip} />
        ))}
      </div>
    </div>
  );
}

function CatalogInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): React.ReactElement {
  return (
    <div className="relative mt-1">
      <textarea
        value={value}
        onChange={e => {
          onChange(e.target.value);
        }}
        rows={value.length > 0 ? 3 : 2}
        placeholder="الصق هنا أي نص منقول من PartSouq أو Amayama أو روابط الكتالوجات (مثل: [VIN: ...], Region, ModelCode, Details)..."
        className="w-full resize-none rounded-xl border border-slate-300 bg-white p-2 font-mono text-[11px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-200 dark:placeholder:text-slate-500"
      />
    </div>
  );
}

function CatalogResults({
  extractedData,
  onApply,
}: {
  extractedData: ExtractedCatalogVehicle | null;
  onApply: () => void;
}): React.ReactElement | null {
  if (extractedData === null || extractedData.extractedFieldsCount === 0) return null;
  return <ExtractionPanel extractedData={extractedData} onApply={onApply} />;
}

export function ManualVehicleCatalog({
  onChange,
}: Pick<ManualVehicleFieldsProps, 'onChange'>): React.ReactElement {
  const [rawCatalogText, setRawCatalogText] = useState('');
  const extractedData = useMemo(
    () => (rawCatalogText.trim().length > 0 ? parseCatalogVehicleText(rawCatalogText) : null),
    [rawCatalogText]
  );

  const handlePasteFromClipboard = async (): Promise<void> => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText.trim().length === 0) return;
      setRawCatalogText(clipText);
      const parsed = parseCatalogVehicleText(clipText);
      onChange(buildDraftPatch(parsed));
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const hasText = rawCatalogText.length > 0;
  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-slate-50 p-2.5 shadow-xs dark:border-blue-900/60 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900">
      <CatalogToolbar
        onPaste={() => {
          void handlePasteFromClipboard();
        }}
        onClear={() => {
          setRawCatalogText('');
        }}
        hasText={hasText}
      />
      <CatalogInput value={rawCatalogText} onChange={setRawCatalogText} />
      <CatalogResults
        extractedData={extractedData}
        onApply={() => {
          if (extractedData !== null) onChange(buildDraftPatch(extractedData));
        }}
      />
    </div>
  );
}
