import React from 'react';
import { FileSpreadsheet, Printer, Calendar, Filter } from 'lucide-react';
import type { FilterState, DateRange, ReturnsType } from '../../hooks/useReturnsReport';

interface Props {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  handleExportExcel: () => void;
  handlePrint: () => void;
}

const ReturnsFilterBar: React.FC<Props> = ({
  filters,
  setFilters,
  handleExportExcel,
  handlePrint,
}) => {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-sm sm:p-4">
      <div className="mb-3.5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="mb-0.5 flex items-center gap-2">
            <div className="h-4 w-1.5 rounded-full bg-rose-500" />
            <h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-white">
              تحليل المرتجعات
            </h3>
          </div>
          <p className="text-[10px] font-semibold text-slate-400">
            تصفية حركات مرتجعات المبيعات والمشتريات
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
          >
            <FileSpreadsheet size={14} />
            <span>تصدير إكسل</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex min-h-[36px] items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Printer size={14} />
            <span>طباعة</span>
          </button>
        </div>
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Period Filter */}
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-400">النطاق الزمني</label>
          <div className="relative">
            <Calendar
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={filters.dateRange}
              onChange={e => {
                setFilters({ ...filters, dateRange: e.target.value as DateRange });
              }}
              className="min-h-[36px] w-full appearance-none rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] py-1.5 pl-3 pr-8 text-xs font-bold outline-none transition-colors focus:border-rose-500 dark:text-white"
            >
              <option value="today">اليوم</option>
              <option value="week">آخر 7 أيام</option>
              <option value="month">آخر 30 يوم</option>
              <option value="year">السنة الحالية</option>
              <option value="custom">تاريخ مخصص</option>
            </select>
          </div>
        </div>

        {/* Flow Type Filter */}
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-400">نوع التدفق</label>
          <div className="relative">
            <Filter
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={filters.type}
              onChange={e => {
                setFilters({ ...filters, type: e.target.value as ReturnsType });
              }}
              className="min-h-[36px] w-full appearance-none rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] py-1.5 pl-3 pr-8 text-xs font-bold outline-none transition-colors focus:border-rose-500 dark:text-white"
            >
              <option value="all">كافة التدفقات</option>
              <option value="sales">مرتجعات المبيعات</option>
              <option value="purchase">مرتجعات المشتريات</option>
            </select>
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-400">الحالة</label>
          <select
            value={filters.status}
            onChange={e => {
              setFilters({ ...filters, status: e.target.value });
            }}
            className="min-h-[36px] w-full appearance-none rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3 py-1.5 text-xs font-bold outline-none transition-colors focus:border-rose-500 dark:text-white"
          >
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="posted">معتمد</option>
            <option value="paid">مدفوع</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>

        {/* Causation Filter */}
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-400">سبب الإرجاع</label>
          <select
            value={filters.reason}
            onChange={e => {
              setFilters({ ...filters, reason: e.target.value });
            }}
            className="min-h-[36px] w-full appearance-none rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3 py-1.5 text-xs font-bold outline-none transition-colors focus:border-rose-500 dark:text-white"
          >
            <option value="all">جميع المسببات</option>
            <option value="defective">منتج تالف</option>
            <option value="not_as_described">غير مطابق</option>
            <option value="wrong_item">صنف خاطئ</option>
            <option value="quality_issue">مشكلة جودة</option>
            <option value="changed_mind">تغيير رأي</option>
            <option value="expired">منتهي الصلاحية</option>
            <option value="other">أخرى</option>
          </select>
        </div>
      </div>

      {/* Dynamic Custom Date Picker */}
      {filters.dateRange === 'custom' && (
        <div className="animate-in slide-in-from-top-2 mt-3 grid grid-cols-2 gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold text-slate-400">من تاريخ</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={e => {
                setFilters({ ...filters, startDate: e.target.value });
              }}
              className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 font-mono text-xs font-bold outline-none focus:border-rose-500 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold text-slate-400">إلى تاريخ</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={e => {
                setFilters({ ...filters, endDate: e.target.value });
              }}
              className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 font-mono text-xs font-bold outline-none focus:border-rose-500 dark:text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsFilterBar;
