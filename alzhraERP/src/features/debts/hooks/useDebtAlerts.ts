/**
 * تنبيهات تحصيل الديون داخل القسم: أقساط حرجة + وعود مخلَفة.
 * تعمل عند فتح قسم الديون، والوسوم (tags) تمنع تكرار نفس التنبيه.
 * ملاحظة (ADR-018): نقلها إلى دورة فحوص الصحة العامة يحتاج أولاً سداد
 * دين lint القائم في notifications/service.ts (8 مقابل سقف 4).
 */
import { useEffect } from 'react';
import { useAuthStore } from '../../auth/store';
import { useNotificationStore } from '../../notifications/store';
import { useDebtDashboard } from './useDebtQueries';

export const useDebtAlerts = (): void => {
  const { user } = useAuthStore();
  const { data: rows } = useDebtDashboard();
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    const companyId = user?.company_id;
    if (companyId === undefined || rows === undefined || rows.length === 0) return;

    const criticalCount = rows.filter(r => r.classification === 'critical').length;
    if (criticalCount > 0) {
      addNotification({
        companyId,
        tag: 'debt_critical_summary',
        category: 'debt',
        priority: 'high',
        title: 'ديون حرجة تحتاج تدخلاً فورياً',
        message: `${String(criticalCount)} عميل تجاوز تأخيرهم الحد الحرج المحدد. يرجى بدء التحصيل اليوم.`,
        type: 'warning',
        link: '/debts/followup',
        actions: [{ label: 'بدء التحصيل', link: '/debts/followup', isPrimary: true }],
      });
    }

    const brokenCount = rows.filter(r => r.has_broken_promise).length;
    if (brokenCount > 0) {
      addNotification({
        companyId,
        tag: 'promise_broken_summary',
        category: 'debt',
        priority: 'high',
        title: 'وعود سداد مخلَفة',
        message: `${String(brokenCount)} عميل لديهم وعود سداد مخلَفة تحتاج متابعة وإعادة جدولة.`,
        type: 'warning',
        link: '/debts/promises',
        actions: [{ label: 'متابعة الوعود', link: '/debts/promises', isPrimary: true }],
      });
    }
  }, [rows, user?.company_id, addNotification]);
};
