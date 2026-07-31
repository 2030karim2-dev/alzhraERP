import React, { useState, useRef, useEffect } from 'react';
import { GitBranch, ChevronDown, Globe, Check, Building2 } from 'lucide-react';
import { useAuthStore } from '../../auth/store';
import { useBranchFilterStore } from '../store';
import { useBranches } from '../../settings/hooks.ts';
import { cn } from '../../../core/utils';

/**
 * BranchSwitcher
 * 
 * مكوّن dropdown يظهر فقط للمدير العام (owner/admin).
 * يتيح تبديل الفرع الذي تُعرض بياناته دون إعادة تسجيل الدخول.
 * يُوضع في شريط التنقل الرئيسي (Sidebar/Topbar).
 */
const BranchSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { user } = useAuthStore();
  const { activeBranchId, activeBranchName, setActiveBranch, resetToAll } = useBranchFilterStore();
  const branchesQuery = useBranches();
  const branches = (branchesQuery as any)?.data ?? (branchesQuery as any);
  const isLoading = branchesQuery?.isLoading ?? false;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // إغلاق عند النقر خارج المكون
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // إظهار فقط للمدير العام
  const isManager = user?.role === 'owner' || user?.role === 'admin';
  if (!isManager) return null;

  const activeBranches = (Array.isArray(branches) ? branches : []).filter((b: any) => b.status === 'active');
  const label = activeBranchId ? activeBranchName : 'جميع الفروع';

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
          activeBranchId
            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-200/50 dark:shadow-none'
            : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-indigo-300'
        )}
      >
        {activeBranchId ? <GitBranch size={13} /> : <Globe size={13} />}
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown
          size={12}
          className={cn('transition-transform shrink-0', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-3 py-2 border-b dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">تبديل الفرع</p>
          </div>

          {/* All Branches Option */}
          <button
            onClick={() => { resetToAll(); setOpen(false); }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold transition-colors text-right',
              !activeBranchId
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
            )}
          >
            <div className={cn(
              'p-1.5 rounded-lg',
              !activeBranchId ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
            )}>
              <Globe size={13} />
            </div>
            <span className="flex-1">جميع الفروع</span>
            {!activeBranchId && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
          </button>

          {/* Branch List */}
          {isLoading ? (
            <div className="px-3 py-4 text-center text-xs text-gray-400">جاري التحميل...</div>
          ) : activeBranches.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-gray-400">لا توجد فروع نشطة</div>
          ) : (
            <div className="py-1 max-h-52 overflow-y-auto custom-scrollbar">
              {activeBranches.map((branch: any) => {
                const isActive = activeBranchId === branch.id;
                return (
                  <button
                    key={branch.id}
                    onClick={() => { setActiveBranch(branch.id, branch.name); setOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold transition-colors text-right',
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className={cn(
                      'p-1.5 rounded-lg shrink-0',
                      isActive ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                    )}>
                      <Building2 size={13} />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="truncate">{branch.name}</p>
                      {branch.address && (
                        <p className="text-[9px] text-gray-400 truncate mt-0.5">{branch.address}</p>
                      )}
                    </div>
                    {isActive && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BranchSwitcher;
