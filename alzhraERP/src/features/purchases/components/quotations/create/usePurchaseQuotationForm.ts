import { useCallback, useMemo, useRef, useState } from 'react';
import { formatLocalDate } from '../../../../../core/utils';
import { logger } from '../../../../../core/utils/logger';
import { parseError } from '../../../../../core/utils/errorUtils';
import { useParties } from '../../../../parties/hooks';
import { useFeedbackStore } from '../../../../feedback/store';
import type { Product } from '../../../../inventory/types';
import type { Party } from '../../../../parties/types';
import { purchaseQuotationsApi } from '../../../api/quotationsApi';
import {
  buildQuotationDraftKey,
  createEmptyItemRow,
  restoreQuotationDraft,
  type QuotationDraftSnapshot,
  type RestoredQuotationDraft,
} from './draft';
import { usePurchaseQuotationDraft } from './usePurchaseQuotationDraft';
import type { ItemRow, ProductModalState, SupplierOption } from './types';

type ItemFieldUpdater = (index: number, field: keyof ItemRow, value: string | number) => void;
type ItemSearcher = (index: number, query?: string) => void;

/** سعر صالح للاستخدام = عدد منتهٍ وغير صفري (يطابق دلالة `||` السابقة). */
const isUsablePrice = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value !== 0;

/** سعر شراء المنتج: شراء ← تكلفة ← صفر. */
const resolveProductUnitPrice = (product: Product): number => {
  if (isUsablePrice(product.purchase_price)) return product.purchase_price;
  if (isUsablePrice(product.cost_price)) return product.cost_price;
  return 0;
};

/**
 * بنود العرض: الإضافة والتعديل والحذف + حالة نافذة اختيار المنتج.
 * تنطّع الحذف عند بقاء بند واحد فقط (لا يمكن ترك الجدول فارغاً).
 */
const useQuotationItems = (
  initialItems: ItemRow[]
): {
  items: ItemRow[];
  productModal: ProductModalState;
  updateItem: ItemFieldUpdater;
  addItem: () => void;
  removeItem: (index: number) => void;
  resetItems: () => void;
  openProductSearch: ItemSearcher;
  closeProductSearch: () => void;
  applyProduct: (product: Product) => void;
} => {
  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const [productModal, setProductModal] = useState<ProductModalState>({
    isOpen: false,
    rowIndex: 0,
    query: '',
  });

  const updateItem = useCallback<ItemFieldUpdater>((index, field, value): void => {
    setItems(previous =>
      previous.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  }, []);

  const addItem = useCallback((): void => {
    setItems(previous => [...previous, createEmptyItemRow()]);
  }, []);

  const removeItem = useCallback((index: number): void => {
    setItems(previous =>
      previous.length <= 1 ? previous : previous.filter((_, itemIndex) => itemIndex !== index)
    );
  }, []);

  const resetItems = useCallback((): void => {
    setItems([createEmptyItemRow()]);
  }, []);

  const openProductSearch = useCallback<ItemSearcher>((index, query = ''): void => {
    setProductModal({ isOpen: true, rowIndex: index, query });
  }, []);

  const closeProductSearch = useCallback((): void => {
    setProductModal(previous => ({ ...previous, isOpen: false }));
  }, []);

  const applyProduct = useCallback(
    (product: Product): void => {
      setItems(previous =>
        previous.map((item, index) =>
          index === productModal.rowIndex
            ? {
                ...item,
                productId: product.id,
                description: product.name,
                partNumber: (product as { part_number?: string }).part_number ?? '',
                size: product.size ?? '',
                unitPrice: resolveProductUnitPrice(product),
              }
            : item
        )
      );
      setProductModal(previous => ({ ...previous, isOpen: false }));
    },
    [productModal.rowIndex]
  );

  return {
    items,
    productModal,
    updateItem,
    addItem,
    removeItem,
    resetItems,
    openProductSearch,
    closeProductSearch,
    applyProduct,
  };
};

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
const useSavePurchaseQuotation = ({
  companyId,
  userId,
  rfqGroupId,
  items,
  selectedParty,
  issueDate,
  currencyCode,
  deliveryTerms,
  paymentTerms,
  notes,
  clearDraft,
  onSuccess,
}: UseSavePurchaseQuotationParams): { saving: boolean; handleSave: () => Promise<void> } => {
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
      await purchaseQuotationsApi.createQuotation(companyId, userId, {
        partyId: selectedParty?.id ?? null,
        issueDate,
        currencyCode,
        items: validItems,
        notes: notes.trim() !== '' ? notes : undefined,
        deliveryTerms: deliveryTerms.trim() !== '' ? deliveryTerms : undefined,
        paymentTerms: paymentTerms.trim() !== '' ? paymentTerms : undefined,
        rfqGroupId,
      });
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
export function usePurchaseQuotationForm({
  companyId,
  userId,
  rfqGroupId,
  onSuccess,
}: UsePurchaseQuotationFormParams): {
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
} {
  const draftKey = buildQuotationDraftKey(companyId, userId, rfqGroupId);
  const [restored] = useState<RestoredQuotationDraft>(() => restoreQuotationDraft(draftKey));
  const items = useQuotationItems(restored.items);
  const party = useQuotationPartyState(restored);
  const terms = useQuotationTermsState(restored);
  const { data: suppliers, isLoading: suppliersLoading } = useParties('supplier', party.partyQuery);

  const snapshot = useMemo<QuotationDraftSnapshot>(
    () => ({
      items: items.items,
      party: party.selectedParty,
      issueDate: terms.issueDate,
      currencyCode: terms.currencyCode,
      deliveryTerms: terms.deliveryTerms,
      paymentTerms: terms.paymentTerms,
      notes: terms.notes,
    }),
    [
      items.items,
      party.selectedParty,
      terms.issueDate,
      terms.currencyCode,
      terms.deliveryTerms,
      terms.paymentTerms,
      terms.notes,
    ]
  );

  const { hasDraft, clearDraft } = usePurchaseQuotationDraft({
    draftKey,
    initialHasDraft: restored.hasDraft,
    snapshot,
  });

  const total = useMemo(
    () =>
      items.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice * (1 - item.discountPercent / 100),
        0
      ),
    [items.items]
  );
  const hasValidItem = items.items.some(
    item => item.description.trim() !== '' && item.quantity > 0
  );

  const { saving, handleSave } = useSavePurchaseQuotation({
    companyId,
    userId,
    rfqGroupId,
    items: items.items,
    selectedParty: party.selectedParty,
    issueDate: terms.issueDate,
    currencyCode: terms.currencyCode,
    deliveryTerms: terms.deliveryTerms,
    paymentTerms: terms.paymentTerms,
    notes: terms.notes,
    clearDraft,
    onSuccess,
  });

  const discardDraft = (): void => {
    clearDraft();
    items.resetItems();
    party.resetParty();
    terms.resetTerms();
  };

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
