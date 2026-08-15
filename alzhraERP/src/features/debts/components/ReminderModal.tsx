import React, { useState, useEffect } from 'react';
import { X, MessageSquare, PhoneOff, Send, ExternalLink } from 'lucide-react';
import { cn } from '../../../core/utils';
import { useAuthStore } from '../../auth/store';
import { useDebtTemplates, useDebtFollowupConfig } from '../hooks/useDebtQueries';
import { useDebtMutations } from '../hooks/useDebtMutations';
import { debtsService, type PreparedReminder } from '../services/debtService';
import type { FollowUpDashboardRow, DebtMessageTemplate } from '../types';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: FollowUpDashboardRow;
}

// ── Small presentational pieces (each stays under the lint line budget) ──

const TemplatePicker: React.FC<{
  templates: DebtMessageTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
}> = ({ templates, selectedId, onSelect }) => (
  <div>
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
      قالب الرسالة
    </label>
    <div className="flex flex-wrap gap-1.5">
      {templates.map((t) => (
        <button
          key={t.id}
          onClick={() => {
            onSelect(t.id);
          }}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
            t.id === selectedId
              ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
              : 'text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-slate-300 dark:border-slate-700'
          )}
        >
          {t.name}
        </button>
      ))}
    </div>
  </div>
);

const PhoneWarning: React.FC = () => (
  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 text-[11px] font-semibold">
    <PhoneOff size={14} className="flex-shrink-0 mt-0.5" />
    لا يوجد رقم واتساب صالح لهذا العميل — لن يُفتح واتساب، ويمكن تسجيل التذكير فقط.
  </div>
);

const SentNotice: React.FC = () => (
  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
    ✅ تم فتح واتساب وتسجيل التذكير. سيظهر العميل ضمن «تم تذكيرهم».
  </div>
);

const SendButton: React.FC<{
  hasLink: boolean;
  disabled: boolean;
  onClick: () => void;
}> = ({ hasLink, disabled, onClick }) => (
  <button
    onClick={() => {
      onClick();
    }}
    disabled={disabled}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-green-600 text-white shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {hasLink ? (
      <>
        <Send size={14} /> إرسال وتسجيل
      </>
    ) : (
      <>
        <ExternalLink size={14} /> تسجيل فقط
      </>
    )}
  </button>
);

const ModalShell: React.FC<{
  title: string;
  subtitle: string;
  iconBg: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}> = ({ title, subtitle, iconBg, onClose, children, footer }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-md:mx-2 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-4 max-md:p-2.5 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 text-white rounded-xl shadow-lg', iconBg)}>
            <MessageSquare size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm">{title}</h3>
            <p className="text-[10px] text-gray-500">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => {
            onClose();
          }}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      <div className="p-4 max-md:p-2.5 space-y-4 max-md:space-y-2.5">{children}</div>
      <div className="flex items-center justify-end gap-2 p-4 max-md:p-2.5 border-t border-gray-200 dark:border-slate-800">
        {footer}
      </div>
    </div>
  </div>
);

// ── Main modal ──

/**
 * Reminder flow: pick a template → preview the rendered message →
 * open WhatsApp (wa.me) → record the send in ONE transaction (SQL).
 */
const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, row }) => {
  const user = useAuthStore((s) => s.user);
  const { data: templates } = useDebtTemplates(true);
  const { data: config } = useDebtFollowupConfig();
  const { recordReminder, isSaving } = useDebtMutations();

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);

  useEffect(() => {
    if (!isOpen) return;
    const body = selectedTemplate?.body ?? templates?.[0]?.body ?? '';
    const prepared = debtsService.prepareReminder(row, body, {
      companyName: user?.company_name,
      signature: config?.reminder_signature,
    });
    setMessage(prepared.message);
    if (!selectedTemplateId && templates?.[0]) {
      setSelectedTemplateId(templates[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, row, selectedTemplateId, templates, config, user?.company_name]);

  if (!isOpen) return null;

  const prepared: PreparedReminder = debtsService.prepareReminder(row, message, {
    companyName: user?.company_name,
    signature: config?.reminder_signature,
  });

  const handleSend = (): void => {
    const link = prepared.whatsappLink;
    if (!link || !message.trim()) return;
    recordReminder(
      {
        partyId: row.party_id,
        messageText: message,
        templateId: selectedTemplate?.id ?? null,
        recipient: prepared.recipient || null,
      },
      {
        onSuccess: () => {
          window.open(link, '_blank', 'noopener,noreferrer');
          setIsSent(true);
        },
      }
    );
  };

  return (
    <ModalShell
      title="تذكير واتساب"
      subtitle={row.party_name}
      iconBg="bg-green-500 shadow-green-500/20"
      onClose={onClose}
      footer={
        <>
          <button
            onClick={() => {
              onClose();
            }}
            className="px-4 max-md:px-2.5 py-2 max-md:py-1.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            إغلاق
          </button>
          <SendButton
            hasLink={!!prepared.whatsappLink}
            disabled={!message.trim() || isSaving}
            onClick={handleSend}
          />
        </>
      }
    >
      {templates && templates.length > 0 ? (
        <TemplatePicker
          templates={templates}
          selectedId={selectedTemplateId}
          onSelect={setSelectedTemplateId}
        />
      ) : null}

      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
          نص الرسالة (قابل للتعديل)
        </label>
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
          }}
          rows={7}
          className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </div>

      {prepared.phoneMissing ? <PhoneWarning /> : null}
      {isSent ? <SentNotice /> : null}
    </ModalShell>
  );
};

export default ReminderModal;

