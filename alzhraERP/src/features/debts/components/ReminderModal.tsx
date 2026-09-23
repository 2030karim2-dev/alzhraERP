import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  PhoneOff,
  Sparkles,
  Copy,
  Check,
  Globe,
  Send,
  Smartphone,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../../../core/utils';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { useDebtTemplates, useDebtFollowupConfig } from '../hooks/useDebtQueries';
import { useDebtMutations } from '../hooks/useDebtMutations';
import { debtsService, type PreparedReminder } from '../services/debtService';
import { debtAiService, type ReminderTone } from '../services/debtAiService';
import { buildWhatsAppLink, buildWhatsAppWebLink } from '../lib/whatsapp';
import { createIdempotencyKey } from '../../../core/utils/idempotency';
import type { FollowUpDashboardRow } from '../types';
import { DebtsModalShell } from './DebtsModalShell';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: FollowUpDashboardRow;
}

const TONES: Array<{ key: ReminderTone; label: string; icon: string; desc: string }> = [
  { key: 'friendly', label: 'ودي ومحترم', icon: '🤝', desc: 'تذكير لطيف للمستحقات القريبة' },
  { key: 'formal', label: 'رسمي ومهني', icon: '📋', desc: 'خطاب مالي للمنشآت والشركات' },
  { key: 'urgent', label: 'حازم وعاجل', icon: '⚠️', desc: 'للمتأخرات والوعود السابقة' },
  { key: 'legal', label: 'إشعار نهائي', icon: '⚖️', desc: 'تنبيه نهائي قبل وقف الحساب' },
];

