import React, { useMemo, useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Loader2,
  Calendar,
  Building2,
  DollarSign,
  Truck,
  Search,
  Check,
  X,
} from 'lucide-react';
import Modal from '../../../../ui/base/Modal';
import { purchaseQuotationsApi } from '../../api/quotationsApi';
import { useAuthStore } from '../../../auth/store';
import { useParties } from '../../../parties/hooks';
import { formatCurrency, formatLocalDate } from '../../../../core/utils';
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
interface ProductModalState {
  isOpen: boolean;
  rowIndex: number;
  query: string;
}

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

const SupplierSection = ({
  selectedParty,
  partyQuery,
  isOpen,
  suppliers,
  loading,
  onQueryChange,
  onOpenChange,
  onSelect,
  onClear,
  issueDate,
  deliveryTerms,
  onIssueDateChange,
  onDeliveryTermsChange,
}: SupplierSectionProps): React.ReactElement => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <div className="space-y-1.5">
      <label
        htmlFor="quotation-supplier"
        className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400"
      >
        <Building2 size={12} /> المورد
      </label>
      <div className="relative">
        {selectedParty !== null ? (
          <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 p-2.5 dark:border-violet-800 dark:bg-violet-900/20">
            <div className="flex items-center gap-2 overflow-hidden">
              <Building2 size={14} className="text-violet-600" />
              <span className="truncate text-sm font-bold text-gray-800 dark:text-slate-100">
                {selectedParty.name}
              </span>
            </div>
            <button
              type="button"
              aria-label="إزالة المورد"
              onClick={onClear}
              className="rounded p-1 text-gray-400 transition-all hover:bg-white hover:text-rose-500 dark:hover:bg-slate-800"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <input
              id="quotation-supplier"
              type="text"
              value={partyQuery}
              onChange={event => {
                onQueryChange(event.target.value);
                onOpenChange(true);
              }}
              onFocus={() => {
                onOpenChange(true);
              }}
              placeholder="بحث عن مورد..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            {isOpen && partyQuery.trim() !== '' && (
              <div className="custom-scrollbar absolute z-50 mt-1 max-h-48 w-full overflow-hidden overflow-y-auto rounded-xl border border-violet-500 bg-[var(--app-surface)] shadow-2xl">
                {loading ? (
                  <div className="animate-pulse p-3 text-center text-xs text-gray-400">
                    جاري التحميل...
                  </div>
                ) : suppliers.length > 0 ? (
                  <ul className="divide-y dark:divide-slate-800">
                    {suppliers.map(supplier => (
                      <li key={supplier.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(supplier);
                            onOpenChange(false);
                            onQueryChange('');
                          }}
                          className="group flex w-full cursor-pointer items-center justify-between px-3 py-2 text-right transition-colors hover:bg-violet-600 hover:text-white"
                        >
                          <span className="flex flex-col">
                            <span className="text-xs font-bold">{supplier.name}</span>
                            <span className="text-[10px] opacity-60">{supplier.phone ?? ''}</span>
                          </span>
                          <Check
                            size={12}
                            className="opacity-0 group-hover:opacity-100 max-md:opacity-100"
                          />
                        </button>
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
      <label
        htmlFor="quotation-issue-date"
        className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400"
      >
        <Calendar size={12} /> تاريخ العرض
      </label>
      <input
        id="quotation-issue-date"
        type="date"
        value={issueDate}
        onChange={event => {
          onIssueDateChange(event.target.value);
        }}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800"
      />
    </div>
    <div className="space-y-1.5">
      <label
        htmlFor="quotation-delivery-terms"
        className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400"
      >
        <Truck size={12} /> شروط التسليم
      </label>
      <input
        id="quotation-delivery-terms"
        type="text"
        value={deliveryTerms}
        onChange={event => {
          onDeliveryTermsChange(event.target.value);
        }}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800"
      />
    </div>
  </div>
);

interface ItemTableProps {
  items: ItemRow[];
  productModal: ProductModalState;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof ItemRow, value: string | number) => void;
  onSearch: (index: number, query?: string) => void;
}

const ItemRowView = ({
  item,
  index,
  itemCount,
  onRemove,
  onUpdate,
  onSearch,
}: {
  item: ItemRow;
  index: number;
  itemCount: number;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof ItemRow, value: string | number) => void;
  onSearch: (index: number, query?: string) => void;
}): React.ReactElement => {
  const lineTotal = item.quantity * item.unitPrice;
  return (
    <tr className="border-b border-gray-50 dark:border-slate-800/50">
      <td className="px-3 py-2 text-xs text-gray-400">{String(index + 1)}</td>
      <td className="px-3 py-2">
        <div className="group/search relative">
          <input
            id={`quotation-description-${String(index)}`}
            aria-label={`وصف البند ${String(index + 1)}`}
            type="text"
            value={item.description}
            onChange={event => {
              onUpdate(index, 'description', event.target.value);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === 'F2') {
                event.preventDefault();
                onSearch(index, item.description);
              }
            }}
            className="w-full border-0 bg-transparent pr-1 text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-white"
          />
          <button
            type="button"
            aria-label="البحث عن منتج"
            onClick={() => {
              onSearch(index, item.description);
            }}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-1 text-gray-400 opacity-0 transition-all hover:text-violet-500 group-hover/search:opacity-100 max-md:opacity-100"
          >
            <Search size={14} />
          </button>
        </div>
      </td>
      <td className="px-3 py-2">
        <input
          aria-label={`كمية البند ${String(index + 1)}`}
          type="number"
          step="any"
          min={0}
          value={item.quantity}
          onChange={event => {
            onUpdate(index, 'quantity', Number(event.target.value));
          }}
          className="w-full border-0 bg-transparent text-center text-sm text-gray-900 outline-none dark:text-white"
        />
      </td>
      <td className="px-3 py-2">
        <input
          aria-label={`سعر البند ${String(index + 1)}`}
          type="number"
          min={0}
          step="any"
          value={item.unitPrice}
          onChange={event => {
            onUpdate(index, 'unitPrice', Number(event.target.value));
          }}
          className="w-full border-0 bg-transparent text-center font-mono text-sm text-gray-900 outline-none dark:text-white"
        />
      </td>
      <td
        className="px-3 py-2 text-center font-mono text-sm font-bold text-gray-900 dark:text-white"
        dir="ltr"
      >
        {formatCurrency(lineTotal)}
      </td>
      <td className="px-1 py-2">
        <button
          type="button"
          aria-label={`حذف البند ${String(index + 1)}`}
          onClick={() => {
            onRemove(index);
          }}
          className="p-1 text-gray-400 transition-colors hover:text-rose-500"
          disabled={itemCount <= 1}
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
};

const ItemTable = ({
  items,
  onAdd,
  onRemove,
  onUpdate,
  onSearch,
}: ItemTableProps): React.ReactElement => (
  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-[var(--app-surface)] dark:border-slate-800">
    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">بنود العرض</h3>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-50 dark:hover:bg-violet-900/20"
      >
        <Plus size={12} /> إضافة بند
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-slate-800">
            <th className="w-8 px-3 py-2 text-right text-xs font-medium text-gray-500">#</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">الوصف</th>
            <th className="w-20 px-3 py-2 text-right text-xs font-medium text-gray-500">الكمية</th>
            <th className="w-28 px-3 py-2 text-right text-xs font-medium text-gray-500">
              سعر الوحدة
            </th>
            <th className="w-28 px-3 py-2 text-right text-xs font-medium text-gray-500">
              الإجمالي
            </th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <ItemRowView
              key={`${item.productId}-${String(index)}`}
              item={item}
              index={index}
              itemCount={items.length}
              onRemove={onRemove}
              onUpdate={onUpdate}
              onSearch={onSearch}
            />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const TermsSection = ({
  paymentTerms,
  notes,
  onPaymentTermsChange,
  onNotesChange,
}: {
  paymentTerms: string;
  notes: string;
  onPaymentTermsChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}): React.ReactElement => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <div className="space-y-1.5">
      <label
        htmlFor="quotation-payment-terms"
        className="text-xs font-bold text-gray-600 dark:text-gray-400"
      >
        شروط الدفع
      </label>
      <input
        id="quotation-payment-terms"
        type="text"
        value={paymentTerms}
        onChange={event => {
          onPaymentTermsChange(event.target.value);
        }}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800"
      />
    </div>
    <div className="space-y-1.5">
      <label
        htmlFor="quotation-notes"
        className="text-xs font-bold text-gray-600 dark:text-gray-400"
      >
        ملاحظات
      </label>
      <input
        id="quotation-notes"
        type="text"
        value={notes}
        onChange={event => {
          onNotesChange(event.target.value);
        }}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800"
      />
    </div>
  </div>
);

const Totals = ({ total }: { total: number }): React.ReactElement => (
  <div className="flex items-center justify-between border-t border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50 p-4 dark:border-violet-800/30 dark:from-violet-900/20 dark:to-purple-900/20">
    <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
      <DollarSign size={18} />
      <span className="text-sm font-bold">إجمالي عرض المورد</span>
    </div>
    <span className="font-mono text-2xl font-bold text-violet-700 dark:text-violet-300" dir="ltr">
      {formatCurrency(total)}
    </span>
  </div>
);

const CreatePurchaseQuotationModal: React.FC<Props> = ({ onClose, onSuccess, rfqGroupId }) => {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [selectedParty, setSelectedParty] = useState<SupplierOption | null>(null);
  const [partyQuery, setPartyQuery] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const { data: filteredSuppliers, isLoading: suppliersLoading } = useParties(
    'supplier',
    partyQuery
  );
  const [issueDate, setIssueDate] = useState(() => formatLocalDate());
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0 },
  ]);
  const [productModal, setProductModal] = useState<ProductModalState>({
    isOpen: false,
    rowIndex: 0,
    query: '',
  });
  const totals = useMemo(
    () => ({
      total: items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice * (1 - item.discountPercent / 100),
        0
      ),
    }),
    [items]
  );
  const updateItem = (index: number, field: keyof ItemRow, value: string | number): void => {
    setItems(previous =>
      previous.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  };
  const addItem = (): void => {
    setItems(previous => [
      ...previous,
      { productId: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0 },
    ]);
  };
  const removeItem = (index: number): void => {
    if (items.length <= 1) return;
    setItems(previous => previous.filter((_, itemIndex) => itemIndex !== index));
  };
  const openProductSearch = (index: number, query = ''): void => {
    setProductModal({ isOpen: true, rowIndex: index, query });
  };
  const selectProduct = (product: Product): void => {
    setItems(previous =>
      previous.map((item, index) =>
        index === productModal.rowIndex
          ? {
              ...item,
              productId: product.id,
              description: product.name,
              unitPrice: product.cost_price,
            }
          : item
      )
    );
    setProductModal(previous => ({ ...previous, isOpen: false }));
  };
  const handleSave = async (): Promise<void> => {
    const validItems = items.filter(item => item.description.trim() !== '' && item.quantity > 0);
    if (validItems.length === 0 || user?.company_id === undefined) return;
    setSaving(true);
    try {
      await purchaseQuotationsApi.createQuotation(user.company_id, user.id, {
        partyId: selectedParty?.id ?? null,
        issueDate,
        items: validItems,
        notes: notes.trim() !== '' ? notes : undefined,
        deliveryTerms: deliveryTerms.trim() !== '' ? deliveryTerms : undefined,
        paymentTerms: paymentTerms.trim() !== '' ? paymentTerms : undefined,
        rfqGroupId,
      });
      onSuccess();
    } catch (error) {
      logger.error('CreatePurchaseQuotationModal', 'Failed to create purchase quotation:', error);
    } finally {
      setSaving(false);
    }
  };
  const hasValidItem = items.some(item => item.description.trim() !== '');
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      icon={FileText}
      title="تسجيل عرض سعر مورد"
      description={
        rfqGroupId !== undefined && rfqGroupId !== ''
          ? 'إضافة رد مورد لطلب عرض سعر قائم'
          : 'تسجيل عرض سعر جديد من مورد'
      }
      size="xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={saving || !hasValidItem}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} حفظ عرض
            المورد
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <SupplierSection
          selectedParty={selectedParty}
          partyQuery={partyQuery}
          isOpen={isPartyDropdownOpen}
          suppliers={filteredSuppliers}
          loading={suppliersLoading}
          onQueryChange={setPartyQuery}
          onOpenChange={setIsPartyDropdownOpen}
          onSelect={setSelectedParty}
          onClear={() => {
            setSelectedParty(null);
          }}
          issueDate={issueDate}
          deliveryTerms={deliveryTerms}
          onIssueDateChange={setIssueDate}
          onDeliveryTermsChange={setDeliveryTerms}
        />
        <ItemTable
          items={items}
          productModal={productModal}
          onAdd={addItem}
          onRemove={removeItem}
          onUpdate={updateItem}
          onSearch={openProductSearch}
        />
        <Totals total={totals.total} />
        <TermsSection
          paymentTerms={paymentTerms}
          notes={notes}
          onPaymentTermsChange={setPaymentTerms}
          onNotesChange={setNotes}
        />
      </div>
      <ProductSelectionModal
        isOpen={productModal.isOpen}
        onClose={() => {
          setProductModal(previous => ({ ...previous, isOpen: false }));
        }}
        onSelect={selectProduct}
        initialQuery={productModal.query}
        mode="purchase"
      />
    </Modal>
  );
};

export default CreatePurchaseQuotationModal;
