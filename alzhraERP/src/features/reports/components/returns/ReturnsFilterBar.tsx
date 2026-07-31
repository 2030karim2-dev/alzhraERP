import React from 'react';
import { FileSpreadsheet, Printer, Calendar, Filter } from 'lucide-react';
import { FilterState, DateRange, ReturnsType } from '../../hooks/useReturnsReport';

interface Props {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    handleExportExcel: () => void;
    handlePrint: () => void;
}

const ReturnsFilterBar: React.FC<Props> = ({ filters, setFilters, handleExportExcel, handlePrint }) => {
    return (
        <div className="glass-panel bento-item p-10 bg-white dark:bg-slate-900/50 border-none shadow-2xl relative overflow-visible">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-6 bg-rose-500 rounded-full" />
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">تحليل المرتجعات الذكي</h3>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Returns & Discrepancies Intelligence Center</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleExportExcel}
                        className="group flex items-center gap-3 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 font-bold text-xs"
                    >
                        <FileSpreadsheet size={16} className="group-hover:scale-110 transition-transform" />
                        <span>تصدير البيانات</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="group flex items-center gap-3 px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold text-xs"
                    >
                        <Printer size={16} className="group-hover:scale-110 transition-transform" />
                        <span>طباعة التقرير</span>
                    </button>
                </div>
            </div>

            {/* Highly Functional Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Period Filter */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">النطاق الزمني</label>
                    <div className="relative group">
                        <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors pointer-events-none" />
                        <select
                            value={filters.dateRange}
                            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as DateRange })}
                            className="w-full pl-4 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 focus:border-rose-500 rounded-2xl text-sm font-bold outline-none transition-all dark:text-white shadow-inner appearance-none"
                        >
                            <option value="today">اليوم</option>
                            <option value="week">آخر ٧ أيام</option>
                            <option value="month">آخر ٣٠ يوم</option>
                            <option value="year">السنة الحالية</option>
                            <option value="custom">تاريخ مخصص</option>
                        </select>
                    </div>
                </div>

                {/* Flow Type Filter */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">نوع التدفق</label>
                    <div className="relative group">
                        <Filter size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors pointer-events-none" />
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value as ReturnsType })}
                            className="w-full pl-4 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 focus:border-rose-500 rounded-2xl text-sm font-bold outline-none transition-all dark:text-white shadow-inner appearance-none"
                        >
                            <option value="all">كافة التدفقات</option>
                            <option value="sales">مرتجعات المبيعات</option>
                            <option value="purchase">مرتجعات المشتريات</option>
                        </select>
                    </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">الحالة الإدارية</label>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="w-full px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 focus:border-rose-500 rounded-2xl text-sm font-bold outline-none transition-all dark:text-white shadow-inner appearance-none"
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">سبب الاسترجاع</label>
                    <select
                        value={filters.reason}
                        onChange={(e) => setFilters({ ...filters, reason: e.target.value })}
                        className="w-full px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 focus:border-rose-500 rounded-2xl text-sm font-bold outline-none transition-all dark:text-white shadow-inner appearance-none"
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
                <div className="grid grid-cols-2 gap-6 mt-8 p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-700/50 animate-in slide-in-from-top-4 duration-500">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">من تاريخ</label>
                        <input
                            type="date"
                            value={filters.startDate || ''}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold dark:text-white outline-none focus:border-rose-500 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">إلى تاريخ</label>
                        <input
                            type="date"
                            value={filters.endDate || ''}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold dark:text-white outline-none focus:border-rose-500 transition-all"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReturnsFilterBar;
