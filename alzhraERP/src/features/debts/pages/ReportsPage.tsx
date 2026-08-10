import React from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useDebtAnalytics, useFollowUpDashboard } from '../hooks/useDebtQueries';
import PageLoader from '@/ui/base/PageLoader';
import { TrendingUp, AlertTriangle, CalendarCheck, Users, Wallet } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(v);

const DebtReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: a, isLoading } = useDebtAnalytics();
  const { data: f } = useFollowUpDashboard();
  if (isLoading) return <PageLoader />;

  const byClass = {
    critical: f?.filter(r => r.classification === 'critical').length || 0,
    overdue: f?.filter(r => r.classification === 'overdue').length || 0,
    due_today: f?.filter(r => r.classification === 'due_today').length || 0,
    due_soon: f?.filter(r => r.classification === 'due_soon').length || 0,
    current: f?.filter(r => r.classification === 'current').length || 0,
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-[var(--app-text)]">📊 {t('debt_reports')}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={<Wallet/>} label={t('total_receivables')} value={fmt(a?.total_receivables || 0)} color="blue"/>
        <Stat icon={<AlertTriangle/>} label={t('overdue')} value={fmt(a?.overdue_receivables || 0)} color="red"/>
        <Stat icon={<CalendarCheck/>} label={t('due_today')} value={fmt(a?.due_today || 0)} color="orange"/>
        <Stat icon={<Users/>} label={t('pending_promises')} value={`${a?.pending_promises || 0}`} color="emerald" sub={`${a?.broken_promises || 0} ${t('broken')}`}/>
      </div>

      {/* Aging Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> {t('aging_summary') || 'ملخص تقادم الديون'}</h3>
        <div className="space-y-3">
          {[{ label: t('critical'), count: byClass.critical, color: 'bg-red-500' },
            { label: t('overdue'), count: byClass.overdue, color: 'bg-orange-500' },
            { label: t('due_today'), count: byClass.due_today, color: 'bg-yellow-500' },
            { label: t('due_soon'), count: byClass.due_soon, color: 'bg-blue-500' },
            { label: t('current'), count: byClass.current, color: 'bg-green-500' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-xs w-20 text-[var(--app-text-secondary)]">{item.label}</span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                <div className={`h-3 rounded-full ${item.color} transition-all`} style={{ width: `${f && f.length > 0 ? (item.count / f.length) * 100 : 0}%` }}/>
              </div>
              <span className="text-xs font-bold w-8 text-right">{item.count}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-[var(--app-text-secondary)] mt-3">{t('total')}: {f?.length || 0} {t('parties')}</div>
      </div>


      {/* Currency Breakdown */}
      {a?.by_currency && a.by_currency.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border">
          <h3 className="text-sm font-semibold mb-4">{t('balances_by_currency')}</h3>
          <table className="w-full text-xs">
            <thead className="text-[var(--app-text-secondary)] border-b border-gray-100 dark:border-gray-700">
              <tr><th className="p-2 text-right">{t('currency')}</th><th className="p-2 text-right">{t('balance')}</th><th className="p-2 text-right">{t('parties')}</th></tr>
            </thead>
            <tbody>
              {a.by_currency.map((c: any) => (
                <tr key={c.currency} className="border-b border-gray-50 dark:border-gray-700/50">
                  <td className="p-2 font-medium">{c.currency}</td><td className="p-2">{fmt(c.balance)}</td><td className="p-2">{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Debtors */}
      {f && f.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border">
          <h3 className="text-sm font-semibold mb-4">{t('top_debtors') || 'أكبر الديون'}</h3>
          <div className="space-y-2">
            {[...f].sort((a, b) => b.outstanding_balance - a.outstanding_balance).slice(0, 10).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--app-text-secondary)] w-5">{i + 1}.</span>
                  <span className="font-medium">{r.party_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--app-text-secondary)]">{r.currency_code} {fmt(r.outstanding_balance)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.classification==='critical'?'bg-red-100 text-red-700':r.classification==='overdue'?'bg-orange-100 text-orange-700':'bg-blue-100 text-blue-700'}`}>{r.classification}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function Stat({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string; color: string; sub?: string }) {
  const cc: Record<string,string> = { blue:'bg-blue-50 text-blue-600', red:'bg-red-50 text-red-600', orange:'bg-orange-50 text-orange-600', emerald:'bg-emerald-50 text-emerald-600' };
  return <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
    <div className="flex items-center gap-2 mb-2"><div className={`p-1.5 rounded-lg ${cc[color]}`}>{icon}</div><span className="text-xs text-[var(--app-text-secondary)]">{label}</span></div>
    <div className="text-lg font-bold">{value}</div>
    {sub && <div className="text-xs text-red-500 mt-1">{sub}</div>}
  </div>;
}

export default DebtReportsPage;
