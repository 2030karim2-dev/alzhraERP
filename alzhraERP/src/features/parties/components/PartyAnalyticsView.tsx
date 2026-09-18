import React, { useMemo } from 'react';
import {
  Crown,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  MessageCircle,
  FileText,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import type { Party, PartyType } from '../types';
import { formatCurrency, cn } from '../../../core/utils';
import { buildWhatsAppLink, hasValidWhatsAppPhone } from '../../debts/lib/whatsapp';

interface PartyAnalyticsViewProps {
  partyType: PartyType;
  parties?: Party[];
  isLoading?: boolean;
  onViewStatement: (party: Party) => void;
}

export const PartyAnalyticsView: React.FC<PartyAnalyticsViewProps> = ({
  partyType,
  parties = [],
  isLoading = false,
  onViewStatement,
}) => {
  const isCustomer = partyType === 'customer';

  // Segmentation stats
  const segmentation = useMemo(() => {
    let vip = 0;
    let activeInDebt = 0;
    let regular = 0;
    let zeroBalance = 0;
    let highRisk = 0;

    parties.forEach(p => {
      const bal = p.balance ?? 0;
      if (bal > 20000) highRisk++;
      if (bal > 10000) vip++;
      else if (bal > 0) activeInDebt++;
      else if (bal === 0) zeroBalance++;
      else regular++;
    });

    return {
      vip,
      activeInDebt,
      regular,
      zeroBalance,
      highRisk,
      total: parties.length,
    };
  }, [parties]);

  // Top 5 Debtors
  const topDebtors = useMemo(() => {
    return [...parties]
      .filter(p => (p.balance ?? 0) > 0)
      .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))
      .slice(0, 5);
  }, [parties]);

  // Balance Brackets
  const brackets = useMemo(() => {
    let under1k = 0;
    let from1kTo5k = 0;
    let from5kTo20k = 0;
    let over20k = 0;

    let under1kSum = 0;
    let from1kTo5kSum = 0;
    let from5kTo20kSum = 0;
    let over20kSum = 0;

    parties.forEach(p => {
      const bal = p.balance ?? 0;
      if (bal <= 0) return;
      if (bal < 1000) {
        under1k++;
        under1kSum += bal;
      } else if (bal < 5000) {
        from1kTo5k++;
        from1kTo5kSum += bal;
      } else if (bal < 20000) {
        from5kTo20k++;
        from5kTo20kSum += bal;
      } else {
        over20k++;
        over20kSum += bal;
      }
    });

    return [
      { label: 'أقل من 1,000', count: under1k, sum: under1kSum, color: 'bg-emerald-500' },
      { label: '1,000 - 5,000', count: from1kTo5k, sum: from1kTo5kSum, color: 'bg-blue-500' },
      { label: '5,000 - 20,000', count: from5kTo20k, sum: from5kTo20kSum, color: 'bg-amber-500' },
      { label: 'أكثر من 20,000 (حرجة)', count: over20k, sum: over20kSum, color: 'bg-rose-500' },
    ];
  }, [parties]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm font-bold text-slate-400">جاري تحليل بيانات الجهات...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Segmentation Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* VIP */}
        <div className="rounded-2xl border border-purple-200/70 bg-gradient-to-br from-purple-50/80 to-purple-100/40 p-4 shadow-sm dark:border-purple-900/40 dark:from-purple-950/20 dark:to-purple-900/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 dark:text-purple-300">
              {isCustomer ? 'عملاء كبار (VIP)' : 'كبار الموردين'}
            </span>
            <div className="rounded-xl bg-purple-100 p-2 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              <Crown size={16} />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl font-bold text-purple-900 dark:text-purple-100">
            {segmentation.vip}
          </div>
          <span className="mt-1 block text-[10px] text-purple-600 dark:text-purple-400">
            أرصدة تتجاوز 10,000
          </span>
        </div>

        {/* Active with balance */}
        <div className="rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/80 to-blue-100/40 p-4 shadow-sm dark:border-blue-900/40 dark:from-blue-950/20 dark:to-blue-900/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
              {isCustomer ? 'عليهم مديونية جارية' : 'مستحقات جارية'}
            </span>
            <div className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl font-bold text-blue-900 dark:text-blue-100">
            {segmentation.activeInDebt}
          </div>
          <span className="mt-1 block text-[10px] text-blue-600 dark:text-blue-400">
            جهات بأرصدة نشطة
          </span>
        </div>

        {/* High credit risk */}
        <div className="rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50/80 to-rose-100/40 p-4 shadow-sm dark:border-rose-900/40 dark:from-rose-950/20 dark:to-rose-900/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
              مخاطر ائتمانية مرتفعة
            </span>
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl font-bold text-rose-900 dark:text-rose-100">
            {segmentation.highRisk}
          </div>
          <span className="mt-1 block text-[10px] text-rose-600 dark:text-rose-400">
            مديونية تتجاوز 20,000
          </span>
        </div>

        {/* Settled / Zero Balance */}
        <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 p-4 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-emerald-900/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              أرصدة مسواة بالكامل
            </span>
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3 font-mono text-2xl font-bold text-emerald-900 dark:text-emerald-100">
            {segmentation.zeroBalance}
          </div>
          <span className="mt-1 block text-[10px] text-emerald-600 dark:text-emerald-400">
            لا توجد مستحقات معلقة
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top Debtors Table */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {isCustomer ? 'أعلى 5 عملاء مديونية للمطالبة' : 'أعلى 5 موردين بأرصدة مدينة'}
                </h4>
                <p className="text-[10px] text-slate-500">
                  المراسلة والمطالبة المباشرة عبر واتساب بنقرة واحدة
                </p>
              </div>
            </div>
          </div>

          {topDebtors.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              لا توجد مديونيات قائمة حالياً
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 dark:border-slate-800">
                    <th className="pb-2">الجهة</th>
                    <th className="pb-2">الهاتف</th>
                    <th className="pb-2">الرصيد المستحق</th>
                    <th className="pb-2 text-center">إجراءات سريعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {topDebtors.map(party => {
                    const bal = Number(party.balance) || 0;
                    return (
                      <tr
                        key={party.id}
                        className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-2.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {party.name}
                          </span>
                          {party.category && (
                            <span className="py-0.2 mr-2 inline-block rounded bg-slate-100 px-1.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {party.category}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 font-mono text-slate-500" dir="ltr">
                          {party.phone || '---'}
                        </td>
                        <td className="py-2.5">
                          <span
                            dir="ltr"
                            className="font-mono font-bold text-rose-600 dark:text-rose-400"
                          >
                            {formatCurrency(bal)}
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {hasValidWhatsAppPhone(party.phone) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const message = `مرحباً ${party.name}، نود تذكيركم بلطف برصيد حسابكم الحالي وقدره ${formatCurrency(bal)} لدى المنشأة. يرجى التكرم بالاطلاع والتسوية. شاكرين لكم حسن تعاونكم.`;
                                  window.open(
                                    buildWhatsAppLink(party.phone!, message),
                                    '_blank',
                                    'noopener,noreferrer'
                                  );
                                }}
                                className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
                                title="مطالبة سريعة عبر واتساب"
                              >
                                <MessageCircle size={13} />
                                <span>مطالبة</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                onViewStatement(party);
                              }}
                              className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/60"
                              title="عرض كشف الحساب"
                            >
                              <FileText size={13} />
                              <span>كشف الحساب</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Debt Distribution Brackets */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <DollarSign size={16} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                توزيع فئات المديونية
              </h4>
              <p className="text-[10px] text-slate-500">حجم المطالبات حسب شريحة المبلغ</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {brackets.map(b => (
              <div key={b.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">{b.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{b.count} جهة</span>
                    <span dir="ltr" className="font-mono text-slate-900 dark:text-white">
                      {formatCurrency(b.sum)}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', b.color)}
                    style={{
                      width: `${
                        parties.length > 0
                          ? Math.min(
                              100,
                              Math.round((b.count / Math.max(parties.length, 1)) * 100 * 2)
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartyAnalyticsView;
