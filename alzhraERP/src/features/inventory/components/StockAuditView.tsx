import React, { useState, useMemo } from 'react';
import { ClipboardCheck, Plus, Loader2, CheckCircle2, Activity, Clock, Zap, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StartAuditModal from './StartAuditModal';
import { useAuditSessions } from '../hooks/useInventoryManagement';
import { cn } from '../../../core/utils';

const StockAuditView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: audits, isLoading } = useAuditSessions();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!audits) return { total: 0, active: 0, completed: 0 };
    return {
      total: audits.length,
      active: audits.filter((a: any) => a.status !== 'completed').length,
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
      <div className="grid grid-cols-3 gap-3 shrink-0">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg shrink-0">
            <ClipboardCheck size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase">إجمالي الجلسات</p>
            <p className="text-xl font-black text-gray-900 dark:text-white leading-none mt-0.5">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg shrink-0">
            <Activity size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase">جلسات نشطة</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 leading-none mt-0.5">{stats.active}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg shrink-0">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase">مكتملة</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">{stats.completed}</p>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-white dark:bg-slate-900 border-2 border-dashed border-blue-300 dark:border-blue-800 rounded-xl p-3.5 text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2 hover:bg-blue-50/60 dark:hover:bg-blue-900/20 transition-all active:scale-95 shadow-sm group"
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
          className="bg-gradient-to-l from-emerald-500 to-teal-400 text-white rounded-xl p-3.5 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-95 shadow-md group"
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
            <h3 className="font-bold text-gray-600 dark:text-slate-400 text-sm">لا توجد جلسات جرد</h3>
            <p className="text-xs text-gray-400 dark:text-slate-600 mt-1 max-w-xs">
              أنشئ جلسة جرد ميداني جديدة أو استخدم الجرد السريع للبدء
            </p>
          </div>
        ) : (
          audits.map((ad: any) => {
            const isCompleted = ad.status === 'completed';
            const progress = ad.progress ?? 0;
            return (
              <button
                key={ad.id}
                onClick={() => navigate(`/inventory/audit/${ad.id}`)}
                className={cn(
                  "w-full text-right bg-white dark:bg-slate-900 rounded-xl border p-3.5 hover:shadow-md transition-all active:scale-[0.99] group",
                  isCompleted
                    ? "border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100"
                    : "border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                        isCompleted
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 animate-pulse"
                      )}>
                        {isCompleted ? 'مكتملة' : 'نشطة'}
                      </span>
                      {ad.accuracy && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                          دقة {ad.accuracy}%
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{ad.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-gray-500 dark:text-slate-500 flex items-center gap-1">
                        <Clock size={10} /> {new Date(ad.created_at).toLocaleDateString('ar-SA')}
                      </span>
                      {ad.warehouse_name && (
                        <span className="text-[10px] text-gray-400 dark:text-slate-600 truncate">
                          {ad.warehouse_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronLeft size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0 mt-1" />
                </div>

                {/* Progress Bar */}
                {progress > 0 && (
                  <div className="mt-3">
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
            );
          })
        )}
      </div>

      <StartAuditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default StockAuditView;