// ============================================
// MessagingIntegration — WhatsApp & Telegram Settings (Container)
// تم التقسيم: المنطق → useMessagingConfig | UI → TelegramCard, WhatsAppCard, EventTogglesCard
// ============================================
import React from 'react';
import { Save, TestTube, Send, Loader2 } from 'lucide-react';
import Button from '@/ui/base/Button';
import { useMessagingConfig } from './hooks/useMessagingConfig';
import TelegramCard from './TelegramCard';
import WhatsAppCard from './WhatsAppCard';
import EventTogglesCard from './EventTogglesCard';

interface Props {
    companyId: string;
}

const MessagingIntegration: React.FC<Props> = ({ companyId }) => {
    const { config, loading, saving, testing, handleUpdate, handleSave, handleTest } = useMessagingConfig(companyId);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Send className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">الرسائل التلقائية</h2>
                        <p className="text-sm text-slate-500">إرسال تلقائي للمعاملات عبر واتساب وتليجرام</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleTest} isLoading={testing} variant="outline" className="gap-2" leftIcon={<TestTube size={16} />}>
                        اختبار
                    </Button>
                    <Button onClick={handleSave} isLoading={saving} className="gap-2" leftIcon={<Save size={16} />}>
                        حفظ
                    </Button>
                </div>
            </div>

            <TelegramCard config={config} onUpdate={handleUpdate} />
            <WhatsAppCard config={config} onUpdate={handleUpdate} />
            <EventTogglesCard config={config} onUpdate={handleUpdate} />
        </div>
    );
};

export default MessagingIntegration;
