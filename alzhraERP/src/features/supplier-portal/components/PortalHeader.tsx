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
    <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-indigo-950/20 border border-indigo-800/40">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
          <Building2 className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            بوابة الموردين والتوريد الذكي (Supplier Portal)
          </h1>
          <p className="text-xs text-indigo-200 mt-1">
            إدارة المنتجات، طلبات التسعير، عروض الأسعار التفاعلية، ومصفوفة المقارنة
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenComparisonModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-600/30 transition-all active:scale-95"
        >
          <Scale className="w-4 h-4" />
          <span>مصفوفة المقارنة الذكية</span>
        </button>

        <button
          onClick={onOpenNewQuotationDrawer}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء عرض سعر جديد</span>
        </button>

        <button
          onClick={onRefresh}
          className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
          title="تحديث البيانات"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
