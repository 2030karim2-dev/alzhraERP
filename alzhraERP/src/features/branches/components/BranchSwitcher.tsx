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
  const { activeBranchId, activeBranchName, setActiveBranch, resetToAll } = useBranchFilterStore();
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
          onClick={() => {
            setOpen(!open);
          }}
          className={cn(
            'mx-auto flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-bold shadow-sm transition-all',
            activeBranchId
              ? 'border-indigo-700 bg-indigo-600 text-white shadow-indigo-200/50 dark:shadow-none'
              : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          )}
          title={`الفرع الحالي: ${label}`}
        >
          {activeBranchId ? <GitBranch size={16} /> : <Globe size={16} />}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
          }}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-bold shadow-sm transition-all',
            activeBranchId
              ? 'border-indigo-700 bg-indigo-600 text-white shadow-indigo-200/50 dark:shadow-none'
              : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {activeBranchId ? (
              <GitBranch size={14} className="shrink-0 text-white" />
            ) : (
              <Globe size={14} className="shrink-0 text-indigo-500" />
            )}
            <span className="truncate">{label}</span>
          </div>
          <ChevronUp
            size={13}
            className={cn('shrink-0 transition-transform', open ? 'rotate-180' : '')}
          />
        </button>
      )}

      {/* Dropdown / Dropup Menu */}
      {open && (
        <div
          className={cn(
            'animate-in fade-in absolute z-[999] w-64 overflow-hidden rounded-2xl border border-gray-200 bg-[var(--app-surface)] shadow-2xl duration-150 dark:border-slate-700',
            placement === 'top'
              ? 'slide-in-from-bottom-2 bottom-full right-0 mb-2'
              : 'slide-in-from-top-2 right-0 top-full mt-2'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-[11px] font-bold text-gray-600 dark:text-slate-300">
              تبديل نطاق الفرع
            </p>
            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
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
              'flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-right text-xs font-bold transition-colors dark:border-slate-800/60',
              !activeBranchId
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                : 'text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
            )}
          >
            <div
              className={cn(
                'shrink-0 rounded-lg p-1.5',
                !activeBranchId
                  ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-slate-700'
              )}
            >
              <Globe size={14} />
            </div>
            <div className="flex-1 text-right">
              <p>جميع الفروع (الرئيسي والفرعية)</p>
              <p className="text-[10px] font-normal text-gray-400">عرض كل العمليات</p>
            </div>
            {!activeBranchId && (
              <Check size={15} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
            )}
          </button>

          {/* Branch List */}
          {isLoading ? (
            <div className="px-3 py-4 text-center text-xs font-bold text-gray-400">
              جاري التحميل...
            </div>
          ) : activeBranches.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs font-bold text-gray-400">
              لا توجد فروع نشطة
            </div>
          ) : (
            <div className="custom-scrollbar max-h-56 divide-y divide-gray-50 overflow-y-auto py-1 dark:divide-slate-800/40">
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
                      'flex w-full items-center gap-3 px-3 py-2.5 text-right text-xs font-bold transition-colors',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                    )}
                  >
                    <div
                      className={cn(
                        'shrink-0 rounded-lg p-1.5',
                        isActive
                          ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300'
                          : isMain
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-slate-700'
                      )}
                    >
                      <Building2 size={14} />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate">{branch.name}</p>
                        {isMain && (
                          <span className="py-0.2 rounded bg-amber-100 px-1 text-[10px] font-black text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            الرئيسي
                          </span>
                        )}
                      </div>
                      {branch.address && (
                        <p className="mt-0.5 truncate text-[10px] font-normal text-gray-400">
                          {branch.address}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <Check size={15} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
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
