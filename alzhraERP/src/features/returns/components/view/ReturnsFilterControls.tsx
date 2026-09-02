import React from 'react';
import { Search, Filter, Download, Printer, RefreshCw, X } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import type { SortField, SortDirection, ReturnsListFilters } from '../../hooks/useReturnsListView';

interface Props {
  localSearchTerm: string;
  setLocalSearchTerm: (term: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  filters: ReturnsListFilters;
  setFilters: (filters: ReturnsListFilters) => void;
  sortField: SortField;
  setSortField: (field: SortField) => void;
  sortDirection: SortDirection;
  setSortDirection: (dir: SortDirection) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  handleExportExcel: () => void;
  handlePrint: () => void;
  refetch: () => void;
  isLoading: boolean;
  hasData: boolean;
  type: 'sales' | 'purchase';
}

export const ReturnsFilterControls: React.FC<Props> = ({
  localSearchTerm,
  setLocalSearchTerm,
  showFilters,
  setShowFilters,
  filters,
  setFilters,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  hasActiveFilters,
  clearFilters,
  handleExportExcel,
  handlePrint,
  refetch,
  isLoading,
  hasData,
  type,
}) => {
  // filters مضمون النوع الآن (ReturnsListFilters) — لا حاجة لحاجز التحويل
  const safeFilters = filters;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-3 lg:flex-row">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={localSearchTerm}
            onChange={e => {
              setLocalSearchTerm(e.target.value);
            }}
            placeholder={`بحث ب${type === 'sales' ? 'العميل' : 'المورد'}، رقم الفاتورة، سبب الإرجاع...`}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm font-medium text-gray-900 placeholder-gray-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
          {localSearchTerm && (
            <button
              onClick={() => {
                setLocalSearchTerm('');
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant={showFilters ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              setShowFilters(!showFilters);
            }}
            leftIcon={<Filter size={14} />}
          >
            فلترة
            {hasActiveFilters && (
              <span className="mr-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
                {
                  [
                    safeFilters.status,
                    safeFilters.startDate,
                    safeFilters.endDate,
                    safeFilters.minAmount,
                    safeFilters.maxAmount,
                    safeFilters.returnReason,
                    localSearchTerm,
                  ].filter(Boolean).length
                }
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={!hasData}
            leftIcon={<Download size={14} />}
          >
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={!hasData}
            leftIcon={<Printer size={14} />}
          >
            طباعة
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
          >
            تحديث
          </Button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-slate-600">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {/* Status Filter */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">الحالة</label>
              <select
                value={safeFilters.status}
                onChange={e => {
                  setFilters({ ...safeFilters, status: e.target.value });
                }}
                className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700"
              >
                <option value="">الكل</option>
                <option value="draft">مسودة</option>
                <option value="posted">معتمد</option>
                <option value="paid">مدفوع</option>
              </select>
            </div>

            {/* Return Reason Filter */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">سبب الإرجاع</label>
              <select
                value={safeFilters.returnReason}
                onChange={e => {
                  setFilters({ ...safeFilters, returnReason: e.target.value });
                }}
                className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700"
              >
                <option value="">الكل</option>
                <option value="defective">منتج تالف</option>
                <option value="not_as_described">غير مطابق للمواصفات</option>
                <option value="wrong_item">صنف خاطئ</option>
                <option value="quality_issue">مشكلة في الجودة</option>
                {type === 'sales' && <option value="changed_mind">تغيير رأي العميل</option>}
                <option value="expired">منتج منتهي الصلاحية</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">من تاريخ</label>
              <input
                type="date"
                value={safeFilters.startDate}
                onChange={e => {
                  setFilters({ ...safeFilters, startDate: e.target.value });
                }}
                className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">إلى تاريخ</label>
              <input
                type="date"
                value={safeFilters.endDate}
                onChange={e => {
                  setFilters({ ...safeFilters, endDate: e.target.value });
                }}
                className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700"
              />
            </div>

            {/* Min Amount */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">الحد الأدنى</label>
              <input
                type="number"
                value={safeFilters.minAmount}
                onChange={e => {
                  setFilters({ ...safeFilters, minAmount: e.target.value });
                }}
                placeholder="الحد الأدنى"
                className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700"
              />
            </div>

            {/* Max Amount */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">الحد الأعلى</label>
              <input
                type="number"
                value={safeFilters.maxAmount}
                onChange={e => {
                  setFilters({ ...safeFilters, maxAmount: e.target.value });
                }}
                placeholder="الحد الأعلى"
                className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700"
              />
            </div>
          </div>

          {/* Sort Options */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-500">ترتيب حسب:</span>
            <div className="flex gap-1">
              {[
                { value: 'issue_date', label: 'التاريخ' },
                { value: 'total_amount', label: 'المبلغ' },
                { value: 'party_name', label: type === 'sales' ? 'العميل' : 'المورد' },
                { value: 'invoice_number', label: 'رقم الفاتورة' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    if (sortField === option.value) {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField(option.value as SortField);
                      setSortDirection('desc');
                    }
                  }}
                  className={`rounded px-2 py-1 text-xs ${
                    sortField === option.value
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
                  }`}
                >
                  {option.label}{' '}
                  {sortField === option.value && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
              >
                <X size={12} /> مسح الفلاتر
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
