// Integrations Settings Component
import React from 'react';
import { Link,  Mail, MessageSquare,  Key, Save, CheckCircle, XCircle } from 'lucide-react';
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
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                        <Link className="w-5 h-5 text-indigo-600" />
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
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <Save className="w-4 h-4" />
                    <span className="text-sm font-medium">{t.save || 'حفظ'}</span>
                </button>
            </div>


            {/* Email Integration */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-slate-400" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            {t.email_integration || 'تكامل البريد الإلكتروني'}
                        </h3>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${integration.email_enabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                        {integration.email_enabled ? (
                            <>
                                <CheckCircle className="w-3 h-3" />
                                <span>{t.connected || 'متصل'}</span>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-3 h-3" />
                                <span>{t.not_connected || 'غير متصل'}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="email_enabled"
                            checked={integration.email_enabled}
                            onChange={(e) => handleUpdate({ email_enabled: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="email_enabled" className="text-sm text-slate-600 dark:text-slate-300">
                            {t.enable_email || 'تفعيل إرسال البريد الإلكتروني'}
                        </label>
                    </div>
                    {integration.email_enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mr-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                    {t.smtp_server || 'خادم SMTP'}
                                </label>
                                <input
                                    type="text"
                                    value={integration.email_smtp_server}
                                    onChange={(e) => handleUpdate({ email_smtp_server: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="smtp.example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                    {t.smtp_port || 'المنفذ'}
                                </label>
                                <input
                                    type="number"
                                    value={integration.email_smtp_port}
                                    onChange={(e) => handleUpdate({ email_smtp_port: parseInt(e.target.value) || 587 })}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                    {t.email_username || 'اسم المستخدم'}
                                </label>
                                <input
                                    type="text"
                                    value={integration.email_username}
                                    onChange={(e) => handleUpdate({ email_username: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                    {t.email_password || 'كلمة المرور'}
                                </label>
                                <input
                                    type="password"
                                    value={integration.email_password}
                                    onChange={(e) => handleUpdate({ email_password: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* SMS Integration */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-slate-400" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            {t.sms_integration || 'تكامل الرسائل النصية'}
                        </h3>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${integration.sms_enabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                        {integration.sms_enabled ? (
                            <>
                                <CheckCircle className="w-3 h-3" />
                                <span>{t.connected || 'متصل'}</span>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-3 h-3" />
                                <span>{t.not_connected || 'غير متصل'}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="sms_enabled"
                            checked={integration.sms_enabled}
                            onChange={(e) => handleUpdate({ sms_enabled: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="sms_enabled" className="text-sm text-slate-600 dark:text-slate-300">
                            {t.enable_sms || 'تفعيل إرسال الرسائل النصية'}
                        </label>
                    </div>
                    {integration.sms_enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mr-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                    {t.sms_provider || 'مزود الخدمة'}
                                </label>
                                <select
                                    value={integration.sms_provider}
                                    onChange={(e) => handleUpdate({ sms_provider: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="twilio">Twilio</option>
                                    <option value="nexmo">Nexmo</option>
                                    <option value="messagebird">MessageBird</option>
                                    <option value="other">{t.other || 'أخرى'}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                    {t.sender_name || 'اسم المرسل'}
                                </label>
                                <input
                                    type="text"
                                    value={integration.sms_sender_name}
                                    onChange={(e) => handleUpdate({ sms_sender_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* WhatsApp & Telegram Messaging */}
            {companyId && <MessagingIntegration companyId={companyId} />}

            {/* API Keys */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Key className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {t.api_keys || 'مفاتيح API'}
                    </h3>
                </div>
                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                {t.public_key || 'المفتاح العام'}
                            </span>
                            <button className="text-xs text-indigo-600 hover:text-indigo-700">
                                {t.copy || 'نسخ'}
                            </button>
                        </div>
                        <code className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                            {integration.api_public_key || 'pk_xxxxxxxxxxxx'}
                        </code>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                {t.secret_key || 'المفتاح السري'}
                            </span>
                            <button className="text-xs text-indigo-600 hover:text-indigo-700">
                                {t.copy || 'نسخ'}
                            </button>
                        </div>
                        <code className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                            ••••••••••••••••
                        </code>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default IntegrationsSettings;
