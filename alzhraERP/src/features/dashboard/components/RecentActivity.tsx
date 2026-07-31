
import React from 'react';
import { Clock,   ShoppingBag, FileText, UserPlus, Receipt } from 'lucide-react';
import { cn } from '../../../core/utils';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  desc: string;
  time: string;
  color: string;
}

interface Props {
  activities?: ActivityItem[];
}

const RecentActivity: React.FC<Props> = ({ activities = [] }) => {

  const getIcon = (type: string) => {
    switch (type) {
      case 'sale': return ShoppingBag;
      case 'expense': return Receipt;
      case 'customer': return UserPlus;
      default: return FileText;
    }
  };

  return (
    <div className="bg-[var(--app-surface)] rounded-[2rem] border border-[var(--app-border)] p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-[var(--app-text)] flex items-center gap-2">
          <Clock size={16} className="text-[var(--app-text-secondary)]" />
          أحدث النشاطات
        </h3>
      </div>

      <div className="space-y-6 relative before:absolute before:top-2 before:bottom-2 before:right-[19px] before:w-0.5 before:bg-[var(--app-border)]">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-[var(--app-text-secondary)] text-[10px]">لا توجد نشاطات حديثة</div>
        ) : activities.map((item) => {
          const Icon = getIcon(item.type);
          return (
            <div key={item.id} className="relative flex gap-4 items-start group">
              <div className={cn(
                "relative z-10 w-10 h-10 rounded-xl flex items-center justify-center border-4 border-[var(--app-surface)] shadow-sm transition-transform group-hover:scale-110",
                `bg-${item.color}-50 text-${item.color}-600 dark:bg-${item.color}-900/20`
              )}>
                <Icon size={16} />
              </div>
              <div className="flex-1 pt-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-[11px] font-bold text-[var(--app-text)] group-hover:text-blue-600 transition-colors">{item.title}</h4>
                  <span className="text-[9px] font-bold text-[var(--app-text-secondary)] font-mono" dir="ltr">{new Date(item.time).toLocaleDateString('ar-SA')}</span>
                </div>
                <p className="text-[10px] text-[var(--app-text-secondary)] mt-0.5 line-clamp-1">{item.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default RecentActivity;
