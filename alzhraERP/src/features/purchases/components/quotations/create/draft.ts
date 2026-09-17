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
  notes: string;
  deliveryTerms: string;
  paymentTerms: string;
}

/** المورد المستعاد من المسودة بشرط وجود المعرّف والاسم معاً. */
const toRestoredParty = (saved: PurchaseQuotationDraft): SupplierOption | null =>
  saved.partyId !== null &&
  saved.partyId !== '' &&
  saved.partyName !== null &&
  saved.partyName !== ''
    ? { id: saved.partyId, name: saved.partyName, phone: saved.partyPhone ?? null }
    : null;

/** المورد المستخدم في فحص «الجدية» — يتسامح مع اسم فارغ (يطابق السلوك السابق). */
const toSnapshotParty = (saved: PurchaseQuotationDraft): SupplierOption | null =>
  saved.partyId !== null && saved.partyId !== ''
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
 * يقرأ المسودة من التخزين المحلي ويحوّلها إلى حالة نموذج جاهزة.
 * أي مسودة غير موجودة أو غير قابلة للقراءة تُنتج القيم الافتراضية.
 */
export const restoreQuotationDraft = (draftKey: string | null): RestoredQuotationDraft => {
  if (draftKey === null || draftKey === '') return emptyRestoredDraft();
  const saved = draftStorage.load<PurchaseQuotationDraft>(draftKey);
  if (saved === null) return emptyRestoredDraft();

  const savedItems = Array.isArray(saved.items) ? saved.items : [];
  return {
    hasDraft: isQuotationDraftDirty({
      items: savedItems,
      party: toSnapshotParty(saved),
      notes: saved.notes ?? '',
      deliveryTerms: saved.deliveryTerms ?? '',
      paymentTerms: saved.paymentTerms ?? '',
    }),
    party: toRestoredParty(saved),
    issueDate: saved.issueDate ?? formatLocalDate(),
    currencyCode: saved.currencyCode ?? 'SAR',
    deliveryTerms: saved.deliveryTerms ?? '',
    paymentTerms: saved.paymentTerms ?? '',
    notes: saved.notes ?? '',
    items: savedItems.length > 0 ? savedItems : [createEmptyItemRow()],
  };
};
