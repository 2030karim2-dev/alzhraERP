import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageSquare,
  PhoneOff,
  Sparkles,
  Copy,
  Check,
  Globe,
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
  // مفتاح عدم التكرار: ثابت لعملية الإرسال الواحدة (يمنع تسجيلها مرتين)،
  // ويُجدَّد بعد كل نجاح ليسمح بإرسال تذكير جديد مقصود لاحقاً.
  const idempotencyKeyRef = useRef(createIdempotencyKey('debt-reminder'));

  // Generate AI reminder when tone changes or modal opens in AI mode
  const handleGenerateAiMessage = async (tone: ReminderTone) => {
    setIsGeneratingAi(true);
    try {
      const res = await debtAiService.generateSmartReminder({
        row,
        tone,
        ...(user?.company_name ? { companyName: user.company_name } : {}),
        ...(config?.reminder_signature ? { bankDetails: config.reminder_signature } : {}),
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

    if (mode === 'ai') {
      handleGenerateAiMessage(selectedTone);
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
  }, [isOpen, mode, selectedTone, selectedTemplateId]);

  if (!isOpen) return null;

  const prepared: PreparedReminder = debtsService.prepareReminder(row, message, {
    companyName: user?.company_name,
    signature: config?.reminder_signature,
  });

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setIsCopied(true);
    showToast('تم نسخ نص الرسالة بنجاح', 'success');
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const handleSendApp = () => {
    if (!message.trim()) return;
    const phone = prepared.recipient || row.party_phone;
    const link = phone ? buildWhatsAppLink(phone, message) : null;

    recordReminder(
      {
        partyId: row.party_id,
        messageText: message,
        templateId: mode === 'template' ? selectedTemplateId || null : null,
        recipient: prepared.recipient || null,
        idempotencyKey: idempotencyKeyRef.current,
      },
      {
        onSuccess: () => {
          idempotencyKeyRef.current = createIdempotencyKey('debt-reminder');
          if (link) window.open(link, '_blank', 'noopener,noreferrer');
          setIsSent(true);
        },
      }
    );
  };

  const handleSendWeb = () => {
    if (!message.trim()) return;
    const phone = prepared.recipient || row.party_phone;
    const link = phone ? buildWhatsAppWebLink(phone, message) : null;

    recordReminder(
      {
        partyId: row.party_id,
        messageText: message,
        templateId: mode === 'template' ? selectedTemplateId || null : null,
        recipient: prepared.recipient || null,
        idempotencyKey: idempotencyKeyRef.current,
      },
      {
        onSuccess: () => {
          idempotencyKeyRef.current = createIdempotencyKey('debt-reminder');
          if (link) window.open(link, '_blank', 'noopener,noreferrer');
          setIsSent(true);
        },
      }
    );
  };

  const hasPhone = Boolean(prepared.recipient || row.party_phone);

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm duration-200">
      <div
        className="animate-in zoom-in-95 flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-[var(--app-surface)] shadow-2xl duration-200 dark:border-slate-800"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gray-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-green-600 p-2.5 text-white shadow-lg shadow-green-500/20">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-slate-100">
                تذكير واتساب: {row.party_name}
              </h3>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">
                الرصيد: {row.outstanding_balance} {row.currency_code} · تأخير {row.days_overdue} يوم
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 bg-gray-100/60 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex items-center gap-1.5 rounded-2xl border border-gray-200/60 bg-white p-1 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('ai');
                handleGenerateAiMessage(selectedTone);
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

        {/* Content Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* AI Tone Picker */}
          {mode === 'ai' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  اختر نبرة الخطاب المطلوبة:
                </label>
                <button
                  type="button"
                  disabled={isGeneratingAi}
                  onClick={() => handleGenerateAiMessage(selectedTone)}
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
                      handleGenerateAiMessage(t.key);
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
              <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                اختر قالب الرسالة:
              </label>
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
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
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

          {/* Sent Success Message */}
          {isSent && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-extrabold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
              <Check size={16} />
              تم فتح واتساب وتسجيل التذكير في سجل المتابعة بنجاح!
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-gray-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-bold text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2">
            {hasPhone && (
              <button
                type="button"
                onClick={handleSendWeb}
                disabled={!message.trim() || isSaving}
                className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Globe size={14} className="text-blue-500" />
                واتساب ويب
              </button>
            )}

            <button
              type="button"
              onClick={handleSendApp}
              disabled={!message.trim() || isSaving}
              className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-green-600/20 transition-all hover:bg-green-700"
            >
              <Smartphone size={14} />
              إرسال عبر واتساب
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderModal;
