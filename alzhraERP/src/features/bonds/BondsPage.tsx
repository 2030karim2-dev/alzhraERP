import React, { useState, useMemo } from 'react';
import {
  FileText, Plus, ArrowDownCircle, ArrowUpCircle, LayoutGrid, Table as TableIcon
} from 'lucide-react';
import { useBonds, useBondMutation, useBondsAnalytics } from './hooks';
import { BondType } from './types';
import MicroHeader from '../../ui/base/MicroHeader';
import Button from '../../ui/base/Button';
import CreateBondModal from './components/CreateBondModal';
import BondsList from './components/BondsList';
import BondsAnalyticsView from './components/BondsAnalyticsView';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { useAIPrefillStore } from '../ai/store';

import { useNavigate } from 'react-router-dom';

type ViewType = 'list' | 'analytics';

const BondsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<BondType>('receipt');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewType, setViewType] = useState<ViewType>('list');
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>('cards');
  const { t } = useTranslation();

  const { data: bonds, isLoading } = useBonds(activeTab);
  const { mutate: createBond, isPending: isCreating } = useBondMutation();

  // Fetch server-sided analytics instead of client-sided aggregation
  const { data: serverAnalytics } = useBondsAnalytics();

  // AI Prefill: consume pending bond intent
  const consumePrefill = useAIPrefillStore((s: any) => s.consumePrefill);
  React.useEffect(() => {
    const aiData = consumePrefill(['create_bond_receipt', 'create_bond_payment']);
    if (aiData) {
      if (aiData.intent === 'create_bond_receipt') {
        setActiveTab('receipt');
      } else {
        setActiveTab('payment');
      }
      setIsModalOpen(true);
    }
  }, [consumePrefill]);

  // Map server response to component expected structure
  const analytics = useMemo(() => {
    if (!serverAnalytics) {
      return {
        totalAmount: 0,
        count: 0,
        avgAmount: 0,
        chartData: [],
        accountData: []
      };
    }
    const safeAnalytics = serverAnalytics as Record<string, unknown>;
    return {
      totalAmount: safeAnalytics.totalAmount as number || 0,
      count: safeAnalytics.count as number || 0,
      avgAmount: safeAnalytics.avgAmount as number || 0,
      chartData: safeAnalytics.chartData as { date: string; amount: number; count: number }[] || [],
      accountData: safeAnalytics.accountData as { name: string; amount: number; count: number }[] || []
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
        netAmount: 0
      };
    }
    return {
      receiptCount: safeTotals.receiptCount || 0,
      receiptAmount: safeTotals.receiptAmount || 0,
      paymentCount: safeTotals.paymentCount || 0,
      paymentAmount: safeTotals.paymentAmount || 0,
      netAmount: safeTotals.netAmount || 0
    };
  }, [serverAnalytics]);

  // Analytics View
  if (viewType === 'analytics') {
    return (
      <BondsAnalyticsView
        analytics={analytics}
        totals={totals}
        onSwitchToList={() => setViewType('list')}
      />
    );
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-gray-200 dark:border-slate-800 mr-2">
        <button
          onClick={() => setDisplayMode('cards')}
          className={`p-1.5 rounded-md transition-all ${displayMode === 'cards' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'text-gray-400 hover:text-gray-600'}`}
          title="عرض البطاقات"
        >
          <LayoutGrid size={16} />
        </button>
        <button
          onClick={() => setDisplayMode('table')}
          className={`p-1.5 rounded-md transition-all ${displayMode === 'table' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'text-gray-400 hover:text-gray-600'}`}
          title="عرض الجدول (إكسل)"
        >
          <TableIcon size={16} />
        </button>
      </div>
      <Button onClick={() => navigate('/pos')} variant="outline" size="sm" leftIcon={<LayoutGrid size={14} />}>
        نقطة البيع
      </Button>
      <Button onClick={() => setViewType('analytics')} variant="outline" size="sm">
        تحليلات
      </Button>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant={activeTab === 'receipt' ? 'success' : 'danger'}
        size="sm"
        leftIcon={<Plus size={14} />}
      >
        {activeTab === 'receipt' ? 'سند قبض' : 'سند صرف'}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 font-cairo">
      <MicroHeader
        title={t('bonds_management')}
        icon={FileText}
        iconColor={activeTab === 'receipt' ? 'text-emerald-600' : 'text-rose-600'}
        actions={headerActions}
        tabs={[
          { id: 'receipt', label: t('receipt_bonds'), icon: ArrowDownCircle },
          { id: 'payment', label: t('payment_bonds'), icon: ArrowUpCircle }
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as BondType)}
        searchPlaceholder={t('search_in_bonds')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <div className="flex-1 overflow-hidden flex flex-col relative z-20">
        <div className="flex-1 overflow-y-auto px-2 md:px-4 pt-5 md:pt-6 pb-24 custom-scrollbar">
          <BondsList
            bonds={bonds || []}
            isLoading={isLoading}
            searchTerm={searchTerm}
            displayMode={displayMode}
          />
        </div>
      </div>

      <CreateBondModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={activeTab}
        onSubmit={(data) => createBond(data, { onSuccess: () => setIsModalOpen(false) })}
        isSubmitting={isCreating}
      />
    </div>
  );
};

export default BondsPage;
