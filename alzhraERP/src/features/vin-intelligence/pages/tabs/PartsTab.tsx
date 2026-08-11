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

  if (!result || result.analysisStatus === 'FAILED') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
          <span className="text-2xl">🔧</span>
        </div>
        <h3 className="text-sm font-black text-[var(--app-text)] mb-1">
          {t('vin_no_parts_yet')}
        </h3>
        <p className="text-[10px] text-[var(--app-text-secondary)] max-w-xs">
          {t('vin_analyze_to_see_parts')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Core Parts Table — full width (no sidebar grid) */}
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)] mb-2 px-1">
          {t('vin_core_parts')} ({result.coreParts.length})
        </h3>
        <CorePartsTable parts={result.coreParts} onPartClick={onPartClick} />
      </div>

      {/* Inventory + Missing side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <InventoryMatches matches={result.inventoryMatches} />
        <MissingParts parts={result.missingParts} />
      </div>
    </div>
  );
};

export default PartsTab;
