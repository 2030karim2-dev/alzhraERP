// Integrations Settings Component
import React from 'react';
import { Link, Mail, MessageSquare, Key, Save, CheckCircle, XCircle } from 'lucide-react';
import { useSettingsStore } from '../../settingsStore';
import { useI18nStore } from '@/lib/i18nStore';
import Card from '@/ui/base/Card';
import MessagingIntegration from './MessagingIntegration';
import { useAuthStore } from '@/features/auth/store';

export const IntegrationsSettings: React.FC = () => {
  const { dictionary: t } = useI18nStore();
  const { integration, setIntegrationSettings } = useSettingsStore();
  const companyId = useAuthStore(s => s.user?.company_id);

  const handleUpdate = (updates: Partial<typeof integration>) => {
    setIntegrationSettings(updates);
  };

  return (
    <div className="space-y-6 p-6 max-md:p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 max-md:gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
            <Link className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {t.integrations_settings || 'إعدادات التكامل'}
            </h2>
            <p className="text-sm text-slate-500">
              {t.integrations_settings_desc || 'ربط التطبيق مع الخدمات الخارجية'}
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700 max-md:gap-2">
          <Save className="h-4 w-4" />
          <span className="text-sm font-medium">{t.save || 'حفظ'}</span>
        </button>
      </div>

      {/* Email Integration */}
      <Card className="p-6 max-md:p-3">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 max-md:gap-2">
            <Mail className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              {t.email_integration || 'تكامل البريد الإلكتروني'}
            </h3>
          </div>
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium max-md:gap-1 ${
              integration.email_enabled
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {integration.email_enabled ? (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>{t.connected || 'متصل'}</span>
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                <span>{t.not_connected || 'غير متصل'}</span>
              </>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 max-md:gap-2">
            <input
              type="checkbox"
              id="email_enabled"
              checked={integration.email_enabled}
              onChange={e => {
                handleUpdate({ email_enabled: e.target.checked });
              }}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="email_enabled" className="text-sm text-slate-600 dark:text-slate-300">
              {t.enable_email || 'تفعيل إرسال البريد الإلكتروني'}
            </label>
          </div>
          {integration.email_enabled && (
            <div className="mr-6 grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  {t.smtp_server || 'خادم SMTP'}
                </label>
                <input
                  type="text"
                  value={integration.email_smtp_server}
                  onChange={e => {
                    handleUpdate({ email_smtp_server: e.target.value });
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-800 focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  {t.smtp_port || 'المنفذ'}
                </label>
                <input
                  type="number"
                  value={integration.email_smtp_port}
                  onChange={e => {
                    handleUpdate({ email_smtp_port: parseInt(e.target.value) || 587 });
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-800 focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  {t.email_username || 'اسم المستخدم'}
                </label>
                <input
                  type="text"
                  value={integration.email_username}
                  onChange={e => {
                    handleUpdate({ email_username: e.target.value });
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-800 focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  {t.email_password || 'كلمة المرور'}
                </label>
                <input
                  type="password"
                  value={integration.email_password}
                  onChange={e => {
                    handleUpdate({ email_password: e.target.value });
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-800 focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* SMS Integration */}
      <Card className="p-6 max-md:p-3">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 max-md:gap-2">
            <MessageSquare className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              {t.sms_integration || 'تكامل الرسائل النصية'}
            </h3>
          </div>
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium max-md:gap-1 ${
              integration.sms_enabled
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {integration.sms_enabled ? (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>{t.connected || 'متصل'}</span>
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                <span>{t.not_connected || 'غير متصل'}</span>
              </>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 max-md:gap-2">
            <input
              type="checkbox"
              id="sms_enabled"
              checked={integration.sms_enabled}
              onChange={e => {
                handleUpdate({ sms_enabled: e.target.checked });
              }}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="sms_enabled" className="text-sm text-slate-600 dark:text-slate-300">
              {t.enable_sms || 'تفعيل إرسال الرسائل النصية'}
            </label>
          </div>
          {integration.sms_enabled && (
            <div className="mr-6 grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  {t.sms_provider || 'مزود الخدمة'}
                </label>
                <select
                  value={integration.sms_provider}
                  onChange={e => {
                    handleUpdate({ sms_provider: e.target.value });
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-800 focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="twilio">Twilio</option>
                  <option value="nexmo">Nexmo</option>
                  <option value="messagebird">MessageBird</option>
                  <option value="other">{t.other || 'أخرى'}</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  {t.sender_name || 'اسم المرسل'}
                </label>
                <input
                  type="text"
                  value={integration.sms_sender_name}
                  onChange={e => {
                    handleUpdate({ sms_sender_name: e.target.value });
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-800 focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* WhatsApp & Telegram Messaging */}
      {companyId && <MessagingIntegration companyId={companyId} />}

      {/* API Keys */}
      <Card className="p-6 max-md:p-3">
        <div className="mb-4 flex items-center gap-2 max-md:gap-2">
          <Key className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {t.api_keys || 'مفاتيح API'}
          </h3>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 max-md:p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {t.public_key || 'المفتاح العام'}
              </span>
              <button className="text-xs text-indigo-600 hover:text-indigo-700">
                {t.copy || 'نسخ'}
              </button>
            </div>
            <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              {integration.api_public_key || 'pk_xxxxxxxxxxxx'}
            </code>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 max-md:p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {t.secret_key || 'المفتاح السري'}
              </span>
              <button className="text-xs text-indigo-600 hover:text-indigo-700">
                {t.copy || 'نسخ'}
              </button>
            </div>
            <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              ••••••••••••••••
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default IntegrationsSettings;
