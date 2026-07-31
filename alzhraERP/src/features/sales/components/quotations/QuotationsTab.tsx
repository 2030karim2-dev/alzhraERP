import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Search, Clock, CheckCircle, CircleX, Send, ArrowRightLeft, Loader2 } from 'lucide-react';
import { salesQuotationsApi } from '@/features/sales/api/quotationsApi';
import { useAuthStore } from '@/features/auth/store';
import { formatCurrency } from '@/core/utils';
import type { QuotationStatus } from '@/features/sales/types/quotation';
import { useBranchFilter } from '@/features/branches/hooks/useBranchFilter';
import CreateQuotationModal from '@/features/sales/components/quotations/CreateQuotationModal';
import QuotationDetailsModal from '@/features/sales/components/quotations/QuotationDetailsModal';

const STATUS_CONFIG: Record<QuotationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300', icon: <Clock size={12} /> },
  sent: { label: 'مُرسل', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Send size={12} /> },
  accepted: { label: 'مقبول', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle size={12} /> },
  rejected: { label: 'مرفوض', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', icon: <CircleX size={12} /> },
  expired: { label: 'منتهي', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock size={12} /> },
  converted: { label: 'تم التحويل', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: <ArrowRightLeft size={12} /> },
};

const FILTER_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'draft', label: 'مسودة' },
  { key: 'sent', label: 'مرسل' },
  { key: 'accepted', label: 'مقبول' },
  { key: 'rejected', label: 'مرفوض' },
  { key: 'converted', label: 'محوّل' },
];

interface Props {
  onConvertToInvoice?: () => void;
}

export const QuotationsTab: React.FC<Props> = ({ onConvertToInvoice }) => {
  const { user } = useAuthStore();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);

  const { branchId } = useBranchFilter();

  const fetchQuotations = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    const { data } = await salesQuotationsApi.getQuotations(user.company_id, branchId);
    setQuotations(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotations();
  }, [user?.company_id, branchId]);

  const filtered = useMemo(() => {
    return quotations.filter(q => {
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      const matchesSearch = !searchTerm || 
        q.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.party?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [quotations, statusFilter, searchTerm]);

  const getDaysRemaining = (validUntil: string | null) => {
    if (!validUntil) return null;
    const diff = Math.ceil((new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">عروض الأسعار</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{quotations.length} عرض سعر</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-indigo-600/20"
        >
          <Plus size={16} />
          عرض سعر جديد
        </button>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1 overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.key
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالرقم أو اسم العميل..."
            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2 pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700">
          <FileText size={40} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد عروض أسعار</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">ابدأ بإنشاء عرض سعر جديد</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الرقم</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">العميل</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الصلاحية</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">المبلغ</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">البنود</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {filtered.map((q) => {
                  const statusConf = STATUS_CONFIG[q.status as QuotationStatus] || STATUS_CONFIG.draft;
                  const daysLeft = getDaysRemaining(q.valid_until);
                  return (
                    <tr
                      key={q.id}
                      onClick={() => setSelectedQuotationId(q.id)}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {q.quotation_number}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        {q.party?.name || 'عميل نقدي'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">
                        {new Date(q.issue_date).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="py-3 px-4">
                        {daysLeft !== null ? (
                          <span className={`text-xs font-medium ${daysLeft <= 0 ? 'text-rose-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                            {daysLeft <= 0 ? 'منتهي' : `${daysLeft} يوم`}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white" dir="ltr">
                        {formatCurrency(q.total_amount, q.currency_code || 'SAR')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.color}`}>
                          {statusConf.icon}
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                        {q.quotation_items?.length || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateQuotationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchQuotations();
          }}
        />
      )}

      {selectedQuotationId && (
        <QuotationDetailsModal
          quotationId={selectedQuotationId}
          onClose={() => setSelectedQuotationId(null)}
          onRefresh={fetchQuotations}
          {...(onConvertToInvoice ? { onConvertToInvoice } : {})}
        />
      )}
    </div>
  );
};

export default QuotationsTab;
