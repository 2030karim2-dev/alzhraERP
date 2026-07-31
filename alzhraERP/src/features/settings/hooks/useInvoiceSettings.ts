import { useState } from 'react';
import { useSettingsStore } from '../settingsStore';
import { useFeedbackStore } from '../../feedback/store';

export const useInvoiceSettings = () => {
    const { invoice, setInvoiceSettings, resetSection } = useSettingsStore();
    const { showToast } = useFeedbackStore();
    const [saved, setSaved] = useState(false);

    const handleUpdate = (updates: Partial<typeof invoice>) => {
        setInvoiceSettings(updates);
    };

    const handleSave = () => {
        setSaved(true);
        showToast('تم حفظ إعدادات الفواتير بنجاح ✓', 'success');
        setTimeout(() => setSaved(false), 3000);
    };

    const handleReset = () => {
        if (window.confirm('هل أنت متأكد من إعادة ضبط إعدادات الفواتير للافتراضي؟')) {
            resetSection('invoice');
            showToast('تمت إعادة الضبط للوضع الافتراضي', 'info');
        }
    };

    const previewNumber = (() => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const num = String(invoice.invoice_start_number).padStart(4, '0');
        const suffix = invoice.invoice_suffix_format === 'YYYY-MM-XXXX'
            ? `${yyyy}-${mm}-${num}`
            : invoice.invoice_suffix_format === 'YYYY-XXXX'
                ? `${yyyy}-${num}`
                : num;
        return `${invoice.invoice_prefix}${suffix}`;
    })();

    return {
        invoice,
        saved,
        previewNumber,
        handleUpdate,
        handleSave,
        handleReset
    };
};
