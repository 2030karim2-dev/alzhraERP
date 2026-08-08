import React from 'react';
import { Car, Database, CheckCircle2, Package, HelpCircle } from 'lucide-react';
import type { VinDashboardMetrics } from '../types';
import StatCard from '../../../ui/common/StatCard';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface DashboardSummaryProps {
  metrics: VinDashboardMetrics;
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ metrics }) => {
  const { t } = useTranslation();
  const m = metrics;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      <StatCard title={t('vin_vins_analyzed')} value={m.vinsAnalyzed.toLocaleString()} icon={Car} colorClass="text-blue-600" iconBgClass="bg-blue-600" variant="compact" />
      <StatCard title={t('vin_vehicles_kb')} value={m.vehiclesInKnowledgeBase.toLocaleString()} icon={Database} colorClass="text-purple-600" iconBgClass="bg-purple-600" variant="compact" />
      <StatCard title={t('vin_verified_fitments')} value={m.verifiedFitments.toLocaleString()} icon={CheckCircle2} colorClass="text-emerald-600" iconBgClass="bg-emerald-600" variant="compact" />
      <StatCard title={t('vin_inventory_matches')} value={m.inventoryMatches.toLocaleString()} icon={Package} colorClass="text-orange-600" iconBgClass="bg-orange-600" variant="compact" />
      <StatCard title={t('vin_unknown_fitments')} value={m.unknownFitments.toLocaleString()} icon={HelpCircle} colorClass="text-slate-500" iconBgClass="bg-slate-500" variant="compact" />
    </div>
  );
};

export default DashboardSummary;
