import React, { useMemo, useState } from 'react';
import { Users, UserPlus, FileText, LayoutGrid, Edit, Trash2, History, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useParties, usePartyMutations, usePartiesView } from './hooks';
import { Party, PartyView, PartyType, PartyFormData } from './types';
import { useAIPrefillStore } from '../ai/store';
import MicroHeader from '../../ui/base/MicroHeader';
import PartiesStats from './components/PartiesStats';
import ExcelTable, { Column } from '../../ui/common/ExcelTable';
import PartyModal from './components/PartyModal';
import StatementView from './components/StatementView';
import CategoriesView from './components/CategoriesView';
import CustomerTimelineModal from './components/customers/CustomerTimelineModal';
import Button from '../../ui/base/Button';
import Avatar from '../../ui/base/Avatar';
import { formatCurrency, cn } from '../../core/utils';
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
        activeView, setActiveView,
        searchTerm, setSearchTerm,
        isModalOpen,
        editingParty,
        handleEdit,
        handleAddNew,
        handleCloseModal
    } = usePartiesView();
    const [isMaximized, setIsMaximized] = useState(false);
    const [isZenMode, setIsZenMode] = useState(false);

    const { data: parties, isLoading, stats } = useParties(partyType, searchTerm);
    const { saveParty, deleteParty, isSaving } = usePartyMutations(partyType);

    // Timeline modal state
    const [selectedCustomer, setSelectedCustomer] = useState<Party | null>(null);
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);
    // AI Prefill Logic
    const consumePrefill = useAIPrefillStore(s => s.consumePrefill);
    const [prefillData, setPrefillData] = useState<Partial<PartyFormData> | null>(null);

    React.useEffect(() => {
        const intent = partyType === 'customer' ? 'create_customer' : 'create_supplier';
        const aiData = consumePrefill(intent);
        if (aiData && aiData.entities) {
            setPrefillData({
                name: aiData.entities.partyName || ''
            });
            handleAddNew();
        }
    }, [partyType, consumePrefill, handleAddNew]);

    const defaultTitle = partyType === 'customer' ? t('customer_management') : t('supplier_management');
    const displayTitle = title || defaultTitle;
    const displayIcon = icon || Users;
    const displayIconColor = iconColor || (partyType === 'customer' ? 'text-emerald-600' : 'text-blue-600');

    const columns: Column<Party>[] = useMemo(() => [
        {
            header: t('name'),
            accessor: (row: Party) => (
                <div className="flex items-center gap-3">
                    <Avatar name={row.name} size="sm" />
                    <div className="flex flex-col items-start translate-y-[1px]">
                        <span className="font-bold text-gray-900 dark:text-white leading-tight">{row.name}</span>
                        {row.email && <span className="text-[10px] text-gray-400 font-medium">{row.email}</span>}
                    </div>
                </div>
            ),
            accessorKey: 'name',
            sortKey: 'name',
            align: 'right'
        },
        {
            header: t('phone'),
            accessor: (row: Party) => <span dir="ltr" className="font-mono text-xs text-slate-500">{row.phone || '---'}</span>,
            accessorKey: 'phone',
            width: '140px',
            align: 'center'
        },
        {
            header: t('category'),
            accessor: (row: Party) => (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-tighter">
                    {row.category || t('general')}
                </span>
            ),
            accessorKey: 'category',
            width: '100px',
            align: 'center'
        },
        {
            header: t('status'),
            accessor: (row: Party) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    row.status === 'active'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30'
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'
                )}>
                    {row.status === 'active' ? t('active') : t('blocked')}
                </span>
            ),
            accessorKey: 'status',
            width: '80px',
            align: 'center'
        },
        {
            header: t('balance'),
            accessor: (row: Party) => {
                const val = Number(row.balance);
                return (
                    <span dir="ltr" className={cn(
                        "text-sm font-bold font-mono tracking-tighter",
                        val > 0 ? "text-emerald-600" : val < 0 ? "text-rose-600" : "text-gray-400"
                    )}>
                        {formatCurrency(val)}
                    </span>
                );
            },
            accessorKey: 'balance',
            sortKey: 'balance',
            width: '130px',
            align: 'center'
        },
        {
            header: t('actions'),
            accessor: (row: Party) => (
                <div className="flex items-center gap-1 justify-center">
                    {partyType === 'customer' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomer(row);
                                setIsTimelineOpen(true);
                            }}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="تاريخ العميل"
                        >
                            <History size={14} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                        <Edit size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(t('confirm_delete'))) deleteParty(row.id);
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
            width: partyType === 'customer' ? '120px' : '100px',
            align: 'center'
        }
    ], [t, partyType, handleEdit, deleteParty]);

    const headerActions = (
        <div className="flex items-center gap-2">
            <Button
                onClick={() => navigate('/pos')}
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
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <PartiesStats stats={stats} type={partyType} />

                        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                            <ExcelTable
                                columns={columns}
                                data={parties || []}
                                colorTheme={partyType === 'customer' ? 'blue' : 'indigo'}
                                isRTL={true}
                                showSearch={false}
                                isLoading={isLoading}
                                onRowDoubleClick={(row: any) => handleEdit(row as Party)}
                            />
                        </div>
                    </div>
                );
            case 'statements': return <StatementView partyType={partyType} />;
            case 'categories': return <CategoriesView partyType={partyType} />;
        }
    };

    return (
        <FullscreenContainer isMaximized={isMaximized} onToggleMaximize={() => { setIsMaximized(false); setIsZenMode(false); }} isZenMode={isZenMode}>
            <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 font-cairo">
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
                        { id: 'categories', label: t('categories'), icon: LayoutGrid }
                    ]}
                    activeTab={activeView}
                    onTabChange={(id) => setActiveView(id as PartyView)}
                    isMaximized={isMaximized}
                    onToggleMaximize={() => {
                        setIsMaximized(!isMaximized);
                        if (isMaximized) setIsZenMode(false);
                    }}
                    isZenMode={isZenMode}
                    onToggleZen={() => setIsZenMode(!isZenMode)}
                />

            <div className={cn(
                "flex-1 overflow-hidden flex flex-col relative z-20",
                isZenMode ? "bg-white dark:bg-slate-900" : ""
            )}>
                <div className="flex-1 overflow-y-auto px-2 md:px-4 pt-5 md:pt-6 pb-24 custom-scrollbar">
                    {renderContent()}
                </div>
            </div>

            <PartyModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={(data) => {
                    const payload = { data: data as PartyFormData };
                    if (editingParty?.id) {
                        (payload as any).id = editingParty.id;
                    }
                    saveParty(payload as any, { onSuccess: () => {
                        handleCloseModal();
                        setPrefillData(null);
                    }});
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
        </div>
        </FullscreenContainer>
    );
};

export default PartiesPage;