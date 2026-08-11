import React from 'react';
import type { VinAnalysisResult, VehicleCorePart } from '../../types';

interface PartsTabProps {
  result: VinAnalysisResult | null;
  onPartClick: (part: VehicleCorePart) => void;
}

const PartsTab: React.FC<PartsTabProps> = () => {
  return <div>Parts Tab</div>;
};

export default PartsTab;
