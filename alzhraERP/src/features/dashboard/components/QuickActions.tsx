import React from 'react';
import { ShoppingCart, UserPlus, Receipt, FileText, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../core/routes/paths';
import { cn } from '../../../core/utils';

const QuickActions: React.FC<{ className?: string }> = ({ className }) => {
  const navigate = useNavigate();

  const actions = [
    { label: 'فاتورة بيع', icon: ShoppingCart, color: '#3b82f6', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'سند قبض', icon: FileText, color: '#10b981', bg: 'bg-emerald-500/10 border-emerald-500/20', path: ROUTES.DASHBOARD.BONDS },
    { label: 'إضافة عميل', icon: UserPlus, color: '#8b5cf6', bg: 'bg-violet-500/10 border-violet-500/20', path: ROUTES.DASHBOARD.CLIENTS },
    { label: 'مصروف', icon: Receipt, color: '#f43f5e', bg: 'bg-rose-500/10 border-rose-500/20', path: ROUTES.DASHBOARD.EXPENSES },
    { label: 'مناقلة', icon: ArrowRightLeft, color: '#f59e0b', bg: 'bg-amber-500/10 border-amber-500/20', path: ROUTES.DASHBOARD.INVENTORY },
  ];

  return (
    <div className={cn(
      "bg-[var(--app-surface)]/90 backdrop-blur-2xl border border-[var(--app-border)] rounded-2xl p-4 overflow-hidden relative",
      className
    )}>
      {/* Ambient glow */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="text-xs font-bold text-[var(--app-text)]">إجراءات سريعة</h3>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => action.path && navigate(action.path)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300",
                "group-hover:-translate-y-1 group-hover:scale-110 group:active:scale-95",
                action.bg
              )}>
                <action.icon size={18} style={{ color: action.color, filter: `drop-shadow(0 0 4px ${action.color}40)` }} />
              </div>
              <span className="text-[8px] font-bold text-[var(--app-text-secondary)] group-hover:text-[var(--app-text)] transition-colors">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
