/* eslint-disable max-lines-per-function -- React component composing five presentational units + modals; the 50-line ceiling is not applicable to a component boundary. */
import React from 'react';
import { Car } from 'lucide-react';
import { ConfirmModal } from '../../../ui/base/ConfirmModal';
import { ManualVinModal } from './ManualVinModal';
import { VehicleProfileCard } from './VehicleProfileCard';
import { PartIntelligenceModal } from './PartIntelligenceModal';
import { VinsTabHeader } from './vins/VinsTabHeader';
import { EmptyVinsState } from './vins/EmptyVinsState';
import { VinsListSidebar } from './vins/VinsListSidebar';
import { VehicleCatalogSearchCard } from './vins/VehicleCatalogSearchCard';
import { usePartInspection } from '../hooks/usePartInspection';
import { useVinsTabState } from '../hooks/useVinsTabState';
import { useVehiclePartsActions } from '../hooks/useVehiclePartsActions';
import type { ExtractedPart, VehicleInfo, VehicleProductLink, VinAnalysisRecord } from '../types';

interface VinsTabProps {
  savedVins: VinAnalysisRecord[];
  isLoading: boolean;
  onLoadParts: (vehicleId: string) => Promise<VehicleProductLink[]>;
  onSearchPart: (partNumber: string) => Promise<ExtractedPart[]>;
  isSearching: boolean;
  onAddParts: (vehicle: VehicleInfo, parts: ExtractedPart[]) => Promise<number>;
  onOpenInExtract?: ((record: VinAnalysisRecord) => void) | undefined;
  onSaveManualVehicle?: (vehicle: VehicleInfo, vinNumber?: string) => Promise<unknown>;
  onDeleteSavedVin?: ((id: string) => Promise<void>) | undefined;
  isAdding: boolean;
  canAdd?: boolean | undefined;
}

