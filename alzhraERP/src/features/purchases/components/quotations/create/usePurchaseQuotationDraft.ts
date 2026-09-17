import { useCallback, useEffect, useRef, useState } from 'react';
import { draftStorage } from '../../../../../core/utils/draftStorage';
import {
  buildQuotationDraftKey,
  isQuotationDraftDirty,
  restoreQuotationDraft,
  type PurchaseQuotationDraft,
  type QuotationDraftSnapshot,
  type RestoredQuotationDraft,
} from './draft';

/** مهلة الحفظ التلقائي بعد آخر تعديل (ملّي ثانية). */
const SAVE_DEBOUNCE_MS = 800;

interface UsePurchaseQuotationDraftParams {
  draftKey: string | null;
  /** هل وُجدت مسودة ذات محتوى فعلي عند أول تحميل؟ (يحدد ظهور التنبيه) */
  initialHasDraft: boolean;
  /** القيم الحالية للنموذج التي تُكتب في المسودة. */
  snapshot: QuotationDraftSnapshot;
}

interface UsePurchaseQuotationDraftResult {
  hasDraft: boolean;
  clearDraft: () => void;
}

/** يبني مفتاح مسودة عرض السعر (يعاد تصديره لاستخدامه في اختبارات الوحدة). */
export { buildQuotationDraftKey, restoreQuotationDraft };
export type { RestoredQuotationDraft };

/**
 * يدير مسودة عرض سعر المورد: حفظ تلقائي مؤجّل (800ms) لكل تعديل،
 * وتنظيف التخزين عند التخلي عن المسودة أو بعد نجاح الإرسال.
 *
 * ملاحظة: كل الاشتقاقات وقراءة التخزين تتم خارج الهوك، وهذا الهوك مسؤول
 * فقط عن دورة حياة الحفظ حتى يبقى صغيراً وقابلاً للاختبار.
 */
export function usePurchaseQuotationDraft({
  draftKey,
  initialHasDraft,
  snapshot,
}: UsePurchaseQuotationDraftParams): UsePurchaseQuotationDraftResult {
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingSave = useCallback((): void => {
    if (saveTimeout.current !== null) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
  }, []);

  useEffect(() => {
    if (draftKey === null || draftKey === '') return undefined;
    clearPendingSave();
    saveTimeout.current = setTimeout(() => {
      if (!isQuotationDraftDirty(snapshot)) {
        draftStorage.clear(draftKey);
        return;
      }
      draftStorage.save<PurchaseQuotationDraft>(draftKey, {
        items: snapshot.items,
        partyId: snapshot.party?.id ?? null,
        partyName: snapshot.party?.name ?? null,
        partyPhone: snapshot.party?.phone ?? null,
        issueDate: snapshot.issueDate,
        currencyCode: snapshot.currencyCode,
        deliveryTerms: snapshot.deliveryTerms,
        paymentTerms: snapshot.paymentTerms,
        notes: snapshot.notes,
      });
    }, SAVE_DEBOUNCE_MS);
    return clearPendingSave;
  }, [draftKey, snapshot, clearPendingSave]);

  const clearDraft = useCallback((): void => {
    clearPendingSave();
    if (draftKey !== null && draftKey !== '') draftStorage.clear(draftKey);
    setHasDraft(false);
  }, [draftKey, clearPendingSave]);

  return { hasDraft, clearDraft };
}
