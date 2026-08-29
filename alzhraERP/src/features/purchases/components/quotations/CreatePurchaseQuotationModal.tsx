import React, { useMemo, useState } from 'react';
import { FileText, Plus, Trash2, Save, Loader2, Calendar, Building2, DollarSign, Truck, Search, Check, X } from 'lucide-react';
import Modal from '../../../../ui/base/Modal';
import { purchaseQuotationsApi } from '../../api/quotationsApi';
import { useAuthStore } from '../../../auth/store';
import { useParties } from '../../../parties/hooks';
import { formatCurrency } from '../../../../core/utils';
import ProductSelectionModal from '../../../sales/components/create/ProductSelectionModal';
import type { Product } from '../../../inventory/types';
import type { Party } from '../../../parties/types';
import { logger } from '../../../../core/utils/logger';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  rfqGroupId?: string;
}

interface ItemRow {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

interface SupplierOption {
  id: Party['id'];
  name: Party['name'];
  phone: Party['phone'];
}
interface ProductModalState { isOpen: boolean; rowIndex: number; query: string }

interface SupplierSectionProps {
  selectedParty: SupplierOption | null;
  partyQuery: string;
  isOpen: boolean;
  suppliers: SupplierOption[];
  loading: boolean;
  onQueryChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (supplier: SupplierOption) => void;
  onClear: () => void;
  issueDate: string;
  deliveryTerms: string;
  onIssueDateChange: (value: string) => void;
  onDeliveryTermsChange: (value: string) => void;
}

const SupplierSection = ({ selectedParty, partyQuery, isOpen, suppliers, loading, onQueryChange, onOpenChange, onSelect, onClear, issueDate, deliveryTerms, onIssueDateChange, onDeliveryTermsChange }: SupplierSectionProps): React.ReactElement => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="space-y-1.5">
      <label htmlFor="quotation-supplier" className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5"><Building2 size={12} /> المورد</label>
      <div className="relative">
        {selectedParty !== null ? (
          <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 p-2.5 rounded-xl">
            <div className="flex items-center gap-2 overflow-hidden"><Building2 size={14} className="text-violet-600" /><span className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{selectedParty.name}</span></div>
            <button type="button" aria-label="إزالة المورد" onClick={onClear} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded text-gray-400 hover:text-rose-500 transition-all"><X size={14} /></button>
          </div>
        ) : (
          <>
            <input id="quotation-supplier" type="text" value={partyQuery} onChange={(event) => { onQueryChange(event.target.value); onOpenChange(true); }} onFocus={() => { onOpenChange(true); }} placeholder="بحث عن مورد..." className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            {isOpen && partyQuery.trim() !== '' && (
              <div className="absolute z-50 w-full mt-1 bg-[var(--app-surface)] border border-violet-500 shadow-2xl rounded-xl overflow-hidden overflow-y-auto max-h-48 custom-scrollbar">
                {loading ? <div className="p-3 text-center text-xs text-gray-400 animate-pulse">جاري التحميل...</div> : suppliers.length > 0 ? <ul className="divide-y dark:divide-slate-800">{suppliers.map((supplier) => <li key={supplier.id}><button type="button" onClick={() => { onSelect(supplier); onOpenChange(false); onQueryChange(''); }} className="w-full text-right px-3 py-2 hover:bg-violet-600 hover:text-white cursor-pointer flex items-center justify-between group transition-colors"><span className="flex flex-col"><span className="text-xs font-bold">{supplier.name}</span><span className="text-[10px] opacity-60">{supplier.phone ?? ''}</span></span><Check size={12} className="opacity-0 group-hover:opacity-100 max-md:opacity-100" /></button></li>)}</ul> : <div className="p-3 text-center text-xs text-gray-400">لا توجد نتائج</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    <div className="space-y-1.5"><label htmlFor="quotation-issue-date" className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5"><Calendar size={12} /> تاريخ العرض</label><input id="quotation-issue-date" type="date" value={issueDate} onChange={(event) => { onIssueDateChange(event.target.value); }} className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
    <div className="space-y-1.5"><label htmlFor="quotation-delivery-terms" className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5"><Truck size={12} /> شروط التسليم</label><input id="quotation-delivery-terms" type="text" value={deliveryTerms} onChange={(event) => { onDeliveryTermsChange(event.target.value); }} className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
  </div>
);

interface ItemTableProps { items: ItemRow[]; productModal: ProductModalState; onAdd: () => void; onRemove: (index: number) => void; onUpdate: (index: number, field: keyof ItemRow, value: string | number) => void; onSearch: (index: number, query?: string) => void }

const ItemRowView = ({ item, index, itemCount, onRemove, onUpdate, onSearch }: { item: ItemRow; index: number; itemCount: number; onRemove: (index: number) => void; onUpdate: (index: number, field: keyof ItemRow, value: string | number) => void; onSearch: (index: number, query?: string) => void }): React.ReactElement => {
  const lineTotal = item.quantity * item.unitPrice;
  return <tr className="border-b border-gray-50 dark:border-slate-800/50"><td className="py-2 px-3 text-xs text-gray-400">{String(index + 1)}</td><td className="py-2 px-3"><div className="relative group/search"><input id={`quotation-description-${String(index)}`} aria-label={`وصف البند ${String(index + 1)}`} type="text" value={item.description} onChange={(event) => { onUpdate(index, 'description', event.target.value); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === 'F2') { event.preventDefault(); onSearch(index, item.description); } }} className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 pr-1" /><button type="button" aria-label="البحث عن منتج" onClick={() => { onSearch(index, item.description); }} className="absolute left-0 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-violet-500 opacity-0 group-hover/search:opacity-100 max-md:opacity-100 transition-all"><Search size={14} /></button></div></td><td className="py-2 px-3"><input aria-label={`كمية البند ${String(index + 1)}`} type="number" min={1} value={item.quantity} onChange={(event) => { onUpdate(index, 'quantity', Number(event.target.value)); }} className="w-full bg-transparent border-0 outline-none text-sm text-center text-gray-900 dark:text-white" /></td><td className="py-2 px-3"><input aria-label={`سعر البند ${String(index + 1)}`} type="number" min={0} step={0.01} value={item.unitPrice} onChange={(event) => { onUpdate(index, 'unitPrice', Number(event.target.value)); }} className="w-full bg-transparent border-0 outline-none text-sm text-center font-mono text-gray-900 dark:text-white" /></td><td className="py-2 px-3 font-mono text-sm font-bold text-gray-900 dark:text-white text-center" dir="ltr">{formatCurrency(lineTotal)}</td><td className="py-2 px-1"><button type="button" aria-label={`حذف البند ${String(index + 1)}`} onClick={() => { onRemove(index); }} className="p-1 text-gray-400 hover:text-rose-500 transition-colors" disabled={itemCount <= 1}><Trash2 size={14} /></button></td></tr>;
};

const ItemTable = ({ items, onAdd, onRemove, onUpdate, onSearch }: ItemTableProps): React.ReactElement => <div className="bg-[var(--app-surface)] rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden"><div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between"><h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">بنود العرض</h3><button type="button" onClick={onAdd} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"><Plus size={12} /> إضافة بند</button></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100 dark:border-slate-800"><th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-8">#</th><th className="text-right py-2 px-3 text-xs font-medium text-gray-500">الوصف</th><th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-20">الكمية</th><th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-28">سعر الوحدة</th><th className="text-right py-2 px-3 text-xs font-medium text-gray-500 w-28">الإجمالي</th><th className="w-10" /></tr></thead><tbody>{items.map((item, index) => <ItemRowView key={`${item.productId}-${String(index)}`} item={item} index={index} itemCount={items.length} onRemove={onRemove} onUpdate={onUpdate} onSearch={onSearch} />)}</tbody></table></div></div>;

const TermsSection = ({ paymentTerms, notes, onPaymentTermsChange, onNotesChange }: { paymentTerms: string; notes: string; onPaymentTermsChange: (value: string) => void; onNotesChange: (value: string) => void }): React.ReactElement => <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1.5"><label htmlFor="quotation-payment-terms" className="text-xs font-bold text-gray-600 dark:text-gray-400">شروط الدفع</label><input id="quotation-payment-terms" type="text" value={paymentTerms} onChange={(event) => { onPaymentTermsChange(event.target.value); }} className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div><div className="space-y-1.5"><label htmlFor="quotation-notes" className="text-xs font-bold text-gray-600 dark:text-gray-400">ملاحظات</label><input id="quotation-notes" type="text" value={notes} onChange={(event) => { onNotesChange(event.target.value); }} className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div></div>;

const Totals = ({ total }: { total: number }): React.ReactElement => <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-t border-violet-100 dark:border-violet-800/30 flex items-center justify-between"><div className="flex items-center gap-2 text-violet-600 dark:text-violet-400"><DollarSign size={18} /><span className="text-sm font-bold">إجمالي عرض المورد</span></div><span className="text-2xl font-bold font-mono text-violet-700 dark:text-violet-300" dir="ltr">{formatCurrency(total)}</span></div>;

const CreatePurchaseQuotationModal: React.FC<Props> = ({ onClose, onSuccess, rfqGroupId }) => {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [selectedParty, setSelectedParty] = useState<SupplierOption | null>(null);
  const [partyQuery, setPartyQuery] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const { data: filteredSuppliers, isLoading: suppliersLoading } = useParties('supplier', partyQuery);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ productId: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0 }]);
  const [productModal, setProductModal] = useState<ProductModalState>({ isOpen: false, rowIndex: 0, query: '' });
  const totals = useMemo(() => ({ total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (1 - item.discountPercent / 100), 0) }), [items]);
  const updateItem = (index: number, field: keyof ItemRow, value: string | number): void => { setItems((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)); };
  const addItem = (): void => { setItems((previous) => [...previous, { productId: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0 }]); };
  const removeItem = (index: number): void => { if (items.length <= 1) return; setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index)); };
  const openProductSearch = (index: number, query = ''): void => { setProductModal({ isOpen: true, rowIndex: index, query }); };
  const selectProduct = (product: Product): void => { setItems((previous) => previous.map((item, index) => index === productModal.rowIndex ? { ...item, productId: product.id, description: product.name, unitPrice: product.cost_price } : item)); setProductModal((previous) => ({ ...previous, isOpen: false })); };
  const handleSave = async (): Promise<void> => {
    const validItems = items.filter((item) => item.description.trim() !== '' && item.quantity > 0);
    if (validItems.length === 0 || user?.company_id === undefined) return;
    setSaving(true);
    try {
      await purchaseQuotationsApi.createQuotation(user.company_id, user.id, { partyId: selectedParty?.id ?? null, issueDate, items: validItems, notes: notes.trim() !== '' ? notes : undefined, deliveryTerms: deliveryTerms.trim() !== '' ? deliveryTerms : undefined, paymentTerms: paymentTerms.trim() !== '' ? paymentTerms : undefined, rfqGroupId });
      onSuccess();
    } catch (error) { logger.error("CreatePurchaseQuotationModal", 'Failed to create purchase quotation:', error); } finally { setSaving(false); }
  };
  const hasValidItem = items.some((item) => item.description.trim() !== '');
  return <Modal isOpen={true} onClose={onClose} icon={FileText} title="تسجيل عرض سعر مورد" description={rfqGroupId !== undefined && rfqGroupId !== '' ? 'إضافة رد مورد لطلب عرض سعر قائم' : 'تسجيل عرض سعر جديد من مورد'} size="xl" footer={<><button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">إلغاء</button><button type="button" onClick={() => { void handleSave(); }} disabled={saving || !hasValidItem} className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} حفظ عرض المورد</button></>}><div className="space-y-6"><SupplierSection selectedParty={selectedParty} partyQuery={partyQuery} isOpen={isPartyDropdownOpen} suppliers={filteredSuppliers} loading={suppliersLoading} onQueryChange={setPartyQuery} onOpenChange={setIsPartyDropdownOpen} onSelect={setSelectedParty} onClear={() => { setSelectedParty(null); }} issueDate={issueDate} deliveryTerms={deliveryTerms} onIssueDateChange={setIssueDate} onDeliveryTermsChange={setDeliveryTerms} /><ItemTable items={items} productModal={productModal} onAdd={addItem} onRemove={removeItem} onUpdate={updateItem} onSearch={openProductSearch} /><Totals total={totals.total} /><TermsSection paymentTerms={paymentTerms} notes={notes} onPaymentTermsChange={setPaymentTerms} onNotesChange={setNotes} /></div><ProductSelectionModal isOpen={productModal.isOpen} onClose={() => { setProductModal((previous) => ({ ...previous, isOpen: false })); }} onSelect={selectProduct} initialQuery={productModal.query} mode="purchase" /></Modal>;
};

export default CreatePurchaseQuotationModal;
