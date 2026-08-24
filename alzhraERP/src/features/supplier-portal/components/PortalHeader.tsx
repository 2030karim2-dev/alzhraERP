import React from 'react';
import { Building2, Plus, RefreshCw, Scale } from 'lucide-react';

interface PortalHeaderProps {
  isLoading: boolean;
  onOpenComparisonModal: () => void;
  onOpenNewQuotationDrawer: () => void;
  onRefresh: () => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({
  isLoading,
  onOpenComparisonModal,
  onOpenNewQuotationDrawer,
  onRefresh,
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
      {/* Title & Badge */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              بوابة الموردين وعروض الأسعار
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
              Supplier Hub
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            إدارة كتالوج الأصناف، طلبات التسعير (RFQs)، وعروض الأسعار التفاعلية
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenComparisonModal}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <Scale className="w-3.5 h-3.5 text-slate-500" />
          <span>مصفوفة المقارنة</span>
        </button>

        <button
          type="button"
          onClick={onOpenNewQuotationDrawer}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>عرض سعر جديد</span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
          title="تحديث البيانات"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>
    </header>
  );
};
