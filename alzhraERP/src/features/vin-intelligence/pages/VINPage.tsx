import React, { useState } from 'react';
import { ScanLine, PackageSearch, PackagePlus, Bookmark, Car, RotateCcw } from 'lucide-react';
import MicroHeader from '../../../ui/base/MicroHeader';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { useAuthStore } from '../../auth/store';
import { useVinIntelligence } from '../hooks/useVinIntelligence';
import { VinDecodeTab } from '../components/VinDecodeTab';
import { InventoryMatchTab } from '../components/InventoryMatchTab';
import { PartsExtractTab } from '../components/PartsExtractTab';
import { VinsTab } from '../components/VinsTab';
import { safeParseVehicleInfo } from '../utils/vehicleGuard';
import { getArabicVehicleName, formatVehicleYears } from '../utils/smartPartNamer';
import type { VinDecodeMode } from '../types';

/* eslint-disable max-lines-per-function, complexity -- page composing four feature tabs; the ceilings are not applicable to a page boundary. */
const VINPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('decode');

  const vin = useVinIntelligence(user?.company_id, user?.id);

  const canAddToInventory =
    user?.role === 'admin' || user?.role === 'manager' || user?.role === 'owner';

  const tabs = [
    { id: 'decode', label: t('vin_tab_decode'), icon: ScanLine },
    { id: 'inventory', label: t('vin_tab_inventory'), icon: PackageSearch },
    { id: 'extract', label: t('vin_tab_extract'), icon: PackagePlus },
    { id: 'vin', label: t('vin_tab_saved'), icon: Bookmark },
  ];

  const handleDecode = async (vinValue: string, mode: VinDecodeMode): Promise<void> => {
    try {
      await vin.decodeVin(vinValue, mode);
    } catch {
      /* error surfaced via vin.decodeError */
    }
  };

  const handleSave = async (): Promise<void> => {
    try {
      await vin.saveCurrentResult();
      setActiveTab('vin');
    } catch {
      /* error surfaced via toast */
    }
  };

  const activeVehicleNames = vin.vehicle ? getArabicVehicleName(vin.vehicle) : null;
  const activeVehicleYears = vin.vehicle ? formatVehicleYears(vin.vehicle) : '';

  return (
    <div className="font-cairo flex h-full flex-col bg-[var(--app-bg)]">
      <MicroHeader
        title={t('vin_intelligence')}
        icon={ScanLine}
        iconColor="text-blue-600"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={id => {
          setActiveTab(id);
        }}
      />

      {/* Active Vehicle Context Bar */}
      {vin.vehicle && (
        <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 px-4 py-2 text-xs shadow-xs dark:border-slate-800 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                <Car size={15} />
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-slate-500 dark:text-slate-400">السيارة الحالية:</span>
                <span className="text-blue-700 dark:text-blue-300">
                  {activeVehicleNames?.makeAr} {activeVehicleNames?.modelAr}
                  {activeVehicleYears ? ` (${activeVehicleYears})` : ''}
                </span>
                {vin.vehicle.displacement && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                    {vin.vehicle.displacement}L
                  </span>
                )}
                {vin.vehicle.market && (
                  <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {vin.vehicle.market}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  vin.reset();
                  setActiveTab('decode');
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="تفريغ السيارة الحالية واختيار أو فك سيارة جديدة"
              >
                <RotateCcw size={12} className="text-slate-500" />
                تغيير السيارة / فك جديد
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-20 flex flex-1 flex-col overflow-hidden">
        <div className="custom-scrollbar flex-1 overflow-y-auto px-2 pb-24 pt-4 md:px-4 md:pt-5">
          {activeTab === 'decode' && (
            <VinDecodeTab
              isDecoding={vin.isDecoding}
              error={vin.decodeError}
              result={vin.result}
              history={vin.savedVins}
              onDecode={handleDecode}
              onSetManualVehicle={vin.setManualVehicle}
              onSave={() => {
                void handleSave();
              }}
              onNavigateToExtract={() => {
                setActiveTab('extract');
              }}
              onNavigateToInventory={() => {
                setActiveTab('inventory');
              }}
              isSaving={vin.isSaving}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryMatchTab
              hasVehicle={!!vin.vehicle}
              matchingProducts={vin.matchingProducts}
              isMatching={vin.isMatching}
              linkedProducts={vin.linkedProducts}
              isLinkedLoading={vin.isLinkedLoading}
              isLinking={vin.isLinking}
              onLink={productId => {
                void vin.linkProduct({ productId }).catch(() => undefined);
              }}
              onUnlink={id => {
                void vin.unlinkProduct(id).catch(() => undefined);
              }}
              onNavigateToExtract={() => {
                setActiveTab('extract');
              }}
              onNavigateToDecode={() => {
                setActiveTab('decode');
              }}
            />
          )}

          {activeTab === 'extract' && (
            <PartsExtractTab
              hasVehicle={!!vin.vehicle}
              {...(user?.company_id !== undefined ? { companyId: user.company_id } : {})}
              vehicle={vin.vehicle}
              onSearchPart={vin.searchPartByNumber}
              isSearching={vin.isSearching}
              onAdd={parts =>
                vin.vehicle
                  ? vin.addToInventory({ vehicle: vin.vehicle, parts })
                  : Promise.resolve(0)
              }
              onNavigateToInventory={() => {
                setActiveTab('inventory');
              }}
              onNavigateToDecode={() => {
                setActiveTab('decode');
              }}
              isAdding={vin.isAdding}
              canAdd={canAddToInventory}
            />
          )}

          {activeTab === 'vin' && (
            <VinsTab
              savedVins={vin.savedVins}
              isLoading={vin.isSavedVinsLoading}
              onLoadParts={vin.loadLinkedProducts}
              onSearchPart={vin.searchPartByNumber}
              isSearching={vin.isSearching}
              onAddParts={(vehicle, parts) => vin.addToInventory({ vehicle, parts })}
              onOpenInExtract={v => {
                const info = safeParseVehicleInfo(v.decoded);
                if (info != null) {
                  void vin.setManualVehicle(info, v.vin).then(() => {
                    setActiveTab('extract');
                  });
                }
              }}
              onSaveManualVehicle={vin.saveManualVehicle}
              onDeleteSavedVin={vin.deleteSavedVin}
              isAdding={vin.isAdding}
              canAdd={canAddToInventory}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default VINPage;
/* eslint-enable max-lines-per-function, complexity */
