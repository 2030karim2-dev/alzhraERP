
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, FileText, UserPlus, Receipt, Package, ClipboardList } from 'lucide-react';
import { cn } from '../../core/utils';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  path: string;
  color: string;
}

const actions: QuickAction[] = [
  { icon: <FileText size={18} />, label: 'فاتورة جديدة', path: '/sales/new', color: 'bg-blue-600 hover:bg-blue-700' },
  { icon: <UserPlus size={18} />, label: 'عميل جديد', path: '/parties/new', color: 'bg-emerald-600 hover:bg-emerald-700' },
  { icon: <Receipt size={18} />, label: 'مصروف جديد', path: '/expenses/new', color: 'bg-rose-600 hover:bg-rose-700' },
  { icon: <Package size={18} />, label: 'منتج جديد', path: '/inventory/new', color: 'bg-amber-600 hover:bg-amber-700' },
  { icon: <ClipboardList size={18} />, label: 'جرد سريع', path: '/inventory?quick=1', color: 'bg-violet-600 hover:bg-violet-700' },
];

const QuickActionFAB: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-[90] bg-slate-950/30 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)} />
      )}

      {/* Action Buttons */}
      <div className="fixed bottom-24 right-4 z-[95] flex flex-col-reverse items-end gap-2 md:hidden">
        {actions.map((action, idx) => (
          <button
            key={action.label}
            onClick={() => { navigate(action.path); setIsOpen(false); }}
            className={cn(
              'flex items-center gap-3 px-4 py-3 text-white text-xs font-bold rounded-2xl shadow-lg transition-all duration-300 active:scale-95',
              action.color,
              isOpen
                ? 'opacity-100 translate-x-0 scale-100'
                : 'opacity-0 translate-x-8 scale-75 pointer-events-none',
            )}
            style={{ transitionDelay: isOpen ? `${idx * 50}ms` : '0ms' }}
          >
            <span className="whitespace-nowrap">{action.label}</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              {action.icon}
            </div>
          </button>
        ))}

        {/* Main FAB */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'إغلاق القائمة' : 'إجراءات سريعة'}
          className={cn(
            'w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-90',
            isOpen
              ? 'bg-rose-600 rotate-45 shadow-rose-500/30'
              : 'bg-blue-600 shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1',
          )}
        >
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <Plus size={26} className="text-white" strokeWidth={3} />
          )}
        </button>
      </div>
    </>
  );
};

export default QuickActionFAB;
