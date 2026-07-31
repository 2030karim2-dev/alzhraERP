import React, { useState } from 'react';
import {
  Receipt, Plus, BarChart3
} from 'lucide-react';

import CreateExpenseModal from '../components/CreateExpenseModal';
import { useExpensesData, useExpenseActions } from '../hooks';
import MicroHeader from '../../../ui/base/MicroHeader';
import Button from '../../../ui/base/Button';
import ExpensesAnalyticsView from './ExpensesAnalyticsView';
import ExpensesListView from './ExpensesListView';
import { useAIPrefillStore } from '../../ai/store';

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';
type ViewType = 'list' | 'analytics';

const ExpensesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('list');
  const [period, setPeriod] = useState<PeriodType>('month');

  const { expenses, isLoading, stats } = useExpensesData(searchTerm);
  const { createExpense, isCreating, deleteExpense } = useExpenseActions();

  // AI Prefill: consume pending expense intent
  const consumePrefill = useAIPrefillStore((s: any) => s.consumePrefill);
  React.useEffect(() => {
    const aiData = consumePrefill('create_expense');
    if (aiData) {
      setIsModalOpen(true);
    }
  }, [consumePrefill]);

  const periodLabels: Record<PeriodType, string> = {
    today: 'اليوم',
    week: 'الأسبوع',
    month: 'الشهر',
    quarter: 'الربع',
    year: 'السنة'
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => setViewType(viewType === 'list' ? 'analytics' : 'list')}
        variant="outline"
        size="sm"
      >
        {viewType === 'list' ? 'تحليلات' : 'القائمة'}
      </Button>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="danger"
        size="sm"
        leftIcon={<Plus size={14} />}
      >
        إضافة مصروف
      </Button>
    </div>
  );

  // Analytics View
  if (viewType === 'analytics') {
    return (
      <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 font-cairo">
        <MicroHeader
          title="تحليلات المصروفات"
          icon={BarChart3}
          iconColor="text-rose-600"
          actions={
            <div className="flex items-center gap-2">
              <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                {(['today', 'week', 'month', 'quarter', 'year'] as PeriodType[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-xs font-bold rounded transition-all ${period === p
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => setViewType('list')}
                variant="outline"
                size="sm"
              >
                للقائمة
              </Button>
            </div>
          }
        />

        <div className="flex-1 overflow-y-auto p-4 pb-20">
          <ExpensesAnalyticsView expenses={expenses || []} />
        </div>
      </div>
    );
  }

  // Original List View
  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 font-cairo">
      <MicroHeader
        title="مركز إدارة المصاريف"
        icon={Receipt}
        iconColor="text-rose-600"
        actions={headerActions}
        searchPlaceholder="البحث في المصاريف..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 custom-scrollbar">
        <ExpensesListView 
          expenses={expenses || []} 
          isLoading={isLoading} 
          stats={stats} 
          onDelete={deleteExpense}
        />
      </div>

      <CreateExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={createExpense}
        isSubmitting={isCreating}
      />
    </div>
  );
};

export default ExpensesPage;
