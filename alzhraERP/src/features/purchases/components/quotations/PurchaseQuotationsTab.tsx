import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Search, Loader2, Scale, Clock, CheckCircle, XCircle, Send, ArrowRightLeft } from 'lucide-react';
import { purchaseQuotationsApi } from '../../api/quotationsApi';
import { useAuthStore } from '../../../auth/store';
import { formatCurrency } from '../../../../core/utils';
import QuotationComparisonView from './QuotationComparisonView';
import CreatePurchaseQuotationModal from './CreatePurchaseQuotationModal';
import type { QuotationStatus } from '../../../sales/types/quotation';

const STATUS_CONFIG: Record<QuotationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300', icon: <Clock size={12} /> },
  sent: { label: 'مُرسل', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Send size={12} /> },
  accepted: { label: 'مقبول', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle size={12} /> },
  rejected: { label: 'مرفوض', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', icon: <XCircle size={12} /> },
  expired: { label: 'منتهي', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock size={12} /> },
  converted: { label: 'تم التحويل', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: <ArrowRightLeft size={12} /> },
};

interface Props {
  onConvertToPurchase?: () => void;
}

export const PurchaseQuotationsTab: React.FC<Props> = ({ onConvertToPurchase }) => {
  const { user } = useAuthStore();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [compareGroupId, setCompareGroupId] = useState<string | null>(null);

  const fetchQuotations = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    const { data } = await purchaseQuotationsApi.getQuotations(user.company_id);
    setQuotations(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotations();
  }, [user?.company_id]);

  // Group by rfq_group_id
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    quotations.forEach(q => {
      const key = q.rfq_group_id || q.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    });
    return Object.entries(groups).sort(
      (a, b) => new Date(b[1][0].created_at).getTime() - new Date(a[1][0].created_at).getTime()
    );
  }, [quotations]);

  const filtered = useMemo(() => {
    if (!searchTerm) return grouped;
    return grouped.filter(([, quots]) =>
      quots.some(q =>
        q.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.party?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [grouped, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
            <FileText size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">عروض أسعار الموردين</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{quotations.length} عرض • {grouped.length} طلب</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-violet-600/20"
        >
          <Plus size={16} />
          تسجيل عرض مورد
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث بالرقم أو اسم المورد..."
          className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2 pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Comparison View */}
      {compareGroupId && (
        <QuotationComparisonView
          rfqGroupId={compareGroupId}
          onClose={() => setCompareGroupId(null)}
          {...(onConvertToPurchase ? { onConvertToPurchase } : {})}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700">
          <FileText size={40} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد عروض أسعار من الموردين</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">سجّل عروض الموردين للمقارنة بينها</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(([groupId, quots]) => (
            <div
              key={groupId}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              {/* Group Header */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                      طلب عرض سعر
                    </h3>
                    <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full text-[10px] font-bold">
                      {quots.length} عرض
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{groupId.substring(0, 8)}...</p>
                </div>
                {quots.length >= 2 && (
                  <button
                    onClick={() => setCompareGroupId(compareGroupId === groupId ? null : groupId)}
                    className="flex items-center gap-2 px-3 py-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 text-violet-700 dark:text-violet-400 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Scale size={14} />
                    {compareGroupId === groupId ? 'إخفاء المقارنة' : 'مقارنة العروض'}
                  </button>
                )}
              </div>

              {/* Quotations in this group */}
              <div className="divide-y divide-gray-50 dark:divide-slate-800">
                {quots.map((q: any) => {
                  const statusConf = STATUS_CONFIG[q.status as QuotationStatus] || STATUS_CONFIG.draft;
                  return (
                    <div key={q.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
                          {q.quotation_number}
                        </span>
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {q.party?.name || 'مورد غير محدد'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConf.color}`}>
                          {statusConf.icon} {statusConf.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-sm text-gray-900 dark:text-white" dir="ltr">
                          {formatCurrency(q.total_amount, q.currency_code || 'SAR')}
                        </span>
                        <span className="text-xs text-gray-400">
                          {q.quotation_items?.length || 0} بنود
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePurchaseQuotationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchQuotations();
          }}
        />
      )}
    </div>
  );
};

export default PurchaseQuotationsTab;
