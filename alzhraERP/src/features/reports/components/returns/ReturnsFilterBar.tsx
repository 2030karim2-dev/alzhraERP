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
    <div className="bg-[var(--app-surface)]/50 relative overflow-visible rounded-xl border border-slate-200/80 shadow-sm dark:border-slate-800 max-md:p-4 sm:rounded-2xl sm:p-6 md:p-10">
      <div className="mb-4 flex flex-col max-md:gap-4 sm:mb-6 sm:gap-6 md:mb-10">
        <div>
          <div className="mb-1 flex items-center max-md:gap-2 sm:mb-2 sm:gap-3">
            <div className="h-4 w-1.5 rounded-full bg-rose-500 sm:h-6 sm:w-2" />
            <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white sm:text-xl md:text-2xl">
              تحليل المرتجعات الذكي
            </h3>
          </div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            تحليل المرتجعات
          </p>
        </div>

        <div className="flex flex-wrap items-center max-md:gap-2 sm:gap-3">
          <button
            onClick={handleExportExcel}
            className="group flex min-h-[44px] items-center rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95 max-md:gap-2 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm md:px-6"
          >
            <FileSpreadsheet size={14} className="sm:hidden" />
            <FileSpreadsheet size={16} className="hidden sm:block" />
            <span className="hidden sm:inline">تصدير البيانات</span>
            <span className="sm:hidden">تصدير</span>
          </button>
          <button
            onClick={handlePrint}
            className="group flex min-h-[44px] items-center rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 max-md:gap-2 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm md:px-6"
          >
            <Printer size={14} className="sm:hidden" />
            <Printer size={16} className="hidden sm:block" />
            <span className="hidden sm:inline">طباعة التقرير</span>
            <span className="sm:hidden">طباعة</span>
          </button>
        </div>
      </div>

      {/* Highly Functional Filter Grid */}
      <div className="grid grid-cols-1 max-md:gap-3 sm:grid-cols-2 sm:gap-4 md:gap-6">
        {/* Period Filter */}
        <div className="space-y-3">
          <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            النطاق الزمني
          </label>
          <div className="group relative">
            <Calendar
              size={18}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-rose-500"
            />
            <select
              value={filters.dateRange}
              onChange={e => {
                setFilters({ ...filters, dateRange: e.target.value as DateRange });
              }}
              className="min-h-[44px] w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-10 text-xs font-bold shadow-inner outline-none transition-all focus:border-rose-500 dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-white sm:pr-12 sm:text-sm"
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
        <div className="space-y-3">
          <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            نوع التدفق
          </label>
          <div className="group relative">
            <Filter
              size={18}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-rose-500"
            />
            <select
              value={filters.type}
              onChange={e => {
                setFilters({ ...filters, type: e.target.value as ReturnsType });
              }}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-4 pr-12 text-sm font-bold shadow-inner outline-none transition-all focus:border-rose-500 dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-white max-md:rounded-xl"
            >
              <option value="all">كافة التدفقات</option>
              <option value="sales">مرتجعات المبيعات</option>
              <option value="purchase">مرتجعات المشتريات</option>
            </select>
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-3">
          <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            الحالة الإدارية
          </label>
          <select
            value={filters.status}
            onChange={e => {
              setFilters({ ...filters, status: e.target.value });
            }}
            className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3.5 text-sm font-bold shadow-inner outline-none transition-all focus:border-rose-500 dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-white max-md:rounded-xl max-md:px-3"
          >
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="posted">معتمد</option>
            <option value="paid">مدفوع</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>

        {/* Causation Filter */}
        <div className="space-y-3">
          <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            سبب الاسترجاع
          </label>
          <select
            value={filters.reason}
            onChange={e => {
              setFilters({ ...filters, reason: e.target.value });
            }}
            className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3.5 text-sm font-bold shadow-inner outline-none transition-all focus:border-rose-500 dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-white max-md:rounded-xl max-md:px-3"
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
        <div className="animate-in slide-in-from-top-4 mt-8 grid grid-cols-2 gap-6 rounded-3xl border border-slate-100 bg-slate-50 p-6 duration-500 dark:border-slate-700/50 dark:bg-slate-800/40 max-md:mt-3 max-md:gap-3 max-md:rounded-xl max-md:p-3">
          <div className="space-y-2">
            <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              من تاريخ
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={e => {
                setFilters({ ...filters, startDate: e.target.value });
              }}
              className="w-full rounded-xl border border-slate-200 bg-[var(--app-surface)] px-5 py-3 font-mono text-xs font-bold outline-none transition-all focus:border-rose-500 dark:border-slate-700 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={e => {
                setFilters({ ...filters, endDate: e.target.value });
              }}
              className="w-full rounded-xl border border-slate-200 bg-[var(--app-surface)] px-5 py-3 font-mono text-xs font-bold outline-none transition-all focus:border-rose-500 dark:border-slate-700 dark:text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsFilterBar;
