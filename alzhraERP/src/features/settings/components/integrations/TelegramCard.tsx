import React, { useState } from 'react';
import { CheckCircle, XCircle, Send, Loader2 } from 'lucide-react';
import Card from '@/ui/base/Card';
import type { MessagingConfig } from '@/features/notifications/messagingApi';
import { messagingApi } from '@/features/notifications/messagingApi';
import { useAuthStore } from '@/features/auth/store';
import { useFeedbackStore } from '@/features/feedback/store';

const TelegramIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
);

interface Props {
    config: MessagingConfig;
    onUpdate: (updates: Partial<MessagingConfig>) => void;
}

const TelegramCard: React.FC<Props> = ({ config, onUpdate }) => {
    const [isTesting, setIsTesting] = useState(false);
    const companyId = useAuthStore((s) => s.user?.company_id);
    const { showToast } = useFeedbackStore();

    const handleTest = async () => {
        if (!config.telegram_bot_token || !config.telegram_chat_id) {
            showToast('يرجى ملء Bot Token و Chat ID أولاً', 'error');
            return;
        }

        if (!companyId) return;

        try {
            setIsTesting(true);
            const res = await messagingApi.sendNotification(
                companyId,
                'test_connection',
                'اختبار اتصال Al-Zahra Smart ERP مع Telegram ناجح! 🚀'
            );

            if (res.success) {
                showToast('تم إرسال رسالة الاختبار بنجاح إلى Telegram!', 'success');
            } else {
                showToast('فشل اختبار الاتصال، تأكد من صحة التوكن ومعرف الشات', 'error');
            }
        } catch {
            showToast('حدث خطأ أثناء اختبار الاتصال', 'error');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <Card className="overflow-hidden border border-[var(--app-border)]">
            <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-[#0088cc]">
                            <TelegramIcon />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-white">Telegram</h3>
                            <p className="text-xs text-slate-500">إرسال الإشعارات إلى مجموعة أو قناة تليجرام</p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                        config.telegram_enabled
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                        {config.telegram_enabled
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
                        checked={config.telegram_enabled}
                        onChange={(e) => onUpdate({ telegram_enabled: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">تفعيل إشعارات تليجرام</span>
                </label>

                {config.telegram_enabled && (
                    <div className="space-y-4 mr-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Bot Token</label>
                                <input
                                    type="password"
                                    value={config.telegram_bot_token}
                                    onChange={(e) => onUpdate({ telegram_bot_token: e.target.value })}
                                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                                    dir="ltr"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                    احصل عليه من <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-blue-500 underline">@BotFather</a>
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Chat ID</label>
                                <input
                                    type="text"
                                    value={config.telegram_chat_id}
                                    onChange={(e) => onUpdate({ telegram_chat_id: e.target.value })}
                                    placeholder="-100123456789"
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                                    dir="ltr"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">معرف المجموعة/القناة (يبدأ بـ -)</p>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                disabled={isTesting}
                                onClick={handleTest}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-60 shadow-sm"
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

export default TelegramCard;
