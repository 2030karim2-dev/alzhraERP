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
  onOpenInExtract?: (v: VinAnalysisRecord) => void;
  /** Loosely-typed to avoid coupling this presentational card to RPC evolution. */
  linkedParts: VehicleProductLink[];
}

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
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Car size={24} />
          </div>
          <div>
            {/* Arabic Vehicle Title */}
            <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
              {names.makeAr} {names.modelAr}{' '}
              {years ? `(${years})` : ''}
            </h3>

            {/* VIN Number with 1-click copy and delete */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {selected.vin}
              </span>
              <button
                type="button"
                onClick={() => onCopyVin(selected.vin)}
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
                onClick={() => onRequestDelete(selected)}
                className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="حذف هذا الشاصي من السجل"
              >
                <Trash2 size={12} />
                <span className="text-[11px]">حذف</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Jump to Smart Parts Extraction Table */}
        {onOpenInExtract && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => { onOpenInExtract(selected); }}
            className="text-xs font-bold px-4 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-blue-500/20"
          >
            <Sparkles size={14} className="ml-1.5 text-amber-300" />
            إدارة في جدول القطع الذكي ⚡
          </Button>
        )}
      </div>