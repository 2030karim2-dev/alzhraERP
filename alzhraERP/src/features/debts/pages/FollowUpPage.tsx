import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useFollowUpDashboard } from '../hooks/useDebtQueries';
import { ROUTES } from '@/core/routes/paths';
import PageLoader from '@/ui/base/PageLoader';
import { AlertTriangle, Phone, Calendar, ChevronLeft } from 'lucide-react';

const FollowUpPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: rows, isLoading } = useFollowUpDashboard();

  if (isLoading) return <PageLoader />;

  const grouped = {
    critical: rows?.filter(r => r.classification === 'critical') || [],
    overdue: rows?.filter(r => r.classification === 'overdue') || [],
    due_today: rows?.filter(r => r.classification === 'due_today') || [],
    due_soon: rows?.filter(r => r.classification === 'due_soon') || [],
    current: rows?.filter(r => r.classification === 'current') || [],
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-[var(--app-text)]">🔔 {t('follow_up')}</h1>

      {/* Critical */}
      {grouped.critical.length > 0 && (
        <Section title={t('critical')} color="red" items={grouped.critical} />
      )}
      {/* Overdue */}
      {grouped.overdue.length > 0 && (
        <Section title={t('overdue')} color="orange" items={grouped.overdue} />
      )}
      {/* Due Today */}
      {grouped.due_today.length > 0 && (
        <Section title={t('due_today')} color="yellow" items={grouped.due_today} />
      )}
      {/* Due Soon */}
      {grouped.due_soon.length > 0 && (
        <Section title={t('due_soon')} color="blue" items={grouped.due_soon} />
      )}

      {rows?.length === 0 && (
        <div className="text-center py-12 text-[var(--app-text-secondary)]">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">{t('no_outstanding_debts')}</p>
        </div>
      )}
    </div>
  );
};

function Section({ title, color, items }: { title: string; color: string; items: any[] }) {
  const navigate = useNavigate();
  const bgColors: Record<string, string> = {
    red: 'border-red-200 dark:border-red-800',
    orange: 'border-orange-200 dark:border-orange-800',
    yellow: 'border-yellow-200 dark:border-yellow-800',
    blue: 'border-blue-200 dark:border-blue-800',
  };
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 ${bgColors[color] || ''}`}>
      <div className="p-3 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold">{title} ({items.length})</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {items.map((row, i) => (
          <div key={i} onClick={() => navigate(ROUTES.DASHBOARD.DEBTS_CUSTOMER.replace(':id', row.party_id))}
            className="p-3 flex items-center justify-between text-sm hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
            <div className="flex-1">
              <div className="font-medium">{row.party_name}</div>
              <div className="text-xs text-[var(--app-text-secondary)] flex items-center gap-2 mt-0.5">
                {row.party_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/>{row.party_phone}</span>}
                {row.days_overdue > 0 && <span className="flex items-center gap-1 text-red-500"><Calendar className="w-3 h-3"/>{row.days_overdue} {t('days') || 'يوم'}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold">{row.currency_code} {new Intl.NumberFormat('ar-SA').format(row.outstanding_balance)}</div>
              <div className="text-xs text-red-500">{row.overdue_balance > 0 ? `${new Intl.NumberFormat('ar-SA').format(row.overdue_balance)} ${t('overdue')}` : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FollowUpPage;
