import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useDebtFollowupConfig } from '../hooks/useDebtQueries';
import { useDebtMutations } from '../hooks/useDebtMutations';
import { debtsService } from '../services/debtService';

interface FormState {
  due_soon_days: string;
  critical_days: string;
  reminder_window_days: string;
  whatsapp_enabled: boolean;
  reminder_signature: string;
}

const FollowUpSettingsForm: React.FC = () => {
  const { data: config, isLoading } = useDebtFollowupConfig();
  const { saveFollowupConfig, isSaving } = useDebtMutations();
  const defaults = debtsService.getEngineDefaults();

  const [form, setForm] = useState<FormState>({
    due_soon_days: String(defaults.dueSoonDays),
    critical_days: String(defaults.criticalDays),
    reminder_window_days: String(defaults.reminderWindowDays),
    whatsapp_enabled: true,
    reminder_signature: '',
  });

  useEffect(() => {
    if (config) {
      setForm({
        due_soon_days: String(config.due_soon_days ?? defaults.dueSoonDays),
        critical_days: String(config.critical_days ?? defaults.criticalDays),
        reminder_window_days: String(config.reminder_window_days ?? defaults.reminderWindowDays),
        whatsapp_enabled: config.whatsapp_enabled ?? true,
        reminder_signature: config.reminder_signature ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleSave = () => {
    saveFollowupConfig({
      due_soon_days: Number(form.due_soon_days) || defaults.dueSoonDays,
      critical_days: Number(form.critical_days) || defaults.criticalDays,
      reminder_window_days: Number(form.reminder_window_days) || defaults.reminderWindowDays,
      whatsapp_enabled: form.whatsapp_enabled,
      reminder_signature: form.reminder_signature.trim() || null,
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-[var(--app-text-secondary)]">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-wider block mb-1.5">
            أيام «قريب الاستحقاق» (due soon)
          </label>
          <input
            type="number"
            min={1}
            max={90}
            value={form.due_soon_days}
            onChange={(e) => { setForm((p) => ({ ...p, due_soon_days: e.target.value })); }}
            className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <p className="text-[9px] text-[var(--app-text-secondary)] mt-1">
            يُصنَّف الدين «قريباً» عندما يكون استحقاقه خلال هذه الأيام.
          </p>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-wider block mb-1.5">
            أيام «التأخر الحرج» (critical)
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={form.critical_days}
            onChange={(e) => { setForm((p) => ({ ...p, critical_days: e.target.value })); }}
            className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <p className="text-[9px] text-[var(--app-text-secondary)] mt-1">
            بعد هذا التأخير يصبح التصنيف «حرجاً» بأولوية قصوى.
          </p>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-wider block mb-1.5">
            نافذة التذكير (أيام)
          </label>
          <input
            type="number"
            min={1}
            max={90}
            value={form.reminder_window_days}
            onChange={(e) => { setForm((p) => ({ ...p, reminder_window_days: e.target.value })); }}
            className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <p className="text-[9px] text-[var(--app-text-secondary)] mt-1">
            العميل «بحاجة تذكير» إذا مرّت هذه المدة على آخر تذكير له.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center justify-between p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] cursor-pointer">
          <div>
            <span className="block text-xs font-bold text-[var(--app-text)]">التذكير عبر واتساب</span>
            <span className="block text-[10px] text-[var(--app-text-secondary)]">
              روابط wa.me تُفتح مباشرة على رقم العميل
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setForm((p) => ({ ...p, whatsapp_enabled: !p.whatsapp_enabled })); }}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              form.whatsapp_enabled ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
            aria-label="تفعيل واتساب"
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                form.whatsapp_enabled ? 'left-0.5' : 'right-0.5'
              }`}
            />
          </button>
        </label>

        <div>
          <label className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-wider block mb-1.5">
            توقيع نهاية الرسالة ({'{{signature}}'})
          </label>
          <input
            type="text"
            value={form.reminder_signature}
            onChange={(e) => {
              setForm((p) => ({ ...p, reminder_signature: e.target.value }));
            }}
            className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          <Save size={14} /> حفظ الإعدادات
        </button>
      </div>
    </div>
  );
};

export default FollowUpSettingsForm;

