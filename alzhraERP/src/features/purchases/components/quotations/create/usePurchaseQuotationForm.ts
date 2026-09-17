import { useCallback, useMemo, useRef, useState } from 'react';
import { formatLocalDate } from '../../../../../core/utils';
import { logger } from '../../../../../core/utils/logger';
import { parseError } from '../../../../../core/utils/errorUtils';
import { useParties } from '../../../../parties/hooks';
import { useFeedbackStore } from '../../../../feedback/store';
import { useQuotationItems } from './useQuotationItems';
import type { Party } from '../../../../parties/types';
import { purchaseQuotationsApi } from '../../../api/quotationsApi';
import {
  buildQuotationDraftKey,
  restoreQuotationDraft,
  type QuotationDraftSnapshot,
  type RestoredQuotationDraft,
} from './draft';
import { usePurchaseQuotationDraft } from './usePurchaseQuotationDraft';
import type { ItemRow, SupplierOption } from './types';

/**
 * حالة اختيار المورد: المورد المختار + نص البحث + فتح/إغلاق القائمة المنسدلة.
 */
const useQuotationPartyState = (
  restored: RestoredQuotationDraft
): {
  selectedParty: SupplierOption | null;
  partyQuery: string;
  isPartyDropdownOpen: boolean;
  setSelectedParty: (party: SupplierOption | null) => void;
  setPartyQuery: (value: string) => void;
  setPartyDropdownOpen: (open: boolean) => void;
  resetParty: () => void;
} => {
  const [selectedParty, setSelectedParty] = useState<SupplierOption | null>(restored.party);
  const [partyQuery, setPartyQuery] = useState('');
  const [isPartyDropdownOpen, setPartyDropdownOpen] = useState(false);

  const resetParty = useCallback((): void => {
    setSelectedParty(null);
    setPartyQuery('');
    setPartyDropdownOpen(false);
  }, []);

  return {
    selectedParty,
    partyQuery,
    isPartyDropdownOpen,
    setSelectedParty,
    setPartyQuery,
    setPartyDropdownOpen,
    resetParty,
  };
};

/** الحقول التجارية: تاريخ العرض + العملة + شروط التسليم/الدفع + الملاحظات. */
const useQuotationTermsState = (
  restored: RestoredQuotationDraft
): {
  issueDate: string;
  currencyCode: string;
  deliveryTerms: string;
  paymentTerms: string;
  notes: string;
  setIssueDate: (value: string) => void;
  setCurrencyCode: (value: string) => void;
  setDeliveryTerms: (value: string) => void;
  setPaymentTerms: (value: string) => void;
  setNotes: (value: string) => void;
  resetTerms: () => void;
} => {
  const [issueDate, setIssueDate] = useState(restored.issueDate);
  const [currencyCode, setCurrencyCode] = useState(restored.currencyCode);
  const [deliveryTerms, setDeliveryTerms] = useState(restored.deliveryTerms);
  const [paymentTerms, setPaymentTerms] = useState(restored.paymentTerms);
  const [notes, setNotes] = useState(restored.notes);

  const resetTerms = useCallback((): void => {
    setIssueDate(formatLocalDate());
    setCurrencyCode('SAR');
    setDeliveryTerms('');
    setPaymentTerms('');
    setNotes('');
  }, []);

  return {
    issueDate,
    currencyCode,
    deliveryTerms,
    paymentTerms,
    notes,
    setIssueDate,
    setCurrencyCode,
    setDeliveryTerms,
    setPaymentTerms,
    setNotes,
    resetTerms,
  };
};

interface UseSavePurchaseQuotationParams {
  companyId: string | undefined;
  userId: string | undefined;
  rfqGroupId: string | undefined;
  items: ItemRow[];
  selectedParty: SupplierOption | null;
  issueDate: string;
  currencyCode: string;
  deliveryTerms: string;
  paymentTerms: string;
  notes: string;
  clearDraft: () => void;
  onSuccess: () => void;
}

/**
 * إرسال عرض السعر:
 * - حماية من الإرسال المزدوج عبر `savingRef` (يفحصه قبل تغيير الحالة).
 * - تصفية البنود الصالحة (وصف غير فارغ + كمية موجبة) قبل الإرسال.
 * - تحويل أخطاء قاعدة البيانات إلى رسالة عربية عبر `parseError`.
 * - تنظيف المسودة ثم إبلاغ الأب بالنجاح.
 */
