
import React from 'react';
import { Trash2,  Calendar, Receipt } from 'lucide-react';
import ExcelTable from '../../../ui/common/ExcelTable';
// import { formatCurrency } from '../../../core/utils';
import { Expense } from '../types';
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
      status: e.status
    }));
    exportToCSV(exportData, 'Al-Zahra-Expenses', headers);
  };

  const columns = [
    {
      header: 'رقم السند',
      accessor: (row: Expense) => {
        const val = row.voucher_number || (row as any).voucher_no || (row as any).reference_no || '---';
        return (
          <span dir="ltr" className="font-mono font-bold text-gray-400 dark:text-slate-500">
            {val}
          </span>
        );
      },
      width: 'w-24',
      sortKey: 'voucher_number'
    },
    {
      header: 'البيان / الوصف',
      accessor: (row: Expense) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-800 dark:text-slate-200">{row.description}</span>
          <span className="text-[10px] text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800 w-fit px-1.5 rounded mt-0.5 border dark:border-slate-700">
            {row.category_name}
          </span>
        </div>
      ),
      sortKey: 'description'
    },
    {
      header: 'التاريخ',
      accessor: (row: Expense) => (
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400 font-mono">
          <Calendar size={14} className="opacity-50" />
          <span dir="ltr">{row.expense_date}</span>
        </div>
      ),
      width: 'w-32',
      sortKey: 'expense_date'
    },
    {
      header: 'المبلغ (الأساسي)',
      accessor: (row: Expense) => {
        const baseAmount = row.currency_code === 'SAR' ? row.amount : row.amount * (row.exchange_rate || 1);
        return (
          <div className="flex flex-col items-end">
            <span dir="ltr" className="font-bold text-rose-600 dark:text-rose-400 font-mono text-sm leading-none">
              {row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-[9px] font-bold text-gray-400 uppercase ml-1 tracking-widest">{row.currency_code}</span>
            </span>
            {row.currency_code !== 'SAR' && (
              <span dir="ltr" className="text-xs font-bold text-blue-500 mt-1">
                {baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="text-[9px] ml-1">SAR</span>
              </span>
            )}
          </div>
        );
      },
      className: 'text-left',
      sortKey: 'amount'
    },
    {
      header: 'الحالة',
      accessor: (row: Expense) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tighter ${row.status === 'paid'
          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
          : row.status === 'posted'
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
            : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-500 border-gray-200 dark:border-slate-700'
          }`}>
          {row.status === 'paid' ? 'مدفوع' : row.status === 'posted' ? 'مرحل' : 'مسودة'}
        </span>
      ),
      width: 'w-24',
      className: 'text-center'
    },
    {
      header: 'إجراءات',
      accessor: (row: Expense) => (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => { if (window.confirm('حذف هذا المصروف؟')) onDelete(row.id) }}
            className="p-1.5 text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="حذف"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      width: 'w-16',
      className: 'text-center',
    }
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
    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
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
