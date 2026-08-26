
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Receipt, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { ROUTES } from '../../../../core/routes/paths';
import Card from '../../../../ui/base/Card';

interface Props {
  /** فتح نافذة قيد يومية جديد (تمررها الصفحة الرئيسية) */
  onNewJournal?: () => void;
}

const QuickActions: React.FC<Props> = ({ onNewJournal }) => {
  const navigate = useNavigate();

  const colorMap: Record<string, { btn: string; icon: string; label: string }> = {
    blue: {
      btn: 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400',
      icon: 'text-blue-600 dark:text-blue-400 group-hover:text-white',
      label: 'قيد محاسبي',
    },
    rose: {
      btn: 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/50 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400',
      icon: 'text-rose-600 dark:text-rose-400 group-hover:text-white',
      label: 'مصروف',
    },
    emerald: {
      btn: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400',
      icon: 'text-emerald-600 dark:text-emerald-400 group-hover:text-white',
      label: 'سند قبض',
    },
    amber: {
      btn: 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/50 hover:bg-amber-600 hover:text-white text-amber-600 dark:text-amber-400',
      icon: 'text-amber-600 dark:text-amber-400 group-hover:text-white',
      label: 'سند صرف',
    },
  };

  const actions: { color: keyof typeof colorMap; icon: any; onClick: () => void }[] = [
    { color: 'blue', icon: Plus, onClick: () => onNewJournal?.() },
    { color: 'rose', icon: Receipt, onClick: () => navigate(ROUTES.DASHBOARD.EXPENSES) },
    { color: 'emerald', icon: ArrowDownCircle, onClick: () => navigate(ROUTES.DASHBOARD.BONDS) },
    { color: 'amber', icon: ArrowUpCircle, onClick: () => navigate(ROUTES.DASHBOARD.BONDS) },
  ];

  return (
    <Card variant="ledger">
      <h3 className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-widest mb-3 px-1">إجراءات سريعة</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map(action => {
          const c = colorMap[action.color];
          const Icon = action.icon;
          return (
            <button
              key={c.label}
              onClick={action.onClick}
              className={`group border p-3 transition-all text-right rounded-[var(--radius)] ${c.btn}`}
            >
              <Icon size={16} className={`mb-2 transition-transform group-hover:scale-110 ${c.icon}`} />
              <span className="text-[11px] font-bold block">{c.label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default QuickActions;