import React, { useState } from 'react';
import { getArabicVehicleName, formatVehicleYears } from '../utils/smartPartNamer';
import { usePartInspection } from '../hooks/usePartInspection';
import { usePartsExtractDraft } from '../hooks/usePartsExtractDraft';
import { usePartsGridActions } from '../hooks/usePartsGridActions';
import { usePartsExportImport } from '../hooks/usePartsExportImport';
import { NoVehicleSelectedState } from './extract/NoVehicleSelectedState';
import { PartsAddedSuccessAlert } from './extract/PartsAddedSuccessAlert';
import { PartIntelligenceModal } from './PartIntelligenceModal';
import { PartsGridTable } from './PartsGridTable';
import { PartsSearchControls } from './PartsSearchControls';
import { QuickPartsToolbar, QUICK_PARTS_TEMPLATES } from './QuickPartsToolbar';
import { VehicleContextBanner } from './VehicleContextBanner';
import { BulkPartsPasteDropzone } from './extract/BulkPartsPasteDropzone';
import { useFeedbackStore } from '../../feedback/store';
import CreateQuotationModal from '../../sales/components/quotations/CreateQuotationModal';
import type { ItemRow } from '../../sales/hooks/useQuotationForm';
import type { ExtractedPart, VehicleInfo } from '../types';

interface PartsExtractTabProps {
  hasVehicle: boolean;
  companyId?: string | undefined;
  vehicle: VehicleInfo | null;
  onSearchPart: (partNumber: string) => Promise<ExtractedPart[]>;
  isSearching: boolean;
  onAdd: (parts: ExtractedPart[]) => Promise<number>;
  onNavigateToInventory?: () => void;
  onNavigateToDecode?: () => void;
  isAdding: boolean;
  canAdd?: boolean;
}

