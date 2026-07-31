// ============================================
// WhatsAppCard — بطاقة إعدادات WhatsApp Business API
// ============================================
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import Card from '@/ui/base/Card';
import type { MessagingConfig } from '@/features/notifications/messagingApi';

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

interface Props {
    config: MessagingConfig;
    onUpdate: (updates: Partial<MessagingConfig>) => void;
}

const WhatsAppCard: React.FC<Props> = ({ config, onUpdate }) => (
    <Card className="overflow-hidden border-2 border-transparent hover:border-green-200 dark:hover:border-green-800 transition-colors">
        <div className="bg-gradient-to-l from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4 border-b dark:border-slate-800">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#25D366] rounded-xl flex items-center justify-center text-white shadow-md">
                        <WhatsAppIcon />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">WhatsApp</h3>
                        <p className="text-xs text-slate-500">إرسال الإشعارات عبر واتساب بيزنس API</p>
                    </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                    config.whatsapp_enabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                    {config.whatsapp_enabled
                        ? <><CheckCircle className="w-3.5 h-3.5" /><span>مفعل</span></>
                        : <><XCircle className="w-3.5 h-3.5" /><span>معطل</span></>
                    }
                </div>
            </div>
        </div>

        <div className="p-5 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={config.whatsapp_enabled}
                    onChange={(e) => onUpdate({ whatsapp_enabled: e.target.checked })}
                    className="w-5 h-5 text-green-600 rounded-lg focus:ring-green-500 cursor-pointer"
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">تفعيل إشعارات واتساب</span>
            </label>

            {config.whatsapp_enabled && (
                <div className="space-y-4 mr-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">رابط API</label>
                            <input
                                type="text"
                                value={config.whatsapp_api_url}
                                onChange={(e) => onUpdate({ whatsapp_api_url: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono"
                                placeholder="https://graph.facebook.com/v17.0/..."
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">API Key / Token</label>
                            <input
                                type="password"
                                value={config.whatsapp_api_key}
                                onChange={(e) => onUpdate({ whatsapp_api_key: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono"
                                placeholder="Bearer token..."
                                dir="ltr"
                            />
                        </div>
                    </div>
                    <div className="max-w-sm">
                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">رقم الهاتف المستلم</label>
                        <input
                            type="text"
                            value={config.whatsapp_phone}
                            onChange={(e) => onUpdate({ whatsapp_phone: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono"
                            placeholder="+967123456789"
                            dir="ltr"
                        />
                    </div>
                </div>
            )}
        </div>
    </Card>
);

export default WhatsAppCard;
