import React, { useState, useEffect } from 'react';
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
import {
  debtAiService,
  type ReminderTone,
} from '../services/debtAiService';
import {
  buildWhatsAppLink,
  buildWhatsAppWebLink,
} from '../lib/whatsapp';
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

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  row,
}) => {
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
    } catch (err) {
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
      const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);
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
    setTimeout(() => { setIsCopied(false); }, 2000);
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
      },
      {
        onSuccess: () => {
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
      },
      {
        onSuccess: () => {
          if (link) window.open(link, '_blank', 'noopener,noreferrer');
          setIsSent(true);
        },
      }
    );
  };

  const hasPhone = Boolean(prepared.recipient || row.party_phone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[var(--app-surface)] w-full max-w-xl max-h-[92vh] rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-600 text-white rounded-2xl shadow-lg shadow-green-500/20">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-slate-100">
                تذكير واتساب: {row.party_name}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                الرصيد: {row.outstanding_balance} {row.currency_code} · تأخير {row.days_overdue} يوم
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-3 bg-gray-100/60 dark:bg-slate-950/40 border-b border-gray-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setMode('ai');
                handleGenerateAiMessage(selectedTone);
              }}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                mode === 'ai'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
              )}
            >
              <Sparkles size={13} />
              الذكاء الاصطناعي
            </button>
            <button
              type="button"
              onClick={() => { setMode('template'); }}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                mode === 'template'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
              )}
            >
              القوالب الجاهزة
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyMessage}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-200/70 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-300 transition-colors flex items-center gap-1.5"
          >
            {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {isCopied ? 'تم النسخ' : 'نسخ النص'}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* AI Tone Picker */}
          {mode === 'ai' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  اختر نبرة الخطاب المطلوبة:
                </label>
                <button
                  type="button"
                  disabled={isGeneratingAi}
                  onClick={() => handleGenerateAiMessage(selectedTone)}
                  className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <RotateCcw size={11} className={isGeneratingAi ? 'animate-spin' : ''} />
                  إعادة التوليد بالذكاء الاصطناعي
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setSelectedTone(t.key);
                      handleGenerateAiMessage(t.key);
                    }}
                    className={cn(
                      'p-2.5 rounded-2xl border text-right transition-all flex flex-col justify-between',
                      selectedTone === t.key
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 shadow-sm'
                        : 'bg-gray-50/50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700/60 opacity-70 hover:opacity-100'
                    )}
                  >
                    <div className="text-base">{t.icon}</div>
                    <div className="mt-1">
                      <span className="text-[11px] font-extrabold block text-gray-900 dark:text-slate-100">
                        {t.label}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 block leading-tight mt-0.5">
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
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1.5">
                اختر قالب الرسالة:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setSelectedTemplateId(t.id); }}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                      t.id === selectedTemplateId
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700'
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
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                نص رسالة الواتساب (قابل للتعديل):
              </label>
              {isGeneratingAi && (
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 animate-pulse">
                  <RotateCcw size={11} className="animate-spin" />
                  جاري صياغة الرسالة بالذكاء الاصطناعي...
                </span>
              )}
            </div>
            <textarea
              value={message}
              onChange={(e) => { setMessage(e.target.value); }}
              rows={8}
              dir="rtl"
              className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/60 p-3.5 text-xs font-bold leading-relaxed focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
          </div>

          {/* Phone Warning */}
          {!hasPhone && (
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 text-xs font-bold">
              <PhoneOff size={16} className="shrink-0 mt-0.5" />
              لا يوجد رقم هاتف مسجل لهذا العميل — يمكنك نسخ الرسالة أو تسجيل التذكير فقط.
            </div>
          )}

          {/* Sent Success Message */}
          {isSent && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold flex items-center gap-2">
              <Check size={16} />
              تم فتح واتساب وتسجيل التذكير في سجل المتابعة بنجاح!
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50 flex flex-wrap justify-between items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2">
            {hasPhone && (
              <button
                type="button"
                onClick={handleSendWeb}
                disabled={!message.trim() || isSaving}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Globe size={14} className="text-blue-500" />
                واتساب ويب
              </button>
            )}

            <button
              type="button"
              onClick={handleSendApp}
              disabled={!message.trim() || isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 transition-all flex items-center gap-1.5"
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
