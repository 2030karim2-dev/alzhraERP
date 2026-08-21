import React, { useState } from 'react';
import { ScanLine, PackageSearch, PackagePlus, Bookmark } from 'lucide-react';
import MicroHeader from '../../../ui/base/MicroHeader';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { useAuthStore } from '../../auth/store';
import { useVinIntelligence } from '../hooks/useVinIntelligence';
import { VinDecodeTab } from '../components/VinDecodeTab';
import { InventoryMatchTab } from '../components/InventoryMatchTab';
import { PartsExtractTab } from '../components/PartsExtractTab';
import { VinsTab } from '../components/VinsTab';
import type { VinDecodeMode } from '../types';

const VINPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('decode');

  const vin = useVinIntelligence(user?.company_id, user?.id);

  const canAddToInventory = user?.role === 'admin' || user?.role === 'manager';

  const tabs = [
    { id: 'decode', label: t('vin_tab_decode'), icon: ScanLine },
    { id: 'vin', label: t('vin_tab_saved'), icon: Bookmark },
    { id: 'inventory', label: t('vin_tab_inventory'), icon: PackageSearch },
    { id: 'extract', label: t('vin_tab_extract'), icon: PackagePlus },
  ];

  const handleDecode = async (vinValue: string, mode: VinDecodeMode) => {
    try {
      await vin.decodeVin(vinValue, mode);
    } catch {
      /* error surfaced via vin.decodeError */
    }
  };

  const handleSave = async () => {
    try {
      await vin.saveCurrentResult();
      setActiveTab('vin');
    } catch {
      /* error surfaced via toast */
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg)] font-cairo">
      <MicroHeader
        title={t('vin_intelligence')}
        icon={ScanLine}
        iconColor="text-blue-600"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id)}
      />

      <div className="flex-1 overflow-hidden flex flex-col relative z-20">
        <div className="flex-1 overflow-y-auto px-2 md:px-4 pt-4 md:pt-5 pb-24 custom-scrollbar">
          {activeTab === 'decode' && (
            <VinDecodeTab
              isDecoding={vin.isDecoding}
              error={vin.decodeError}
              result={vin.result}
              history={vin.savedVins}
              onDecode={handleDecode}
              onSetManualVehicle={vin.setManualVehicle}
              onSave={handleSave}
              onNavigateToExtract={() => setActiveTab('extract')}
              isSaving={vin.isSaving}
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
              isAdding={vin.isAdding}
              canAdd={canAddToInventory}
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
              onLink={(productId) => vin.linkProduct({ productId }).catch(() => undefined)}
              onUnlink={(id) => vin.unlinkProduct(id).catch(() => undefined)}
            />
          )}

          {activeTab === 'extract' && (
            <PartsExtractTab
              hasVehicle={!!vin.vehicle}
              vehicle={vin.vehicle}
              onSearchPart={vin.searchPartByNumber}
              isSearching={vin.isSearching}
              onAdd={(parts) => (vin.vehicle ? vin.addToInventory({ vehicle: vin.vehicle, parts }) : Promise.resolve(0))}
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
