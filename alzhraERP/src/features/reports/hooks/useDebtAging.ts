/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, security/detect-object-injection, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-non-null-assertion */
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { reportsApi } from '../api';
import { toBaseCurrency, formatLocalDate } from '../../../core/utils';
import { bucketForDays as bucketForOverdueDays } from '../../debts/lib/aging';
import { daysDiffLocal } from '../../../core/utils/dateBucket';
import { type AgingPartyRow, type DebtAgingData, AGING_LABELS } from '../types/debtAging';

/**
 * Hook لحساب أعمار الديون بناءً على تاريخ الاستحقاق المحلي (لا انزياح UTC)
 * ومصنفة عبر bucketForDays الموحد مع قسم الديون.
 */
export const useDebtAging = () => {
  const { user } = useAuthStore();
  return useQuery<DebtAgingData | null>({
    queryKey: ['debt_aging', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return null;

      // Get unpaid/partial invoices with party info
      const { data: invoices, error } = await reportsApi.getDebtAgingInvoices(user.company_id);

      if (error !== null) throw new Error(error.message);

      const todayLocal = formatLocalDate();
      const agingBuckets = { current: 0, days30: 0, days60: 0, days90: 0 };
      const partyAging: Record<string, AgingPartyRow> = {};

      (invoices || []).forEach(inv => {
        const dueKey = inv.due_date || inv.issue_date;
        const daysDiff = daysDiffLocal(dueKey, todayLocal);
        const remainingRaw = (inv.total_amount || 0) - (inv.paid_amount || 0);
        if (remainingRaw <= 0) return;

        const invWithCurrency = inv as unknown as {
          currency_code?: string | null;
          exchange_rate?: number | null;
        };
        const remaining = toBaseCurrency({
          amount: remainingRaw,
          currency_code: invWithCurrency.currency_code ?? null,
          exchange_rate: invWithCurrency.exchange_rate ?? null,
        });

        const partyId = inv.party_id ?? '';
        const partyName = inv.parties?.name || 'غير محدد';
        const partyType = inv.parties?.type || 'customer';

        // الخريطة تُعبّأ تدريجياً: النوع لا يحمل undefined لكن الوصول الأول
        // للطرف الجديد يعيد undefined فعلياً (noUncheckedIndexedAccess معطّل).
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- الحماية من الوصول الأول مطلوبة زمن التشغيل
        if (!partyAging[partyId]) {
          partyAging[partyId] = {
            id: partyId,
            name: partyName,
            type: partyType,
            current: 0,
            days30: 0,
            days60: 0,
            days90: 0,
            total: 0,
            oldestDate: inv.due_date || inv.issue_date,
          };
        }

        const bucket = bucketForOverdueDays(daysDiff);
        if (bucket === 'b0_30') {
          agingBuckets.current += remaining;
          partyAging[partyId].current += remaining;
        } else if (bucket === 'b31_60') {
          agingBuckets.days30 += remaining;
          partyAging[partyId].days30 += remaining;
        } else if (bucket === 'b61_90') {
          agingBuckets.days60 += remaining;
          partyAging[partyId].days60 += remaining;
        } else {
          agingBuckets.days90 += remaining;
          partyAging[partyId].days90 += remaining;
        }

        partyAging[partyId].total += remaining;
        const invoiceOldest = inv.due_date || inv.issue_date;
        if (invoiceOldest < partyAging[partyId].oldestDate) {
          partyAging[partyId].oldestDate = invoiceOldest;
        }
      });

      const partiesList = Object.values(partyAging).sort((a, b) => b.total - a.total);
      const totalOutstanding = partiesList.reduce((s, p) => s + p.total, 0);
      const criticalCount = partiesList.filter(p => p.days90 > 0).length;

      const chartData = [
        { name: AGING_LABELS[0]!, value: Math.max(0, agingBuckets.current) },
        { name: AGING_LABELS[1]!, value: Math.max(0, agingBuckets.days30) },
        { name: AGING_LABELS[2]!, value: Math.max(0, agingBuckets.days60) },
        { name: AGING_LABELS[3]!, value: Math.max(0, agingBuckets.days90) },
      ];

      return {
        agingBuckets,
        partiesList,
        totalOutstanding,
        criticalCount,
        chartData,
      };
    },
    enabled: !!user?.company_id,
  });
};
