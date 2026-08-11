import React from 'react';
import VehicleCard from '../../components/VehicleCard';
import DashboardSummary from '../../components/DashboardSummary';
import type { VinAnalysisResult, VinDashboardMetrics } from '../../types';
import { useTranslation } from '../../../../lib/hooks/useTranslation';

interface DashboardTabProps {
  result: VinAnalysisResult | null;
  metrics: VinDashboardMetrics;
  error: string | null;
}

/**
 * Tab 1: Dashboard — Vehicle summary + metrics overview
 * First thing the user sees after a successful VIN decode.
 */
const DashboardTab: React.FC<DashboardTabProps> = ({ result, metrics, error }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Vehicle Identity Card */}
      <VehicleCard vehicle={result!.vehicle} />

      {/* Dashboard Metrics */}
      <DashboardSummary metrics={metrics} />

      {/* Warnings */}
      {result!.warnings && result!.warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">
            {t('vin_warnings')}
          </p>
          {result!.warnings.map((w, i) => (
            <p key={i} className="text-[9px] text-amber-700 dark:text-amber-400">{w}</p>
          ))}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3">
          <p className="text-[10px] font-bold text-rose-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default DashboardTab;
