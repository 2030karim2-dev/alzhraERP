import { useState, useMemo } from 'react';
import { Product } from '@/features/inventory/types';
import { salesQuotationsApi } from '@/features/sales/api';
import { useBranchFilter } from '@/features/branches/hooks/useBranchFilter';

export interface ItemRow {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export const useQuotationForm = (companyId: string | undefined, userId: string | undefined, onSuccess: () => void) => {
  const [saving, setSaving] = useState(false);
  const [selectedParty, setSelectedParty] = useState<{ id: string; name: string; phone?: string } | null>(null);
  const [partyQuery, setPartyQuery] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const { branchId } = useBranchFilter();
  
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [validDays, setValidDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0 },
  ]);

  const [productModal, setProductModal] = useState<{ isOpen: boolean; rowIndex: number; query: string }>({
    isOpen: false,
    rowIndex: 0,
    query: '',
  });

  const validUntil = useMemo(() => {
    const d = new Date(issueDate);
    d.setDate(d.getDate() + validDays);
    return d.toISOString().split('T')[0];
  }, [issueDate, validDays]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice * (1 - item.discountPercent / 100));
    }, 0);
    return { subtotal, total: subtotal };
  }, [items]);

  const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, { productId: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenProductSearch = (index: number, query: string = '') => {
    setProductModal({ isOpen: true, rowIndex: index, query });
  };

  const handleProductSelect = (product: Product) => {
    setItems(prev => prev.map((item, i) => i === productModal.rowIndex ? {
      ...item,
      productId: product.id,
      description: product.name,
      unitPrice: product.selling_price || 0,
    } : item));
    setProductModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSave = async () => {
    const validItems = items.filter(i => i.description.trim() && i.quantity > 0);
    if (validItems.length === 0) return;
    if (!companyId || !userId) return;

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
      onSuccess();
    } catch (err) {
      console.error('Failed to create quotation:', err);
      throw err;
    } finally {
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
    handleSave
  };
};
