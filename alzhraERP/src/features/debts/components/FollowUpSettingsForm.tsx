import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useDebtFollowupConfig } from '../hooks/useDebtQueries';
import { useDebtMutations } from '../hooks/useDebtMutations';
import { debtsService } from '../services/debtService';

interface FormState {
  due_soon_days: string;
  critical_days: string;
  reminder_window_days: string;
  stage_call_days: string;
  stage_visit_days: string;
  stage_legal_days: string;
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
    stage_call_days: '30',
    stage_visit_days: '60',
    stage_legal_days: '90',
    whatsapp_enabled: true,
    reminder_signature: '',
  });

  useEffect(() => {
    if (config) {
      setForm({
        due_soon_days: String(config.due_soon_days),
        critical_days: String(config.critical_days),
        reminder_window_days: String(config.reminder_window_days),
        stage_call_days: String(config.stage_call_days ?? 30),
        stage_visit_days: String(config.stage_visit_days ?? 60),
        stage_legal_days: String(config.stage_legal_days ?? 90),
        whatsapp_enabled: config.whatsapp_enabled,
        reminder_signature: config.reminder_signature ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleSave = (): void => {
    saveFollowupConfig({
      due_soon_days: Number(form.due_soon_days) || defaults.dueSoonDays,
      critical_days: Number(form.critical_days) || defaults.criticalDays,
      reminder_window_days: Number(form.reminder_window_days) || defaults.reminderWindowDays,
      stage_call_days: Number(form.stage_call_days) || 30,
      stage_visit_days: Number(form.stage_visit_days) || 60,
      stage_legal_days: Number(form.stage_legal_days) || 90,
      whatsapp_enabled: form.whatsapp_enabled,
      reminder_signature: form.reminder_signature.trim() || null,
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-[var(--app-text-secondary)]">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── فترات محرك المتابعة ── */}
      <div>
        <h4 className="mb-3 text-xs font-bold text-[var(--app-text)]">
          فترات محرك المتابعة وتصنيف الديون
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="debt-due-soon-days"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]"
            >
              أيام «قريب الاستحقاق» (due soon)
            </label>
            <input
              id="debt-due-soon-days"
              type="number"
              min={1}
              max={90}
              value={form.due_soon_days}
              onChange={e => {
                setForm(p => ({ ...p, due_soon_days: e.target.value }));
              }}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <p className="mt-1 text-[10px] text-[var(--app-text-secondary)]">
              يُصنَّف الدين «قريباً» عندما يكون استحقاقه خلال هذه الأيام.
            </p>
          </div>

          <div>
            <label
              htmlFor="debt-critical-days"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]"
            >
              أيام «التأخر الحرج» (critical)
            </label>
            <input
              id="debt-critical-days"
              type="number"
              min={1}
              max={365}
              value={form.critical_days}
              onChange={e => {
                setForm(p => ({ ...p, critical_days: e.target.value }));
              }}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <p className="mt-1 text-[10px] text-[var(--app-text-secondary)]">
              بعد هذا التأخير يصبح التصنيف «حرجاً» بأولوية قصوى.
            </p>
          </div>

          <div>
            <label
              htmlFor="debt-reminder-window-days"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]"
            >
              نافذة التذكير (أيام)
            </label>
            <input
              id="debt-reminder-window-days"
              type="number"
              min={1}
              max={90}
              value={form.reminder_window_days}
              onChange={e => {
                setForm(p => ({ ...p, reminder_window_days: e.target.value }));
              }}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <p className="mt-1 text-[10px] text-[var(--app-text-secondary)]">
              العميل «بحاجة تذكير» إذا مرّت هذه المدة على آخر تذكير له.
            </p>
          </div>
        </div>
      </div>

      {/* ── عتبات خط التصعيد ── */}
      <div>
        <h4 className="mb-3 text-xs font-bold text-[var(--app-text)]">
          عتبات مراحل التصعيد (أيام بعد الاستحقاق)
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="debt-stage-call-days"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]"
            >
              مرحلة الاتصال الهاتفي (أيام)
            </label>
            <input
              id="debt-stage-call-days"
              type="number"
              min={1}
              max={365}
              value={form.stage_call_days}
              onChange={e => {
                setForm(p => ({ ...p, stage_call_days: e.target.value }));
              }}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <p className="mt-1 text-[10px] text-[var(--app-text-secondary)]">
              تتحول المتابعة لمرحلة «اتصال هاتفي» بعد مرور هذه الأيام من الاستحقاق (افتراضي: 30).
            </p>
          </div>

          <div>
            <label
              htmlFor="debt-stage-visit-days"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]"
            >
              مرحلة الزيارة الميدانية (أيام)
            </label>
            <input
              id="debt-stage-visit-days"
              type="number"
              min={1}
              max={365}
              value={form.stage_visit_days}
              onChange={e => {
                setForm(p => ({ ...p, stage_visit_days: e.target.value }));
              }}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <p className="mt-1 text-[10px] text-[var(--app-text-secondary)]">
              تتحول المتابعة لمرحلة «زيارة ميدانية» بعد استمرار التأخر (افتراضي: 60).
            </p>
          </div>

          <div>
            <label
              htmlFor="debt-stage-legal-days"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]"
            >
              مرحلة الإجراء القانوني (أيام)
            </label>
            <input
              id="debt-stage-legal-days"
              type="number"
              min={1}
              max={365}
              value={form.stage_legal_days}
              onChange={e => {
                setForm(p => ({ ...p, stage_legal_days: e.target.value }));
              }}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <p className="mt-1 text-[10px] text-[var(--app-text-secondary)]">
              تصعيد إلى «إجراء قانوني» عند بلوغ هذه الأيام دون سداد (افتراضي: 90).
            </p>
          </div>
        </div>
      </div>

      {/* ── إعدادات واتساب والتوقيع ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-4">
          <div>
            <span className="block text-xs font-bold text-[var(--app-text)]">
              التذكير عبر واتساب
            </span>
            <span className="block text-[10px] text-[var(--app-text-secondary)]">
              روابط wa.me تُفتح مباشرة على رقم العميل
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm(p => ({ ...p, whatsapp_enabled: !p.whatsapp_enabled }));
            }}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              form.whatsapp_enabled ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
            aria-label="تفعيل واتساب"
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                form.whatsapp_enabled ? 'left-0.5' : 'right-0.5'
              }`}
            />
          </button>
        </div>

        <div>
          <label
            htmlFor="debt-reminder-signature"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]"
          >
            توقيع نهاية الرسالة ({'{{signature}}'})
          </label>
          <input
            id="debt-reminder-signature"
            type="text"
            value={form.reminder_signature}
            onChange={e => {
              setForm(p => ({ ...p, reminder_signature: e.target.value }));
            }}
            className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={14} /> حفظ الإعدادات
        </button>
      </div>
    </div>
  );
};

export default FollowUpSettingsForm;
