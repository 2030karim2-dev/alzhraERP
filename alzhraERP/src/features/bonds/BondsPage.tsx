/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  LayoutGrid,
  Table as TableIcon,
  Maximize2,
  Minimize2,
  ArrowRightLeft,
} from 'lucide-react';
import { useBonds, useBondMutation, useBondsAnalytics } from './hooks';
import type { Bond, BondType } from './types';
import MicroHeader from '../../ui/base/MicroHeader';
import Button from '../../ui/base/Button';
import CreateBondModal from './components/CreateBondModal';
import BondsList from './components/BondsList';
import BondsAnalyticsView from './components/BondsAnalyticsView';
import BondVoucherModal from './components/BondVoucherModal';
import { BondsQuickKpiBar } from './components/BondsQuickKpiBar';
import { BondsToolbar } from './components/BondsToolbar';
import { useBondsFilter } from './hooks/useBondsFilter';
import { useBondsTotals } from './hooks/useBondsTotals';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { useAIPrefillStore } from '../ai/store';
import { cn } from '../../core/utils';

type ViewType = 'list' | 'analytics';

const BondsPage: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<BondType>('receipt');
  const [modalType, setModalType] = useState<BondType>('receipt');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('list');
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>('table');
  const [previewBond, setPreviewBond] = useState<Bond | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { t } = useTranslation();

  const { data: bonds, isLoading } = useBonds(activeTab);
  const { data: allBondsData } = useBonds();
  const { mutate: createBond, isPending: isCreating } = useBondMutation();
  const { data: serverAnalytics } = useBondsAnalytics();

  // Search, Filter and Sort state & computations
  const {
    searchTerm,
    setSearchTerm,
    datePreset,
    setDatePreset,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    currencyFilter,
    setCurrencyFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    displayedBonds,
    hasActiveFilters,
    handleResetFilters,
  } = useBondsFilter(bonds);

  // Totals & KPI metrics
  const { totals, analytics } = useBondsTotals(serverAnalytics, allBondsData);

  // AI Prefill: consume pending bond intent
  const consumePrefill = useAIPrefillStore((s: any) => s.consumePrefill);
  useEffect(() => {
    const aiData = consumePrefill(['create_bond_receipt', 'create_bond_payment']);
    if (aiData) {
      if (aiData.intent === 'create_bond_receipt') {
        setActiveTab('receipt');
        setModalType('receipt');
      } else {
        setActiveTab('payment');
        setModalType('payment');
      }
      setIsModalOpen(true);
    }
  }, [consumePrefill]);

  // Handle browser fullscreen sync
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen(!isFullscreen);
    }
  };

  // Analytics View
  if (viewType === 'analytics') {
    return (
      <BondsAnalyticsView
        onSwitchToList={() => {
          setViewType('list');
        }}
      />
    );
  }

  const openCreateModal = (type: BondType) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const headerActions = (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Payment Method Quick Filter */}
      <div className="hidden items-center gap-0.5 rounded-lg border border-gray-200 bg-[var(--app-surface)] p-0.5 dark:border-slate-800 lg:flex">
        <button
          type="button"
          onClick={() => setPaymentMethodFilter('all')}
          className={cn(
            'rounded-md px-2 py-1 text-[11px] font-bold transition-all',
            paymentMethodFilter === 'all'
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'
              : 'text-gray-400 hover:text-gray-600'
          )}
        >
          الكل
        </button>
        <button
          type="button"
          onClick={() => setPaymentMethodFilter('cash')}
          className={cn(
            'rounded-md px-2 py-1 text-[11px] font-bold transition-all',
            paymentMethodFilter === 'cash'
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30'
              : 'text-gray-400 hover:text-gray-600'
          )}
        >
          نقداً
        </button>
        <button
          type="button"
          onClick={() => setPaymentMethodFilter('bank')}
          className={cn(
            'rounded-md px-2 py-1 text-[11px] font-bold transition-all',
            paymentMethodFilter === 'bank'
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'
              : 'text-gray-400 hover:text-gray-600'
          )}
        >
          بنك
        </button>
      </div>

      {/* View Display Mode Toggle */}
      <div className="flex items-center rounded-lg border border-gray-200 bg-[var(--app-surface)] p-0.5 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setDisplayMode('table')}
          className={`rounded-md p-1.5 transition-all ${
            displayMode === 'table'
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title="عرض الجدول المحاسبي العريض"
        >
          <TableIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => setDisplayMode('cards')}
          className={`rounded-md p-1.5 transition-all ${
            displayMode === 'cards'
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title="عرض البطاقات"
        >
          <LayoutGrid size={16} />
        </button>
      </div>

      {/* Fullscreen Toggle */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="rounded-lg border border-gray-200 bg-[var(--app-surface)] p-1.5 text-gray-500 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600 dark:border-slate-800 dark:text-slate-400"
        title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة وضع الكمبيوتر'}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      <Button
        onClick={() => navigate('/pos')}
        variant="outline"
        size="sm"
        className="hidden sm:inline-flex"
        leftIcon={<LayoutGrid size={14} />}
      >
        نقطة البيع
      </Button>

      <Button onClick={() => setViewType('analytics')} variant="outline" size="sm">
        تحليلات
      </Button>

      {/* Internal Transfer Button */}
      <Button
        onClick={() => openCreateModal('transfer')}
        variant="outline"
        size="sm"
        className="hidden md:inline-flex"
        leftIcon={<ArrowRightLeft size={14} />}
      >
        تحويل داخلي
      </Button>

      {/* Primary Bond Create Button */}
      <Button
        onClick={() => openCreateModal(activeTab)}
        variant={
          activeTab === 'receipt' ? 'success' : activeTab === 'transfer' ? 'primary' : 'danger'
        }
        size="sm"
        leftIcon={<Plus size={14} />}
      >
        {activeTab === 'receipt' ? 'سند قبض' : activeTab === 'transfer' ? 'تحويل مالي' : 'سند صرف'}
      </Button>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'font-cairo flex h-full flex-col bg-[#f8fafc] transition-all dark:bg-slate-950',
        isFullscreen && 'fixed inset-0 z-50 overflow-hidden'
      )}
    >
      <MicroHeader
        title={t('bonds_management')}
        icon={FileText}
        iconColor={
          activeTab === 'receipt'
            ? 'text-emerald-600'
            : activeTab === 'transfer'
              ? 'text-blue-600'
              : 'text-rose-600'
        }
        actions={headerActions}
        tabs={[
          { id: 'receipt', label: t('receipt_bonds'), icon: ArrowDownCircle },
          { id: 'payment', label: t('payment_bonds'), icon: ArrowUpCircle },
          { id: 'transfer', label: 'سندات التحويل', icon: ArrowRightLeft },
        ]}
        activeTab={activeTab}
        onTabChange={id => setActiveTab(id as BondType)}
        searchPlaceholder={t('search_in_bonds')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Desktop Quick KPI Summary Bar */}
      <BondsQuickKpiBar totals={totals} analytics={analytics} />

      <div className="relative z-20 flex flex-1 flex-col overflow-hidden">
        <div className="custom-scrollbar flex-1 overflow-y-auto px-2 pb-24 pt-3 md:px-5 md:pt-4">
          {/* Enhanced Filtering & Sorting Toolbar */}
          <BondsToolbar
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            currencyFilter={currencyFilter}
            setCurrencyFilter={setCurrencyFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            displayedCount={displayedBonds.length}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
          />

          <BondsList
            bonds={displayedBonds}
            isLoading={isLoading}
            searchTerm={searchTerm}
            displayMode={displayMode}
            onPreviewBond={bond => setPreviewBond(bond)}
          />
        </div>
      </div>

      {/* Fullscreen Create / Edit Bond Modal */}
      <CreateBondModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={modalType}
        onSubmit={data => {
          createBond(data, {
            onSuccess: () => setIsModalOpen(false),
          });
        }}
        isSubmitting={isCreating}
      />

      {/* Official Voucher Preview & Print Modal */}
      <BondVoucherModal
        isOpen={!!previewBond}
        onClose={() => setPreviewBond(null)}
        bond={previewBond}
      />
    </div>
  );
};

export default BondsPage;
