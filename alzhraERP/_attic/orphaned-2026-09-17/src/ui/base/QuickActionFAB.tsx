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
  {
    icon: <FileText size={18} />,
    label: 'فاتورة جديدة',
    path: '/sales/new',
    color: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    icon: <UserPlus size={18} />,
    label: 'عميل جديد',
    path: '/parties/new',
    color: 'bg-emerald-600 hover:bg-emerald-700',
  },
  {
    icon: <Receipt size={18} />,
    label: 'مصروف جديد',
    path: '/expenses/new',
    color: 'bg-rose-600 hover:bg-rose-700',
  },
  {
    icon: <Package size={18} />,
    label: 'منتج جديد',
    path: '/inventory/new',
    color: 'bg-amber-600 hover:bg-amber-700',
  },
  {
    icon: <ClipboardList size={18} />,
    label: 'جرد سريع',
    path: '/inventory?quick=1',
    color: 'bg-violet-600 hover:bg-violet-700',
  },
];

const QuickActionFAB: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/30 backdrop-blur-sm md:hidden"
          onClick={() => {
            setIsOpen(false);
          }}
        />
      )}

      {/* Action Buttons */}
      <div className="fixed bottom-[calc(6rem_+_env(safe-area-inset-bottom))] right-4 z-[95] flex flex-col-reverse items-end gap-2 md:hidden">
        {actions.map((action, idx) => (
          <button
            key={action.label}
            onClick={() => {
              navigate(action.path);
              setIsOpen(false);
            }}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold text-white shadow-lg transition-all duration-300 active:scale-95',
              action.color,
              isOpen
                ? 'translate-x-0 scale-100 opacity-100'
                : 'pointer-events-none translate-x-8 scale-75 opacity-0'
            )}
            style={{ transitionDelay: isOpen ? `${idx * 50}ms` : '0ms' }}
          >
            <span className="whitespace-nowrap">{action.label}</span>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
              {action.icon}
            </div>
          </button>
        ))}

        {/* Main FAB */}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
          }}
          aria-label={isOpen ? 'إغلاق القائمة' : 'إجراءات سريعة'}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-2xl shadow-2xl transition-all duration-300 active:scale-90',
            isOpen
              ? 'rotate-45 bg-rose-600 shadow-rose-500/30'
              : 'bg-blue-600 shadow-blue-500/30 hover:-translate-y-1 hover:shadow-blue-500/50'
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
