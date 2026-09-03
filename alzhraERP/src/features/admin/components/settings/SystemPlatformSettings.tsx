import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Save,
  Layers,
  Bot,
  Car,
  Store,
  MessageSquare,
  WifiOff,
} from 'lucide-react';
import { useSystemConfigs, useConfigMutations } from '../../hooks/useAdminData';
import Button from '../../../../ui/base/Button';

export const SystemPlatformSettings: React.FC = () => {
  const { data: configs, isLoading, isError, refetch } = useSystemConfigs();
  const { updateConfig, isUpdating } = useConfigMutations();

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [estimatedEnd, setEstimatedEnd] = useState('');
  const [flags, setFlags] = useState({
    ai_assistance: true,
    vin_intelligence: true,
    supplier_portal: true,
    internal_chat: true,
    offline_sync: true,
  });

  useEffect(() => {
    if (configs) {
      setMaintenanceEnabled(configs.maintenance_mode?.enabled || false);
      setMaintenanceMsg(configs.maintenance_mode?.message || '');
      setEstimatedEnd(
        configs.maintenance_mode?.estimated_end
          ? new Date(configs.maintenance_mode.estimated_end).toISOString().slice(0, 16)
          : ''
      );
      setFlags(
        configs.feature_flags || {
          ai_assistance: true,
          vin_intelligence: true,
          supplier_portal: true,
          internal_chat: true,
          offline_sync: true,
        }
      );
    }
  }, [configs]);

  const handleSaveMaintenance = async () => {
    try {
      await updateConfig({
        key: 'maintenance_mode',
        value: {
          enabled: maintenanceEnabled,
          message: maintenanceMsg.trim() || 'النظام يخضع حالياً لعملية صيانة مجدولة. سنعود قريباً.',
          estimated_end: estimatedEnd ? new Date(estimatedEnd).toISOString() : null,
        },
      });
    } catch {
      // رسالة الخطأ ظهرت عبر الـ hook — لا نغيّر الحالة المحلية كي لا تنحرف عن الخادم
    }
  };

  const handleToggleFlag = async (key: keyof typeof flags) => {
    const prevFlags = flags;
    const nextFlags = { ...prevFlags, [key]: !prevFlags[key] };
    setFlags(nextFlags);
    try {
      await updateConfig({
        key: 'feature_flags',
        value: nextFlags,
      });
    } catch {
      // تراجع فوري عن التبديل المتفائل عند فشل الحفظ
      setFlags(prevFlags);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-[var(--app-text-secondary)]">
        جاري تحميل إعدادات المنصة...
      </div>
    );
  }

  if (isError || !configs) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-8 text-center">
        <p className="text-xs font-bold text-rose-600">
          تعذر تحميل إعدادات المنصة. لن يتم حفظ أي تغيير قبل نجاح التحميل لحماية الإعدادات الحالية.
        </p>
        <button
          onClick={() => refetch()}
          className="mt-3 rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-500/10"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs">
        <h2 className="text-xs font-black text-[var(--app-text)]">
          إعدادات المنصة ووضع الصيانة (System Config & Maintenance)
        </h2>
        <p className="text-[10px] text-[var(--app-text-secondary)]">
          تحكم فوري في تشغيل وضع الصيانة العام على مستوى المنظومة وتفعيل أو تعطيل الخدمات الحساسة
          (Feature Flags).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Section 1: Maintenance Mode */}
        <div className="space-y-3.5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle
                size={16}
                className={
                  maintenanceEnabled ? 'text-amber-500' : 'text-[var(--app-text-secondary)]'
                }
              />
              <h3 className="text-xs font-black text-[var(--app-text)]">
                وضع الصيانة الموجه (Maintenance Mode)
              </h3>
            </div>
            <span
              className={`text-[10px] font-bold ${maintenanceEnabled ? 'text-amber-500' : 'text-emerald-500'}`}
            >
              {maintenanceEnabled ? '● مفعّل للعامة' : '○ متوقف (المنصة متاحة)'}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-[var(--app-text-secondary)]">
            عند تفعيل وضع الصيانة، سيتم منع تسجيل دخول مستخدمي المنشآت العاديين وعرض شاشة الصيانة
            الأنيقة مع رسالتك المخصصة. سيظل بإمكانك كـ Super Admin الدخول واختبار التحديثات بأمان.
          </p>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={maintenanceEnabled}
                onChange={e => setMaintenanceEnabled(e.target.checked)}
                className="rounded border-[var(--app-border)] text-amber-600 focus:ring-0"
              />
              <span className="text-xs font-bold text-[var(--app-text)]">
                تفعيل وضع الصيانة العام فوراً
              </span>
            </label>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-[var(--app-text-secondary)]">
                رسالة الصيانة التي ستظهر للمستخدمين:
              </label>
              <textarea
                rows={3}
                value={maintenanceMsg}
                onChange={e => setMaintenanceMsg(e.target.value)}
                placeholder="النظام يخضع حالياً لأعمال صيانة وتحسينات كبرى. سنعود للعمل قريباً..."
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-2.5 text-xs text-[var(--app-text)] focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[10px] font-bold text-[var(--app-text-secondary)]">
                  الموعد المتوقع لانتهاء الصيانة (اختياري):
                </label>
                {estimatedEnd && (
                  <button
                    type="button"
                    onClick={() => setEstimatedEnd('')}
                    className="text-[10px] font-bold text-rose-500 hover:underline"
                  >
                    تفريغ التاريخ
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                value={estimatedEnd}
                onChange={e => setEstimatedEnd(e.target.value)}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 font-mono text-xs text-[var(--app-text)] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant={maintenanceEnabled ? 'danger' : 'primary'}
              onClick={handleSaveMaintenance}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold"
            >
              <Save size={13} />
              <span>{isUpdating ? 'جاري الحفظ...' : 'حفظ حالة الصيانة'}</span>
            </Button>
          </div>
        </div>

        {/* Section 2: Global Feature Flags */}
        <div className="space-y-3.5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2.5">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-blue-500" />
              <h3 className="text-xs font-black text-[var(--app-text)]">
                مفاتيح الخدمات العامة (Feature Flags)
              </h3>
            </div>
            <span className="text-[10px] font-bold text-blue-500">تحكم فوري دون Deploy</span>
          </div>

          <p className="text-[11px] text-[var(--app-text-secondary)]">
            يمكنك إيقاف خدمة معينة مؤقتاً في حال وجود ضغط أو صيانة طارئة عليها دون التأثير على باقي
            أقسام النظام:
          </p>

          <div className="space-y-2 text-xs">
            {/* AI Flag */}
            <div className="bg-[var(--app-surface-hover)]/60 flex items-center justify-between rounded-xl border border-[var(--app-border)] p-2.5">
              <div className="flex items-center gap-2">
                <Bot size={15} className="text-purple-500" />
                <div>
                  <p className="font-bold text-[var(--app-text)]">خدمات الذكاء الاصطناعي (AI)</p>
                  <span className="text-[10px] text-[var(--app-text-secondary)]">
                    البحث الصوتي والتعرف على القطع
                  </span>
                  <span className="mt-0.5 block text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    ⚠ غير مربوط بخدمة تشغيلية بعد — الإيقاف لن يغيّر سلوك النظام حالياً
                  </span>
                </div>
              </div>
              <button
                disabled={isUpdating}
                onClick={() => handleToggleFlag('ai_assistance')}
                className={`text-lg transition-colors disabled:opacity-50 ${flags.ai_assistance ? 'text-emerald-500' : 'text-slate-400'}`}
              >
                {flags.ai_assistance ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
              </button>
            </div>

            {/* VIN Flag */}
            <div className="bg-[var(--app-surface-hover)]/60 flex items-center justify-between rounded-xl border border-[var(--app-border)] p-2.5">
              <div className="flex items-center gap-2">
                <Car size={15} className="text-blue-500" />
                <div>
                  <p className="font-bold text-[var(--app-text)]">
                    خدمة فك الشاصي (VIN Intelligence)
                  </p>
                  <span className="text-[10px] text-[var(--app-text-secondary)]">
                    استعلام وترميز المركبات
                  </span>
                </div>
              </div>
              <button
                disabled={isUpdating}
                onClick={() => handleToggleFlag('vin_intelligence')}
                className={`text-lg transition-colors disabled:opacity-50 ${flags.vin_intelligence ? 'text-emerald-500' : 'text-slate-400'}`}
              >
                {flags.vin_intelligence ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
              </button>
            </div>

            {/* Supplier Portal Flag */}
            <div className="bg-[var(--app-surface-hover)]/60 flex items-center justify-between rounded-xl border border-[var(--app-border)] p-2.5">
              <div className="flex items-center gap-2">
                <Store size={15} className="text-amber-500" />
                <div>
                  <p className="font-bold text-[var(--app-text)]">
                    بوابة الموردين المخصصة (Supplier Portal)
                  </p>
                  <span className="text-[10px] text-[var(--app-text-secondary)]">
                    روابط التسعير العامة للموردين
                  </span>
                </div>
              </div>
              <button
                disabled={isUpdating}
                onClick={() => handleToggleFlag('supplier_portal')}
                className={`text-lg transition-colors disabled:opacity-50 ${flags.supplier_portal ? 'text-emerald-500' : 'text-slate-400'}`}
              >
                {flags.supplier_portal ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
              </button>
            </div>

            {/* Chat Flag */}
            <div className="bg-[var(--app-surface-hover)]/60 flex items-center justify-between rounded-xl border border-[var(--app-border)] p-2.5">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-blue-600" />
                <div>
                  <p className="font-bold text-[var(--app-text)]">
                    المحادثات والتواصل الداخلي (Chat Hub)
                  </p>
                  <span className="text-[10px] text-[var(--app-text-secondary)]">
                    نظام الرسائل المتزامن
                  </span>
                </div>
              </div>
              <button
                disabled={isUpdating}
                onClick={() => handleToggleFlag('internal_chat')}
                className={`text-lg transition-colors disabled:opacity-50 ${flags.internal_chat ? 'text-emerald-500' : 'text-slate-400'}`}
              >
                {flags.internal_chat ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
              </button>
            </div>

            {/* Offline Sync Flag */}
            <div className="bg-[var(--app-surface-hover)]/60 flex items-center justify-between rounded-xl border border-[var(--app-border)] p-2.5">
              <div className="flex items-center gap-2">
                <WifiOff size={15} className="text-teal-600" />
                <div>
                  <p className="font-bold text-[var(--app-text)]">
                    المزامنة غير المتصلة (Offline Sync)
                  </p>
                  <span className="text-[10px] text-[var(--app-text-secondary)]">
                    العمل ونقاط البيع بدون إنترنت
                  </span>
                  <span className="mt-0.5 block text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    ⚠ غير مربوط بخدمة تشغيلية بعد — الإيقاف لن يغيّر سلوك النظام حالياً
                  </span>
                </div>
              </div>
              <button
                disabled={isUpdating}
                onClick={() => handleToggleFlag('offline_sync')}
                className={`text-lg transition-colors disabled:opacity-50 ${flags.offline_sync ? 'text-emerald-500' : 'text-slate-400'}`}
              >
                {flags.offline_sync ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
