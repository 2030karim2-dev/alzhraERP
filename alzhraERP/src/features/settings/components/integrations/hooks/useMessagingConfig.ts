// ============================================
// useMessagingConfig — Hook لجلب/حفظ/اختبار إعدادات الرسائل
// ============================================
import { useState, useEffect, useCallback } from 'react';
import { useFeedbackStore } from '@/features/feedback/store';
import { messagingApi, MessagingConfig, DEFAULT_MESSAGING_CONFIG } from '@/features/notifications/messagingApi';
import { messagingService } from '@/features/notifications/messagingService';

export const useMessagingConfig = (companyId: string) => {
    const { showToast } = useFeedbackStore();
    const [config, setConfig] = useState<MessagingConfig>({ company_id: companyId, ...DEFAULT_MESSAGING_CONFIG });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    // تحميل الإعدادات عند mount أو تغيير companyId
    useEffect(() => {
        (async () => {
            try {
                const data = await messagingApi.getConfig(companyId);
                setConfig(data ?? { company_id: companyId, ...DEFAULT_MESSAGING_CONFIG });
            } catch {
                console.error('[useMessagingConfig] Load config error');
            } finally {
                setLoading(false);
            }
        })();
    }, [companyId]);

    const handleUpdate = useCallback((updates: Partial<MessagingConfig>) => {
        setConfig(prev => ({ ...prev, ...updates }));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await messagingApi.saveConfig(config);
            if (error) {
                showToast('فشل حفظ الإعدادات', 'error');
            } else {
                showToast('تم حفظ إعدادات الرسائل بنجاح ✅', 'success');
            }
        } catch {
            showToast('حدث خطأ غير متوقع', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        // الحفظ أولاً قبل الاختبار
        setSaving(true);
        const { error } = await messagingApi.saveConfig(config);
        setSaving(false);
        if (error) {
            showToast('يجب حفظ الإعدادات أولاً', 'error');
            return;
        }

        setTesting(true);
        try {
            const result = await messagingService.testConnection(companyId);
            if (result.success && result.results?.some(r => r.success)) {
                showToast('تم إرسال رسالة الاختبار بنجاح! ✅', 'success');
            } else {
                const failedChannels = result.results?.filter(r => !r.success).map(r => `${r.channel}: ${r.error}`).join(', ');
                showToast(`فشل الاختبار: ${failedChannels || 'لا توجد قنوات مفعلة'}`, 'error');
            }
        } catch {
            showToast('فشل اختبار الاتصال', 'error');
        } finally {
            setTesting(false);
        }
    };

    return { config, loading, saving, testing, handleUpdate, handleSave, handleTest };
};
