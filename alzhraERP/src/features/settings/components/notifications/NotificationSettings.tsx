import React, { useState } from 'react';
import {
  Bell,
  ShieldAlert,
  Package,
  MessageSquare,
  Save,
  Monitor,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useFeedbackStore } from '../../../feedback/store';
import { useNotificationStore, useSoundStore } from '../../../notifications/store';
import {
  isDesktopNotificationSupported,
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  sendTestDesktopNotification,
} from '../../../notifications/desktopNotificationService';
import Button from '../../../../ui/base/Button';
import MicroListItem from '../../../../ui/common/MicroListItem';
import ToggleSwitch from './ToggleSwitch';

const PREFS_STORAGE_KEY = 'alzhra:notification_prefs';

interface NotificationPrefs {
  stock: boolean;
  debt: boolean;
  marketing: boolean;
  system: boolean;
  sales: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  stock: true,
  debt: true,
  marketing: false,
  system: true,
  sales: true,
};

const loadPrefs = (): NotificationPrefs => {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
};

const NotificationSettings: React.FC = () => {
  const { showToast } = useFeedbackStore();
  const { desktopEnabled, setDesktopEnabled } = useNotificationStore();
  const { isSoundEnabled, toggleSound } = useSoundStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(loadPrefs);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    getDesktopNotificationPermission()
  );

  const handleRequestPermission = async () => {
    const perm = await requestDesktopNotificationPermission();
    setPermission(perm);
    if (perm === 'granted') {
      showToast('تم تفعيل إشعارات سطح المكتب بنجاح!', 'success');
      setDesktopEnabled(true);
      void sendTestDesktopNotification();
    } else if (perm === 'denied') {
      showToast('تم رفض إذن الإشعارات من إعدادات المتصفح', 'error');
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    const ok = await sendTestDesktopNotification();
    setIsTesting(false);
    if (ok) {
      showToast('تم إرسال إشعار تجريبي إلى سطح المكتب 🔔', 'success');
    } else {
      showToast('يرجى السماح بالإشعارات من المتصفح أولاً', 'warning');
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
      } catch {
        // ignore quota errors
      }
      showToast('تم حفظ تفضيلات الإشعارات بنجاح', 'success');
    }, 300);
  };

  const settings = [
    {
      id: 'sales',
      title: 'إشعارات المبيعات والفواتير',
      desc: 'عند إنشاء فواتير جديدة أو مدفوعات العملاء',
      icon: Sparkles,
      color: 'text-emerald-500',
    },
    {
      id: 'stock',
      title: 'تنبيهات المخزون',
      desc: 'عند وصول الأصناف للحد الأدنى أو نفاذ الكمية',
      icon: Package,
      color: 'text-amber-500',
    },
    {
      id: 'debt',
      title: 'مواعيد الديون والمستحقات',
      desc: 'تذكير باستحقاق ديون العملاء والتسديدات',
      icon: ShieldAlert,
      color: 'text-rose-500',
    },
    {
      id: 'system',
      title: 'تحديثات النظام والأمان',
      desc: 'حول النسخ الاحتياطي والصيانة والترقيات',
      icon: Bell,
      color: 'text-blue-500',
    },
    {
      id: 'marketing',
      title: 'نصائح ذكاء الأعمال والتقارير',
      desc: 'تحليلات أسبوعية للأداء والمبيعات',
      icon: MessageSquare,
      color: 'text-purple-500',
    },
  ];

  const isSupported = isDesktopNotificationSupported();

  return (
    <div className="animate-in mx-auto max-w-4xl space-y-4 p-3 max-md:p-3 md:p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 max-md:text-lg">
            مركز الإشعارات والتنبيهات
          </h2>
          <p className="mt-1 text-xs font-bold uppercase text-gray-400">
            إدارة إشعارات سطح المكتب والنوافذ المنبثقة
          </p>
        </div>
        <Button
          onClick={handleSave}
          isLoading={isSaving}
          className="rounded-xl px-6"
          leftIcon={<Save size={16} />}
        >
          حفظ
        </Button>
      </div>

      {/* Primary Desktop OS Notifications Card */}
      <div className="rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900/80 dark:to-indigo-950/20">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Monitor size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  إشعارات سطح المكتب (Windows / Mac)
                </h3>
                {permission === 'granted' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <CheckCircle2 size={12} />
                    مفعلة وتظهر فوق كل البرامج
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                    <AlertCircle size={12} />
                    تحتاج إذن المتصفح
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                تظهر الإشعارات على شاشة سطح المكتب فوق جميع التطبيقات المفتوحة (حتى أثناء العمل على
                برامج أخرى أو عندما تكون النافذة مصغرة).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {permission !== 'granted' && isSupported && (
              <Button
                variant="primary"
                onClick={handleRequestPermission}
                className="rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
              >
                السماح بالإشعارات الآن 🔔
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleTestNotification}
              isLoading={isTesting}
              className="rounded-xl border-indigo-200 bg-white px-4 text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300"
            >
              إرسال إشعار تجريبي 🚀
            </Button>
          </div>
        </div>

        {/* Desktop Notification Toggles */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200/60 pt-4 dark:border-slate-800 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-800/60">
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                تفعيل النوافذ المنبثقة لسطح المكتب
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                إرسال تنبيهات للنظام عند وقوع أحداث هامة
              </span>
            </div>
            <ToggleSwitch checked={desktopEnabled} onChange={setDesktopEnabled} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex items-center gap-2">
              <Volume2 size={16} className="text-slate-500" />
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  الأصوات التنبيهية
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  تشغيل رنين خفيف عند وصول الإشعار
                </span>
              </div>
            </div>
            <ToggleSwitch checked={isSoundEnabled} onChange={toggleSound} />
          </div>
        </div>
      </div>

      {/* Category Notification Preferences */}
      <div className="divide-y overflow-hidden rounded-[2rem] border bg-[var(--app-surface)] shadow-sm dark:divide-slate-800 dark:border-slate-800">
        <div className="bg-slate-50/60 px-5 py-3 dark:bg-slate-800/40">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            تخصيص أقسام الإشعارات المستلمة:
          </span>
        </div>
        {settings.map(item => (
          <MicroListItem
            key={item.id}
            icon={item.icon}
            iconColorClass={item.color}
            title={item.title}
            subtitle={item.desc}
            actions={
              <ToggleSwitch
                checked={prefs[item.id as keyof typeof prefs]}
                onChange={checked => {
                  setPrefs({ ...prefs, [item.id as keyof typeof prefs]: checked });
                }}
              />
            }
          />
        ))}
      </div>
    </div>
  );
};

export default NotificationSettings;
