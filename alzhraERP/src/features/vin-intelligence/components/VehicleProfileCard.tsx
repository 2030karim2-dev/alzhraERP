import React from 'react';
import { Car, Copy, Check, Trash2, Sparkles } from 'lucide-react';
import Button from '../../../ui/base/Button';
import { formatEngineSpec, formatMarketLabel } from '../utils/smartPartNamer';
import { driveLabel, fuelLabel, transLabel } from '../utils/vehicleLabels';
import type { VehicleProductLink, VinAnalysisRecord, VehicleInfo } from '../types';

interface VehicleProfileCardProps {
  vehicle: VehicleInfo;
  /** Pre-computed Arabic labels for the active vehicle (parent memoizes). */
  names: { makeAr: string; modelAr: string };
  /** Pre-computed years string for the active vehicle. */
  years: string;
  /** The selected saved-VIN record (title + VIN + actions). */
  selected: VinAnalysisRecord;
  copiedVin: boolean;
  onCopyVin: (vin: string) => void;
  onRequestDelete: (v: VinAnalysisRecord) => void;
  /** Loosely-typed optional handler; `undefined` is valid under exactOptionalPropertyTypes. */
  onOpenInExtract?: ((record: VinAnalysisRecord) => void) | undefined;
  /** Loosely-typed to avoid coupling this presentational card to RPC evolution. */
  linkedParts: VehicleProductLink[];
}

/* ──────────────────────────────────────────────────────────────────
   Small presentational pieces — each stays under the 50-line and
   complexity-10 ceilings enforced by the ESLint configuration.
   ────────────────────────────────────────────────────────────────── */

const transmissionLabel = (v: VehicleInfo): string =>
  v.transmission != null && v.transmission !== '' ? transLabel(v.transmission) : '—';

const driveTypeLabel = (v: VehicleInfo): string =>
  v.driveType != null && v.driveType !== '' ? driveLabel(v.driveType) : '—';

const fuelTypeLabel = (v: VehicleInfo): string =>
  v.fuelType != null && v.fuelType !== '' ? fuelLabel(v.fuelType) : 'بنزين';

interface SpecBoxProps {
  label: string;
  value: string;
  valueClass?: string;
}

const SpecBox: React.FC<SpecBoxProps> = ({ label, value, valueClass = '' }) => (
  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
    <span className="block text-[10px] font-bold text-slate-400">{label}</span>
    <span className={`block text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 ${valueClass}`}>
      {value}
    </span>
  </div>
);

interface SpecsGridProps {
  vehicle: VehicleInfo;
  names: { makeAr: string; modelAr: string };
  years: string;
}

const SpecsGrid: React.FC<SpecsGridProps> = ({ vehicle, names, years }) => {
  const market = formatMarketLabel(vehicle.market ?? vehicle.region ?? '') || '—';
  const engine = formatEngineSpec(vehicle) || '—';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
      <SpecBox label="الشركة الصانعة" value={names.makeAr || vehicle.make} />
      <SpecBox label="الموديل / الطراز" value={names.modelAr || (vehicle.model ?? '') || '—'} />
      <SpecBox label="سنة الصنع" value={years || '—'} />
      <SpecBox label="المواصفات / السوق" value={market} valueClass="text-blue-600 dark:text-blue-400" />
      <SpecBox label="المحرك والسعة" value={engine} valueClass="text-emerald-600 dark:text-emerald-400" />
      <SpecBox label="ناقل الحركة" value={transmissionLabel(vehicle)} />
      <SpecBox label="نظام الدفع" value={driveTypeLabel(vehicle)} />
      <SpecBox label="نوع الوقود" value={fuelTypeLabel(vehicle)} />
    </div>
  );
};

interface TitleBlockProps {
  names: { makeAr: string; modelAr: string };
  years: string;
  vin: string;
  copiedVin: boolean;
  onCopyVin: (vin: string) => void;
  onRequestDelete: (v: VinAnalysisRecord) => void;
  selected: VinAnalysisRecord;
}

const TitleBlock: React.FC<TitleBlockProps> = ({
  names,
  years,
  vin,
  copiedVin,
  onCopyVin,
  onRequestDelete,
  selected,
}) => (
  <div className="flex items-center gap-3">
    <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
      <Car size={24} />
    </div>
    <div>
      <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
        {names.makeAr} {names.modelAr} {years ? `(${years})` : ''}
      </h3>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          {vin}
        </span>
        <VinActions
          copiedVin={copiedVin}
          vin={vin}
          onCopyVin={onCopyVin}
          onRequestDelete={onRequestDelete}
          selected={selected}
        />
      </div>
    </div>
  </div>
);

interface VinActionsProps {
  copiedVin: boolean;
  vin: string;
  onCopyVin: (vin: string) => void;
  onRequestDelete: (v: VinAnalysisRecord) => void;
  selected: VinAnalysisRecord;
}

const VinActions: React.FC<VinActionsProps> = ({ copiedVin, vin, onCopyVin, onRequestDelete, selected }) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => {
        onCopyVin(vin);
      }}
      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors"
      title="نسخ رقم الشاصي"
    >
      {copiedVin ? (
        <>
          <Check size={12} className="text-emerald-500" />
          <span className="text-emerald-600 text-[11px]">تم النسخ</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span className="text-[11px]">نسخ</span>
        </>
      )}
    </button>
    <button
      type="button"
      onClick={() => {
        onRequestDelete(selected);
      }}
      className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40"
      title="حذف هذا الشاصي من السجل"
    >
      <Trash2 size={12} />
      <span className="text-[11px]">حذف</span>
    </button>
  </div>
);

interface LinkedPartsBadgesProps {
  linkedParts: VehicleProductLink[];
}

const LinkedPartsBadges: React.FC<LinkedPartsBadgesProps> = ({ linkedParts }) => (
  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
      القطع المتوافقة المرتبطة في المخزون ({linkedParts.length}):
    </span>
    <div className="flex flex-wrap gap-1.5">
      {linkedParts.map((l) => (
        <span
          key={l.id ?? l.product_id}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
        >
          {l.product_id.slice(0, 10)}
        </span>
      ))}
    </div>
  </div>
);

export const VehicleProfileCard: React.FC<VehicleProfileCardProps> = ({
  vehicle,
  names,
  years,
  selected,
  copiedVin,
  onCopyVin,
  onRequestDelete,
  onOpenInExtract,
  linkedParts,
}) => (
  <div className="bg-[var(--app-surface)] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
    {/* Header Row */}
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
      <TitleBlock
        names={names}
        years={years}
        vin={selected.vin}
        copiedVin={copiedVin}
        onCopyVin={onCopyVin}
        onRequestDelete={onRequestDelete}
        selected={selected}
      />
      {onOpenInExtract && (
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            onOpenInExtract(selected);
          }}
          className="text-xs font-bold px-4 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-blue-500/20"
        >
          <Sparkles size={14} className="ml-1.5 text-amber-300" />
          إدارة في جدول القطع الذكي ⚡
        </Button>
      )}
    </div>

    {/* ── Arabic Specifications Grid ── */}
    <SpecsGrid vehicle={vehicle} names={names} years={years} />

    {/* Linked Inventory Products Badge List */}
    {linkedParts.length > 0 && <LinkedPartsBadges linkedParts={linkedParts} />}
  </div>
);

