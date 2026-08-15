import React, { useState, useMemo } from 'react';
import { ClipboardCheck, Plus, Loader2, CheckCircle2, Activity, Clock, Zap, Trash2, CircleCheckBig } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StartAuditModal from './StartAuditModal';
import { useAuditSessions, useInventoryMutations } from '../hooks/useInventoryManagement';
import { useFeedbackStore } from '../../feedback/store';
import { cn } from '../../../core/utils';

const StockAuditView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const { data: audits, isLoading } = useAuditSessions();
  const { deleteAuditSession, isDeletingSession } = useInventoryMutations();
  const { showToast } = useFeedbackStore();
  const navigate = useNavigate();

  const handleDeleteClick = (e: React.MouseEvent, session: any) => {
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

  const cancelDelete = () => setDeleteTarget(null);

  const stats = useMemo(() => {
    if (!audits) return { total: 0, active: 0, completed: 0 };
    return {
      total: audits.length,
      active: audits.filter((a: any) => a.status === 'active').length,
      completed: audits.filter((a: any) => a.status === 'completed').length,
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
    <div className="space-y-4 flex flex-col h-full font-cairo">

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-3 max-md:gap-1.5 shrink-0">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 max-md:p-1.5 flex items-center gap-3 max-md:gap-1.5 shadow-sm">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg shrink-0">
            <ClipboardCheck size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase">إجمالي الجلسات</p>
            <p className="text-xl max-md:text-lg font-black text-gray-900 dark:text-white leading-none mt-0.5">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-3 shadow-sm">
          <div className="p-2 max-md:p-1 bg-amber-50 dark:bg-amber-900/30 rounded-lg shrink-0">
            <Activity size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase">جلسات نشطة</p>
            <p className="text-xl max-md:text-lg font-black text-amber-600 dark:text-amber-400 leading-none mt-0.5">{stats.active}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-3 shadow-sm">
          <div className="p-2 max-md:p-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg shrink-0">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase">مكتملة</p>
            <p className="text-xl max-md:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">{stats.completed}</p>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="grid grid-cols-2 gap-3 max-md:gap-1.5 shrink-0">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-white dark:bg-slate-900 border-2 border-dashed border-blue-300 dark:border-blue-800 rounded-xl p-3.5 max-md:p-2.5 text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2 hover:bg-blue-50/60 dark:hover:bg-blue-900/20 transition-all active:scale-95 shadow-sm group"
        >
          <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded-lg group-hover:scale-110 transition-transform">
            <Plus size={14} strokeWidth={3} />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest">جلسة جرد ميداني</p>
            <p className="text-[9px] text-gray-400 font-medium">إحصاء يدوي مفصّل</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/inventory/quick-audit')}
          className="bg-gradient-to-l from-emerald-500 to-teal-400 text-white rounded-xl p-3.5 max-md:p-2.5 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-95 shadow-md group"
        >
          <div className="p-1 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
            <Zap size={14} strokeWidth={3} />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest">جرد سريع</p>
            <p className="text-[9px] text-emerald-100 font-medium">تسوية مخزون فورية</p>
          </div>
        </button>
      </div>

      {/* ── Sessions List ── */}
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar min-h-0 pb-2">
        {(!audits || audits.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-2xl mb-4">
              <ClipboardCheck size={32} className="text-gray-400 dark:text-slate-500" strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-gray-600 dark:text-slate-400 text-sm max-md:text-xs">لا توجد جلسات جرد</h3>
            <p className="text-xs text-gray-400 dark:text-slate-600 mt-1 max-w-xs">
              أنشئ جلسة جرد ميداني جديدة أو استخدم الجرد السريع للبدء
            </p>
          </div>
        ) : (
          audits.filter((ad: any) => ad.status !== 'cancelled').map((ad: any) => {
            const isCompleted = ad.status === 'completed';
            const progress = ad.progress ?? 0;
            const isDeletingThis = deleteTarget?.id === ad.id;
            return (
              <div
                key={ad.id}
                className={cn(
                  "w-full bg-white dark:bg-slate-900 rounded-xl border p-3.5 max-md:p-2.5 hover:shadow-md transition-all group flex items-stretch gap-2.5",
                  isCompleted
                    ? "border-slate-200 dark:border-slate-800"
                    : "border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700",
                  deleteTarget?.id === ad.id && "border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-900/10"
                )}
              >
                {/* Session content — clickable */}
                <button
                  onClick={() => navigate(`/inventory/audit/${ad.id}`)}
                  className="flex-1 text-right min-w-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1",
                      isCompleted
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                    )}>
                      {isCompleted ? <CircleCheckBig size={9} /> : <Activity size={9} className="animate-pulse" />}
                      {isCompleted ? 'مكتملة' : 'نشطة'}
                    </span>
                    {ad.accuracy && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        دقة {ad.accuracy}%
                      </span>
                    )}
                    <span className="text-[9px] text-gray-400 dark:text-slate-600 flex items-center gap-1 mr-auto">
                      <Clock size={9} /> {new Date(ad.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm max-md:text-[13px] truncate leading-tight">{ad.title}</p>
                  {ad.warehouse_name && (
                    <p className="text-[10px] text-gray-400 dark:text-slate-600 truncate mt-0.5">{ad.warehouse_name}</p>
                  )}

                  {/* Progress Bar */}
                  {progress > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[9px] font-bold text-gray-400 mb-1">
                        <span>التقدم</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isCompleted
                              ? "bg-emerald-500"
                              : progress > 50 ? "bg-blue-500" : "bg-amber-500"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteClick(e, ad)}
                  disabled={isDeletingSession}
                  className={cn(
                    "self-center shrink-0 rounded-lg p-2 max-md:p-1.5 border transition-all",
                    isDeletingThis
                      ? "bg-rose-600 text-white border-rose-600"
                      : "bg-white dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  )}
                  title="حذف الجلسة"
                >
                  {isDeletingSession && isDeletingThis ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      <StartAuditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* ── Delete Confirmation Dialog ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={cancelDelete}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-2xl border-t border-gray-200 dark:border-slate-800 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                <Trash2 size={18} className="text-rose-600 dark:text-rose-400" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-gray-900 dark:text-white text-base truncate">حذف جلسة الجرد</h3>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{deleteTarget.title}</p>
              </div>
            </div>
            <p className="text-[13px] text-gray-500 dark:text-slate-400 mb-4 leading-relaxed">
              هل أنت متأكد من حذف هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء وستُحذف جميع بيانات الجرد المرتبطة بها.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={cancelDelete}
                className="rounded-xl py-2.5 px-4 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeletingSession}
                className="rounded-xl py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isDeletingSession ? <Loader2 size={15} className="animate-spin" /> : null}
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAuditView;