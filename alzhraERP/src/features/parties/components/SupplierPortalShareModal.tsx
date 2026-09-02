import React, { useState } from 'react';
import {
  Globe,
  Copy,
  Check,
  Share2,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  Building2,
} from 'lucide-react';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import { supplierPortalService } from '../../supplier-portal/services/supplierPortalService';
import { useFeedbackStore } from '../../feedback/store';
import { useCompany } from '../../settings/hooks';
import type { Party } from '../types';
import { cn } from '../../../core/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  onTokenUpdated?: (newParty: Party) => void;
}

export const SupplierPortalShareModal: React.FC<Props> = ({
  isOpen,
  onClose,
  party,
  onTokenUpdated,
}) => {
  const { showToast } = useFeedbackStore();
  const { data: company } = useCompany();
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [currentToken, setCurrentToken] = useState(party?.portal_token || '');

  React.useEffect(() => {
    if (party?.portal_token) {
      setCurrentToken(party.portal_token);
    }
  }, [party]);

  if (!party) return null;

  const origin = window.location.origin;
  const portalUrl = `${origin}/portal/supplier/${currentToken}`;
  const companyName = (company as { name_ar?: string })?.name_ar || 'منشأتنا';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      showToast('تم نسخ رابط البوابة بنجاح', 'success');
      setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      showToast('تعذر نسخ الرابط تلقائياً', 'error');
    }
  };

  const handleShareWhatsApp = () => {
    const lines = [
      `مرحباً بكم *${party.name}* 🌸`,
      `يسرنا تزويدكم برابط الدخول المباشر إلى *بوابة الموردين الخاصة بكم* لدى *${companyName}*:`,
      ``,
      `🔗 *رابط البوابة الخاص بك:*`,
      portalUrl,
      ``,
      `✨ *من خلال هذه البوابة يمكنك في أي وقت:*`,
      `1️⃣ متابعة الأصناف التي تحتاج إعادة طلب وتوريدها فوراً.`,
      `2️⃣ الاطلاع على طلبات التسعير (RFQs) النشطة وتقديم عروض أسعار مباشرة.`,
      `3️⃣ متابعة حالة عروض الأسعار السابقة والطلبيات المعتمدة.`,
      ``,
      `شكراً لتعاونكم معنا 🤝`,
    ];
    const text = encodeURIComponent(lines.join('\n'));
    const phoneClean = party.phone?.replace(/[^0-9]/g, '') || '';
    const waUrl = phoneClean
      ? `https://wa.me/${phoneClean}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  const handleRegenerateToken = async () => {
    if (
      !window.confirm(
        'هل أنت متأكد من رغبتك في تجديد رابط المورد؟ سيتم إلغاء صلاحية أي رابط سابق فوراً.'
      )
    ) {
      return;
    }
    setIsRegenerating(true);
    try {
      const newToken = await supplierPortalService.regeneratePortalToken(party.id);
      setCurrentToken(newToken);
      showToast('تم تجديد رابط بوابة المورد بنجاح', 'success');
      if (onTokenUpdated) {
        onTokenUpdated({ ...party, portal_token: newToken });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تجديد الرابط';
      showToast(message, 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="رابط بوابة المورد الذكية"
      icon={Globe}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRegenerateToken}
            isLoading={isRegenerating}
            className="text-[10px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            leftIcon={<RefreshCw size={13} />}
          >
            تجديد الرابط (Revoke & Renew)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-[10px] font-bold"
          >
            إغلاق
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5 text-xs">
        {/* Supplier Profile Summary */}
        <div className="flex items-center justify-between rounded-2xl border border-blue-200/70 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <Building2 size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">{party.name}</h4>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                {party.phone && (
                  <span dir="ltr" className="font-mono font-bold">
                    {party.phone}
                  </span>
                )}
                {party.email && <span>• {party.email}</span>}
              </div>
            </div>
          </div>
          <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
            بوابة مفعلة
          </span>
        </div>

        {/* Dedicated Link Box */}
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            الرابط الدائم المخصص للمورد (Private Vendor Access Link)
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
            <input
              type="text"
              readOnly
              value={portalUrl}
              className="w-full select-all bg-transparent font-mono text-[11px] font-bold text-slate-800 outline-none dark:text-slate-200"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold shadow-xs transition-all',
                copied ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
            </button>
          </div>
        </div>

        {/* Direct Action Buttons */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-500/10 px-4 py-3 text-xs font-black text-emerald-700 transition-all hover:bg-emerald-500 hover:text-white dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white"
          >
            <Share2 size={16} />
            <span>إرسال دعوة مباشرة عبر واتساب</span>
          </button>

          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-800 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-750"
          >
            <ExternalLink size={16} />
            <span>معاينة البوابة كـ مورد</span>
          </a>
        </div>

        {/* Security / Instructions Note */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="flex items-start gap-1.5">
            <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              هذا الرابط سري ومخصص حصراً لـ <strong>{party.name}</strong>. يتيح للمورد استعراض
              المنتجات المطلوب توريدها وتقديم عروض أسعار إلكترونية مباشرة لنظامكم دون الحاجة لكلمة
              مرور.
            </span>
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default SupplierPortalShareModal;
