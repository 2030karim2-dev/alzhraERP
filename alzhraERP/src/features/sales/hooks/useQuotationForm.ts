import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Product } from '@/features/inventory/types';
import { salesQuotationsApi } from '@/features/sales/api';
import { useBranchFilter } from '@/features/branches/hooks/useBranchFilter';
import { logger } from '../../../core/utils/logger';
import { formatLocalDate } from '../../../core/utils/dateUtils';
import { draftStorage } from '../../../core/utils/draftStorage';

export interface ItemRow {
  productId: string;
  description: string;
  partNumber?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

interface DraftState {
  items: ItemRow[];
  partyId: string | null;
  partyName: string | null;
  partyPhone: string | null;
  issueDate: string;
  validDays: number;
  notes: string;
  terms: string;
  paymentTerms: string;
}

const isDraftDirty = (
  items: ItemRow[],
  party: { id: string; name: string; phone?: string } | null,
  notes: string,
  terms: string,
  paymentTerms: string
): boolean => {
  const hasItems = items.some(
    i => i.description.trim() !== '' || (i.productId && i.productId.trim() !== '')
  );
  return (
    hasItems ||
    party !== null ||
    notes.trim() !== '' ||
    terms.trim() !== '' ||
    paymentTerms.trim() !== ''
  );
};

export const useQuotationForm = (
  companyId: string | undefined,
  userId: string | undefined,
  onSuccess: () => void,
  initialData?: {
    items?: ItemRow[] | undefined;
    notes?: string | undefined;
  }
) => {
  const draftKey = companyId
    ? userId
      ? `sales_quotation:${companyId}:${userId}`
      : `sales_quotation:${companyId}`
    : null;

  // Load saved draft on first render
  const savedDraft = draftKey ? draftStorage.load<DraftState>(draftKey) : null;

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [selectedParty, setSelectedParty] = useState<{
    id: string;
    name: string;
    phone?: string;
  } | null>(() => {
    if (savedDraft?.partyId && savedDraft.partyName) {
      return {
        id: savedDraft.partyId,
        name: savedDraft.partyName,
        ...(savedDraft.partyPhone ? { phone: savedDraft.partyPhone } : {}),
      };
    }
    return null;
  });
  const [partyQuery, setPartyQuery] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const { branchId } = useBranchFilter();

  const [issueDate, setIssueDate] = useState(() => savedDraft?.issueDate ?? formatLocalDate());
  const [validDays, setValidDays] = useState(() => savedDraft?.validDays ?? 7);
  const [notes, setNotes] = useState(() => savedDraft?.notes ?? (initialData?.notes || ''));
  const [terms, setTerms] = useState(() => savedDraft?.terms ?? '');
  const [paymentTerms, setPaymentTerms] = useState(() => savedDraft?.paymentTerms ?? '');
  const [items, setItems] = useState<ItemRow[]>(() => {
    if (savedDraft?.items && savedDraft.items.length > 0) return savedDraft.items;
    if (initialData?.items && initialData.items.length > 0) return initialData.items;
    return [
      {
        productId: '',
        description: '',
        partNumber: '',
        size: '',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
      },
    ];
  });

  const [hasDraft, setHasDraft] = useState(() => {
    if (!savedDraft) return false;
    return isDraftDirty(
      savedDraft.items || [],
      savedDraft.partyId ? { id: savedDraft.partyId, name: savedDraft.partyName || '' } : null,
      savedDraft.notes || '',
      savedDraft.terms || '',
      savedDraft.paymentTerms || ''
    );
  });

  const [productModal, setProductModal] = useState<{
    isOpen: boolean;
    rowIndex: number;
    query: string;
  }>({
    isOpen: false,
    rowIndex: 0,
    query: '',
  });

  // ─── Auto-save draft on every meaningful change ─────────────────────────────
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleDraftSave = useCallback(() => {
    if (!draftKey) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (!isDraftDirty(items, selectedParty, notes, terms, paymentTerms)) {
        // Form is empty / clean – do not write blank draft to localStorage
        draftStorage.clear(draftKey);
        return;
      }
      const draft: DraftState = {
        items,
        partyId: selectedParty?.id ?? null,
        partyName: selectedParty?.name ?? null,
        partyPhone: selectedParty?.phone ?? null,
        issueDate,
        validDays,
        notes,
        terms,
        paymentTerms,
      };
      draftStorage.save(draftKey, draft);
    }, 800); // debounce 800ms
  }, [draftKey, items, selectedParty, issueDate, validDays, notes, terms, paymentTerms]);

  useEffect(() => {
    scheduleDraftSave();
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [scheduleDraftSave]);

  // ─── Computed ──────────────────────────────────────────────────────────────
  const validUntil = useMemo(() => {
    const parts = (issueDate || formatLocalDate()).split('-').map(Number);
    const d = new Date(parts[0] || 2000, (parts[1] || 1) - 1, (parts[2] || 1) + validDays);
    return formatLocalDate(d);
  }, [issueDate, validDays]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const line =
        (Number(item.quantity) || 0) *
        (Number(item.unitPrice) || 0) *
        (1 - (Number(item.discountPercent) || 0) / 100);
      return sum + line;
    }, 0);
    const rounded = Math.round(subtotal * 100) / 100;
    return { subtotal: rounded, total: rounded };
  }, [items]);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        productId: '',
        description: '',
        partNumber: '',
        size: '',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenProductSearch = (index: number, query = '') => {
    setProductModal({ isOpen: true, rowIndex: index, query });
  };

  const handleProductSelect = (product: Product) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === productModal.rowIndex
          ? {
              ...item,
              productId: product.id,
              description: product.name,
              partNumber: (product as { part_number?: string }).part_number ?? '',
              size: product.size ?? '',
              unitPrice: product.selling_price || 0,
            }
          : item
      )
    );
    setProductModal(prev => ({ ...prev, isOpen: false }));
  };

  const clearDraft = () => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    if (draftKey) draftStorage.clear(draftKey);
    setHasDraft(false);
    setSelectedParty(null);
    setPartyQuery('');
    setIssueDate(formatLocalDate());
    setValidDays(7);
    setNotes('');
    setTerms('');
    setPaymentTerms('');
    setItems([
      {
        productId: '',
        description: '',
        partNumber: '',
        size: '',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
      },
    ]);
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    const validItems = items.filter(i => i.description.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      throw new Error('يرجى إضافة صنف واحد على الأقل مع تحديد الكمية');
    }
    if (!companyId || !userId) return;

    savingRef.current = true;
    setSaving(true);
    try {
      await salesQuotationsApi.createQuotation(companyId, userId, {
        branchId,
        partyId: selectedParty?.id || null,
        issueDate,
        validUntil,
        items: validItems,
        notes: notes || undefined,
        termsAndConditions: terms || undefined,
        paymentTerms: paymentTerms || undefined,
      });
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (draftKey) draftStorage.clear(draftKey);
      setHasDraft(false);
      onSuccess();
    } catch (err) {
      logger.error('useQuotationForm', 'Failed to create quotation:', err);
      throw err;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return {
    saving,
    selectedParty,
    setSelectedParty,
    partyQuery,
    setPartyQuery,
    isPartyDropdownOpen,
    setIsPartyDropdownOpen,
    issueDate,
    setIssueDate,
    validDays,
    setValidDays,
    notes,
    setNotes,
    terms,
    setTerms,
    paymentTerms,
    setPaymentTerms,
    items,
    productModal,
    setProductModal,
    validUntil,
    totals,
    updateItem,
    addItem,
    removeItem,
    handleOpenProductSearch,
    handleProductSelect,
    handleSave,
    hasDraft,
    clearDraft,
  };
};
