import React, { useEffect, useState } from 'react';
import { Bot, Moon, Gauge, Phone } from 'lucide-react';
import { useDebtFollowupConfig } from '../hooks/useDebtQueries';
import { useDebtMutations } from '../hooks/useDebtMutations';
import type { DebtFollowupConfigUpdate } from '../types';

const INPUT_CLASS =
  'w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-2.5 py-2 text-xs font-bold text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-blue-500/40';

const LABEL_CLASS = 'text-[10px] font-extrabold uppercase tracking-wider text-gray-400';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export interface AutomationForm {
  auto_send_enabled: boolean;
  quiet_start_hour: number;
  quiet_end_hour: number;
  daily_cap_per_party: number;
  default_country_code: string;
}

const DEFAULT_FORM: AutomationForm = {
  auto_send_enabled: false,
  quiet_start_hour: 21,
  quiet_end_hour: 8,
  daily_cap_per_party: 1,
  default_country_code: '967',
};

const AutomationToggle: React.FC<{ enabled: boolean; onToggle: (enabled: boolean) => void }> = ({
  enabled,
  onToggle,
}) => (
  <label className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--app-border)] p-3">
    <span className="space-y-1">
      <span className="flex items-center gap-2 text-xs font-bold text-[var(--app-text)]">
        <Bot size={14} className="text-indigo-500" />
        تشغيل الإرسال الآلي للتذكيرات
      </span>
      <span className="block text-[10px] leading-relaxed text-[var(--app-text-secondary)]">
        يفحص المحرّك جدول التحصيل كل ساعة ويضع الرسائل المستحقة في الطابور، ويُرسلها كل 10 دقائق. لا
        تُرسل أي رسالة قبل ضبط «قنوات الإرسال» ومفتاح المزوّد.
      </span>
    </span>
    <input
      type="checkbox"
      checked={enabled}
      onChange={e => {
        onToggle(e.target.checked);
      }}
      className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300"
    />
  </label>
);

interface HourFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (hour: number) => void;
}

const HourField: React.FC<HourFieldProps> = ({ id, label, value, onChange }) => (
  <div className="space-y-1">
    <label htmlFor={id} className={`block ${LABEL_CLASS}`}>
      {label}
    </label>
    <select
      id={id}
      value={value}
      onChange={e => {
        onChange(Number(e.target.value));
      }}
      className={INPUT_CLASS}
    >
      {HOURS.map(hour => (
        <option key={hour} value={hour}>
          {String(hour).padStart(2, '0')}:00
        </option>
      ))}
    </select>
  </div>
);

const CapField: React.FC<{ value: number; onChange: (cap: number) => void }> = ({
  value,
  onChange,
}) => (
  <div className="space-y-1">
    <label htmlFor="auto-cap" className={`flex items-center gap-1 ${LABEL_CLASS}`}>
      <Gauge size={10} />
      السقف اليومي لكل عميل
    </label>
    <input
      id="auto-cap"
      type="number"
      min={0}
      max={10}
      value={value}
      onChange={e => {
        onChange(Math.min(Math.max(Number(e.target.value) || 0, 0), 10));
      }}
      className={INPUT_CLASS}
    />
    <span className="block text-[10px] text-[var(--app-text-secondary)]">0 = بلا حد</span>
  </div>
);

const CountryCodeField: React.FC<{ value: string; onChange: (code: string) => void }> = ({
  value,
  onChange,
}) => (
  <div className="space-y-1">
    <label htmlFor="auto-country" className={`flex items-center gap-1 ${LABEL_CLASS}`}>
      <Phone size={10} />
      مفتاح الدولة الافتراضي
    </label>
    <input
      id="auto-country"
      value={value}
      dir="ltr"
      placeholder="967"
      onChange={e => {
        onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 5));
      }}
      className={INPUT_CLASS}
    />
    <span className="block text-[10px] text-[var(--app-text-secondary)]">
      يُضاف للأرقام المحلية بلا مفتاح
    </span>
  </div>
);

interface LimitsProps {
  form: AutomationForm;
  patch: (part: Partial<AutomationForm>) => void;
}