// eslint-disable-next-line max-lines-per-function -- React component composing presentational units + modals; boundary container.
export const PartsExtractTab: React.FC<PartsExtractTabProps> = ({
  hasVehicle,
  companyId,
  vehicle,
  onSearchPart,
  isSearching,
  onAdd,
  onNavigateToInventory,
  onNavigateToDecode,
  isAdding,
  canAdd,
}) => {
  const { showToast } = useFeedbackStore();
  const {
    isIntelligenceOpen,
    setIsIntelligenceOpen,
    isIntelligenceLoading,
    activeIntelligence,
    handleDeepInspectPart,
  } = usePartInspection();

  const { rows, setRows, customVehicleTemplate, setCustomVehicleTemplate, clearAllDraft } =
    usePartsExtractDraft(companyId, vehicle);

  const selectedRows = rows.filter(r => r.selected === true);
  const [lastAddedCount, setLastAddedCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState('megazip');
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [rawBulkPartsText, setRawBulkPartsText] = useState('');
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);

  const {
    updateRow,
    addRow,
    addMultipleRows,
    deleteRow,
    duplicateRow,
    toggleSelectAll,
    applyGeneralizationToAllRows,
    resetTemplateToSmartDefault,
    handleApplyBulkParts,
    handleAddAlternativeToGrid,
    handleAddAllAlternativesToGrid,
    handleSearchMegazip,
    handleSaveToInventory,
  } = usePartsGridActions({
    vehicle,
    rows,
    setRows,
    customVehicleTemplate,
    setCustomVehicleTemplate,
    activeIntelligence,
    companyId,
    onSearchPart,
    onAdd,
    handleDeepInspectPart,
    clearAllDraft,
    setLastAddedCount,
  });

  const {
    fileInputRef,
    isExporting,
    isImporting,
    handleExportExcel,
    handleFileImport,
    handleCopyWhatsAppMemo,
    handleClearAllRows,
  } = usePartsExportImport({
    vehicle,
    rows,
    selectedRows,
    setRows,
    clearAllDraft,
  });

  if (!hasVehicle || !vehicle) {
    return <NoVehicleSelectedState onNavigateToDecode={onNavigateToDecode} />;
  }

  const { makeAr, modelAr } = getArabicVehicleName(vehicle);
  const years = formatVehicleYears(vehicle);
  const allSelected = rows.length > 0 && rows.every(r => r.selected === true);

  const quotationInitialItems: ItemRow[] = selectedRows.map(r => {
    let desc =
      (r.description ?? '').trim() !== ''
        ? (r.description ?? '').trim()
        : r.baseName.trim() !== ''
          ? r.baseName.trim()
          : 'قطعة غيار';
    const partNo = r.partNumber.trim();
    if (partNo.length > 0) desc = `${desc} (${partNo})`;
    const sizeSpec = r.sizeSpec?.trim() ?? '';
    if (sizeSpec.length > 0) desc = `${desc} - ${sizeSpec}`;
    return {
      productId: '',
      description: desc,
      quantity: 1,
      unitPrice: r.salePrice ?? 0,
      discountPercent: 0,
    };
  });

  return (
    <div className="font-cairo space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        className="hidden"
        onChange={e => {
          void handleFileImport(e);
        }}
      />

      <VehicleContextBanner
        vehicle={vehicle}
        makeAr={makeAr}
        modelAr={modelAr}
        years={years}
        customVehicleTemplate={customVehicleTemplate}
        onTemplateChange={setCustomVehicleTemplate}
        onApplyGeneralization={() => {
          applyGeneralizationToAllRows();
        }}
        onResetTemplate={resetTemplateToSmartDefault}
        hasRows={rows.length > 0}
        onClearDraft={handleClearAllRows}
      />

      {lastAddedCount !== null && (
        <PartsAddedSuccessAlert
          lastAddedCount={lastAddedCount}
          onNavigateToInventory={onNavigateToInventory}
          onDismiss={() => {
            setLastAddedCount(null);
          }}
        />
      )}

      <PartsSearchControls
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedCatalogId={selectedCatalogId}
        onCatalogChange={setSelectedCatalogId}
        isSearching={isSearching}
        onSearch={() => {
          void handleSearchMegazip(searchQuery, selectedCatalogId);
        }}
        vehicle={vehicle}
        onAddRow={() => {
          addRow();
        }}
        onAddMultipleRows={count => {
          addMultipleRows(count);
        }}
      />

      <BulkPartsPasteDropzone
        isOpen={isBulkPasteOpen}
        onToggle={() => {
          setIsBulkPasteOpen(prev => !prev);
        }}
        rawText={rawBulkPartsText}
        onTextChange={setRawBulkPartsText}
        onApply={() => {
          handleApplyBulkParts(rawBulkPartsText, () => {
            setRawBulkPartsText('');
            setIsBulkPasteOpen(false);
          });
        }}
      />

      <QuickPartsToolbar
        templates={QUICK_PARTS_TEMPLATES}
        selectedCount={selectedRows.length}
        rowsCount={rows.length}
        isImporting={isImporting}
        isExporting={isExporting}
        onAddFromTemplate={tmpl => {
          addRow(tmpl);
        }}
        onOpenQuotation={() => {
          if (selectedRows.length === 0) {
            showToast('يرجى تحديد قطعة واحدة على الأقل لإنشاء عرض السعر', 'warning');
            return;
          }
          setIsQuotationModalOpen(true);
        }}
        onImportClick={() => {
          fileInputRef.current?.click();
        }}
        onExport={() => {
          void handleExportExcel();
        }}
        onCopyWhatsApp={() => {
          void handleCopyWhatsAppMemo();
        }}
      />

      <PartsGridTable
        rows={rows}
        allSelected={allSelected}
        onToggleSelectAll={toggleSelectAll}
        onUpdateRow={updateRow}
        onDuplicateRow={duplicateRow}
        onDeleteRow={deleteRow}
        onInspectPart={q => {
          void handleDeepInspectPart(q, vehicle, selectedCatalogId);
        }}
        selectedRows={selectedRows}
        onAddRow={() => {
          addRow();
        }}
        onSaveToInventory={() => {
          void handleSaveToInventory(selectedRows);
        }}
        canAdd={canAdd}
        isAdding={isAdding}
        vehicle={vehicle}
        customVehicleTemplate={customVehicleTemplate}
      />

      <PartIntelligenceModal
        isOpen={isIntelligenceOpen}
        onClose={() => {
          setIsIntelligenceOpen(false);
        }}
        intelligence={activeIntelligence}
        isLoading={isIntelligenceLoading}
        onAddAlternativeToGrid={handleAddAlternativeToGrid}
        onAddAllAlternativesToGrid={handleAddAllAlternativesToGrid}
      />

      {isQuotationModalOpen && (
        <CreateQuotationModal
          onClose={() => {
            setIsQuotationModalOpen(false);
          }}
          onSuccess={() => {
            showToast('تم إنشاء وحفظ عرض السعر بنجاح! 📄', 'success');
            setIsQuotationModalOpen(false);
          }}
          initialItems={quotationInitialItems}
          initialNotes={`عرض سعر قطع غيار سيارة: ${makeAr} ${modelAr} ${years}`}
        />
      )}
    </div>
  );
};