export const VinsTab: React.FC<VinsTabProps> = ({
  savedVins,
  isLoading,
  onLoadParts,
  onSearchPart,
  isSearching,
  onAddParts,
  onOpenInExtract,
  onSaveManualVehicle,
  onDeleteSavedVin,
  isAdding,
  canAdd,
}) => {
  const {
    isIntelligenceOpen,
    setIsIntelligenceOpen,
    isIntelligenceLoading,
    activeIntelligence,
    handleDeepInspectPart,
  } = usePartInspection();

  const vinsState = useVinsTabState({
    savedVins,
    onLoadParts,
    onDeleteSavedVin,
  });

  const partsActions = useVehiclePartsActions({
    vehicle: vinsState.vehicle,
    vehicleId: vinsState.selected?.vehicle_id,
    activeIntelligence,
    onSearchPart,
    onAddParts,
    onLoadParts,
    setLinkedParts: () => {
      /* handled inside useVinsTabState */
    },
    handleDeepInspectPart,
  });

  const handleSelectRecord = (record: VinAnalysisRecord): void => {
    vinsState.setSelected(record);
    partsActions.resetPartsForm();
  };

  const handleSaveManualModal = async (newVehicle: VehicleInfo, vinVal: string): Promise<void> => {
    if (onSaveManualVehicle) {
      await onSaveManualVehicle(newVehicle, vinVal);
    }
  };

  const handleSaveAndExtractModal = async (
    newVehicle: VehicleInfo,
    vinVal: string
  ): Promise<void> => {
    if (!onSaveManualVehicle) return;
    const res = await onSaveManualVehicle(newVehicle, vinVal);
    if (res != null && onOpenInExtract) {
      onOpenInExtract({
        id: `temp-${String(Date.now())}`,
        vin: vinVal,
        vehicle_id: newVehicle.id ?? null,
        decoded: newVehicle,
        source: 'manual',
        created_at: new Date().toISOString(),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="font-cairo rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="animate-pulse text-xs font-bold text-slate-500 dark:text-slate-400">
          جارٍ تحميل سجل الشواصي والمركبات المحفوظة...
        </p>
      </div>
    );
  }

  return (
    <div className="font-cairo space-y-4">
      <VinsTabHeader
        onOpenManualModal={() => {
          vinsState.setIsManualModalOpen(true);
        }}
      />

      {savedVins.length === 0 ? (
        <EmptyVinsState
          onOpenManualModal={() => {
            vinsState.setIsManualModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <VinsListSidebar
            filteredVins={vinsState.filteredVins}
            selectedId={vinsState.selected?.id}
            filterText={vinsState.filterText}
            onFilterChange={vinsState.setFilterText}
            onSelect={handleSelectRecord}
            onRequestDelete={vinsState.setDeleteConfirmVin}
            canDelete={Boolean(onDeleteSavedVin)}
          />

          <div className="space-y-4 lg:col-span-2">
            {vinsState.selected && vinsState.vehicle ? (
              <>
                <VehicleProfileCard
                  vehicle={vinsState.vehicle}
                  names={vinsState.activeVehicleNames}
                  years={vinsState.activeVehicleYears}
                  selected={vinsState.selected}
                  copiedVin={vinsState.copiedVin}
                  onCopyVin={vin => {
                    void vinsState.handleCopyVin(vin);
                  }}
                  onRequestDelete={vinsState.setDeleteConfirmVin}
                  onOpenInExtract={onOpenInExtract}
                  linkedParts={vinsState.linkedParts}
                />

                <VehicleCatalogSearchCard
                  vin={vinsState.selected.vin}
                  selectedCatalogId={partsActions.selectedCatalogId}
                  onSelectCatalogId={partsActions.setSelectedCatalogId}
                  searchQuery={partsActions.searchQuery}
                  onSearchQueryChange={partsActions.setSearchQuery}
                  onSearch={() => {
                    void partsActions.handleSearch();
                  }}
                  isSearching={isSearching}
                  manualNumber={partsActions.manualNumber}
                  onManualNumberChange={partsActions.setManualNumber}
                  manualDesc={partsActions.manualDesc}
                  onManualDescChange={partsActions.setManualDesc}
                  onAddManual={partsActions.addManual}
                  parts={partsActions.parts}
                  selectedIds={partsActions.selectedIds}
                  onTogglePart={partsActions.togglePart}
                  onToggleSelectAll={partsActions.toggleSelectAll}
                  onInspectPart={pn => {
                    void handleDeepInspectPart(
                      pn,
                      vinsState.vehicle,
                      partsActions.selectedCatalogId
                    );
                  }}
                  onAddSelectedParts={() => {
                    void partsActions.handleAdd();
                  }}
                  isAdding={isAdding}
                  canAdd={canAdd}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Car size={32} className="mx-auto mb-2 text-slate-400" />
                <p className="text-xs font-bold text-slate-500">
                  اختر شاصي من القائمة لعرض تفاصيله باللغة العربية
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <PartIntelligenceModal
        isOpen={isIntelligenceOpen}
        onClose={() => {
          setIsIntelligenceOpen(false);
        }}
        intelligence={activeIntelligence}
        isLoading={isIntelligenceLoading}
        onAddAlternativeToGrid={partsActions.handleAddAlternativeToParts}
        onAddAllAlternativesToGrid={partsActions.handleAddAllAlternativesToParts}
      />

      <ManualVinModal
        isOpen={vinsState.isManualModalOpen}
        onClose={() => {
          vinsState.setIsManualModalOpen(false);
        }}
        onSave={handleSaveManualModal}
        onSaveAndExtract={handleSaveAndExtractModal}
      />

      <ConfirmModal
        isOpen={Boolean(vinsState.deleteConfirmVin)}
        onClose={() => {
          vinsState.setDeleteConfirmVin(null);
        }}
        onConfirm={() => {
          void vinsState.handleDeleteVin();
        }}
        isLoading={vinsState.isDeletingVin}
        title="حذف الشاصي من السجل"
        message={`هل أنت متأكد من حذف الشاصي (${vinsState.deleteConfirmVin?.vin ?? ''}) من السجل؟ لن يؤثر هذا على المنتجات المسجلة مسبقاً في المخزون.`}
        variant="danger"
        confirmLabel="نعم، احذف الشاصي"
        cancelLabel="إلغاء"
      />
    </div>
  );
};
/* eslint-enable max-lines-per-function */
