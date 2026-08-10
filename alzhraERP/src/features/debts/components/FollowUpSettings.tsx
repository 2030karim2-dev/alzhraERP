import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { debtApi } from '../api/debtApi';
import { Save } from 'lucide-react';
import type { FollowupConfig } from '@/core/database/types/debt.types';

interface Props { config: FollowupConfig | null; companyId: string; qc: ReturnType<typeof useQueryClient>; }

const FollowUpSettings: React.FC<Props> = ({ config, companyId, qc }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ dueSoonDays: 7, criticalDays: 30, autoReminder: false });
  const mutation = useMutation({
    mutationFn: (data: typeof form) => debtApi.upsertFollowupConfig(companyId, {
      due_soon_days: data.dueSoonDays, overdue_critical_days: data.criticalDays, auto_reminder_enabled: data.autoReminder,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts', 'followupConfig'] }),
  });

  useEffect(() => {
    if (config) setForm({ dueSoonDays: config.due_soon_days || 7, criticalDays: config.overdue_critical_days || 30, autoReminder: config.auto_reminder_enabled || false });
  }, [config]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium mb-2">⏰ {t('due_soon_label') || 'تنبيه قرب الاستحقاق (أيام)'}</label>
        <input type="number" min={1} max={90} value={form.dueSoonDays}
          onChange={e => setForm({...form, dueSoonDays: parseInt(e.target.value) || 7})}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">🚨 {t('critical_label') || 'الحد الحرج للتأخير (أيام)'}</label>
        <input type="number" min={1} max={365} value={form.criticalDays}
          onChange={e => setForm({...form, criticalDays: parseInt(e.target.value) || 30})}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="autoReminder" checked={form.autoReminder}
          onChange={e => setForm({...form, autoReminder: e.target.checked})}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
        <label htmlFor="autoReminder" className="text-sm">{t('auto_reminder_label') || 'تفعيل التذكير التلقائي'}</label>
      </div>
      <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        <Save className="w-4 h-4"/> {mutation.isPending ? '...' : t('save_settings') || 'حفظ الإعدادات'}
      </button>
    </div>
  );
};

export default FollowUpSettings;
