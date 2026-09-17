import React from 'react';
import { Car, CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import { cn } from '../../../../../core/utils';
import type { VehiclePreviewModel, PreviewDraft } from './previewModel';
import { buildPreviewModel } from './previewModel';

function PreviewBadges({ model }: { model: VehiclePreviewModel }): React.ReactElement {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-200">
      <span className="py-0.2 rounded border border-slate-200/80 bg-white/90 px-1.5 dark:border-slate-700 dark:bg-slate-800">
        المواصفات: {model.market}
      </span>
      {model.engine.length > 0 && (
        <span className="py-0.2 rounded border border-slate-200/80 bg-white/90 px-1.5 font-mono dark:border-slate-700 dark:bg-slate-800">
          المحرك: {model.engine}
        </span>
      )}
      <span className="py-0.2 rounded border border-slate-200/80 bg-white/90 px-1.5 dark:border-slate-700 dark:bg-slate-800">
        الجير: {model.trans}
      </span>
      <span className="py-0.2 rounded border border-slate-200/80 bg-white/90 px-1.5 dark:border-slate-700 dark:bg-slate-800">
        الدفع: {model.drive}
      </span>
    </div>
  );
}

function PreviewInfo({ model }: { model: VehiclePreviewModel }): React.ReactElement {
  return (
    <div className="flex min-w-[260px] flex-1 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30">
        <Car size={18} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
            هوية السيارة المستهدفة
          </span>
          <span className="py-0.2 flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/70 dark:text-emerald-200">
            <CheckCircle2 size={11} />
            <span>جاهزة للتثبيت</span>
          </span>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">{model.titleAr}</h4>
          <span
            className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-300"
            dir="ltr"
          >
            ({model.titleEn})
          </span>
          {model.yearsLabel.length > 0 && (
            <span className="py-0.2 rounded border border-emerald-200 bg-white px-2 font-mono text-[11px] font-black text-emerald-800 shadow-xs dark:border-emerald-700/60 dark:bg-slate-800 dark:text-emerald-200">
              {model.yearsLabel}
            </span>
          )}
        </div>

        <PreviewBadges model={model} />
      </div>
    </div>
  );
}

function ApplyButton({
  canApply,
  isDecoding,
  onApplyManualVehicle,
}: {
  canApply: boolean;
  isDecoding: boolean;
  onApplyManualVehicle: () => Promise<void>;
}): React.ReactElement {
  return (
    <div className="flex w-full items-center gap-2 lg:w-auto">
      <button
        type="button"
        onClick={() => {
          void onApplyManualVehicle();
        }}
        disabled={isDecoding || !canApply}
        className={cn(
          'flex h-10 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-xs font-black text-white shadow-lg transition-all lg:w-auto',
          !canApply
            ? 'cursor-not-allowed bg-slate-300 opacity-60 dark:bg-slate-800'
            : 'border border-emerald-400/30 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-600 active:scale-[0.99]'
        )}
      >
        {isDecoding ? (
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            <span>جاري التثبيت...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="animate-bounce text-amber-300" />
            <span>تثبيت مواصفات المركبة والبدء باستخراج القطع</span>
            <ArrowRight size={14} className="rotate-180" />
          </div>
        )}
      </button>
    </div>
  );
}

interface ManualVehiclePreviewProps {
  draft: PreviewDraft;
  onApplyManualVehicle: () => Promise<void>;
  isDecoding: boolean;
}

export function ManualVehiclePreview({
  draft,
  onApplyManualVehicle,
  isDecoding,
}: ManualVehiclePreviewProps): React.ReactElement | null {
  const model = buildPreviewModel(draft);
  if (model === null) return null;
  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-blue-50/60 p-3 shadow-md shadow-black/10 transition-all dark:border-emerald-700/60 dark:from-emerald-950/70 dark:via-slate-900 dark:to-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PreviewInfo model={model} />
        <ApplyButton
          canApply={draft.make.trim().length > 0}
          isDecoding={isDecoding}
          onApplyManualVehicle={onApplyManualVehicle}
        />
      </div>
    </div>
  );
}
