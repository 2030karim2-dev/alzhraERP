import React from 'react';
import { Trash2, Calendar, Receipt } from 'lucide-react';
import ExcelTable from '../../../ui/common/ExcelTable';
import { toBaseCurrency } from '../../../core/utils';
import type { Expense } from '../types';
import { exportToCSV } from '../../../lib/exportUtils';
import EmptyState from '../../../ui/base/EmptyState';

interface ExpenseTableProps {
  expenses: Expense[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({ expenses, isLoading, onDelete }) => {
  const handleExport = () => {
    const headers = ['Voucher', 'Description', 'Category', 'Date', 'Amount', 'Currency', 'Status'];
    const exportData = expenses.map(e => ({
      no: e.voucher_number || (e as any).voucher_no || (e as any).reference_no || '---',
      desc: e.description,
      cat: e.category_name,
      date: e.expense_date,
      amount: e.amount,
      currency: e.currency_code,
      status: e.status,
    }));
    exportToCSV(exportData, 'Al-Zahra-Expenses', headers);
  };

  const columns = [
    {
      header: 'رقم السند',
      accessor: (row: Expense) => {
        const val =
          row.voucher_number || (row as any).voucher_no || (row as any).reference_no || '---';
        return (
          <span dir="ltr" className="font-mono font-bold text-gray-400 dark:text-slate-500">
            {val}
          </span>
        );
      },
      width: 'w-24',
      sortKey: 'voucher_number',
    },
    {
      header: 'البيان / الوصف',
      accessor: (row: Expense) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-800 dark:text-slate-200">{row.description}</span>
          <span className="mt-0.5 w-fit rounded border bg-gray-50 px-1.5 text-[10px] text-gray-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
            {row.category_name}
          </span>
        </div>
      ),
      sortKey: 'description',
    },
    {
      header: 'التاريخ',
      accessor: (row: Expense) => (
        <div className="flex items-center gap-2 font-mono text-xs text-gray-600 dark:text-slate-400">
          <Calendar size={14} className="opacity-50" />
          <span dir="ltr">{row.expense_date}</span>
        </div>
      ),
      width: 'w-32',
      sortKey: 'expense_date',
    },
    {
      header: 'المبلغ (الأساسي)',
      accessor: (row: Expense) => {
        const baseAmount = toBaseCurrency(row);
        return (
          <div className="flex flex-col items-end">
            <span
              dir="ltr"
              className="font-mono text-sm font-bold leading-none text-rose-600 dark:text-rose-400"
            >
              {row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {row.currency_code}
              </span>
            </span>
            {row.currency_code !== 'SAR' && (
              <span dir="ltr" className="mt-1 text-xs font-bold text-blue-500">
                {baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="ml-1 text-[10px]">SAR</span>
              </span>
            )}
          </div>
        );
      },
      className: 'text-left',
      sortKey: 'amount',
    },
    {
      header: 'الحالة',
      accessor: (row: Expense) => (
        <span
          className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-tighter ${
            row.status === 'paid'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400'
              : row.status === 'posted'
                ? 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-400'
                : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
          }`}
        >
          {row.status === 'paid' ? 'مدفوع' : row.status === 'posted' ? 'مرحل' : 'مسودة'}
        </span>
      ),
      width: 'w-24',
      className: 'text-center',
    },
    {
      header: 'إجراءات',
      accessor: (row: Expense) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              if (window.confirm('حذف هذا المصروف؟')) onDelete(row.id);
            }}
            className="p-1.5 text-gray-300 transition-colors hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400"
            title="حذف"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      width: 'w-16',
      className: 'text-center',
    },
  ];

  if (!isLoading && expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="سجل مصروفات خالٍ"
        description="لم يتم تسجيل أي مصروفات تشغيلية حتى الآن. المصروفات تساعدك في تتبع التدفق النقدي بدقة."
      />
    );
  }

  return (
    <div className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-[var(--app-surface)] shadow-sm transition-colors dark:border-slate-800">
      <ExcelTable
        columns={columns}
        data={expenses}
        colorTheme="orange"
        title="سجل المصروفات التشغيلية"
        onExport={handleExport}
      />
    </div>
  );
};

export default ExpenseTable;
