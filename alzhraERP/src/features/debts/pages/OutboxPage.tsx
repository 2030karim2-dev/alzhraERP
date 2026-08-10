import React, { useState } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debtApi } from '../api/debtApi';
import { useAuthStore } from '@/features/auth/store';
import PageLoader from '@/ui/base/PageLoader';
import { Send, MessageSquare, RefreshCw, Trash2 } from 'lucide-react';

const OutboxPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const companyId = user?.company_id || '';
  const [statusFilter, setStatusFilter] = useState('');

  const { data: messages, isLoading } = useQuery({
    queryKey: ['debts', 'outbox', companyId, statusFilter],
    queryFn: () => debtApi.getOutbox(companyId, statusFilter || undefined),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => debtApi.updateMessageStatus(id, 'cancelled'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts', 'outbox'] }),
  });

  if (isLoading) return <PageLoader />;

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', queued: 'bg-blue-100 text-blue-700',
    sent: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-400',
  };
  const statusLabels: Record<string, string> = {
    draft: 'مسودة', queued: 'في الانتظار', sent: 'تم الإرسال', failed: 'فشل', cancelled: 'ملغي',
  };

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--app-text)]">📨 {t('outbox')}</h1>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['debts', 'outbox'] })}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-[var(--app-text-secondary)]">
          <RefreshCw className="w-3 h-3"/> {t('refresh') || 'تحديث'}
        </button>
      </div>

      <div className="flex gap-1 flex-wrap">
        {['', 'draft', 'queued', 'sent', 'failed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-[var(--app-text-secondary)] hover:bg-gray-200'}`}>
            {s ? statusLabels[s] : t('all') || 'الكل'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {messages?.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border text-center text-[var(--app-text-secondary)]">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30"/><p>{t('no_messages') || 'لا توجد رسائل'}</p>
          </div>
        )}
        {messages?.map((msg: any) => (
          <div key={msg.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[msg.status] || ''}`}>{statusLabels[msg.status] || msg.status}</span>
                  <span className="text-xs text-[var(--app-text-secondary)]">{msg.channel}</span>
                  {msg.recipient && <span className="text-xs text-[var(--app-text-secondary)] truncate">{msg.recipient}</span>}
                </div>
                <p className="text-sm text-[var(--app-text)] line-clamp-2">{msg.message_text}</p>
                <div className="text-xs text-[var(--app-text-secondary)] mt-1">
                  {new Date(msg.created_at).toLocaleString('ar-SA')}
                  {msg.sent_at && ` · تم الإرسال: ${new Date(msg.sent_at).toLocaleString('ar-SA')}`}
                  {msg.error_info && <span className="text-red-500 ml-2">{msg.error_info}</span>}
                </div>
              </div>
              {(msg.status === 'draft' || msg.status === 'queued') && (
                <button onClick={() => cancelMutation.mutate(msg.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 shrink-0" title={t('cancel')}>
                  <Trash2 className="w-4 h-4"/>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OutboxPage;
