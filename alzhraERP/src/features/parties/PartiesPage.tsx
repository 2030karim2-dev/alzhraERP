import React, { useState } from 'react';
import { Users, UserPlus, FileText, LayoutGrid } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useParties, usePartyMutations, usePartiesView } from './hooks';
import type { Party, PartyView, PartyType, PartyFormData } from './types';
import { useAIPrefillStore } from '../ai/store';
import MicroHeader from '../../ui/base/MicroHeader';
import PartyModal from './components/PartyModal';
import StatementView from './components/StatementView';
import CategoriesView from './components/CategoriesView';
import CustomerTimelineModal from './components/customers/CustomerTimelineModal';
import SupplierPortalShareModal from './components/SupplierPortalShareModal';
import PartyTypeSwitcher from './components/PartyTypeSwitcher';
import PartiesListView from './components/PartiesListView';
import { usePartiesColumns } from './hooks/usePartiesColumns';
import Button from '../../ui/base/Button';
import { cn } from '../../core/utils';
import { ROUTES } from '../../core/routes/paths';
import { useTranslation } from '../../lib/hooks/useTranslation';
import FullscreenContainer from '../../ui/base/FullscreenContainer';

interface PartiesPageProps {
  partyType: PartyType;
  title?: string;
  icon?: LucideIcon;
  iconColor?: string;
}

const PartiesPage: React.FC<PartiesPageProps> = ({ partyType, title, icon, iconColor }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    activeView,
    setActiveView,
    searchTerm,
    setSearchTerm,
    isModalOpen,
    editingParty,
    handleEdit,
    handleAddNew,
    handleCloseModal,
  } = usePartiesView();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  const { data: parties, isLoading, stats } = useParties(partyType, searchTerm);
  const { saveParty, deleteParty, isSaving } = usePartyMutations(partyType);

  // Modal states
  const [selectedCustomer, setSelectedCustomer] = useState<Party | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedSupplierForPortal, setSelectedSupplierForPortal] = useState<Party | null>(null);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);

  // AI Prefill Logic
  const consumePrefill = useAIPrefillStore(s => s.consumePrefill);
  const [prefillData, setPrefillData] = useState<Partial<PartyFormData> | null>(null);

  React.useEffect(() => {
    const intent = partyType === 'customer' ? 'create_customer' : 'create_supplier';
    const aiData = consumePrefill(intent);
    if (aiData?.entities) {
      setPrefillData({
        name: aiData.entities.partyName || '',
      });
      handleAddNew();
    }
  }, [partyType, consumePrefill, handleAddNew]);

  const defaultTitle =
    partyType === 'customer' ? t('customer_management') : t('supplier_management');
  const displayTitle = title || defaultTitle;
  const displayIcon = icon || Users;
  const displayIconColor =
    iconColor || (partyType === 'customer' ? 'text-emerald-600' : 'text-blue-600');

  const columns = usePartiesColumns({
    partyType,
    onEdit: handleEdit,
    onDelete: deleteParty,
    onOpenTimeline: party => {
      setSelectedCustomer(party);
      setIsTimelineOpen(true);
    },
    onOpenPortal: party => {
      setSelectedSupplierForPortal(party);
      setIsPortalModalOpen(true);
    },
  });

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => navigate(ROUTES.DASHBOARD.POS)}
        variant="outline"
        size="sm"
        leftIcon={<LayoutGrid size={14} />}
      >
        نقطة البيع
      </Button>
      <Button
        onClick={handleAddNew}
        variant={partyType === 'customer' ? 'success' : 'primary'}
        size="sm"
        leftIcon={<UserPlus size={14} />}
      >
        {partyType === 'customer' ? t('new_customer') : t('new_supplier')}
      </Button>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'list':
        return (
          <PartiesListView
            partyType={partyType}
            parties={parties}
            isLoading={isLoading}
            stats={stats}
            columns={columns}
            onEdit={handleEdit}
          />
        );
      case 'statements':
        return <StatementView partyType={partyType} />;
      case 'categories':
        return <CategoriesView partyType={partyType} />;
    }
  };

  return (
    <FullscreenContainer
      isMaximized={isMaximized}
      onToggleMaximize={() => {
        setIsMaximized(false);
        setIsZenMode(false);
      }}
      isZenMode={isZenMode}
    >
      <div className="font-cairo flex h-full flex-col bg-[#f8fafc] dark:bg-slate-950">
        <MicroHeader
          title={displayTitle}
          icon={displayIcon}
          iconColor={displayIconColor}
          actions={headerActions}
          searchPlaceholder={t('search_by_name_phone_category')}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          tabs={[
            { id: 'list', label: t('records'), icon: Users },
            { id: 'statements', label: t('account_statements'), icon: FileText },
            { id: 'categories', label: t('categories'), icon: LayoutGrid },
          ]}
          activeTab={activeView}
          onTabChange={id => {
            setActiveView(id as PartyView);
          }}
          isMaximized={isMaximized}
          onToggleMaximize={() => {
            setIsMaximized(!isMaximized);
            if (isMaximized) setIsZenMode(false);
          }}
          isZenMode={isZenMode}
          onToggleZen={() => {
            setIsZenMode(!isZenMode);
          }}
        />

        {/* Type switcher — the URL is the single source of truth */}
        <PartyTypeSwitcher
          partyType={partyType}
          onSwitch={type => {
            void navigate(
              type === 'customer' ? ROUTES.DASHBOARD.CLIENTS : ROUTES.DASHBOARD.SUPPLIERS
            );
          }}
        />

        <div
          className={cn(
            'relative z-20 flex flex-1 flex-col overflow-hidden',
            isZenMode ? 'bg-[var(--app-surface)]' : ''
          )}
        >
          <div className="custom-scrollbar flex-1 overflow-y-auto px-2 pb-24 pt-5 md:px-4 md:pt-6">
            {renderContent()}
          </div>
        </div>

        <PartyModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={data => {
            const payload: { data: PartyFormData; id?: string } = { data };
            if (editingParty?.id) {
              payload.id = editingParty.id;
            }
            saveParty(payload, {
              onSuccess: () => {
                handleCloseModal();
                setPrefillData(null);
              },
            });
          }}
          isSubmitting={isSaving}
          initialData={editingParty}
          prefillData={prefillData}
          partyType={partyType}
        />

        {/* Customer Timeline Modal */}
        <CustomerTimelineModal
          isOpen={isTimelineOpen}
          onClose={() => {
            setIsTimelineOpen(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
        />

        {/* Supplier Portal Share Modal */}
        <SupplierPortalShareModal
          isOpen={isPortalModalOpen}
          onClose={() => {
            setIsPortalModalOpen(false);
            setSelectedSupplierForPortal(null);
          }}
          party={selectedSupplierForPortal}
          onTokenUpdated={updated => {
            setSelectedSupplierForPortal(updated);
          }}
        />
      </div>
    </FullscreenContainer>
  );
};

export default PartiesPage;
