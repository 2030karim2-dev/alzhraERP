import React from 'react';
import CorePartsTable from '../../components/CorePartsTable';
import InventoryMatches from '../../components/InventoryMatches';
import MissingParts from '../../components/MissingParts';
import type { VinAnalysisResult, VehicleCorePart } from '../../types';
import { useTranslation } from '../../../../lib/hooks/useTranslation';

interface PartsTabProps {
  result: VinAnalysisResult | null;
  onPartClick: (part: VehicleCorePart) => void;
}

/**
 * Tab 2: Parts — Full-width core parts table + inventory matches + missing parts
 * Focused workspace for procurement and inventory analysis.
 */
const PartsTab: React.FC<PartsTabProps> = ({ result, onPartClick }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Core Parts Table — full width (no sidebar grid) */}
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)] mb-2 px-1">
          {t('vin_core_parts')} ({result!.coreParts.length})
        </h3>
        <CorePartsTable parts={result!.coreParts} onPartClick={onPartClick} />
      </div>

      {/* Inventory + Missing side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <InventoryMatches matches={result!.inventoryMatches} />
        <MissingParts parts={result!.missingParts} />
      </div>
    </div>
  );
};

export default PartsTab;
