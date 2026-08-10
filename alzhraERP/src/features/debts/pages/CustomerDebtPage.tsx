import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { usePartyBalances, usePartyInfo, usePromises, useCustomerActivities } from '../hooks/useDebtQueries';
import PageLoader from '@/ui/base/PageLoader';
import PromiseFormModal from '../components/PromiseFormModal';
import OpeningBalanceForm from '../components/OpeningBalanceForm';
import StatementTable from '../components/StatementTable';
import { ArrowLeft, Wallet, Plus, Phone, Check, X as XIcon, Clock, FileText, DollarSign } from 'lucide-react';
import type { PaymentPromise } from '@/core/database/types/debt.types';
import { useUpdatePromise } from '../hooks/useDebtMutations';

type Tab = 'overview' | 'promises' | 'statement' | 'opening' | 'activity';

const CustomerDebtPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: balances, isLoading: balLoading } = usePartyBalances(id || '');
  const updatePromise = useUpdatePromise();
  const [tab, setTab] = useState<Tab>('overview');
  const [showPromiseForm, setShowPromiseForm] = useState(false);
  const [showOpeningForm, setShowOpeningForm] = useState(false);

  const { data: party } = usePartyInfo(id || '');
  const { data: activities } = useCustomerActivities(id || '');

  const { data: promises, isLoading: promLoading } = usePromises(id);

  if (balLoading) return <PageLoader />;

  const tabs = useMemo((): { id: Tab; label: string }[] => [
    { id: 'overview', label: t('overview') || 'نظرة عامة' },
    { id: 'statement', label: t('statement') || 'كشف حساب' },
    { id: 'promises', label: t('promises') || 'الوعود' },
    { id: 'opening', label: t('opening_balance') || 'رصيد افتتاحي' },
    { id: 'activity', label: t('activity') || 'النشاطات' },
  ], [t]);

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text)]">
        <ArrowLeft className="w-4 h-4" /> {t('back')}
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--app-text)]">{party?.name || t('customer_debt_details')}</h1>
          {party?.phone && <p className="text-sm text-[var(--app-text-secondary)] mt-1 flex items-center gap-1"><Phone className="w-3 h-3"/> {party.phone}</p>}
        </div>
        <button onClick={() => setShowPromiseForm(true)} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 shrink-0">
          <Plus className="w-4 h-4"/> {t('add_promise')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {balances?.map((b) => (
          <div key={b.currency_code} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border text-center">
            <div className="text-sm text-[var(--app-text-secondary)] mb-1">{b.currency_code}</div>
            <div className={`text-2xl font-bold ${b.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{new Intl.NumberFormat('ar-SA').format(Math.abs(b.balance))}</div>
            <div className="text-xs text-[var(--app-text-secondary)] mt-2">{b.transaction_count} {t('transactions')}</div>
            {b.last_activity_date && <div className="text-xs text-[var(--app-text-secondary)]">{t('last_activity')}: {new Date(b.last_activity_date).toLocaleDateString('ar-SA')}</div>}
          </div>
        ))}
        {(!balances || balances.length === 0) && (
          <div className="col-span-3 text-center py-8 text-[var(--app-text-secondary)]"><Wallet className="w-10 h-10 mx-auto mb-2 opacity-30"/><p>{t('no_balances_found')}</p></div>
        )}
      </div>
      {tab === 'overview' && <OverviewTab balances={balances} creditLimit={party?.credit_limit} t={t} />}
      {tab === 'promises' && (
        <PromisesTab promises={promises || []} isLoading={promLoading}
          onFulfill={(pid) => updatePromise.mutate({ id: pid, payload: { status: 'completed', completed_at: new Date().toISOString() } })}
          onBreak={(pid) => updatePromise.mutate({ id: pid, payload: { status: 'broken' } })}
          onCancel={(pid) => updatePromise.mutate({ id: pid, payload: { status: 'cancelled', cancelled_at: new Date().toISOString() } })}
          t={t} />
      )}
      {tab === 'activity' && <ActivitiesTab activities={activities || []} t={t} />}
      {tab === 'statement' && (
        <StatementTable partyId={id || ''} partyName={party?.name || ''} />
      )}
      {tab === 'opening' && <OpeningTab partyId={id || ''} onAdd={() => setShowOpeningForm(true)} t={t} />}
      <PromiseFormModal isOpen={showPromiseForm} onClose={() => setShowPromiseForm(false)} partyId={id || ''} />
      <OpeningBalanceForm isOpen={showOpeningForm} onClose={() => setShowOpeningForm(false)} partyId={id || ''} />
    </div>
  );
};

function OverviewTab({ balances, creditLimit, t }: { balances: any[] | undefined; creditLimit: number | null; t: (k: string) => string }) {
  const total = balances?.reduce((s, b) => s + b.balance, 0) || 0;
  return (
    <div className="space-y-4">
      {creditLimit != null && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[var(--app-text-secondary)]">{t('credit_limit') || 'حد الائتمان'}</span>
            <span className="text-sm font-bold">{new Intl.NumberFormat('ar-SA').format(creditLimit)}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
            <div className={`h-2.5 rounded-full transition-all ${creditLimit > 0 && total / creditLimit > 0.9 ? 'bg-red-500' : total / creditLimit > 0.7 ? 'bg-orange-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(creditLimit > 0 ? (total / creditLimit) * 100 : 0, 100)}%` }} />
          </div>
          <div className="text-xs text-[var(--app-text-secondary)] mt-1">{creditLimit > 0 ? `${Math.round((total / creditLimit) * 100)}% ${t('used') || 'مستخدم'}` : ''}</div>
        </div>
      )}
    </div>
  );
}

function PromisesTab({ promises, isLoading, onFulfill, onBreak, onCancel, t }: {
  promises: PaymentPromise[]; isLoading: boolean;
  onFulfill: (id: string) => void; onBreak: (id: string) => void; onCancel: (id: string) => void;
  t: (k: string) => string;
}) {
  if (isLoading) return <div className="text-center py-8 text-[var(--app-text-secondary)]">{t('loading')}</div>;
  if (!promises.length) return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border text-center text-[var(--app-text-secondary)]">
      <Clock className="w-10 h-10 mx-auto mb-2 opacity-30"/><p>{t('no_promises') || 'لا توجد وعود دفع'}</p>
    </div>
  );
  const sc: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', completed: 'bg-green-100 text-green-700', broken: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-500' };
  return (
    <div className="space-y-2">
      {promises.map((p) => (
        <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{p.currency_code} {new Intl.NumberFormat('ar-SA').format(p.amount)}</div>
              <div className="text-xs text-[var(--app-text-secondary)] mt-0.5">{t('promise_date') || 'تاريخ الوعد'}: {new Date(p.promise_date).toLocaleDateString('ar-SA')}</div>
              {p.notes && <div className="text-xs text-[var(--app-text-secondary)] mt-0.5">{p.notes}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc[p.status] || ''}`}>{t(p.status) || p.status}</span>
              {p.status === 'pending' && (
                <div className="flex gap-1">
                  <button onClick={() => onFulfill(p.id)} className="p-1 rounded-lg hover:bg-green-50 text-green-600" title={t('complete') || 'إكمال'}><Check className="w-4 h-4"/></button>
                  <button onClick={() => onBreak(p.id)} className="p-1 rounded-lg hover:bg-red-50 text-red-600" title={t('break') || 'إلغاء'}><XIcon className="w-4 h-4"/></button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CustomerDebtPage;

      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1">
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${tab === tb.id ? 'bg-white dark:bg-gray-600 text-[var(--app-text)] shadow-sm' : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'}`}>{tb.label}</button>
        ))}
      </div>

function OpeningTab({ partyId, onAdd, t }: { partyId: string; onAdd: () => void; t: (k: string) => string }) {
  const { data: openings, isLoading } = useOpeningBalances(partyId);
  if (isLoading) return <div className="text-center py-8 text-[var(--app-text-secondary)]">{t('loading')}</div>;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={onAdd} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Plus className="w-4 h-4"/> {t('add_opening_balance') || 'إضافة رصيد افتتاحي'}
        </button>
      </div>
      {(!openings || openings.length === 0) ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border text-center text-[var(--app-text-secondary)]">
          <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30"/>
          <p>{t('no_opening_balances') || 'لا توجد أرصدة افتتاحية'}</p>
        </div>

function ActivitiesTab({ activities, t }: { activities: any[]; t: (k: string) => string }) {
  const typeIcons: Record<string, string> = {
    call: '📞', meeting: '🤝', visit: '🏢', note: '📝', task: '✅',
    invoice_created: '🧾', payment_received: '💰', follow_up: '🔔', complaint: '⚠️',
  };
  const typeLabels: Record<string, string> = {
    call: 'اتصال', meeting: 'اجتماع', visit: 'زيارة', note: 'ملاحظة', task: 'مهمة',
    invoice_created: 'فاتورة', payment_received: 'دفعة', follow_up: 'متابعة', complaint: 'شكوى',
  };
  if (!activities.length) return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border text-center text-[var(--app-text-secondary)]">
      <Clock className="w-10 h-10 mx-auto mb-2 opacity-30"/><p>{t('no_activities') || 'لا توجد نشاطات'}</p>
    </div>
  );
  return (
    <div className="space-y-2">
      {activities.map((a: any) => (
        <div key={a.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">{typeIcons[a.activity_type] || '📌'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{a.subject}</span>
                <span className="text-xs text-[var(--app-text-secondary)]">{new Date(a.created_at).toLocaleDateString('ar-SA')}</span>
              </div>
              <div className="text-xs text-[var(--app-text-secondary)] mt-0.5 flex items-center gap-2">
                <span>{typeLabels[a.activity_type] || a.activity_type}</span>
                {a.status && <span className={`px-1.5 py-0.5 rounded text-xs ${a.status==='completed'?'bg-green-100 text-green-700':a.status==='pending'?'bg-yellow-100 text-yellow-700':'bg-gray-100 text-gray-600'}`}>{a.status}</span>}
              </div>
              {a.description && <p className="text-xs text-[var(--app-text-secondary)] mt-1 line-clamp-2">{a.description}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

      ) : (
        <div className="space-y-2">
          {openings.map((o: any) => (
            <div key={o.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">{o.currency_code} {new Intl.NumberFormat('ar-SA').format(o.amount)}</div>
                <div className="text-xs text-[var(--app-text-secondary)]">{o.direction==='debit'?'مدين':'دائن'} · {new Date(o.entry_date).toLocaleDateString('ar-SA')}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.direction==='debit'?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>{o.direction==='debit'?'مدين':'دائن'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

