import React, { useState } from 'react';
import {
  Bell,
  ShieldAlert,
  Package,
  MessageSquare,
  Save,
  Monitor,
  Volume2,
  Volume1,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Music,
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
  const { isSoundEnabled, toggleSound, volume, setVolume, playNotificationSound } = useSoundStore();
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

  const handlePlayTone = (priority: 'normal' | 'urgent') => {
    void playNotificationSound(priority, true);
    showToast(
      priority === 'urgent' ? 'تم تشغيل نغمة التنبيه العاجل' : 'تم تشغيل النغمة اللطيفة',
      'info'
    );
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
    }, 250);
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
      desc: 'تذكير باستحقاق ديون العملاء وتجاوز السقوف الائتمانية',
      icon: ShieldAlert,
      color: 'text-rose-500',
    },
    {
      id: 'system',
      title: 'تحديثات النظام والأمان',
      desc: 'حول المزامنة والصيانة والعمليات الرئيسية',
      icon: Bell,
      color: 'text-blue-500',
    },
    {
      id: 'marketing',
      title: 'نصائح ذكاء الأعمال والتقارير',
      desc: 'تحليلات دورية للمبيعات والمؤشرات المالية',
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
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 md:text-2xl">
            مركز الإشعارات والتنبيهات
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
            تخصيص سلوك إشعارات سطح المكتب والنغمات الصوتية وتنبيهات الأقسام
          </p>
        </div>
        <Button
          onClick={handleSave}
          isLoading={isSaving}
          className="rounded-xl px-5"
          leftIcon={<Save size={16} />}
        >
          حفظ التفضيلات
        </Button>
      </div>

      {/* Primary Desktop OS Notifications Card */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-4 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:via-slate-900/80 dark:to-indigo-950/20 md:p-5">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Monitor size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 md:text-base">
                  إشعارات سطح المكتب (Windows / Mac)
                </h3>
                {permission === 'granted' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <CheckCircle2 size={12} />
                    مفعلة وتظهر فوق كل البرامج
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
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
                className="rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
              >
                السماح بالإشعارات الآن 🔔
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleTestNotification}
              isLoading={isTesting}
              className="rounded-xl border-indigo-200 bg-white px-3.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300"
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
              <Volume2 size={16} className="shrink-0 text-slate-500" />
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  الأصوات التنبيهية
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  تشغيل رنين ثنائي هادئ عند وصول الإشعار
                </span>
              </div>
            </div>
            <ToggleSwitch checked={isSoundEnabled} onChange={toggleSound} />
          </div>
        </div>
      </div>

      {/* Audio Sound & Tone Controls Card */}
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xs md:p-5">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--app-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Music size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">
                التحكم بنغمات الصوت ومستوى الرنين
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                ضبط شدة الصوت وتجربة النغمات مباشرة عبر مكبر الصوت
              </p>
            </div>
          </div>

          {/* Tone Preview Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePlayTone('normal')}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <span>نغمة لطيفة</span>
              <Volume1 size={13} />
            </button>
            <button
              type="button"
              onClick={() => handlePlayTone('urgent')}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <span>نغمة عاجلة</span>
              <Volume2 size={13} />
            </button>
          </div>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-4 pt-1">
          <Volume2 size={16} className="shrink-0 text-gray-400" />
          <div className="flex flex-1 items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="w-full cursor-pointer accent-blue-600"
              aria-label="مستوى صوت الإشعارات"
            />
            <span className="w-10 text-center text-xs font-bold text-gray-700 dark:text-slate-300">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Category Notification Preferences */}
      <div className="divide-y overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-xs dark:divide-slate-800">
        <div className="border-b border-[var(--app-border)] bg-slate-50/60 px-4 py-2.5 dark:bg-slate-800/40">
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
                  const updated = { ...prefs, [item.id as keyof typeof prefs]: checked };
                  setPrefs(updated);
                  try {
                    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
                  } catch {
                    /* ignore */
                  }
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
