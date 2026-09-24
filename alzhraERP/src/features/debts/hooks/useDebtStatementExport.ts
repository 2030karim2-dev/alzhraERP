/**
 * useDebtStatementExport — تصدير كشف الحساب من لوحة المتابعة (M-4).
 *
 * الفصل مقصود: المكوّن للعرض فقط، والـ Hook ينسّق (شركة → جلب الكشف →
 * توليد الملف) ويملك حالة التصدير ورسائل النجاح/الخطأ، أما بناء الحمولة
 * فمصدره خدمة نقية `services/debtStatementExport` (بلا partiesService هنا).
 */
import { useCallback, useState } from 'react';
import { useCompany } from '../../settings/hooks';
import { useFeedbackStore } from '../../feedback/store';
import { partiesService } from '../../parties/service';
import { exportStatementToExcel } from '../../parties/utils/statementExcelExporter';
import { parseError } from '../../../core/utils/errorUtils';
import {
  buildCompanyDoc,
  buildExportOptions,
  toStatementEntries,
} from '../services/debtStatementExport';
import type { FollowUpDashboardRow } from '../types';

export interface DebtStatementExport {
  /** يصدّر كشف حساب الطرف في صف المتابعة (Excel) ويملك التنبيهات والخطأ. */
  exportStatement: (row: FollowUpDashboardRow) => Promise<void>;
  /** معرّف الطرف الجاري تصديره — يمنع النقر المزدوج على أزرار الصف. */
  exportingPartyId: string | null;
}

export const useDebtStatementExport = (): DebtStatementExport => {
  const { data: company } = useCompany();
  const { showToast } = useFeedbackStore();
  const [exportingPartyId, setExportingPartyId] = useState<string | null>(null);

  const exportStatement = useCallback(
    async (row: FollowUpDashboardRow): Promise<void> => {
      try {
        setExportingPartyId(row.party_id);
        showToast('جاري إنشاء وتنسيق كشف الحساب الاحترافي (Excel)...', 'info');

        const movements = await partiesService.getStatement(row.party_id, 'customer', {
          currencyCode: row.currency_code,
        });

        await exportStatementToExcel(
          buildCompanyDoc(company ?? null),
          row.party_name,
          toStatementEntries(movements),
          buildExportOptions(row)
        );

        showToast('تم تحميل كشف الحساب بصيغة Excel بنجاح', 'success');
      } catch (err) {
        showToast(parseError(err).message, 'error');
      } finally {
        setExportingPartyId(null);
      }
    },
    [company, showToast]
  );

  return { exportStatement, exportingPartyId };
};
