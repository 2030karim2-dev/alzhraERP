import React, { useState, useMemo } from 'react';
import { FileText, Plus, Trash2, Save, Loader2, Calendar, Building2, DollarSign, Truck, Search, Check, X } from 'lucide-react';
import Modal from '../../../../ui/base/Modal';
import { purchaseQuotationsApi } from '../../api/quotationsApi';
import { useAuthStore } from '../../../auth/store';
import { useParties } from '../../../parties/hooks';
import { formatCurrency } from '../../../../core/utils';
import ProductSelectionModal from '../../../sales/components/create/ProductSelectionModal';
import { Product } from '../../../inventory/types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  rfqGroupId?: string;  // If adding to existing RFQ group
}

interface ItemRow {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

const CreatePurchaseQuotationModal: React.FC<Props> = ({ onClose, onSuccess, rfqGroupId }) => {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedParty, setSelectedParty] = useState<{ id: string; name: string; phone?: string } | null>(null);
  const [partyQuery, setPartyQuery] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const { data: filteredSuppliers, isLoading: suppliersLoading } = useParties('supplier', partyQuery);

  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0 },
  ]);

  // Product Search State
  const [productModal, setProductModal] = useState<{ isOpen: boolean; rowIndex: number; query: string }>({
    isOpen: false,
    rowIndex: 0,
    query: '',
  });

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
      unitPrice: product.cost_price || 0,
    } : item));
    setProductModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSave = async () => {
    const validItems = items.filter(i => i.description.trim() && i.quantity > 0);
    if (validItems.length === 0 || !user?.company_id) return;

    setSaving(true);
    try {
      await purchaseQuotationsApi.createQuotation(user.company_id, user.id, {
        partyId: selectedParty?.id || null,
        issueDate,
        items: validItems,
        notes: notes || undefined,
        deliveryTerms: deliveryTerms || undefined,
        paymentTerms: paymentTerms || undefined,
        rfqGroupId: rfqGroupId,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to create purchase quotation:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      icon={FileText}
      title="تسجيل عرض سعر مورد"
      description={rfqGroupId ? 'إضافة رد مورد لطلب عرض سعر قائم' : 'تسجيل عرض سعر جديد من مورد'}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving || items.every(i => !i.description.trim())}
            className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ عرض المورد
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Supplier & Date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <Building2 size={12} /> المورد
            </label>
            <div className="relative">
              {selectedParty ? (
                <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Building2 size={14} className="text-violet-600" />
                    <span className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{selectedParty.name}</span>
                  </div>
                  <button onClick={() => setSelectedParty(null)} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-gray-400 hover:text-rose-500 transition-all">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={partyQuery}
                    onChange={(e) => { setPartyQuery(e.target.value); setIsPartyDropdownOpen(true); }}
                    onFocus={() => setIsPartyDropdownOpen(true)}
                    placeholder="بحث عن مورد..."
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  
                  {isPartyDropdownOpen && partyQuery.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-violet-500 shadow-2xl rounded-xl overflow-hidden overflow-y-auto max-h-48 custom-scrollbar">
                      {suppliersLoading ? (
                        <div className="p-3 text-center text-xs text-gray-400 animate-pulse">جاري التحميل...</div>
                      ) : filteredSuppliers && filteredSuppliers.length > 0 ? (
                        <ul className="divide-y dark:divide-slate-800">
                          {filteredSuppliers.map((s: any) => (
                            <li
                              key={s.id}
                              onClick={() => { setSelectedParty(s); setIsPartyDropdownOpen(false); setPartyQuery(''); }}
                              className="px-3 py-2 hover:bg-violet-600 hover:text-white cursor-pointer flex items-center justify-between group transition-colors"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">{s.name}</span>
                                <span className="text-[10px] opacity-60">{s.phone}</span>
                              </div>
                              <Check size={12} className="opacity-0 group-hover:opacity-100" />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-3 text-center text-xs text-gray-400">لا توجد نتائج</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <Calendar size={12} /> تاريخ العرض
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <Truck size={12} /> شروط التسليم
            </label>
            <input
              type="text"
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
              placeholder="مثال: 5 أيام عمل"
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">بنود العرض</h3>
            <button
              onClick={addItem}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
            >
              <Plus size={12} /> إضافة بند
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800">
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-8">#</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">الوصف</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-20">الكمية</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-28">سعر الوحدة</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-28">الإجمالي</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const lineTotal = item.quantity * item.unitPrice;
                  return (
                    <tr key={idx} className="border-b border-gray-50 dark:border-slate-800/50">
                      <td className="py-2 px-3 text-xs text-gray-400">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <div className="relative group/search">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(idx, 'description', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'F2') {
                                e.preventDefault();
                                handleOpenProductSearch(idx, item.description);
                              }
                            }}
                            placeholder="وصف البند... (Enter للبحث)"
                            className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 pr-1"
                          />
                          <button 
                            onClick={() => handleOpenProductSearch(idx, item.description)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-violet-500 opacity-0 group-hover/search:opacity-100 transition-all"
                          >
                            <Search size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                          className="w-full bg-transparent border-0 outline-none text-sm text-center text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full bg-transparent border-0 outline-none text-sm text-center font-mono text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono text-sm font-bold text-gray-900 dark:text-white text-center" dir="ltr">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td className="py-2 px-1">
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
                          disabled={items.length <= 1}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-t border-violet-100 dark:border-violet-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                <DollarSign size={18} />
                <span className="text-sm font-bold">إجمالي عرض المورد</span>
              </div>
              <span className="text-2xl font-bold font-mono text-violet-700 dark:text-violet-300" dir="ltr">
                {formatCurrency(totals.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Terms & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">شروط الدفع</label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="مثال: آجل 30 يوم"
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">ملاحظات</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات..."
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
      </div>

      <ProductSelectionModal 
        isOpen={productModal.isOpen}
        onClose={() => setProductModal(prev => ({ ...prev, isOpen: false }))}
        onSelect={handleProductSelect}
        initialQuery={productModal.query}
        mode="purchase"
      />
    </Modal>
  );
};

export default CreatePurchaseQuotationModal;
