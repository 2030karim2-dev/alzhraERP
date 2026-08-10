import React, { useState } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { debtApi } from '../api/debtApi';
import type { MessageTemplate } from '@/core/database/types/debt.types';

interface Props { templates: MessageTemplate[]; companyId: string; qc: ReturnType<typeof useQueryClient>; }

const TemplateSettings: React.FC<Props> = ({ templates, companyId, qc }) => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', body: '', channel: 'whatsapp' });
  const createMutation = useMutation({
    mutationFn: (data: typeof form) => debtApi.createMessageTemplate({ ...data, company_id: companyId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts', 'templates'] }); setShowForm(false); setForm({ name: '', body: '', channel: 'whatsapp' }); },
  });
  const vars = ['{{customer_name}}', '{{amount}}', '{{currency}}', '{{due_date}}', '{{days_overdue}}', '{{company_name}}', '{{invoice_number}}'];

  return (
    <div className="space-y-4 max-w-lg">
      <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ {t('add_template') || 'إضافة قالب'}</button>
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border space-y-3">
          <input placeholder={t('name')} value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"/>
          <textarea placeholder={t('message_body') || 'نص الرسالة'} value={form.body} onChange={e => setForm({...form, body: e.target.value})} rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm resize-none"/>
          <div className="flex flex-wrap gap-1">
            {vars.map(v => <button key={v} type="button" onClick={() => setForm({...form, body: form.body + ' ' + v})}
              className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-600 text-[var(--app-text-secondary)] hover:bg-blue-100 hover:text-blue-700">{v}</button>)}
          </div>
          <button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.body || createMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
            {createMutation.isPending ? '...' : t('save')}
          </button>
        </div>
      )}
      <div className="space-y-2">
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border">
            <div className="font-medium text-sm">{tmpl.name}</div>
            <div className="text-xs text-[var(--app-text-secondary)] mt-1 line-clamp-2">{tmpl.body}</div>
            <div className="text-xs text-[var(--app-text-secondary)] mt-1">{tmpl.channel}</div>
          </div>
        ))}
        {templates.length === 0 && !showForm && (
          <div className="text-center py-8 text-[var(--app-text-secondary)]">{t('no_templates') || 'لا توجد قوالب'}</div>
        )}
      </div>
    </div>
  );
};

export default TemplateSettings;
