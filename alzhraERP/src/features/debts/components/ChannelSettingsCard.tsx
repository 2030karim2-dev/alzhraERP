import React, { useEffect, useState } from 'react';
import { MessageSquare, Smartphone } from 'lucide-react';
import { useDebtChannelConfig } from '../hooks/useDebtQueries';
import { useDebtMutations } from '../hooks/useDebtMutations';
import { EMPTY_CHANNEL_CONFIG } from '../api/debtApi';
import type { DebtChannelConfig } from '../types';

const INPUT_CLASS =
  'w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-2.5 py-2 text-xs font-bold text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-blue-500/40';

interface FieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

const Field: React.FC<FieldProps> = ({ id, label, value, placeholder, onChange }) => (
  <div className="space-y-1">
    <label
      htmlFor={id}
      className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400"
    >
      {label}
    </label>
    <input
      id={id}
      value={value}
      placeholder={placeholder}
      dir="ltr"
      onChange={e => {
        onChange(e.target.value);
      }}
      className={INPUT_CLASS}
    />
  </div>
);

interface ChannelBlockProps {
  title: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}

const ChannelBlock: React.FC<ChannelBlockProps> = ({
  title,
  icon,
  enabled,
  onToggle,
  children,
}) => (
  <div className="rounded-2xl border border-[var(--app-border)] p-3">
    <label className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-xs font-bold text-[var(--app-text)]">
        {icon}
        {title}
      </span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={e => {
          onToggle(e.target.checked);
        }}
        className="h-4 w-4 rounded border-gray-300"
      />
    </label>
    {enabled && <div className="mt-3 grid gap-3 md:grid-cols-2">{children}</div>}
  </div>
);

interface ChannelFieldsProps {
  form: DebtChannelConfig;
  patch: (part: Partial<DebtChannelConfig>) => void;
}

const WhatsAppFields: React.FC<ChannelFieldsProps> = ({ form, patch }) => (
  <ChannelBlock
    title="قناة واتساب (Cloud API أو CallMeBot)"
    icon={<MessageSquare size={14} className="text-emerald-600" />}
    enabled={form.whatsapp_enabled}
    onToggle={enabled => {
      patch({ whatsapp_enabled: enabled });
    }}
  >
    <Field
      id="wa-url"
      label="رابط الـ API"
      value={form.whatsapp_api_url}
      placeholder="https://graph.facebook.com/v20.0/<id>/messages"
      onChange={value => {
        patch({ whatsapp_api_url: value });
      }}
    />
    <Field
      id="wa-key"
      label="مفتاح الـ API (اتركه فارغاً للإبقاء)"
      value={form.whatsapp_api_key}
      placeholder="••••••••"
      onChange={value => {
        patch({ whatsapp_api_key: value });
      }}
    />
    <Field
      id="wa-phone"
      label="رقم الإرسال / المعرّف"
      value={form.whatsapp_phone}
      placeholder="9677xxxxxxxx"
      onChange={value => {
        patch({ whatsapp_phone: value });
      }}
    />
  </ChannelBlock>
);

const SmsFields: React.FC<ChannelFieldsProps> = ({ form, patch }) => (
  <ChannelBlock
    title="قناة SMS (بوابة محلية)"
    icon={<Smartphone size={14} className="text-sky-600" />}
    enabled={form.sms_enabled}
    onToggle={enabled => {
      patch({ sms_enabled: enabled });
    }}
  >
    <Field
      id="sms-url"
      label="رابط بوابة SMS"
      value={form.sms_api_url}
      placeholder="https://sms-provider.example/api/send"
      onChange={value => {
        patch({ sms_api_url: value });
      }}
    />
    <Field
      id="sms-key"
      label="مفتاح البوابة (اتركه فارغاً للإبقاء)"
      value={form.sms_api_key}
      placeholder="••••••••"
      onChange={value => {
        patch({ sms_api_key: value });
      }}
    />
    <Field
      id="sms-sender"
      label="معرّف المُرسل (Sender ID)"
      value={form.sms_sender_id}
      placeholder="ALZAHRA"
      onChange={value => {
        patch({ sms_sender_id: value });
      }}
    />
  </ChannelBlock>
);

const SaveRow: React.FC<{ isSaving: boolean; onSave: () => void }> = ({ isSaving, onSave }) => (
  <div className="flex items-center justify-between gap-2">
    <p className="text-[10px] leading-relaxed text-[var(--app-text-secondary)]">
      الإرسال الآلي يعمل عبر طابور المهام كل 10 دقائق بعد تشغيل «الإرسال الآلي» في إعدادات المتابعة،
      وتُسجَّل الرسائل بحالة «مؤكَّد من المزوّد».
    </p>
    <button
      type="button"
      disabled={isSaving}
      onClick={onSave}
      className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSaving ? 'جارٍ الحفظ...' : 'حفظ إعدادات القنوات'}
    </button>
  </div>
);

/**
 * S3: تفعيل وضبط قنوات الإرسال (واتساب + SMS) على نفس صف messaging_config الذي
 * تستخدمه بقية الوحدات. المفاتيح تُكتب فقط: الحقل الفارغ يبقي القيمة المحفوظة.
 */
const ChannelSettingsCard: React.FC = () => {
  const { data: config } = useDebtChannelConfig();
  const { saveChannelConfig, isSaving } = useDebtMutations();
  const [form, setForm] = useState<DebtChannelConfig>(EMPTY_CHANNEL_CONFIG);

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const patch = (part: Partial<DebtChannelConfig>): void => {
    setForm(prev => ({ ...prev, ...part }));
  };

  return (
    <div className="space-y-3">
      <WhatsAppFields form={form} patch={patch} />
      <SmsFields form={form} patch={patch} />
      <SaveRow
        isSaving={isSaving}
        onSave={() => {
          saveChannelConfig(form);
        }}
      />
    </div>
  );
};

export default ChannelSettingsCard;