export const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, row }) => {
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const { data: templates } = useDebtTemplates(true);
  const { data: config } = useDebtFollowupConfig();
  const { recordReminder, isSaving } = useDebtMutations();

  const [mode, setMode] = useState<'ai' | 'template'>('ai');
  const [selectedTone, setSelectedTone] = useState<ReminderTone>('formal');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [message, setMessage] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  // S1 — تدفق الصدق: لا يُسجَّل التذكير إلا بعد تأكيد المستخدم أن الرسالة أُرسلت فعلاً.
  const [pendingSend, setPendingSend] = useState<'app' | 'web' | null>(null);
  // مفتاح عدم التكرار: ثابت لعملية الإرسال الواحدة (يمنع تسجيلها مرتين)،
  // ويُجدَّد بعد كل نجاح ليسمح بإرسال تذكير جديد مقصود لاحقاً.
  const idempotencyKeyRef = useRef(createIdempotencyKey('debt-reminder'));

  // Generate AI reminder when tone changes or modal opens in AI mode
  const handleGenerateAiMessage = async (tone: ReminderTone): Promise<void> => {
    setIsGeneratingAi(true);
    const companyName = user?.company_name ?? '';
    const signature = config?.reminder_signature ?? '';
    try {
      const res = await debtAiService.generateSmartReminder({
        row,
        tone,
        ...(companyName !== '' ? { companyName } : {}),
        ...(signature !== '' ? { bankDetails: signature } : {}),
      });
      setMessage(res.message);
    } catch {
      showToast('تعذر توليد الرسالة بالذكاء الاصطناعي، تم استخدام القالب الافتراضي', 'info');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setIsSent(false);
    setIsCopied(false);
    setPendingSend(null);

    if (mode === 'ai') {
      void handleGenerateAiMessage(selectedTone);
    } else {
      const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);
      const body = selectedTemplate?.body ?? templates?.[0]?.body ?? '';
      const prepared = debtsService.prepareReminder(row, body, {
        companyName: user?.company_name,
        signature: config?.reminder_signature,
      });
      setMessage(prepared.message);
      if (!selectedTemplateId && templates?.[0]) {
        setSelectedTemplateId(templates[0].id);
      }
    }
    // التوليد يعتمد على النبرة/القالب المختارين فقط — تغيير row/config أثناء
    // الفتح سيولّد رسالة مزدوجة، لذا نستثنيها عمداً من التبعيات.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, selectedTone, selectedTemplateId]);

  if (!isOpen) return null;

  const prepared: PreparedReminder = debtsService.prepareReminder(row, message, {
    companyName: user?.company_name,
    signature: config?.reminder_signature,
  });

  const handleCopyMessage = (): void => {
    void navigator.clipboard.writeText(message);
    setIsCopied(true);
    showToast('تم نسخ نص الرسالة بنجاح', 'success');
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  /**
   * S1 — تدفق الصدق: يفتح واتساب أولاً ولا يُسجّل شيئاً.
   * التسجيل يحدث فقط بعد تأكيد المستخدم أن الرسالة أُرسلت فعلاً، فلا يزعم
   * السجل إرسالاً غير متحقَّق منه، ولا يختفي العميل زوراً من «بحاجة تذكير».
   */
  const openWhatsApp = (target: 'app' | 'web'): void => {
    if (message.trim() === '') return;
    const phone = prepared.recipient !== '' ? prepared.recipient : row.party_phone;
    if (phone === null || phone === '') return;
    const link =
      target === 'app' ? buildWhatsAppLink(phone, message) : buildWhatsAppWebLink(phone, message);
    window.open(link, '_blank', 'noopener,noreferrer');
    setPendingSend(target);
  };

  /** تأكيد الإرسال الفعلي — الآن فقط يُسجَّل التذكير في سجل المتابعة. */
  const confirmSent = (): void => {
    recordReminder(
      {
        partyId: row.party_id,
        messageText: message,
        templateId: mode === 'template' && selectedTemplateId !== '' ? selectedTemplateId : null,
        recipient: prepared.recipient !== '' ? prepared.recipient : null,
        idempotencyKey: idempotencyKeyRef.current,
      },
      {
        onSuccess: () => {
          idempotencyKeyRef.current = createIdempotencyKey('debt-reminder');
          setPendingSend(null);
          setIsSent(true);
        },
      }
    );
  };

  const hasPhone = prepared.recipient !== '' || (row.party_phone ?? '') !== '';

  return (
    <DebtsModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={<MessageSquare size={20} />}
      iconClassName="bg-green-600 shadow-green-500/20"
      title={`تذكير واتساب: ${row.party_name}`}
      description={`الرصيد: ${row.outstanding_balance} ${row.currency_code} · تأخير ${row.days_overdue} يوم`}
      size="xl"
      rounded="rounded-3xl"
      toolbar={
        <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 bg-gray-100/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex items-center gap-1.5 rounded-2xl border border-gray-200/60 bg-white p-1 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('ai');
                void handleGenerateAiMessage(selectedTone);
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                mode === 'ai'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-slate-400'
              )}
            >
              <Sparkles size={13} />
              الذكاء الاصطناعي
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('template');
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                mode === 'template'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-slate-400'
              )}
            >
              القوالب الجاهزة
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyMessage}
            className="flex items-center gap-1.5 rounded-xl bg-gray-200/70 px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-300"
          >
            {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {isCopied ? 'تم النسخ' : 'نسخ النص'}
          </button>
        </div>
      }
      footerClassName="justify-between flex-wrap"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-bold text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={confirmSent}
              disabled={message.trim() === '' || isSaving}
              title="تسجيل تواصل يدوي (اتصال/زيارة/بلا واتساب) — إرسال يدوي غير متحقَّق من التسليم"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400"
            >
              <Check size={14} />
              تسجيل تواصل يدوي
            </button>

            {hasPhone && (
              <button
                type="button"
                onClick={() => {
                  openWhatsApp('web');
                }}
                disabled={message.trim() === '' || isSaving}
                className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Globe size={14} className="text-blue-500" />
                واتساب ويب
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                openWhatsApp('app');
              }}
              disabled={message.trim() === '' || isSaving}
              className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-green-600/20 transition-all hover:bg-green-700"
            >
              <Smartphone size={14} />
              إرسال عبر واتساب
            </button>
          </div>
        </>
      }
    >
      {/* AI Tone Picker */}
      {mode === 'ai' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              اختر نبرة الخطاب المطلوبة:
            </span>
            <button
              type="button"
              disabled={isGeneratingAi}
              onClick={() => {
                void handleGenerateAiMessage(selectedTone);
              }}
              className="flex items-center gap-1 text-[10px] font-bold text-purple-600 hover:underline disabled:opacity-50 dark:text-purple-400"
            >
              <RotateCcw size={11} className={isGeneratingAi ? 'animate-spin' : ''} />
              إعادة التوليد بالذكاء الاصطناعي
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TONES.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setSelectedTone(t.key);
                  void handleGenerateAiMessage(t.key);
                }}
                className={cn(
                  'flex flex-col justify-between rounded-2xl border p-2.5 text-right transition-all',
                  selectedTone === t.key
                    ? 'border-purple-400 bg-purple-50 shadow-sm dark:border-purple-600 dark:bg-purple-950/40'
                    : 'border-gray-200 bg-gray-50/50 opacity-70 hover:opacity-100 dark:border-slate-700/60 dark:bg-slate-800/40'
                )}
              >
                <div className="text-base">{t.icon}</div>
                <div className="mt-1">
                  <span className="block text-[11px] font-extrabold text-gray-900 dark:text-slate-100">
                    {t.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-tight text-gray-400 dark:text-slate-500">
                    {t.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Template Picker */}
      {mode === 'template' && templates && templates.length > 0 && (
        <div>
          <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
            اختر قالب الرسالة:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {templates.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTemplateId(t.id);
                }}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-xs font-bold transition-all',
                  t.id === selectedTemplateId
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Textarea */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="reminder-whatsapp-text"
            className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400"
          >
            نص رسالة الواتساب (قابل للتعديل):
          </label>
          {isGeneratingAi && (
            <span className="flex animate-pulse items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400">
              <RotateCcw size={11} className="animate-spin" />
              جاري صياغة الرسالة بالذكاء الاصطناعي...
            </span>
          )}
        </div>
        <textarea
          id="reminder-whatsapp-text"
          value={message}
          onChange={e => {
            setMessage(e.target.value);
          }}
          rows={8}
          dir="rtl"
          className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 p-3.5 text-xs font-bold leading-relaxed focus:outline-none focus:ring-2 focus:ring-green-500/40 dark:border-slate-700 dark:bg-slate-800/60"
        />
      </div>

      {/* Phone Warning */}
      {!hasPhone && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          <PhoneOff size={16} className="mt-0.5 shrink-0" />
          لا يوجد رقم هاتف مسجل لهذا العميل — يمكنك نسخ الرسالة أو تسجيل التذكير فقط.
        </div>
      )}

      {/* S1 — تأكيد الإرسال الفعلي: لا تسجيل بلا إرسال */}
      {pendingSend !== null && !isSent && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-3.5 text-xs font-extrabold text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
          <span className="flex items-center gap-2">
            <Send size={16} />
            فُتح واتساب — هل أُرسلت الرسالة فعلاً؟
          </span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={confirmSent}
              disabled={isSaving}
              className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              نعم — تسجيل الإرسال
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingSend(null);
              }}
              className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              لم أُرسل — إلغاء
            </button>
          </span>
        </div>
      )}

      {/* Sent Success Message */}
      {isSent && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-extrabold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
          <Check size={16} />
          تم تسجيل التذكير في سجل المتابعة (إرسال يدوي — غير متحقَّق من التسليم).
        </div>
      )}
    </DebtsModalShell>
  );
};

export default ReminderModal;
