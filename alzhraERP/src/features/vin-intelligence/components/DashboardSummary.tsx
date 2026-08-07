import React from 'react';
import { Car, Database, CheckCircle2, Package, HelpCircle } from 'lucide-react';
import type { VinDashboardMetrics } from '../types';
import { mockMetrics } from '../mock';
import StatCard from '../../../ui/common/StatCard';

interface DashboardSummaryProps {
  metrics?: VinDashboardMetrics;
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ metrics }) => {
  const m = metrics ?? mockMetrics;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      <StatCard title="VINs Analyzed" value={m.vinsAnalyzed.toLocaleString()} icon={Car} colorClass="text-blue-600" iconBgClass="bg-blue-600" variant="compact" />
      <StatCard title="Vehicles in KB" value={m.vehiclesInKnowledgeBase.toLocaleString()} icon={Database} colorClass="text-purple-600" iconBgClass="bg-purple-600" variant="compact" />
      <StatCard title="Verified Fitments" value={m.verifiedFitments.toLocaleString()} icon={CheckCircle2} colorClass="text-emerald-600" iconBgClass="bg-emerald-600" variant="compact" />
      <StatCard title="Inventory Matches" value={m.inventoryMatches.toLocaleString()} icon={Package} colorClass="text-orange-600" iconBgClass="bg-orange-600" variant="compact" />
      <StatCard title="Unknown Fitments" value={m.unknownFitments.toLocaleString()} icon={HelpCircle} colorClass="text-slate-500" iconBgClass="bg-slate-500" variant="compact" />
    </div>
  );
};

export default DashboardSummary;
