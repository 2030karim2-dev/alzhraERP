import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Loader2,
  ChevronDown,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import {
  useStockTransferRequests,
  useRespondToTransferRequest,
  type StockTransferRequest,
  type TransferRequestStatus,
} from '../hooks/useStockTransferRequests';
import { formatLocalDate } from '../../../core/utils/dateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TransferRequestStatus,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'بانتظار الموافقة',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    icon: <Clock size={12} />,
  },
  approved: {
    label: 'تمت الموافقة',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    icon: <CheckCircle2 size={12} />,
  },
  rejected: {
    label: 'مرفوض',
    cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    icon: <XCircle size={12} />,
  },
  completed: {
    label: 'مكتمل',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    icon: <CheckCircle2 size={12} />,
  },
  cancelled: {
    label: 'ملغى',
    cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    icon: <XCircle size={12} />,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Row component
// ─────────────────────────────────────────────────────────────────────────────

const TransferRow: React.FC<{
  request: StockTransferRequest;
  isSourceBranch: boolean;
  onRespond: (id: string, action: 'approve' | 'reject' | 'cancel', notes?: string) => void;
  isResponding: boolean;
}> = ({ request, isSourceBranch, onRespond, isResponding }) => {
  const [expanded, setExpanded] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const statusCfg = STATUS_CONFIG[request.status];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      {/* Row Header */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <Package size={18} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
              {request.product_name || request.product_id}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusCfg.cls}`}
            >
              {statusCfg.icon} {statusCfg.label}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              من: <strong>{request.source_branch_name}</strong>
            </span>
            <span>→</span>
            <span>
              إلى: <strong>{request.requester_branch_name}</strong>
            </span>
            <span className="font-mono">كمية: {request.requested_quantity}</span>
            <span>{formatLocalDate(request.created_at)}</span>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          {request.notes && (
            <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <span className="font-bold">ملاحظة الطالب:</span> {request.notes}
            </div>
          )}
          {request.review_notes && (
            <div className="rounded-lg bg-blue-50 p-2.5 text-xs text-slate-600 dark:bg-blue-900/20 dark:text-slate-300">
              <span className="font-bold">ملاحظة المراجع:</span> {request.review_notes}
            </div>
          )}

          {/* أزرار الاستجابة — تظهر فقط للفرع المصدر وفقط إذا كان الطلب معلقاً */}
          {isSourceBranch && request.status === 'pending' && (
            <div className="space-y-2">
              <textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                rows={2}
                maxLength={300}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800"
                placeholder="ملاحظات الرد (اختياري)..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isResponding}
                  onClick={() => onRespond(request.id, 'approve', reviewNotes)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-black text-white transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
                >
                  {isResponding ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  موافقة ونقل المخزون
                </button>
                <button
                  type="button"
                  disabled={isResponding}
                  onClick={() => onRespond(request.id, 'reject', reviewNotes)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-100 py-2 text-xs font-bold text-rose-700 transition-all hover:bg-rose-200 active:scale-[0.98] disabled:opacity-60 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
                >
                  <XCircle size={14} />
                  رفض
                </button>
              </div>
            </div>
          )}

          {/* زر الإلغاء — للفرع الطالب فقط */}
          {!isSourceBranch && request.status === 'pending' && (
            <button
              type="button"
              disabled={isResponding}
              onClick={() => onRespond(request.id, 'cancel', 'تم الإلغاء من قِبل الطالب')}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:text-rose-400"
            >
              <XCircle size={13} /> إلغاء الطلب
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface StockTransferRequestsViewProps {
  branchId: string;
}

type FilterTab = 'all' | 'incoming' | 'outgoing';

const StockTransferRequestsView: React.FC<StockTransferRequestsViewProps> = ({ branchId }) => {
  const [tab, setTab] = useState<FilterTab>('all');
  const { data, isLoading, refetch } = useStockTransferRequests(tab, branchId);
  const requests: StockTransferRequest[] = (data ?? []) as StockTransferRequest[];
  const { mutate: respond, isPending: isResponding } = useRespondToTransferRequest();

  const handleRespond = (id: string, action: 'approve' | 'reject' | 'cancel', notes?: string) => {
    respond({ requestId: id, action, ...(notes !== undefined ? { reviewNotes: notes } : {}) });
  };

  const tabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'الكل', icon: <ArrowRightLeft size={14} /> },
    { key: 'incoming', label: 'واردة علينا', icon: <Inbox size={14} /> },
    { key: 'outgoing', label: 'طلباتنا', icon: <RefreshCw size={14} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-slate-100">
            <ArrowRightLeft size={20} className="text-amber-500" />
            طلبات نقل المخزون
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            الطلبات الواردة والصادرة لهذا الفرع
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw size={13} />
          تحديث
        </button>
      </div>

      {/* Tabs */}
      <div className="flex w-fit gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              tab === t.key
                ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">جاري التحميل...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400 dark:text-slate-600">
          <ArrowRightLeft size={40} strokeWidth={1} />
          <p className="text-sm font-bold">لا توجد طلبات نقل</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(request => (
            <TransferRow
              key={request.id}
              request={request}
              isSourceBranch={request.source_branch_id === branchId}
              onRespond={handleRespond}
              isResponding={isResponding}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StockTransferRequestsView;
