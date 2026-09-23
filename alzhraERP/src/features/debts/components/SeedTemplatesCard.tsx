import React from 'react';
import { LibraryBig, Sparkles } from 'lucide-react';
import { useDebtTemplates } from '../hooks/useDebtQueries';
import { useDebtMutations } from '../hooks/useDebtMutations';

/** حجم المكتبة القياسية — يجب أن يطابق عدد القوالب في seed_default_debt_templates. */
const LIBRARY_SIZE = 16;

/**
 * استيراد المكتبة القياسية للقوالب (متاح لمن يحمل debts:manage).
 * العملية idempotent على الخادم: لا تستبدل ولا تعدّل أي قالب موجود.
 */
const SeedTemplatesCard: React.FC = () => {
  const { data: templates } = useDebtTemplates(false);
  const { seedTemplates, isSaving } = useDebtMutations();
  const count = (templates ?? []).length;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
      <div className="flex items-start gap-2">
        <span className="rounded-lg bg-blue-600 p-1.5 text-white">
          <LibraryBig size={14} />
        </span>
        <div>
          <p className="text-xs font-bold text-blue-800 dark:text-blue-300">
            المكتبة القياسية: {LIBRARY_SIZE} قالباً جاهزاً — من التذكير الودّي حتى الإشعار القانوني
          </p>
          <p className="text-[10px] text-blue-700/80 dark:text-blue-400/80">
            لديك حالياً {count} قالباً. الاستيراد لا يحذف أو يعدّل أي قالب موجود.
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={isSaving}
        onClick={() => {
          seedTemplates();
        }}
        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles size={13} />
        استيراد المكتبة القياسية
      </button>
    </div>
  );
};

export default SeedTemplatesCard;
