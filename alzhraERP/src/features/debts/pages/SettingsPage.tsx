import React, { useState } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { debtApi } from '../api/debtApi';
import { useAuthStore } from '@/features/auth/store';
import PageLoader from '@/ui/base/PageLoader';
import { Bell, MessageSquare } from 'lucide-react';
import FollowUpSettings from '../components/FollowUpSettings';
import TemplateSettings from '../components/TemplateSettings';

const DebtSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const companyId = user?.company_id || '';
  const [tab, setTab] = useState<'followup' | 'templates'>('followup');

  const { data: config, isLoading } = useQuery({
    queryKey: ['debts', 'followupConfig', companyId],
    queryFn: () => debtApi.getFollowupConfig(companyId),
    enabled: !!companyId,
  });

  const { data: templates } = useQuery({
    queryKey: ['debts', 'templates', companyId],
    queryFn: () => debtApi.getMessageTemplates(companyId),
    enabled: !!companyId && tab === 'templates',
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-[var(--app-text)]">⚙️ {t('debt_settings')}</h1>
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('followup')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab==='followup'?'bg-white dark:bg-gray-600 text-[var(--app-text)] shadow-sm':'text-[var(--app-text-secondary)]'}`}>
          <Bell className="w-4 h-4"/> {t('follow_up')}
        </button>
        <button onClick={() => setTab('templates')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab==='templates'?'bg-white dark:bg-gray-600 text-[var(--app-text)] shadow-sm':'text-[var(--app-text-secondary)]'}`}>
          <MessageSquare className="w-4 h-4"/> {t('message_templates') || 'قوالب الرسائل'}
        </button>
      </div>
      {tab === 'followup' && <FollowUpSettings config={config} companyId={companyId} qc={qc} />}
      {tab === 'templates' && <TemplateSettings templates={templates || []} companyId={companyId} qc={qc} />}
    </div>
  );
};

export default DebtSettingsPage;
