import React, { useState } from 'react';
import { CheckCircle, XCircle, Send, Loader2 } from 'lucide-react';
import Card from '@/ui/base/Card';
import type { MessagingConfig } from '@/features/notifications/messagingApi';
import { messagingApi } from '@/features/notifications/messagingApi';
import { useAuthStore } from '@/features/auth/store';
import { useFeedbackStore } from '@/features/feedback/store';

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface Props {
  config: MessagingConfig;
  onUpdate: (updates: Partial<MessagingConfig>) => void;
}

const WhatsAppCard: React.FC<Props> = ({ config, onUpdate }) => {
  const [isTesting, setIsTesting] = useState(false);
  const companyId = useAuthStore(s => s.user?.company_id);
  const { showToast } = useFeedbackStore();

  const handleTest = async () => {
    if (!config.whatsapp_api_url || !config.whatsapp_api_key || !config.whatsapp_phone) {
      showToast('يرجى ملء جميع حقول WhatsApp (الرابط، المفتاح، ورقم الهاتف) أولاً', 'error');
      return;
    }

    if (!companyId) return;

    try {
      setIsTesting(true);
      const res = await messagingApi.sendNotification(
        companyId,
        'test_connection',
        'اختبار اتصال Al-Zahra Smart ERP مع WhatsApp ناجح! 🚀'
      );

      if (res.success) {
        showToast('تم إرسال رسالة الاختبار بنجاح إلى WhatsApp!', 'success');
      } else {
        showToast('فشل اختبار الاتصال، تأكد من صحة المفاتيح والرابط', 'error');
      }
    } catch {
      showToast('حدث خطأ أثناء اختبار الاتصال', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="overflow-hidden border border-[var(--app-border)]">
      <div className="border-b border-gray-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-[#25D366]">
              <WhatsAppIcon />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">WhatsApp</h3>
              <p className="text-xs text-slate-500">إرسال الإشعارات عبر واتساب بيزنس API</p>
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              config.whatsapp_enabled
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {config.whatsapp_enabled ? (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                <span>مفعل</span>
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                <span>معطل</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={config.whatsapp_enabled}
            onChange={e => {
              onUpdate({ whatsapp_enabled: e.target.checked });
            }}
            className="h-5 w-5 cursor-pointer rounded-lg text-green-600 focus:ring-green-500"
          />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
            تفعيل إشعارات واتساب
          </span>
        </label>

        {config.whatsapp_enabled && (
          <div className="animate-in fade-in mr-8 space-y-4 duration-300">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600 dark:text-slate-300">
                  رابط API
                </label>
                <input
                  type="text"
                  value={config.whatsapp_api_url}
                  onChange={e => {
                    onUpdate({ whatsapp_api_url: e.target.value });
                  }}
                  placeholder="https://graph.facebook.com/v18.0/..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-mono text-sm text-slate-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600 dark:text-slate-300">
                  API Key / Token
                </label>
                <input
                  type="password"
                  value={config.whatsapp_api_key}
                  onChange={e => {
                    onUpdate({ whatsapp_api_key: e.target.value });
                  }}
                  placeholder="Bearer Token..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-mono text-sm text-slate-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px] flex-1">
                <label className="mb-2 block text-sm font-bold text-slate-600 dark:text-slate-300">
                  رقم الهاتف المستلم
                </label>
                <input
                  type="text"
                  value={config.whatsapp_phone}
                  onChange={e => {
                    onUpdate({ whatsapp_phone: e.target.value });
                  }}
                  placeholder="966500000000"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-mono text-sm text-slate-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  dir="ltr"
                />
              </div>
              <button
                type="button"
                disabled={isTesting}
                onClick={handleTest}
                className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-green-700 disabled:opacity-60"
              >
                {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>اختبار الإرسال</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default WhatsAppCard;
