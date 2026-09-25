/* eslint-disable max-lines-per-function -- catalog search card combining form, badges, and table */
import React from 'react';
import { Globe } from 'lucide-react';
import { AUTO_PARTS_CATALOGS } from '../../constants/catalogs';
import { CatalogSearchForm } from './CatalogSearchForm';
import { CatalogLauncherBadges } from './CatalogLauncherBadges';
import { ExtractedPartsTable } from './ExtractedPartsTable';
import type { UiPart } from '../PartsListRow';

export interface VehicleCatalogSearchCardProps {
  vin?: string | null | undefined;
  selectedCatalogId: string;
  onSelectCatalogId: (id: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  manualNumber: string;
  onManualNumberChange: (n: string) => void;
  manualDesc: string;
  onManualDescChange: (d: string) => void;
  onAddManual: () => void;
  parts: UiPart[];
  selectedIds: Set<string>;
  onTogglePart: (key: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onInspectPart: (partNumber: string) => void;
  onAddSelectedParts: () => void;
  isAdding: boolean;
  canAdd?: boolean | undefined;
}

export const VehicleCatalogSearchCard: React.FC<VehicleCatalogSearchCardProps> = ({
  vin,
  selectedCatalogId,
  onSelectCatalogId,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  isSearching,
  manualNumber,
  onManualNumberChange,
  manualDesc,
  onManualDescChange,
  onAddManual,
  parts,
  selectedIds,
  onTogglePart,
  onToggleSelectAll,
  onInspectPart,
  onAddSelectedParts,
  isAdding,
  canAdd,
}) => (
  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <Globe size={16} className="text-blue-600 dark:text-blue-400" />
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          استخراج وبحث قطع الغيار لهذه المركبة من الكتالوجات العالمية
        </h4>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <span>الكتالوج النشط:</span>
        <select
          value={selectedCatalogId}
          onChange={e => {
            onSelectCatalogId(e.target.value);
          }}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400"
        >
          {AUTO_PARTS_CATALOGS.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.nameAr}
            </option>
          ))}
        </select>
      </div>
    </div>

    <CatalogSearchForm
      vin={vin}
      selectedCatalogId={selectedCatalogId}
      searchQuery={searchQuery}
      onSearchQueryChange={onSearchQueryChange}
      onSearch={onSearch}
      isSearching={isSearching}
      manualNumber={manualNumber}
      onManualNumberChange={onManualNumberChange}
      manualDesc={manualDesc}
      onManualDescChange={onManualDescChange}
      onAddManual={onAddManual}
    />

    <CatalogLauncherBadges
      vin={vin}
      searchQuery={searchQuery}
      onSelectCatalogId={onSelectCatalogId}
    />

    <ExtractedPartsTable
      parts={parts}
      selectedIds={selectedIds}
      selectedCatalogId={selectedCatalogId}
      isAdding={isAdding}
      canAdd={canAdd}
      onTogglePart={onTogglePart}
      onToggleSelectAll={onToggleSelectAll}
      onInspectPart={onInspectPart}
      onAddSelectedParts={onAddSelectedParts}
    />
  </div>
);
