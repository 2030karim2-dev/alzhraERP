
import React from 'react';
import { Plus, Receipt, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

const QuickActions: React.FC = () => {
  const actions = [
    { label: 'قيد محاسبي', icon: Plus, color: 'blue' },
    { label: 'مصروف', icon: Receipt, color: 'rose' },
    { label: 'سند قبض', icon: ArrowDownCircle, color: 'emerald' },
    { label: 'سند صرف', icon: ArrowUpCircle, color: 'amber' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-none border border-gray-100 dark:border-slate-800 p-3 shadow-sm">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">إجراءات سريعة</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map(action => (
          <button key={action.label} className={`group bg-${action.color}-50 dark:bg-${action.color}-900/10 border border-${action.color}-100 dark:border-${action.color}-800/50 p-3 text-${action.color}-600 dark:text-${action.color}-400 hover:bg-${action.color}-600 dark:hover:bg-${action.color}-500 hover:text-white transition-all text-right`}>
            <action.icon size={16} className="mb-2 transition-transform group-hover:scale-110" />
            <span className="text-[10px] font-bold">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;