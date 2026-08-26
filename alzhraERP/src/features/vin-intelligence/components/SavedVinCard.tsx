import React from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../../../core/utils';
import {
  getArabicVehicleName,
  formatVehicleYears,
  formatEngineSpec,
  formatMarketLabel,
} from '../utils/smartPartNamer';
import { transLabel, driveLabel } from '../utils/vehicleLabels';
import { safeParseVehicleInfo } from '../utils/vehicleGuard';
import type { VinAnalysisRecord } from '../types';

const specLabel = (value: string | null | undefined, label: (v: string) => string): string =>
  value != null && value !== '' ? label(value) : '';

interface SavedVinCardProps {
  record: VinAnalysisRecord;
  isActive: boolean;
  onSelect: (record: VinAnalysisRecord) => void;
  onRequestDelete: (record: VinAnalysisRecord) => void;
  canDelete: boolean;
}

interface VinTitleRowProps {
  vin: string;
  isActive: boolean;
  market: string;
  canDelete: boolean;
  onDelete: () => void;
}

const VinTitleRow: React.FC<VinTitleRowProps> = ({
  vin,
  isActive,
  market,
  canDelete,
  onDelete,
}) => (
  <div className="mb-1 flex items-center justify-between gap-1">
    <span
      className={cn(
        'font-mono text-xs font-bold tracking-tight',
        isActive ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
      )}
    >
      {vin}
    </span>
    <div className="flex items-center gap-1">
      {market && (
        <span
          className={cn(
            'rounded-md border px-1.5 py-0.5 text-[9px] font-bold',
            isActive
              ? 'border-white/30 bg-white/20 text-white'
              : 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
          )}
        >
          {market}
        </span>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className={cn(
            'rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100',
            isActive
              ? 'text-white/80 hover:bg-white/20 hover:text-white'
              : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40'
          )}
          title="حذف الشاصي من السجل"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  </div>
);

interface VinSpecsRowProps {
  isActive: boolean;
  engine: string;
  transmission: string;
  drive: string;
}

const VinSpecsRow: React.FC<VinSpecsRowProps> = ({ isActive, engine, transmission, drive }) => (
  <div
    className={cn(
      'mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-medium',
      isActive ? 'text-blue-100/90' : 'text-slate-500 dark:text-slate-400'
    )}
  >
    {engine && <span>{engine}</span>}
    {transmission && <span>• {transmission}</span>}
    {drive && <span>• {drive}</span>}
  </div>
);

export const SavedVinCard: React.FC<SavedVinCardProps> = ({
  record: v,
  isActive,
  onSelect,
  onRequestDelete,
  canDelete,
}) => {
  const info = safeParseVehicleInfo(v.decoded);
  const { makeAr, modelAr } = getArabicVehicleName(info);
  const years = formatVehicleYears(info);
  const engine = formatEngineSpec(info);
  const market = formatMarketLabel(info?.market ?? info?.region);
  const transmission = specLabel(info?.transmission, transLabel);
  const drive = specLabel(info?.driveType, driveLabel);

  return (
    <button
      type="button"
      onClick={() => {
        onSelect(v);
      }}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border p-3 text-right transition-all',
        isActive
          ? 'border-blue-600 bg-gradient-to-l from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20'
          : 'border-slate-200/80 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800'
      )}
    >
      <VinTitleRow
        vin={v.vin}
        isActive={isActive}
        market={market}
        canDelete={canDelete}
        onDelete={() => {
          onRequestDelete(v);
        }}
      />
      <div className="truncate text-xs font-bold">
        {makeAr} {modelAr} {years ? `(${years})` : ''}
      </div>
      <VinSpecsRow isActive={isActive} engine={engine} transmission={transmission} drive={drive} />
    </button>
  );
};
