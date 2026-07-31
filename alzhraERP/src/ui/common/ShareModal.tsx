// ============================================
// ShareModal - Dialog for sharing content via WhatsApp/Telegram
// ============================================

import React, { useState } from 'react';
import { X, Send, Image, MessageSquare, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { shareService } from '@/features/notifications/shareService';
import { useAuthStore } from '@/features/auth/store';
import { useFeedbackStore } from '@/features/feedback/store';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** The text message to share */
    message: string;
    /** Optional: ref to the HTML element to capture as image */
    elementRef?: React.RefObject<HTMLElement> | undefined;
    /** Title shown in the modal header */
    title?: string | undefined;
    /** Event type for logging */
    eventType?: string | undefined;
}

const TelegramIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
);

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

type SendMode = 'text' | 'image';
type SendStatus = 'idle' | 'sending' | 'success' | 'error';

const ShareModal: React.FC<ShareModalProps> = ({
    isOpen,
    onClose,
    message,
    elementRef,
    title = 'مشاركة',
    eventType = 'share',
}) => {
    const companyId = useAuthStore(s => s.user?.company_id);
    const { showToast } = useFeedbackStore();
    const [sendMode, setSendMode] = useState<SendMode>(elementRef ? 'image' : 'text');
    const [status, setStatus] = useState<SendStatus>('idle');

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!companyId) {
            showToast('لم يتم العثور على بيانات الشركة', 'error');
            return;
        }

        setStatus('sending');
        try {
            let result;

            if (sendMode === 'image' && elementRef?.current) {
                result = await shareService.shareImage(companyId, elementRef.current, message, eventType);
            } else {
                result = await shareService.shareText(companyId, message, eventType);
            }

            if (result.success && result.results?.some(r => r.success)) {
                setStatus('success');
                showToast('تم الإرسال بنجاح! ✅', 'success');
                setTimeout(() => {
                    setStatus('idle');
                    onClose();
                }, 1500);
            } else {
                setStatus('error');
                const failedChannels = result.results?.filter(r => !r.success).map(r => `${r.channel}: ${r.error}`).join(', ');
                showToast(`فشل الإرسال: ${failedChannels || 'لا توجد قنوات مفعلة'}`, 'error');
                setTimeout(() => setStatus('idle'), 2000);
            }
        } catch {
            setStatus('error');
            showToast('حدث خطأ أثناء الإرسال', 'error');
            setTimeout(() => setStatus('idle'), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border dark:border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-l from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 p-4 border-b dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <Send className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="flex items-center gap-1 text-[10px] text-[#25D366] font-bold"><WhatsAppIcon /> واتساب</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="flex items-center gap-1 text-[10px] text-[#0088cc] font-bold"><TelegramIcon /> تليجرام</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Send Mode Toggle */}
                {elementRef && (
                    <div className="p-4 border-b dark:border-slate-800">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSendMode('image')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${sendMode === 'image'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                <Image size={16} />
                                إرسال كصورة
                            </button>
                            <button
                                onClick={() => setSendMode('text')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${sendMode === 'text'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                <MessageSquare size={16} />
                                إرسال كنص
                            </button>
                        </div>
                    </div>
                )}

                {/* Message Preview */}
                <div className="p-4">
                    <label className="text-xs font-bold text-slate-500 mb-2 block">
                        {sendMode === 'image' ? 'سيتم إرسال صورة + النص التالي:' : 'معاينة الرسالة:'}
                    </label>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line max-h-48 overflow-y-auto border dark:border-slate-700 font-mono text-xs leading-relaxed" dir="rtl">
                        {message}
                    </div>
                </div>

                {/* Action */}
                <div className="p-4 pt-0">
                    <button
                        onClick={handleSend}
                        disabled={status === 'sending' || status === 'success'}
                        className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${status === 'success'
                            ? 'bg-emerald-500 text-white'
                            : status === 'error'
                                ? 'bg-red-500 text-white'
                                : 'bg-gradient-to-l from-green-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]'
                            }`}
                    >
                        {status === 'sending' && <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>}
                        {status === 'success' && <><CheckCircle className="w-4 h-4" /> تم الإرسال بنجاح!</>}
                        {status === 'error' && <><XCircle className="w-4 h-4" /> فشل الإرسال - حاول مرة أخرى</>}
                        {status === 'idle' && <><Send className="w-4 h-4" /> إرسال الآن</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
