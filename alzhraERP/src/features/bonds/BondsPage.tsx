import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  LayoutGrid,
  Table as TableIcon,
  Maximize2,
  Minimize2,
  Wallet,
  Activity,
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
import { useTranslation } from '../../lib/hooks/useTranslation';
import { useAIPrefillStore } from '../ai/store';
import { cn, formatCurrency } from '../../core/utils';
import { useNavigate } from 'react-router-dom';

type ViewType = 'list' | 'analytics';

const BondsPage: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<BondType>('receipt');
  const [modalType, setModalType] = useState<BondType>('receipt');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewType, setViewType] = useState<ViewType>('list');
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>('table');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'bank'>('all');
  const [previewBond, setPreviewBond] = useState<Bond | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { t } = useTranslation();

  const { data: bonds, isLoading } = useBonds(activeTab);
  const { mutate: createBond, isPending: isCreating } = useBondMutation();

  // Fetch server-sided analytics
  const { data: serverAnalytics } = useBondsAnalytics();

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
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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

  // Map server response to component expected structure
  const analytics = useMemo(() => {
    if (!serverAnalytics) {
      return {
        totalAmount: 0,
        count: 0,
        avgAmount: 0,
        chartData: [],
        accountData: [],
      };
    }
    const safeAnalytics = serverAnalytics as Record<string, unknown>;
    return {
      totalAmount: (safeAnalytics.totalAmount as number) || 0,
      count: (safeAnalytics.count as number) || 0,
      avgAmount: (safeAnalytics.avgAmount as number) || 0,
      chartData:
        (safeAnalytics.chartData as Array<{ date: string; amount: number; count: number }>) || [],
      accountData:
        (safeAnalytics.accountData as Array<{ name: string; amount: number; count: number }>) || [],
    };
  }, [serverAnalytics]);

  const totals = useMemo(() => {
    const safeAnalytics = serverAnalytics as Record<string, unknown> | null;
    const safeTotals = (safeAnalytics?.totals as Record<string, number>) || {};
    if (!safeTotals || Object.keys(safeTotals).length === 0) {
      return {
        receiptCount: 0,
        receiptAmount: 0,
        paymentCount: 0,
        paymentAmount: 0,
        netAmount: 0,
      };
    }
    return {
      receiptCount: safeTotals.receiptCount || 0,
      receiptAmount: safeTotals.receiptAmount || 0,
      paymentCount: safeTotals.paymentCount || 0,
      paymentAmount: safeTotals.paymentAmount || 0,
      netAmount: safeTotals.netAmount || 0,
    };
  }, [serverAnalytics]);

  // Filter bonds by payment method
  const displayedBonds = useMemo(() => {
    if (!bonds) return [];
    if (paymentMethodFilter === 'all') return bonds;
    return bonds.filter(b => b.payment_method === paymentMethodFilter);
  }, [bonds, paymentMethodFilter]);

  // Analytics View
  if (viewType === 'analytics') {
    return (
      <BondsAnalyticsView
        analytics={analytics}
        totals={totals}
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
          onClick={() => {
            setDisplayMode('table');
          }}
          className={`rounded-md p-1.5 transition-all ${displayMode === 'table' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'text-gray-400 hover:text-gray-600'}`}
          title="عرض الجدول المحاسبي العريض"
        >
          <TableIcon size={16} />
        </button>
        <button
          onClick={() => {
            setDisplayMode('cards');
          }}
          className={`rounded-md p-1.5 transition-all ${displayMode === 'cards' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'text-gray-400 hover:text-gray-600'}`}
          title="عرض البطاقات"
        >
          <LayoutGrid size={16} />
        </button>
      </div>

      {/* Fullscreen Toggle */}
      <button
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

      <Button
        onClick={() => {
          setViewType('analytics');
        }}
        variant="outline"
        size="sm"
      >
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
        onTabChange={id => {
          setActiveTab(id as BondType);
        }}
        searchPlaceholder={t('search_in_bonds')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Desktop Quick KPI Summary Bar (شريط ملخص السيولة الفوري للكمبيوتر) */}
      <div className="hidden grid-cols-2 gap-3 px-3 pb-1 pt-3 md:grid md:px-5 lg:grid-cols-4">
        {/* Total Receipts Card */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-3.5 shadow-sm dark:border-emerald-900/30 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
              إجمالي المقبوضات
            </span>
            <div className="rounded-lg bg-emerald-50 p-1 text-emerald-600 dark:bg-emerald-900/30">
              <ArrowDownCircle size={15} />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totals.receiptAmount, 'SAR')}
            </span>
            <span className="font-mono text-[10px] font-bold text-slate-400">
              {totals.receiptCount} سند
            </span>
          </div>
        </div>

        {/* Total Payments Card */}
        <div className="rounded-2xl border border-rose-100 bg-white p-3.5 shadow-sm dark:border-rose-900/30 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">
              إجمالي المدفوعات
            </span>
            <div className="rounded-lg bg-rose-50 p-1 text-rose-600 dark:bg-rose-900/30">
              <ArrowUpCircle size={15} />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono text-lg font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(totals.paymentAmount, 'SAR')}
            </span>
            <span className="font-mono text-[10px] font-bold text-slate-400">
              {totals.paymentCount} سند
            </span>
          </div>
        </div>

        {/* Net Cash Flow Card */}
        <div className="rounded-2xl border border-blue-100 bg-white p-3.5 shadow-sm dark:border-blue-900/30 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
              صافي تدفق السيولة
            </span>
            <div className="rounded-lg bg-blue-50 p-1 text-blue-600 dark:bg-blue-900/30">
              <Wallet size={15} />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span
              className={cn(
                'font-mono text-lg font-black',
                totals.netAmount >= 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-amber-600 dark:text-amber-400'
              )}
            >
              {formatCurrency(totals.netAmount, 'SAR')}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {totals.netAmount >= 0 ? 'فائض نقدي' : 'عجز نقدي'}
            </span>
          </div>
        </div>

        {/* Average Bond Amount */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">متوسط قيمة السند</span>
            <div className="rounded-lg bg-indigo-50 p-1 text-indigo-600 dark:bg-indigo-900/30">
              <Activity size={15} />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono text-lg font-black text-slate-800 dark:text-slate-100">
              {formatCurrency(analytics.avgAmount, 'SAR')}
            </span>
            <span className="font-mono text-[10px] font-bold text-slate-400">
              إجمالي {analytics.count} سند
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-20 flex flex-1 flex-col overflow-hidden">
        <div className="custom-scrollbar flex-1 overflow-y-auto px-2 pb-24 pt-3 md:px-5 md:pt-4">
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
        onClose={() => {
          setIsModalOpen(false);
        }}
        type={modalType}
        onSubmit={data => {
          createBond(data, {
            onSuccess: () => {
              setIsModalOpen(false);
            },
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
