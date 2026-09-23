import React, { useState } from 'react';
import { Receipt, Plus, BarChart3, FileText } from 'lucide-react';

import CreateExpenseModal from '../components/CreateExpenseModal';
import { useExpensesData, useExpenseActions, useExpenseCategories } from '../hooks';
import MicroHeader from '../../../ui/base/MicroHeader';
import Button from '../../../ui/base/Button';
import ExpensesAnalyticsView from './ExpensesAnalyticsView';
import ExpensesListView from './ExpensesListView';
import ExpenseLedgerView from '../components/ExpenseLedgerView';
import { useAIPrefillStore } from '../../ai/store';
import { useTranslation } from '../../../lib/hooks/useTranslation';

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';
type ViewType = 'list' | 'analytics' | 'ledger';

const ExpensesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('list');
  const [period, setPeriod] = useState<PeriodType>('month');
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<string | null>(null);

  const { expenses, isLoading, stats } = useExpensesData(searchTerm);
  const { data: categories = [] } = useExpenseCategories();
  const { createExpense, isCreating, deleteExpense } = useExpenseActions();
  const { t } = useTranslation();

  // AI Prefill: consume pending expense intent
  const consumePrefill = useAIPrefillStore((s: any) => s.consumePrefill);
  React.useEffect(() => {
    const aiData = consumePrefill('create_expense');
    if (aiData) {
      setIsModalOpen(true);
    }
  }, [consumePrefill]);

  const periodLabels: Record<PeriodType, string> = {
    today: t('today'),
    week: t('week'),
    month: t('month'),
    quarter: t('quarter'),
    year: t('year'),
  };

  const handleOpenLedger = (categoryIdOrAccountId?: string) => {
    if (categoryIdOrAccountId) {
      // Check if it corresponds to an expense category with account_id
      const matchedCat = categories.find((c: any) => c.id === categoryIdOrAccountId);
      if (matchedCat && matchedCat.account_id) {
        setSelectedLedgerAccountId(matchedCat.account_id);
      } else {
        setSelectedLedgerAccountId(categoryIdOrAccountId);
      }
    }
    setViewType('ledger');
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {/* View Segment Control */}
      <div className="shadow-2xs flex rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5">
        <button
          type="button"
          onClick={() => {
            setViewType('list');
          }}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
            viewType === 'list'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]'
          }`}
        >
          <Receipt size={13} />
          <span>سجل المصروفات</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setViewType('analytics');
          }}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
            viewType === 'analytics'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]'
          }`}
        >
          <BarChart3 size={13} />
          <span>التحليلات</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setViewType('ledger');
          }}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
            viewType === 'ledger'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]'
          }`}
        >
          <FileText size={13} />
          <span>كشف حساب تفصيلي</span>
        </button>
      </div>

      <Button
        onClick={() => {
          setIsModalOpen(true);
        }}
        variant="danger"
        size="sm"
        leftIcon={<Plus size={14} />}
      >
        {t('add_expense')}
      </Button>
    </div>
  );

  return (
    <div className="font-cairo flex h-full flex-col bg-[#f8fafc] dark:bg-slate-950">
      <MicroHeader
        title={
          viewType === 'ledger'
            ? 'كشف حساب تفصيلي للمصروفات والعهد'
            : viewType === 'analytics'
              ? t('expenses_analytics_title')
              : t('expenses_management_title')
        }
        icon={viewType === 'ledger' ? FileText : viewType === 'analytics' ? BarChart3 : Receipt}
        iconColor={viewType === 'ledger' ? 'text-blue-600' : 'text-rose-600'}
        actions={headerActions}
        {...(viewType === 'list'
          ? {
              searchPlaceholder: t('search_expenses_placeholder'),
              searchValue: searchTerm,
              onSearchChange: setSearchTerm,
            }
          : {})}
      />

      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {viewType === 'ledger' && (
          <ExpenseLedgerView
            initialAccountId={selectedLedgerAccountId}
            onBackToList={() => {
              setViewType('list');
            }}
          />
        )}

        {viewType === 'analytics' && (
          <div className="space-y-4">
            {/* Period Filter Bar for Analytics */}
            <div className="shadow-2xs flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5">
              <span className="text-xs font-bold text-[var(--app-text-secondary)]">
                فترة التحليل المالي:
              </span>
              <div className="flex rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-0.5">
                {(['today', 'week', 'month', 'quarter', 'year'] as PeriodType[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPeriod(p);
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                      period === p
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
              </div>
            </div>

            <ExpensesAnalyticsView expenses={expenses || []} period={period} />
          </div>
        )}

        {viewType === 'list' && (
          <ExpensesListView
            expenses={expenses || []}
            isLoading={isLoading}
            stats={stats}
            onDelete={deleteExpense}
            onOpenLedger={handleOpenLedger}
          />
        )}
      </div>

      <CreateExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onSubmit={data => {
          createExpense(data, {
            onSuccess: () => {
              setIsModalOpen(false);
            },
          });
        }}
        isSubmitting={isCreating}
      />
    </div>
  );
};

export default ExpensesPage;
