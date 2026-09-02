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
  <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-700/60 dark:bg-slate-800/60">
    <span className="block text-[10px] font-bold text-slate-400">{label}</span>
    <span
      className={`mt-0.5 block text-xs font-bold text-slate-800 dark:text-slate-100 ${valueClass}`}
    >
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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
      <SpecBox label="الشركة الصانعة" value={names.makeAr || vehicle.make} />
      <SpecBox label="الموديل / الطراز" value={names.modelAr || (vehicle.model ?? '') || '—'} />
      <SpecBox label="سنة الصنع" value={years || '—'} />
      <SpecBox
        label="المواصفات / السوق"
        value={market}
        valueClass="text-blue-600 dark:text-blue-400"
      />
      <SpecBox
        label="المحرك والسعة"
        value={engine}
        valueClass="text-emerald-600 dark:text-emerald-400"
      />
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
    <div className="rounded-2xl border border-blue-500/20 bg-blue-600/10 p-3 text-blue-600 dark:text-blue-400">
      <Car size={24} />
    </div>
    <div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white md:text-lg">
        {names.makeAr} {names.modelAr} {years ? `(${years})` : ''}
      </h3>
      <div className="mt-0.5 flex items-center gap-2">
        <span className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
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

const VinActions: React.FC<VinActionsProps> = ({
  copiedVin,
  vin,
  onCopyVin,
  onRequestDelete,
  selected,
}) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => {
        onCopyVin(vin);
      }}
      className="flex items-center gap-1 text-xs font-bold text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400"
      title="نسخ رقم الشاصي"
    >
      {copiedVin ? (
        <>
          <Check size={12} className="text-emerald-500" />
          <span className="text-[11px] text-emerald-600">تم النسخ</span>
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
      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
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
  <div className="space-y-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
      القطع المتوافقة المرتبطة في المخزون ({linkedParts.length}):
    </span>
    <div className="flex flex-wrap gap-1.5">
      {linkedParts.map(l => {
        const title =
          l.product?.name_ar ||
          l.product?.name ||
          (l.product?.part_number ? `قطعة (${l.product.part_number})` : l.product_id.slice(0, 8));
        return (
          <span
            key={l.id ?? l.product_id}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {title}
            {l.product?.sku && (
              <span className="font-mono text-[10px] text-emerald-600 opacity-80 dark:text-emerald-400">
                ({l.product.sku})
              </span>
            )}
          </span>
        );
      })}
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
  <div className="space-y-4 rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5 shadow-sm dark:border-slate-800">
    {/* Header Row */}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
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
          className="rounded-xl bg-gradient-to-l from-blue-600 to-indigo-600 px-4 text-xs font-bold shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700"
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
