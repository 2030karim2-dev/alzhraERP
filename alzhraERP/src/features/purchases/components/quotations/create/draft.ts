import { draftStorage } from '../../../../../core/utils/draftStorage';
import { formatLocalDate } from '../../../../../core/utils';
import type { ItemRow, SupplierOption } from './types';

/** الشكل الدقيق لأي مسودة عرض سعر محفوظة في localStorage. */
export interface PurchaseQuotationDraft {
  items: ItemRow[];
  partyId: string | null;
  partyName: string | null;
  partyPhone: string | null;
  issueDate: string;
  currencyCode?: string;
  deliveryTerms: string;
  paymentTerms: string;
  notes: string;
}

/** يبني مفتاح المسودة: محصور بالمنشأة، ثم المستخدم، ثم طلب عرض السعر. */
export const buildQuotationDraftKey = (
  companyId: string | undefined,
  userId: string | undefined,
  rfqGroupId: string | undefined
): string | null => {
  if (companyId === undefined || companyId === '') return null;
  if (userId === undefined || userId === '') return `purchase_quotation:${companyId}`;
  if (rfqGroupId !== undefined && rfqGroupId !== '') {
    return `purchase_quotation:${companyId}:${userId}:rfq:${rfqGroupId}`;
  }
  return `purchase_quotation:${companyId}:${userId}:general`;
};

/** المصدر الوحيد لبنية البند الفارغ (يُستخدم للتهيئة وعند الإضافة). */
export const createEmptyItemRow = (): ItemRow => ({
  productId: '',
  description: '',
  partNumber: '',
  size: '',
  quantity: 1,
  unitPrice: 0,
  discountPercent: 0,
});

/** لقطة القيم الحالية للنموذج — تُستخدم لفحص «هل تستحق المسودة الحفظ؟». */
export interface QuotationDraftSnapshot {
  items: ItemRow[];
  party: SupplierOption | null;
  issueDate: string;
  currencyCode: string;
  notes: string;
  deliveryTerms: string;
  paymentTerms: string;
}

/** هل يوجد أي محتوى فعلي يستحق الحفظ كمسودة؟ */
/** الحقول التي يعتمد عليها فحص «جدية» المسودة. */
export type QuotationDraftDirtyInput = Pick<
  QuotationDraftSnapshot,
  'items' | 'party' | 'notes' | 'deliveryTerms' | 'paymentTerms'
>;

export const isQuotationDraftDirty = (snapshot: QuotationDraftDirtyInput): boolean => {
  const { items, party, notes, deliveryTerms, paymentTerms } = snapshot;
  const hasItems = items.some(
    item =>
      item.description.trim() !== '' || (item.productId !== '' && item.productId.trim() !== '')
  );
  return (
    hasItems ||
    party !== null ||
    notes.trim() !== '' ||
    deliveryTerms.trim() !== '' ||
    paymentTerms.trim() !== ''
  );
};

/** قيمة نصية موجودة وغير فارغة (تُستخدم للتحقق من بيانات التخزين غير الموثوقة). */
const isNonEmpty = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== '';

/** المورد المستعاد من المسودة (يتطلب معرّفاً واسماً معاً). */
const toRestoredParty = (saved: Partial<PurchaseQuotationDraft>): SupplierOption | null =>
  isNonEmpty(saved.partyId) && isNonEmpty(saved.partyName)
    ? { id: saved.partyId, name: saved.partyName, phone: saved.partyPhone ?? null }
    : null;

/** المورد المستخدم في فحص «الجدية» — يتسامح مع اسم فارغ (يطابق السلوك السابق). */
const toSnapshotParty = (saved: Partial<PurchaseQuotationDraft>): SupplierOption | null =>
  isNonEmpty(saved.partyId)
    ? { id: saved.partyId, name: saved.partyName ?? '', phone: saved.partyPhone ?? null }
    : null;

/** الحالة الأولية الكاملة التي يستعيدها النموذج من المسودة (أو القيم الافتراضية). */
export interface RestoredQuotationDraft {
  hasDraft: boolean;
  party: SupplierOption | null;
  issueDate: string;
  currencyCode: string;
  deliveryTerms: string;
  paymentTerms: string;
  notes: string;
  items: ItemRow[];
}

/** القيم الافتراضية لنموذج عرض سعر جديد (بلا مسودة). */
const emptyRestoredDraft = (): RestoredQuotationDraft => ({
  hasDraft: false,
  party: null,
  issueDate: formatLocalDate(),
  currencyCode: 'SAR',
  deliveryTerms: '',
  paymentTerms: '',
  notes: '',
  items: [createEmptyItemRow()],
});

/**
 * يبني حالة النموذج المستعادة من مسودة مقروءة من التخزين.
 * الحقول مفردة بلا تحقق مسبق، لذلك تقبل `undefined` وتُكمَّل بقيم افتراضية.
 */
const toRestoredDraft = (saved: Partial<PurchaseQuotationDraft>): RestoredQuotationDraft => {
  const savedItems = saved.items ?? [];
  const notes = saved.notes ?? '';
  const deliveryTerms = saved.deliveryTerms ?? '';
  const paymentTerms = saved.paymentTerms ?? '';
  const issueDate = saved.issueDate ?? formatLocalDate();

  return {
    hasDraft: isQuotationDraftDirty({
      items: savedItems,
      party: toSnapshotParty(saved),
      notes,
      deliveryTerms,
      paymentTerms,
    }),
    party: toRestoredParty(saved),
    issueDate,
    currencyCode: saved.currencyCode ?? 'SAR',
    deliveryTerms,
    paymentTerms,
    notes,
    items: savedItems.length > 0 ? savedItems : [createEmptyItemRow()],
  };
};

/**
 * يقرأ المسودة من التخزين المحلي ويحوّلها إلى حالة نموذج جاهزة.
 * أي مسودة غير موجودة أو غير قابلة للقراءة تُنتج القيم الافتراضية.
 */
export const restoreQuotationDraft = (draftKey: string | null): RestoredQuotationDraft => {
  if (draftKey === null || draftKey === '') return emptyRestoredDraft();
  const saved = draftStorage.load<Partial<PurchaseQuotationDraft>>(draftKey);
  return saved === null ? emptyRestoredDraft() : toRestoredDraft(saved);
};
