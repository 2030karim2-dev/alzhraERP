import React, { useMemo, useState } from 'react';
import { Users, UserPlus, FileText, LayoutGrid, Edit, Trash2, History, Globe } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useParties, usePartyMutations, usePartiesView } from './hooks';
import type { Party, PartyView, PartyType, PartyFormData } from './types';
import { useAIPrefillStore } from '../ai/store';
import MicroHeader from '../../ui/base/MicroHeader';
import PartiesStats from './components/PartiesStats';
import ExcelTable from '../../ui/common/ExcelTable';
import type { Column } from '../../ui/common/ExcelTable';
import PartyModal from './components/PartyModal';
import StatementView from './components/StatementView';
import CategoriesView from './components/CategoriesView';
import CustomerTimelineModal from './components/customers/CustomerTimelineModal';
import SupplierPortalShareModal from './components/SupplierPortalShareModal';
import Button from '../../ui/base/Button';
import Avatar from '../../ui/base/Avatar';
import { formatCurrency, cn } from '../../core/utils';
import { ROUTES } from '../../core/routes/paths';
import { useTranslation } from '../../lib/hooks/useTranslation';
import FullscreenContainer from '../../ui/base/FullscreenContainer';

interface PartiesPageProps {
  partyType: PartyType;
  title?: string;
  icon?: LucideIcon;
  iconColor?: string;
}

/** Segmented control for party type — navigates between /clients and /suppliers
 *  (URL is the single source of truth — plans/party-routes-tabs-cleanup.md). */
const PartyTypeSwitcher: React.FC<{
  partyType: PartyType;
  onSwitch: (type: PartyType) => void;
}> = ({ partyType, onSwitch }) => {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center gap-1 px-2 pt-3 md:px-4"
      role="tablist"
      aria-label="العملاء والموردون"
    >
      {(['customer', 'supplier'] as PartyType[]).map(type => (
        <button
          key={type}
          type="button"
          role="tab"
          aria-selected={partyType === type}
          onClick={() => {
            onSwitch(type);
          }}
          className={cn(
            'rounded-lg px-4 py-1.5 text-xs font-bold transition-all',
            partyType === type
              ? type === 'customer'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          )}
        >
          {type === 'customer' ? t('customers') : t('suppliers')}
        </button>
      ))}
    </div>
  );
};

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

  // Timeline modal state
  const [selectedCustomer, setSelectedCustomer] = useState<Party | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // Supplier Portal Share Modal State
  const [selectedSupplierForPortal, setSelectedSupplierForPortal] = useState<Party | null>(null);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);

  // AI Prefill Logic
  const consumePrefill = useAIPrefillStore(s => s.consumePrefill);
  const [prefillData, setPrefillData] = useState<Partial<PartyFormData> | null>(null);

  React.useEffect(() => {
    const intent = partyType === 'customer' ? 'create_customer' : 'create_supplier';
    const aiData = consumePrefill(intent);
    if (aiData && aiData.entities) {
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

  const columns: Column<Party>[] = useMemo(
    () => [
      {
        header: t('name'),
        accessor: (row: Party) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.name} size="sm" />
            <div className="flex translate-y-[1px] flex-col items-start">
              <span className="font-bold leading-tight text-gray-900 dark:text-white">
                {row.name}
              </span>
              {row.email && (
                <span className="text-[10px] font-medium text-gray-400">{row.email}</span>
              )}
            </div>
          </div>
        ),
        accessorKey: 'name',
        sortKey: 'name',
        align: 'right',
      },
      {
        header: t('phone'),
        accessor: (row: Party) => (
          <span dir="ltr" className="font-mono text-xs text-slate-500">
            {row.phone || '---'}
          </span>
        ),
        accessorKey: 'phone',
        width: '140px',
        align: 'center',
      },
      {
        header: t('category'),
        accessor: (row: Party) => (
          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {row.category || t('general')}
          </span>
        ),
        accessorKey: 'category',
        width: '100px',
        align: 'center',
      },
      {
        header: t('status'),
        accessor: (row: Party) => (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
              row.status === 'active'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'
            )}
          >
            {row.status === 'active' ? t('active') : t('blocked')}
          </span>
        ),
        accessorKey: 'status',
        width: '80px',
        align: 'center',
      },
      {
        header: t('balance'),
        accessor: (row: Party) => {
          const currencies = row.balances_by_currency?.filter(c => c.balance !== 0) || [];
          if (currencies.length > 0) {
            return (
              <div className="flex flex-col items-center gap-1">
                {currencies.map(c => (
                  <span
                    key={c.currency}
                    dir="ltr"
                    className={cn(
                      'rounded-md px-2 py-0.5 font-mono text-xs font-bold tracking-tighter',
                      c.balance > 0
                        ? 'border border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'border border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-400'
                    )}
                  >
                    {formatCurrency(c.balance, c.currency)}
                  </span>
                ))}
              </div>
            );
          }
          const val = Number(row.balance);
          return (
            <span
              dir="ltr"
              className={cn(
                'font-mono text-sm font-bold tracking-tighter',
                val === 0 ? 'text-gray-400' : val > 0 ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {formatCurrency(val)}
            </span>
          );
        },
        accessorKey: 'balance',
        sortKey: 'balance',
        width: '140px',
        align: 'center',
      },
      {
        header: t('actions'),
        accessor: (row: Party) => (
          <div className="flex items-center justify-center gap-1">
            {partyType === 'supplier' && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setSelectedSupplierForPortal(row);
                  setIsPortalModalOpen(true);
                }}
                className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                title="رابط بوابة المورد"
              >
                <Globe size={14} />
              </button>
            )}
            {partyType === 'customer' && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setSelectedCustomer(row);
                  setIsTimelineOpen(true);
                }}
                className="rounded-lg p-1.5 text-purple-600 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/20"
                title="تاريخ العميل"
              >
                <History size={14} />
              </button>
            )}
            <button
              onClick={e => {
                e.stopPropagation();
                handleEdit(row);
              }}
              className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                if (window.confirm(t('confirm_delete'))) deleteParty(row.id);
              }}
              className="rounded-lg p-1.5 text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
        width: partyType === 'customer' ? '120px' : '120px',
        align: 'center',
      },
    ],
    [t, partyType, handleEdit, deleteParty]
  );

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
          <div className="animate-in fade-in space-y-4 duration-500">
            <PartiesStats stats={stats} type={partyType} />

            <div className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
              <ExcelTable
                columns={columns}
                data={parties || []}
                colorTheme={partyType === 'customer' ? 'blue' : 'indigo'}
                isRTL={true}
                showSearch={false}
                isLoading={isLoading}
                onRowDoubleClick={row => handleEdit(row as Party)}
              />
            </div>
          </div>
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
          onTabChange={id => setActiveView(id as PartyView)}
          isMaximized={isMaximized}
          onToggleMaximize={() => {
            setIsMaximized(!isMaximized);
            if (isMaximized) setIsZenMode(false);
          }}
          isZenMode={isZenMode}
          onToggleZen={() => setIsZenMode(!isZenMode)}
        />

        {/* Type switcher — the URL is the single source of truth
                    (plans/party-routes-tabs-cleanup.md). */}
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
            const payload: { data: PartyFormData; id?: string } = { data: data as PartyFormData };
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
