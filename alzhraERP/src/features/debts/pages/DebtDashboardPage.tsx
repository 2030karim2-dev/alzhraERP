import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarCheck, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useDebtAnalytics, useFollowUpDashboard, useTodayTasks } from '../hooks/useDebtQueries';
import { ROUTES } from '@/core/routes/paths';
import PageLoader from '@/ui/base/PageLoader';

const fmt = (v: number) => new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(v);

const DebtDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: a, isLoading } = useDebtAnalytics();
  const { data: f } = useFollowUpDashboard();
  const { data: tt } = useTodayTasks();

  if (isLoading) return <PageLoader />;
  const crit = f?.filter(r => r.classification === 'critical').length || 0;
  const tdy = tt?.length || 0;

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div><h1 className="text-2xl font-bold text-[var(--app-text)]">💰 {t('debt_receivables')}</h1></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={<TrendingUp/>} label={t('total_receivables')} v={fmt(a?.total_receivables||0)} c="blue" onClick={() => navigate(ROUTES.DASHBOARD.DEBTS_FOLLOW_UP)} />
        <KPI icon={<AlertTriangle/>} label={t('overdue')} v={fmt(a?.overdue_receivables||0)} c="red" sub={crit>0?`${crit} ${t('critical')}`:''} />
        <KPI icon={<CalendarCheck/>} label={t('due_today')} v={fmt(a?.due_today||0)} c="orange" badge={tdy} onClick={() => navigate(ROUTES.DASHBOARD.DEBTS_TODAY)} />
        <KPI icon={<Users/>} label={t('pending_promises')} v={`${a?.pending_promises||0}`} c="emerald" sub={`${a?.broken_promises||0} ${t('broken')}`} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Act icon={<AlertTriangle/>} label={t('follow_up')} cl="text-red-600" onClick={() => navigate(ROUTES.DASHBOARD.DEBTS_FOLLOW_UP)} />
        <Act icon={<CalendarCheck/>} label={t('today_tasks')} cl="text-orange-600" onClick={() => navigate(ROUTES.DASHBOARD.DEBTS_TODAY)} />
        <Act icon={<ArrowRight/>} label={t('outbox')} cl="text-indigo-600" onClick={() => navigate(ROUTES.DASHBOARD.DEBTS_OUTBOX)} />
        <Act icon={<TrendingUp/>} label={t('reports')} cl="text-teal-600" onClick={() => navigate(ROUTES.DASHBOARD.DEBTS_REPORTS)} />
      </div>
      {a?.by_currency && a.by_currency.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
          <h3 className="text-sm font-semibold mb-3">{t('balances_by_currency')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {a.by_currency.map((c) => (
              <div key={c.currency} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold">{c.currency}</div>
                <div className="text-sm text-[var(--app-text-secondary)]">{fmt(c.balance)}</div>
                <div className="text-xs text-[var(--app-text-secondary)] mt-1">{c.count} {t('parties')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {f && f.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
          <div className="flex justify-between mb-3">
            <h3 className="text-sm font-semibold">{t('recent_follow_ups')}</h3>
            <button onClick={() => navigate(ROUTES.DASHBOARD.DEBTS_FOLLOW_UP)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              {t('view_all')} <ArrowRight className="w-3 h-3"/>
            </button>
          </div>
          <div className="space-y-2">
            {f.slice(0,5).map((r,i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="font-medium">{r.party_name}</span>
                <span className="text-[var(--app-text-secondary)]">{r.currency_code} {fmt(r.outstanding_balance)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.classification==='critical'?'bg-red-100 text-red-700':r.classification==='overdue'?'bg-orange-100 text-orange-700':'bg-blue-100 text-blue-700'}`}>{r.classification}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface KPICardProps { icon: React.ReactNode; label: string; v: string; c: string; sub?: string; badge?: number; onClick?: () => void; }

interface ActBtnProps { icon: React.ReactNode; label: string; cl: string; onClick: () => void; }

function KPI({ icon, label, v, c, sub, badge, onClick }: KPICardProps) {
  const cc: Record<string,string> = { blue:'bg-blue-50 text-blue-600', red:'bg-red-50 text-red-600', orange:'bg-orange-50 text-orange-600', emerald:'bg-emerald-50 text-emerald-600' };
  return <div onClick={onClick} className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border ${onClick?'cursor-pointer hover:shadow-md':''}`}>
    <div className="flex items-center gap-2 mb-2"><div className={`p-1.5 rounded-lg ${cc[c]}`}>{icon}</div><span className="text-xs text-[var(--app-text-secondary)]">{label}</span>{badge>0&&<span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">{badge}</span>}</div>
    <div className="text-lg font-bold">{v}</div>
    {sub&&<div className="text-xs text-red-500 mt-1">{sub}</div>}
  </div>;
}

function Act({ icon, label, cl, onClick }: ActBtnProps) {
  return <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${cl}`}>
    {icon}<span className="text-sm font-medium text-[var(--app-text)]">{label}</span>
  </button>;
}

export default DebtDashboardPage;

