import React from 'react';
import type { VinHistoryEntry, VinDashboardMetrics } from '../../types';

interface HistoryTabProps {
  history: VinHistoryEntry[];
  metrics: VinDashboardMetrics;
  historyError: string | null;
  onSelectVin: (vin: string) => void;
}

const HistoryTab: React.FC<HistoryTabProps> = () => {
  return <div>History Tab</div>;
};

export default HistoryTab;
