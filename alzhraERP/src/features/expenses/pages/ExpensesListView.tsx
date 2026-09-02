import React, { useMemo } from 'react';
import ExpenseStats from '../components/ExpenseStats';
import ExpenseTable from '../components/ExpenseTable';
import ExpenseBreakdownChart from '../components/ExpenseBreakdownChart';
import Card from '../../../ui/base/Card';
import { formatCurrency } from '../../../core/utils';
import { expensesService } from '../service';
import type { Expense } from '../types';

interface ExpensesListViewProps {
  expenses: Expense[];
  isLoading: boolean;
  stats: any;
  onDelete: (id: string) => void;
}

const ExpensesListView: React.FC<ExpensesListViewProps> = ({
  expenses,
  isLoading,
  stats,
  onDelete,
}) => {
  const breakdownData = useMemo(() => expensesService.getCategoryBreakdown(expenses), [expenses]);

  return (
    <div className="mx-auto max-w-none space-y-6">
      <ExpenseStats customStats={stats} />

      <div className="animate-in fade-in grid grid-cols-1 gap-6 duration-500 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-slate-300">
            توزيع المصاريف حسب الفئة
          </h3>
          <ExpenseBreakdownChart data={breakdownData} />
        </Card>
        <Card className="p-6">
          <h3 className="mb-6 text-sm font-bold text-gray-700 dark:text-slate-300">ملخص مالي</h3>
          <div className="space-y-4">
            {breakdownData.map(item => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-2xl bg-gray-50 p-3 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-xs font-bold">{item.name}</span>
                </div>
                <span dir="ltr" className="font-mono text-xs font-bold">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2">
        <ExpenseTable expenses={expenses} isLoading={isLoading} onDelete={onDelete} />
      </div>
    </div>
  );
};

export default ExpensesListView;
