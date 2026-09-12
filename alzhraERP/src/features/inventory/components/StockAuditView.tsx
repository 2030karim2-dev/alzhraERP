import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Plus,
  Loader2,
  CheckCircle2,
  Activity,
  Clock,
  Zap,
  Trash2,
  CircleCheckBig,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StartAuditModal from './StartAuditModal';
import {
  useAuditSessions,
  useInventoryMutations,
  type AuditSessionListItem,
} from '../hooks/useInventoryManagement';
import { cn } from '../../../core/utils';
import { formatLocalDate } from '../../../core/utils/dateUtils';
import { ROUTES } from '../../../core/routes/paths';

const StockAuditView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AuditSessionListItem | null>(null);
  const { data: audits, isLoading } = useAuditSessions();
  const { deleteAuditSession, isDeletingSession } = useInventoryMutations();
  const navigate = useNavigate();

  const handleDeleteClick = (e: React.MouseEvent, session: AuditSessionListItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(session);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteAuditSession(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  const stats = useMemo(() => {
    if (!audits) return { total: 0, active: 0, completed: 0 };
    return {
      total: audits.length,
      active: audits.filter((a: AuditSessionListItem) => a.status === 'active').length,
      completed: audits.filter((a: AuditSessionListItem) => a.status === 'completed').length,
    };
  }, [audits]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );
  }

  return (
    <div className="font-cairo flex h-full flex-col space-y-4">
      {/* ── Stats Row ── */}
      <div className="grid shrink-0 grid-cols-3 gap-3 max-md:gap-1.5">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[var(--app-surface)] p-3 shadow-sm dark:border-slate-800 max-md:gap-1.5 max-md:p-1.5">
          <div className="shrink-0 rounded-lg bg-blue-50 p-2 dark:bg-blue-900/30">
            <ClipboardCheck size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-gray-500 dark:text-slate-500">
              إجمالي الجلسات
            </p>
            <p className="mt-0.5 text-xl font-black leading-none text-gray-900 dark:text-white max-md:text-lg">
              {stats.total}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[var(--app-surface)] p-3 shadow-sm dark:border-slate-800">
          <div className="shrink-0 rounded-lg bg-amber-50 p-2 dark:bg-amber-900/30 max-md:p-1">
            <Activity size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-gray-500 dark:text-slate-500">
              جلسات نشطة
            </p>
            <p className="mt-0.5 text-xl font-black leading-none text-amber-600 dark:text-amber-400 max-md:text-lg">
              {stats.active}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[var(--app-surface)] p-3 shadow-sm dark:border-slate-800">
          <div className="shrink-0 rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/30 max-md:p-1">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-gray-500 dark:text-slate-500">
              مكتملة
            </p>
            <p className="mt-0.5 text-xl font-black leading-none text-emerald-600 dark:text-emerald-400 max-md:text-lg">
              {stats.completed}
            </p>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="grid shrink-0 grid-cols-2 gap-3 max-md:gap-1.5">
        <button
          onClick={() => {
            setIsModalOpen(true);
          }}
          className="group flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-[var(--app-surface)] p-3.5 text-blue-600 shadow-sm transition-all hover:bg-blue-50/60 active:scale-95 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 max-md:p-2.5"
        >
          <div className="rounded-lg bg-blue-100 p-1 transition-transform group-hover:scale-110 dark:bg-blue-900/40">
            <Plus size={14} strokeWidth={3} />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest">جلسة جرد ميداني</p>
            <p className="text-[10px] font-medium text-gray-400">إحصاء يدوي مفصّل</p>
          </div>
        </button>

        <button
          onClick={() => navigate(ROUTES.DASHBOARD.INVENTORY_QUICK_AUDIT)}
          className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-emerald-500 to-teal-400 p-3.5 text-white shadow-md transition-all hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95 max-md:p-2.5"
        >
          <div className="rounded-lg bg-white/20 p-1 transition-transform group-hover:scale-110">
            <Zap size={14} strokeWidth={3} />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest">جرد سريع</p>
            <p className="text-[10px] font-medium text-emerald-100">تسوية مخزون فورية</p>
          </div>
        </button>
      </div>

      {/* ── Sessions List ── */}
      <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pb-2">
        {!audits || audits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-2xl bg-gray-100 p-4 dark:bg-slate-800">
              <ClipboardCheck
                size={32}
                className="text-gray-400 dark:text-slate-500"
                strokeWidth={1.5}
              />
            </div>
            <h3 className="text-sm font-bold text-gray-600 dark:text-slate-400 max-md:text-xs">
              لا توجد جلسات جرد
            </h3>
            <p className="mt-1 max-w-xs text-xs text-gray-400 dark:text-slate-600">
              أنشئ جلسة جرد ميداني جديدة أو استخدم الجرد السريع للبدء
            </p>
          </div>
        ) : (
          audits
            .filter((ad: AuditSessionListItem) => ad.status !== 'cancelled')
            .map((ad: AuditSessionListItem) => {
              const isCompleted = ad.status === 'completed';
              const progress = ad.progress ?? 0;
              const isDeletingThis = deleteTarget?.id === ad.id;
              return (
                <div
                  key={ad.id}
                  className={cn(
                    'group flex w-full items-stretch gap-2.5 rounded-xl border bg-[var(--app-surface)] p-3.5 transition-all hover:shadow-md max-md:p-2.5',
                    isCompleted
                      ? 'border-slate-200 dark:border-slate-800'
                      : 'border-blue-100 hover:border-blue-300 dark:border-blue-900/30 dark:hover:border-blue-700',
                    deleteTarget?.id === ad.id &&
                      'border-rose-300 bg-rose-50/50 dark:border-rose-700 dark:bg-rose-900/10'
                  )}
                >
                  {/* Session content — clickable */}
                  <button
                    onClick={() =>
                      navigate(
                        ROUTES.DASHBOARD.INVENTORY_AUDIT_SESSION.replace(':sessionId', ad.id)
                      )
                    }
                    className="min-w-0 flex-1 text-right"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={cn(
                          'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase',
                          isCompleted
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                        )}
                      >
                        {isCompleted ? (
                          <CircleCheckBig size={10} />
                        ) : (
                          <Activity size={10} className="animate-pulse" />
                        )}
                        {isCompleted ? 'مكتملة' : 'نشطة'}
                      </span>
                      {ad.accuracy && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                          دقة {ad.accuracy}%
                        </span>
                      )}
                      <span className="mr-auto flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-600">
                        <Clock size={10} /> {formatLocalDate(ad.created_at)}
                      </span>
                    </div>
                    <p className="truncate text-sm font-bold leading-tight text-gray-900 dark:text-white max-md:text-[13px]">
                      {ad.title}
                    </p>
                    {ad.warehouse_name && (
                      <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-slate-600">
                        {ad.warehouse_name}
                      </p>
                    )}

                    {/* Progress Bar */}
                    {progress > 0 && (
                      <div className="mt-2">
                        <div className="mb-1 flex justify-between text-[10px] font-bold text-gray-400">
                          <span>التقدم</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              isCompleted
                                ? 'bg-emerald-500'
                                : progress > 50
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </button>

                  {/* Delete button - only for active/in-progress sessions to protect finalized audit trail */}
                  {!isCompleted && (
                    <button
                      onClick={e => {
                        handleDeleteClick(e, ad);
                      }}
                      disabled={isDeletingSession}
                      className={cn(
                        'shrink-0 self-center rounded-lg border p-2 transition-all max-md:p-1.5',
                        isDeletingThis
                          ? 'border-rose-600 bg-rose-600 text-white'
                          : 'border-gray-200 bg-white text-gray-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-rose-700 dark:hover:bg-rose-900/20'
                      )}
                      title="إلغاء الجلسة"
                    >
                      {isDeletingSession && isDeletingThis ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  )}
                </div>
              );
            })
        )}
      </div>

      <StartAuditModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
      />

      {/* ── Delete Confirmation Dialog ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={cancelDelete}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl border-t border-gray-200 bg-[var(--app-surface)] p-5 shadow-2xl dark:border-slate-800"
            onClick={e => {
              e.stopPropagation();
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-xl bg-rose-100 p-2.5 dark:bg-rose-900/30">
                <Trash2 size={18} className="text-rose-600 dark:text-rose-400" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-gray-900 dark:text-white">
                  حذف جلسة الجرد
                </h3>
                <p className="truncate text-[11px] text-gray-400 dark:text-slate-500">
                  {deleteTarget.title}
                </p>
              </div>
            </div>
            <p className="mb-4 text-[13px] leading-relaxed text-gray-500 dark:text-slate-400">
              سيتم إلغاء هذه الجلسة وإخفاؤها من القائمة دون حذف بيانات الجرد المسجلة فيها (لحماية
              سجل المراجعة). هل تريد المتابعة؟
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={cancelDelete}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeletingSession}
                className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
              >
                {isDeletingSession ? <Loader2 size={15} className="animate-spin" /> : null}
                إلغاء الجلسة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAuditView;
