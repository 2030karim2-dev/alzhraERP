
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Receipt, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { ROUTES } from '../../../../core/routes/paths';

interface Props {
  /** فتح نافذة قيد يومية جديد (تمررها الصفحة الرئيسية) */
  onNewJournal?: () => void;
}

const QuickActions: React.FC<Props> = ({ onNewJournal }) => {
  const navigate = useNavigate();

  const actions = [
    { label: 'قيد محاسبي', icon: Plus, color: 'blue', onClick: () => onNewJournal?.() },
    { label: 'مصروف', icon: Receipt, color: 'rose', onClick: () => navigate(ROUTES.DASHBOARD.EXPENSES) },
    { label: 'سند قبض', icon: ArrowDownCircle, color: 'emerald', onClick: () => navigate(ROUTES.DASHBOARD.BONDS) },
    { label: 'سند صرف', icon: ArrowUpCircle, color: 'amber', onClick: () => navigate(ROUTES.DASHBOARD.BONDS) },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-none border border-gray-100 dark:border-slate-800 p-3 shadow-sm">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">إجراءات سريعة</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map(action => (
          <button key={action.label} onClick={action.onClick} className={`group bg-${action.color}-50 dark:bg-${action.color}-900/10 border border-${action.color}-100 dark:border-${action.color}-800/50 p-3 text-${action.color}-600 dark:text-${action.color}-400 hover:bg-${action.color}-600 dark:hover:bg-${action.color}-500 hover:text-white transition-all text-right`}>
            <action.icon size={16} className="mb-2 transition-transform group-hover:scale-110" />
            <span className="text-[10px] font-bold">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;