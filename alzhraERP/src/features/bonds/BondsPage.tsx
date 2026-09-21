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
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { useBonds, useBondMutation, useBondsAnalytics } from './hooks';
import type { Bond, BondType } from './types';
import type { DatePreset } from '../../core/types/invoiceSearch';
import { getDateRangeForPreset } from '../../core/utils/dateUtils';
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

const BOND_DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'all', label: 'كل الفترات' },
  { id: 'today', label: 'اليوم' },
  { id: 'this_week', label: 'آخر 7 أيام' },
  { id: 'this_month', label: 'هذا الشهر' },
  { id: 'last_month', label: 'الشهر الماضي' },
  { id: 'custom', label: 'مخصص' },
];

type ViewType = 'list' | 'analytics';

const BondsPage: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<BondType>('receipt');
  const [modalType, setModalType] = useState<BondType>('receipt');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'number'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewType, setViewType] = useState<ViewType>('list');
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>('table');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'bank'>('all');
  const [previewBond, setPreviewBond] = useState<Bond | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { t } = useTranslation();

  const { data: bonds, isLoading } = useBonds(activeTab);
  // Fetch all bonds (no type filter) for accurate KPI stats across all tabs
  const { data: allBondsData } = useBonds();
  const { mutate: createBond, isPending: isCreating } = useBondMutation();

  // Fetch server-sided analytics (no period here — KPI bar shows all time)
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

  // Falls back to computing from loaded bonds data if server returns zeros
  const analytics = useMemo(() => {
    const safeAnalytics = serverAnalytics as Record<string, unknown> | null;
    const serverCount = (safeAnalytics?.count as number) || 0;
    const serverTotal = (safeAnalytics?.totalAmount as number) || 0;

    // Local computation from ALL loaded bonds as fallback
    const allBonds = allBondsData || [];
    const localTotal = allBonds.reduce((sum, b) => sum + (b.base_amount || b.amount || 0), 0);
    const localCount = allBonds.length;

    const resolvedTotal = serverTotal > 0 ? serverTotal : localTotal;
    const resolvedCount = serverCount > 0 ? serverCount : localCount;
    const serverAvg = (safeAnalytics?.avgAmount as number) || 0;
    const resolvedAvg =
      serverAvg > 0 ? serverAvg : resolvedCount > 0 ? resolvedTotal / resolvedCount : 0;

    return {
      totalAmount: resolvedTotal,
      count: resolvedCount,
      avgAmount: Math.round(resolvedAvg * 100) / 100,
      chartData:
        (safeAnalytics?.chartData as Array<{ date: string; amount: number; count: number }>) || [],
      accountData:
        (safeAnalytics?.accountData as Array<{ name: string; amount: number; count: number }>) ||
        [],
    };
  }, [serverAnalytics, allBondsData]);

  const totals = useMemo(() => {
    const safeAnalytics = serverAnalytics as Record<string, unknown> | null;
    const safeTotals = (safeAnalytics?.totals as Record<string, number>) || {};

    // Server data has real values — use it
    if (safeTotals && (safeTotals.receiptAmount > 0 || safeTotals.paymentAmount > 0)) {
      return {
        receiptCount: safeTotals.receiptCount || 0,
        receiptAmount: safeTotals.receiptAmount || 0,
        paymentCount: safeTotals.paymentCount || 0,
        paymentAmount: safeTotals.paymentAmount || 0,
        netAmount: safeTotals.netAmount || 0,
      };
    }

    // Local fallback: compute from ALL loaded bonds
    const allBonds = allBondsData || [];
    const receiptBonds = allBonds.filter(b => b.type === 'receipt');
    const paymentBonds = allBonds.filter(b => b.type === 'payment');
    const receiptAmount = receiptBonds.reduce((s, b) => s + (b.base_amount || b.amount || 0), 0);
    const paymentAmount = paymentBonds.reduce((s, b) => s + (b.base_amount || b.amount || 0), 0);
    return {
      receiptCount: receiptBonds.length,
      receiptAmount,
      paymentCount: paymentBonds.length,
      paymentAmount,
      netAmount: receiptAmount - paymentAmount,
    };
  }, [serverAnalytics, allBondsData]);

  // Filter & Sort bonds
  const displayedBonds = useMemo(() => {
    if (!bonds) return [];
    let result = [...bonds];

    // Search term
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        b =>
          (b.payment_number || '').toLowerCase().includes(term) ||
          (b.description || '').toLowerCase().includes(term) ||
          (b.party_name || '').toLowerCase().includes(term) ||
          (b.account_name || '').toLowerCase().includes(term)
      );
    }

    // Payment method filter
    if (paymentMethodFilter !== 'all') {
      result = result.filter(b => b.payment_method === paymentMethodFilter);
    }

    // Currency filter
    if (currencyFilter !== 'all') {
      result = result.filter(
        b => (b.currency_code || '').toUpperCase() === currencyFilter.toUpperCase()
      );
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter(b => b.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(b => b.date <= dateTo);
    }

    // Multi-field Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'amount') {
        cmp = (a.amount || 0) - (b.amount || 0);
      } else if (sortBy === 'number') {
        cmp = (a.payment_number || '').localeCompare(b.payment_number || '', undefined, {
          numeric: true,
        });
      } else {
        const dateA = new Date(a.date).getTime() || 0;
        const dateB = new Date(b.date).getTime() || 0;
        cmp = dateA - dateB;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [bonds, searchTerm, paymentMethodFilter, currencyFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const hasActiveFilters = Boolean(
    (searchTerm && searchTerm.trim() !== '') ||
    paymentMethodFilter !== 'all' ||
    currencyFilter !== 'all' ||
    datePreset !== 'all' ||
    dateFrom ||
    dateTo ||
    sortBy !== 'date' ||
    sortOrder !== 'desc'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setPaymentMethodFilter('all');
    setCurrencyFilter('all');
    setDatePreset('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSortBy('date');
    setSortOrder('desc');
  };

  // Analytics View — BondsAnalyticsView manages its own data fetching with period filter
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
          onClick={() => {
            setPaymentMethodFilter('all');
          }}
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
          onClick={() => {
            setPaymentMethodFilter('cash');
          }}
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
          onClick={() => {
            setPaymentMethodFilter('bank');
          }}
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
        onClick={() => {
          openCreateModal('transfer');
        }}
        variant="outline"
        size="sm"
        className="hidden md:inline-flex"
        leftIcon={<ArrowRightLeft size={14} />}
      >
        تحويل داخلي
      </Button>

      {/* Primary Bond Create Button */}
      <Button
        onClick={() => {
          openCreateModal(activeTab);
        }}
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
          {/* Enhanced Filtering & Sorting Toolbar */}
          <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Date Presets Pills */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--app-text-secondary)]">
                  <Calendar size={12} />
                  <span>الفترة:</span>
                </span>
                {BOND_DATE_PRESETS.map(preset => {
                  const isActive = datePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setDatePreset(preset.id);
                        const range = getDateRangeForPreset(preset.id);
                        setDateFrom(range.from);
                        setDateTo(range.to);
                      }}
                      className={`rounded-md px-2 py-1 text-[11px] font-bold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-[var(--app-bg)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Currency & Sort Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Currency Filter */}
                <select
                  value={currencyFilter}
                  onChange={e => setCurrencyFilter(e.target.value)}
                  aria-label="تصفية حسب العملة"
                  className="focus:outline-hidden h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)] focus:border-blue-500"
                >
                  <option value="all">كل العملات</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                  <option value="YER">ريال يمني (YER)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="OMR">ريال عماني (OMR)</option>
                  <option value="CNY">يوان صيني (CNY)</option>
                </select>

                {/* Sort Selector */}
                <select
                  value={`${sortBy}_${sortOrder}`}
                  onChange={e => {
                    const [by, order] = e.target.value.split('_');
                    setSortBy(by as 'date' | 'amount' | 'number');
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                  aria-label="ترتيب وفرز السندات"
                  className="focus:outline-hidden h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)] focus:border-blue-500"
                >
                  <option value="date_desc">الأحدث تاريخاً / وقتاً</option>
                  <option value="date_asc">الأقدم تاريخاً</option>
                  <option value="amount_desc">الأعلى مبلغاً</option>
                  <option value="amount_asc">الأقل مبلغاً</option>
                  <option value="number_desc">رقم السند (تنازلي)</option>
                  <option value="number_asc">رقم السند (تصاعدي)</option>
                </select>

                {/* Counter */}
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {displayedBonds.length} سند
                </span>

                {/* Reset button */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
                    title="مسح الفلاتر"
                  >
                    <RotateCcw size={12} />
                    <span>مسح</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom Date Range Row */}
            {datePreset === 'custom' && (
              <div className="border-[var(--app-border)]/60 flex flex-wrap items-center gap-2 border-t pt-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-[var(--app-text-secondary)]">
                    من تاريخ:
                  </label>
                  <input
                    type="date"
                    value={dateFrom || ''}
                    onChange={e => setDateFrom(e.target.value)}
                    className="h-8 rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-[var(--app-text-secondary)]">
                    إلى تاريخ:
                  </label>
                  <input
                    type="date"
                    value={dateTo || ''}
                    onChange={e => setDateTo(e.target.value)}
                    className="h-8 rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
                  />
                </div>
              </div>
            )}
          </div>

          <BondsList
            bonds={displayedBonds}
            isLoading={isLoading}
            searchTerm={searchTerm}
            displayMode={displayMode}
            onPreviewBond={bond => {
              setPreviewBond(bond);
            }}
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
        onClose={() => {
          setPreviewBond(null);
        }}
        bond={previewBond}
      />
    </div>
  );
};

export default BondsPage;
