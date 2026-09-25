/* eslint-disable max-lines-per-function */
import React from 'react';
import { FileText, LayoutGrid, Plus, Search, Table as TableIcon } from 'lucide-react';

interface PurchaseQuotationsHeaderProps {
  totalQuotations: number;
  totalGroups: number;
  viewMode: 'grouped' | 'table';
  setViewMode: (mode: 'grouped' | 'table') => void;
  onOpenCreateModal: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const PurchaseQuotationsHeader: React.FC<PurchaseQuotationsHeaderProps> = ({
  totalQuotations,
  totalGroups,
  viewMode,
  setViewMode,
  onOpenCreateModal,
  searchTerm,
  setSearchTerm,
}) => (
  <>
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-100 p-2.5 dark:bg-violet-900/30">
          <FileText size={20} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">عروض أسعار الموردين</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {totalQuotations} عرض • {totalGroups} طلب
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              setViewMode('table');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === 'table'
                ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <TableIcon size={14} />
            جدول العروض
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('grouped');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === 'grouped'
                ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <LayoutGrid size={14} />
            مجموعات الطلب
          </button>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-violet-600/20 transition-colors hover:bg-violet-700"
        >
          <Plus size={16} />
          تسجيل عرض مورد
        </button>
      </div>
    </div>

    <div className="relative max-w-xs">
      <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={searchTerm}
        onChange={event => {
          setSearchTerm(event.target.value);
        }}
        placeholder="بحث بالرقم أو المورد أو الصنف أو القياس..."
        className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800"
      />
    </div>
  </>
);

export default PurchaseQuotationsHeader;
