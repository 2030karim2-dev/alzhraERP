import React, { useState, useRef, useEffect } from 'react';
import { GitBranch, ChevronUp, Globe, Check, Building2 } from 'lucide-react';
import { useAuthStore } from '../../auth/store';
import { useBranchFilterStore } from '../store';
import { useBranches } from '../../settings/hooks';
import { cn } from '../../../core/utils';

interface BranchSwitcherProps {
  className?: string;
  isCollapsed?: boolean;
  placement?: 'top' | 'bottom';
}

/**
 * BranchSwitcher
 *
 * مكوّن dropdown يظهر فقط للمدير العام (owner/admin).
 * يتيح تبديل الفرع الذي تُعرض بياناته دون إعادة تسجيل الدخول.
 * يُوضع في شريط التنقل الرئيسي (Sidebar/Topbar).
 */
const BranchSwitcher: React.FC<BranchSwitcherProps> = ({
  className,
  isCollapsed = false,
  placement = 'top',
}) => {
  const { user } = useAuthStore();
  const { activeBranchId, activeBranchName, setActiveBranch, resetToAll } =
    useBranchFilterStore();
  const branchesQuery = useBranches();
  const branches = (branchesQuery as any)?.data ?? (branchesQuery as any);
  const isLoading = branchesQuery?.isLoading ?? false;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // إغلاق عند النقر خارج المكون
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, []);

  // إظهار فقط للمدير العام
  const isManager = user?.role === 'owner' || user?.role === 'admin';
  if (!isManager) return null;

  const activeBranches = (Array.isArray(branches) ? branches : []).filter(
    (b: any) => b.status === 'active'
  );
  const label = activeBranchId ? activeBranchName : 'جميع الفروع';

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger Button */}
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all border shadow-sm mx-auto',
            activeBranchId
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-200/50 dark:shadow-none'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-indigo-300'
          )}
          title={`الفرع الحالي: ${label}`}
        >
          {activeBranchId ? <GitBranch size={16} /> : <Globe size={16} />}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm',
            activeBranchId
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-200/50 dark:shadow-none'
              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-indigo-300'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {activeBranchId ? (
              <GitBranch size={14} className="shrink-0 text-white" />
            ) : (
              <Globe size={14} className="shrink-0 text-indigo-500" />
            )}
            <span className="truncate">{label}</span>
          </div>
          <ChevronUp
            size={13}
            className={cn(
              'transition-transform shrink-0',
              open ? 'rotate-180' : ''
            )}
          />
        </button>
      )}

      {/* Dropdown / Dropup Menu */}
      {open && (
        <div
          className={cn(
            'absolute z-[999] w-64 bg-[var(--app-surface)] border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150',
            placement === 'top'
              ? 'bottom-full mb-2 right-0 slide-in-from-bottom-2'
              : 'top-full mt-2 right-0 slide-in-from-top-2'
          )}
        >
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-600 dark:text-slate-300">
              تبديل نطاق الفرع
            </p>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
              إدارة الفروع
            </span>
          </div>

          {/* All Branches Option */}
          <button
            type="button"
            onClick={() => {
              resetToAll();
              setOpen(false);
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold transition-colors text-right border-b border-gray-100 dark:border-slate-800/60',
              !activeBranchId
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50'
            )}
          >
            <div
              className={cn(
                'p-1.5 rounded-lg shrink-0',
                !activeBranchId
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
              )}
            >
              <Globe size={14} />
            </div>
            <div className="flex-1 text-right">
              <p>جميع الفروع (الرئيسي والفرعية)</p>
              <p className="text-[10px] text-gray-400 font-normal">عرض كل العمليات</p>
            </div>
            {!activeBranchId && (
              <Check
                size={15}
                className="text-indigo-600 dark:text-indigo-400 shrink-0"
              />
            )}
          </button>

          {/* Branch List */}
          {isLoading ? (
            <div className="px-3 py-4 text-center text-xs text-gray-400 font-bold">
              جاري التحميل...
            </div>
          ) : activeBranches.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-gray-400 font-bold">
              لا توجد فروع نشطة
            </div>
          ) : (
            <div className="py-1 max-h-56 overflow-y-auto custom-scrollbar divide-y divide-gray-50 dark:divide-slate-800/40">
              {activeBranches.map((branch: any) => {
                const isActive = activeBranchId === branch.id;
                const isMain = branch.is_main === true;

                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => {
                      setActiveBranch(branch.id, branch.name);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold transition-colors text-right',
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <div
                      className={cn(
                        'p-1.5 rounded-lg shrink-0',
                        isActive
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                          : isMain
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                      )}
                    >
                      <Building2 size={14} />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate">{branch.name}</p>
                        {isMain && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-black">
                            الرئيسي
                          </span>
                        )}
                      </div>
                      {branch.address && (
                        <p className="text-[10px] text-gray-400 font-normal truncate mt-0.5">
                          {branch.address}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <Check
                        size={15}
                        className="text-indigo-600 dark:text-indigo-400 shrink-0"
                      />
                    )}
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
