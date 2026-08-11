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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 md:gap-2">
      <StatCard 
        title={t('vin_vins_analyzed')} 
        value={m.vinsAnalyzed.toLocaleString()} 
        icon={Car} 
        colorClass="text-blue-600 dark:text-blue-400" 
        iconBgClass="bg-blue-600/10 dark:bg-blue-400/10" 
        variant="compact" 
        className="!p-2 md:!p-3 border-none shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
      />
      <StatCard 
        title={t('vin_vehicles_kb')} 
        value={m.vehiclesInKnowledgeBase.toLocaleString()} 
        icon={Database} 
        colorClass="text-purple-600 dark:text-purple-400" 
        iconBgClass="bg-purple-600/10 dark:bg-purple-400/10" 
        variant="compact" 
        className="!p-2 md:!p-3 border-none shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
      />
      <StatCard 
        title={t('vin_verified_fitments')} 
        value={m.verifiedFitments.toLocaleString()} 
        icon={CheckCircle2} 
        colorClass="text-emerald-600 dark:text-emerald-400" 
        iconBgClass="bg-emerald-600/10 dark:bg-emerald-400/10" 
        variant="compact" 
        className="!p-2 md:!p-3 border-none shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
      />
      <StatCard 
        title={t('vin_inventory_matches')} 
        value={m.inventoryMatches.toLocaleString()} 
        icon={Package} 
        colorClass="text-orange-600 dark:text-orange-400" 
        iconBgClass="bg-orange-600/10 dark:bg-orange-400/10" 
        variant="compact" 
        className="!p-2 md:!p-3 border-none shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
      />
      <StatCard 
        title={t('vin_unknown_fitments')} 
        value={m.unknownFitments.toLocaleString()} 
        icon={HelpCircle} 
        colorClass="text-slate-500 dark:text-slate-400" 
        iconBgClass="bg-slate-500/10 dark:bg-slate-400/10" 
        variant="compact" 
        className="col-span-2 sm:col-span-1 !p-2 md:!p-3 border-none shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
      />
    </div>
  );
};

export default DashboardSummary;
