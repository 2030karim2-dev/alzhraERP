import React from 'react';
import type { VinAnalysisResult, VinDashboardMetrics } from '../../types';

interface DashboardTabProps {
  result: VinAnalysisResult | null;
  metrics: VinDashboardMetrics;
  error: string | null;
}

const DashboardTab: React.FC<DashboardTabProps> = () => {
  return <div>Dashboard Tab</div>;
};

export default DashboardTab;