const AutomationLimits: React.FC<LimitsProps> = ({ form, patch }) => (
  <div className="rounded-2xl border border-[var(--app-border)] p-3">
    <p className={`mb-3 flex items-center gap-1.5 ${LABEL_CLASS}`}>
      <Moon size={10} />
      نافذة الهدوء والسقف اليومي
    </p>
    <div className="grid gap-3 md:grid-cols-4">
      <HourField
        id="auto-quiet-start"
        label="بداية الهدوء"
        value={form.quiet_start_hour}
        onChange={hour => {
          patch({ quiet_start_hour: hour });
        }}
      />
      <HourField
        id="auto-quiet-end"
        label="نهاية الهدوء"
        value={form.quiet_end_hour}
        onChange={hour => {
          patch({ quiet_end_hour: hour });
        }}
      />
      <CapField
        value={form.daily_cap_per_party}
        onChange={cap => {
          patch({ daily_cap_per_party: cap });
        }}
      />
      <CountryCodeField
        value={form.default_country_code}
        onChange={code => {
          patch({ default_country_code: code });
        }}
      />
    </div>
  </div>
);

/** حمولة الحفظ: تطبيع مفتاح الدولة ومنع الفراغ (الخادم يرفض غير الأرقام). */
export const buildAutomationPatch = (form: AutomationForm): DebtFollowupConfigUpdate => ({
  auto_send_enabled: form.auto_send_enabled,
  quiet_start_hour: form.quiet_start_hour,
  quiet_end_hour: form.quiet_end_hour,
  daily_cap_per_party: form.daily_cap_per_party,
  default_country_code: form.default_country_code.replace(/[^0-9]/g, '').slice(0, 5) || '967',
});

interface SaveRowProps {
  isSaving: boolean;
  dirty: boolean;
  onSave: () => void;
}

const AutomationSaveRow: React.FC<SaveRowProps> = ({ isSaving, dirty, onSave }) => (
  <div className="flex items-center justify-between gap-2">
    <p className="text-[10px] leading-relaxed text-[var(--app-text-secondary)]">
      نافذة الهدوء تُحترم بتوقيت الرياض؛ الرسائل التي تصادف وقت الهدوء تُؤجَّل ولا تُلغى.
    </p>
    <button
      type="button"
      disabled={isSaving || !dirty}
      onClick={onSave}
      className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSaving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الإرسال الآلي'}
    </button>
  </div>
);

/**
 * S3: تشغيل الإرسال الآلي وضبط حدوده (نافذة الهدوء، السقف اليومي، مفتاح الدولة).
 * لا يُرسل شيء إلا بعد تشغيل هذا المفتاح + ضبط قناة ومفتاح مزوّد من «قنوات الإرسال».
 */
const AutoSendSettingsCard: React.FC = () => {
  const { data: config } = useDebtFollowupConfig();
  const { saveFollowupConfig, isSaving } = useDebtMutations();
  const [form, setForm] = useState<AutomationForm>(DEFAULT_FORM);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty || !config) return;
    setForm({
      auto_send_enabled: config.auto_send_enabled,
      quiet_start_hour: config.quiet_start_hour,
      quiet_end_hour: config.quiet_end_hour,
      daily_cap_per_party: config.daily_cap_per_party,
      default_country_code: config.default_country_code,
    });
  }, [config, dirty]);

  const patch = (part: Partial<AutomationForm>): void => {
    setForm(prev => ({ ...prev, ...part }));
    setDirty(true);
  };

  return (
    <div className="space-y-3">
      <AutomationToggle
        enabled={form.auto_send_enabled}
        onToggle={enabled => {
          patch({ auto_send_enabled: enabled });
        }}
      />
      <AutomationLimits form={form} patch={patch} />
      <AutomationSaveRow
        isSaving={isSaving}
        dirty={dirty}
        onSave={() => {
          saveFollowupConfig(buildAutomationPatch(form), {
            onSuccess: () => {
              setDirty(false);
            },
          });
        }}
      />
    </div>
  );
};

export default AutoSendSettingsCard;
