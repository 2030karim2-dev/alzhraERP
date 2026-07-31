import { useSettingsStore } from '../../../settingsStore';
import { useI18nStore } from '@/lib/i18nStore';
import { useFeedbackStore } from '../../../../feedback/store';

export const usePrintSettings = () => {
    const { dictionary: t } = useI18nStore();
    const { print, setPrintSettings, resetSection } = useSettingsStore();
    const { showToast } = useFeedbackStore();

    const handleUpdate = (updates: Partial<typeof print>) => {
        setPrintSettings(updates);
    };

    const handleSave = () => {
        showToast(t.settings_saved || 'تم حفظ الإعدادات بنجاح', 'success');
    };

    const handleReset = () => {
        if (window.confirm(t.confirm_reset || 'هل أنت متأكد من إعادة ضبط هذا القسم للافتراضي؟')) {
            resetSection('print');
            showToast(t.reset_to_defaults || 'تمت إعادة الضبط بنجاح', 'info');
        }
    };

    return {
        t,
        print,
        handleUpdate,
        handleSave,
        handleReset
    };
};