const buildQuotationPayload = (
  params: UseSavePurchaseQuotationParams,
  validItems: ItemRow[]
): Parameters<typeof purchaseQuotationsApi.createQuotation>[2] => ({
  partyId: params.selectedParty?.id ?? null,
  issueDate: params.issueDate,
  currencyCode: params.currencyCode,
  items: validItems,
  notes: params.notes.trim() !== '' ? params.notes : undefined,
  deliveryTerms: params.deliveryTerms.trim() !== '' ? params.deliveryTerms : undefined,
  paymentTerms: params.paymentTerms.trim() !== '' ? params.paymentTerms : undefined,
  rfqGroupId: params.rfqGroupId,
});

const useSavePurchaseQuotation = (
  params: UseSavePurchaseQuotationParams
): { saving: boolean; handleSave: () => Promise<void> } => {
  const { companyId, userId, items, clearDraft, onSuccess } = params;
  const { showToast } = useFeedbackStore();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const handleSave = async (): Promise<void> => {
    if (savingRef.current) return;
    const validItems = items.filter(item => item.description.trim() !== '' && item.quantity > 0);
    if (validItems.length === 0) {
      showToast('يرجى إضافة صنف واحد على الأقل مع تحديد الكمية', 'warning');
      return;
    }
    if (companyId === undefined || userId === undefined) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await purchaseQuotationsApi.createQuotation(
        companyId,
        userId,
        buildQuotationPayload(params, validItems)
      );
      clearDraft();
      onSuccess();
    } catch (error) {
      logger.error('CreatePurchaseQuotationModal', 'Failed to create purchase quotation:', error);
      const parsed = parseError(error);
      showToast(parsed.message, 'error', parsed);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return { saving, handleSave };
};

export interface UsePurchaseQuotationFormParams {
  companyId: string | undefined;
  userId: string | undefined;
  rfqGroupId: string | undefined;
  onSuccess: () => void;
}

/**
 * الحالة الكاملة لنموذج «تسجيل عرض سعر مورد»: البنود + المورد + الشروط +
 * المسودة التلقائية + الإجمالي + الإرسال. الواجهة العامة محفوظة كما كانت.
 */
interface PurchaseQuotationFormController {
  items: ReturnType<typeof useQuotationItems>;
  party: ReturnType<typeof useQuotationPartyState>;
  terms: ReturnType<typeof useQuotationTermsState>;
  suppliers: Party[];
  suppliersLoading: boolean;
  total: number;
  hasValidItem: boolean;
  hasDraft: boolean;
  discardDraft: () => void;
  saving: boolean;
  handleSave: () => Promise<void>;
}

const useQuotationSnapshot = (
  items: ItemRow[],
  party: SupplierOption | null,
  terms: ReturnType<typeof useQuotationTermsState>
): QuotationDraftSnapshot => {
  const { issueDate, currencyCode, deliveryTerms, paymentTerms, notes } = terms;
  return useMemo(
    () => ({
      items,
      party,
      issueDate,
      currencyCode,
      deliveryTerms,
      paymentTerms,
      notes,
    }),
    [items, party, issueDate, currencyCode, deliveryTerms, paymentTerms, notes]
  );
};

const calculateQuotationTotal = (items: ItemRow[]): number =>
  items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (1 - item.discountPercent / 100),
    0
  );

export function usePurchaseQuotationForm(
  params: UsePurchaseQuotationFormParams
): PurchaseQuotationFormController {
  const { companyId, userId, rfqGroupId } = params;
  const draftKey = buildQuotationDraftKey(companyId, userId, rfqGroupId);
  const [restored] = useState<RestoredQuotationDraft>(() => restoreQuotationDraft(draftKey));
  const items = useQuotationItems(restored.items);
  const party = useQuotationPartyState(restored);
  const terms = useQuotationTermsState(restored);
  const { data: suppliers, isLoading: suppliersLoading } = useParties('supplier', party.partyQuery);

  const snapshot = useQuotationSnapshot(items.items, party.selectedParty, terms);

  const { hasDraft, clearDraft } = usePurchaseQuotationDraft({
    draftKey,
    initialHasDraft: restored.hasDraft,
    snapshot,
  });

  const total = useMemo(() => calculateQuotationTotal(items.items), [items.items]);
  const hasValidItem = items.items.some(
    item => item.description.trim() !== '' && item.quantity > 0
  );

  const { saving, handleSave } = useSavePurchaseQuotation({
    ...params,
    ...snapshot,
    selectedParty: snapshot.party,
    clearDraft,
  });

  const discardDraft = useCallback((): void => {
    clearDraft();
    items.resetItems();
    party.resetParty();
    terms.resetTerms();
  }, [clearDraft, items, party, terms]);

  return {
    items,
    party,
    terms,
    suppliers,
    suppliersLoading,
    total,
    hasValidItem,
    hasDraft,
    discardDraft,
    saving,
    handleSave,
  };
}
