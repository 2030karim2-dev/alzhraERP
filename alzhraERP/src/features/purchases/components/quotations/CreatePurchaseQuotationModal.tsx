import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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
  RotateCcw,
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
import { draftStorage } from '../../../../core/utils/draftStorage';
import { useFeedbackStore } from '../../../feedback/store';
import { parseError } from '../../../../core/utils/errorUtils';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  rfqGroupId?: string;
}

interface ItemRow {
  productId: string;
  description: string;
  partNumber?: string;
  size?: string;
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
  currencyCode: string;
  deliveryTerms: string;
  onIssueDateChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
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
  currencyCode,
  deliveryTerms,
  onIssueDateChange,
  onCurrencyChange,
  onDeliveryTermsChange,
}: SupplierSectionProps): React.ReactElement => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              onBlur={() => {
                setTimeout(() => onOpenChange(false), 150);
              }}
              placeholder="بحث عن مورد..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            {isOpen && (
              <div
                onMouseDown={event => {
                  event.preventDefault();
                }}
                className="custom-scrollbar absolute z-50 mt-1 max-h-52 w-full overflow-hidden overflow-y-auto rounded-xl border border-violet-500 bg-[var(--app-surface)] shadow-2xl"
              >
                {loading ? (
                  <div className="animate-pulse p-3 text-center text-xs text-gray-400">
                    جاري التحميل...
                  </div>
                ) : suppliers.length > 0 ? (
                  <>
                    {partyQuery.trim() === '' && (
                      <div className="border-b border-gray-100 bg-violet-50/60 px-3 py-1.5 text-[11px] text-violet-500 dark:border-slate-700 dark:bg-violet-900/20">
                        اكتب للتصفية أو اختر من القائمة
                      </div>
                    )}
                    <ul className="divide-y dark:divide-slate-800">
                      {suppliers.slice(0, 50).map(supplier => (
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
                  </>
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
        htmlFor="quotation-currency"
        className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400"
      >
        <DollarSign size={12} /> العملة
      </label>
      <select
        id="quotation-currency"
        value={currencyCode}
        onChange={event => {
          onCurrencyChange(event.target.value);
        }}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800"
      >
        <option value="SAR">ريال سعودي (SAR)</option>
        <option value="YER">ريال يمني (YER)</option>
        <option value="USD">دولار أمريكي (USD)</option>
        <option value="CNY">يوان صيني (CNY)</option>
        <option value="OMR">ريال عماني (OMR)</option>
      </select>
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
  currencyCode: string;
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
  currencyCode,
  onRemove,
  onUpdate,
  onSearch,
}: {
  item: ItemRow;
  index: number;
  itemCount: number;
  currencyCode: string;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof ItemRow, value: string | number) => void;
  onSearch: (index: number, query?: string) => void;
}): React.ReactElement => {
  const lineTotal = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
  return (
    <tr className="group border-b border-gray-100 transition-colors hover:bg-violet-50/30 dark:border-slate-700/60 dark:hover:bg-violet-900/10">
      <td className="border-l border-gray-100 px-2 py-1.5 text-center text-xs font-bold text-gray-400 dark:border-slate-700/60">
        {String(index + 1)}
      </td>
      <td className="border-l border-gray-100 px-2 py-1.5 dark:border-slate-700/60">
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
            placeholder="اسم الصنف..."
            className="w-full border-0 bg-transparent pr-1 text-sm font-medium text-gray-900 placeholder-gray-300 outline-none focus:placeholder-transparent dark:text-white"
          />
          <button
            type="button"
            aria-label="البحث عن منتج"
            onClick={() => {
              onSearch(index, item.description);
            }}
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-300 opacity-0 transition-all hover:bg-violet-100 hover:text-violet-600 group-hover/search:opacity-100 dark:hover:bg-violet-900/30 max-md:opacity-100"
          >
            <Search size={13} />
          </button>
        </div>
      </td>
      <td className="border-l border-gray-100 px-2 py-1.5 dark:border-slate-700/60">
        <input
          aria-label={`رقم القطعة ${String(index + 1)}`}
          type="text"
          placeholder="—"
          value={item.partNumber ?? ''}
          onChange={event => {
            onUpdate(index, 'partNumber', event.target.value);
          }}
          className="w-full border-0 bg-transparent text-center font-mono text-xs text-gray-700 placeholder-gray-300 outline-none dark:text-gray-300"
        />
      </td>
      <td className="border-l border-gray-100 px-2 py-1.5 dark:border-slate-700/60">
        <input
          aria-label={`قياس/مقاس البند ${String(index + 1)}`}
          type="text"
          placeholder="—"
          value={item.size ?? ''}
          onChange={event => {
            onUpdate(index, 'size', event.target.value);
          }}
          className="w-full border-0 bg-transparent text-center font-mono text-xs text-gray-700 placeholder-gray-300 outline-none dark:text-gray-300"
        />
      </td>
      <td className="border-l border-gray-100 px-2 py-1.5 dark:border-slate-700/60">
        <input
          aria-label={`كمية البند ${String(index + 1)}`}
          type="number"
          step="any"
          min={0}
          value={item.quantity || ''}
          onChange={event => {
            onUpdate(index, 'quantity', Number(event.target.value));
          }}
          placeholder="0"
          className="w-full border-0 bg-transparent text-center font-mono text-sm font-bold text-gray-900 placeholder-gray-300 outline-none dark:text-white"
        />
      </td>
      <td className="border-l border-gray-100 px-2 py-1.5 dark:border-slate-700/60">
        <input
          aria-label={`سعر البند ${String(index + 1)}`}
          type="number"
          min={0}
          step="any"
          value={item.unitPrice || ''}
          onChange={event => {
            onUpdate(index, 'unitPrice', Number(event.target.value));
          }}
          placeholder="0.00"
          className="w-full border-0 bg-transparent text-center font-mono text-sm font-bold text-emerald-600 placeholder-gray-300 outline-none dark:text-emerald-400"
        />
      </td>
      <td className="border-l border-gray-100 px-2 py-1.5 dark:border-slate-700/60">
        <input
          aria-label={`خصم البند ${String(index + 1)}`}
          type="number"
          min={0}
          max={100}
          step="any"
          value={item.discountPercent || ''}
          onChange={event => {
            const raw = Number(event.target.value);
            onUpdate(index, 'discountPercent', Math.min(100, Math.max(0, raw || 0)));
          }}
          placeholder="0"
          className="w-full border-0 bg-transparent text-center font-mono text-sm font-bold text-rose-500 placeholder-gray-300 outline-none"
        />
      </td>
      <td
        className="border-l border-gray-100 bg-gray-50/60 px-2 py-1.5 text-center font-mono text-sm font-bold text-gray-800 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-gray-200"
        dir="ltr"
      >
        {lineTotal > 0 ? (
          formatCurrency(lineTotal, currencyCode)
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-1 py-1.5">
        <button
          type="button"
          aria-label={`حذف البند ${String(index + 1)}`}
          onClick={() => {
            onRemove(index);
          }}
          className="rounded p-1 text-gray-300 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 dark:hover:bg-rose-900/20"
          disabled={itemCount <= 1}
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
};

const ItemTable = ({
  items,
  currencyCode,
  onAdd,
  onRemove,
  onUpdate,
  onSearch,
}: ItemTableProps): React.ReactElement => (
  <div className="overflow-hidden rounded-xl border border-gray-200 bg-[var(--app-surface)] shadow-sm dark:border-slate-700">
    {/* Table header bar */}
    <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-l from-violet-50 to-purple-50/60 px-3 py-2 dark:border-slate-700 dark:from-violet-900/20 dark:to-purple-900/10">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-violet-700 dark:text-violet-300">
        بنود العرض
        <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-600 dark:bg-violet-900/40">
          {items.length}
        </span>
      </h3>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-3 py-1 text-xs font-bold text-violet-600 shadow-sm transition-all hover:bg-violet-600 hover:text-white dark:border-violet-700 dark:bg-slate-800 dark:hover:bg-violet-600"
      >
        <Plus size={12} /> إضافة بند
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60">
            <th className="w-8 border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-500 dark:border-slate-700">
              #
            </th>
            <th className="border-l border-gray-200 px-2 py-2 text-right text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">
              اسم الصنف / الوصف
            </th>
            <th className="w-28 border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">
              رقم القطعة
            </th>
            <th className="w-20 border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">
              القياس
            </th>
            <th className="w-20 border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">
              الكمية
            </th>
            <th className="w-28 border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">
              سعر الوحدة
            </th>
            <th className="w-20 border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:text-gray-300">
              خصم %
            </th>
            <th className="w-32 border-l border-gray-200 bg-gray-100/80 px-2 py-2 text-center text-[11px] font-bold text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300">
              الإجمالي
            </th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
          {items.map((item, index) => (
            <ItemRowView
              key={`${item.productId}-${String(index)}`}
              item={item}
              index={index}
              itemCount={items.length}
              currencyCode={currencyCode}
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

const Totals = ({
  total,
  currencyCode,
}: {
  total: number;
  currencyCode: string;
}): React.ReactElement => (
  <div className="flex items-center justify-between border-t border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50 p-4 dark:border-violet-800/30 dark:from-violet-900/20 dark:to-purple-900/20">
    <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
      <DollarSign size={18} />
      <span className="text-sm font-bold">إجمالي عرض المورد</span>
    </div>
    <span className="font-mono text-2xl font-bold text-violet-700 dark:text-violet-300" dir="ltr">
      {formatCurrency(total, currencyCode)}
    </span>
  </div>
);

interface PurchaseDraft {
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

const isPurchaseDraftDirty = (
  items: ItemRow[],
  party: SupplierOption | null,
  notes: string,
  deliveryTerms: string,
  paymentTerms: string
): boolean => {
  const hasItems = items.some(
    i => i.description.trim() !== '' || (i.productId && i.productId.trim() !== '')
  );
  return (
    hasItems ||
    party !== null ||
    notes.trim() !== '' ||
    deliveryTerms.trim() !== '' ||
    paymentTerms.trim() !== ''
  );
};

const CreatePurchaseQuotationModal: React.FC<Props> = ({ onClose, onSuccess, rfqGroupId }) => {
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const companyId = user?.company_id;
  const draftKey = companyId
    ? user?.id
      ? rfqGroupId && rfqGroupId !== ''
        ? `purchase_quotation:${companyId}:${user.id}:rfq:${rfqGroupId}`
        : `purchase_quotation:${companyId}:${user.id}:general`
      : `purchase_quotation:${companyId}`
    : null;

  // ─── Load saved draft on mount ─────────────────────────────────────────────
  const savedDraft = draftKey ? draftStorage.load<PurchaseDraft>(draftKey) : null;

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [hasDraft, setHasDraft] = useState(() => {
    if (!savedDraft) return false;
    return isPurchaseDraftDirty(
      savedDraft.items || [],
      savedDraft.partyId
        ? {
            id: savedDraft.partyId,
            name: savedDraft.partyName || '',
            phone: savedDraft.partyPhone ?? null,
          }
        : null,
      savedDraft.notes || '',
      savedDraft.deliveryTerms || '',
      savedDraft.paymentTerms || ''
    );
  });
  const [selectedParty, setSelectedParty] = useState<SupplierOption | null>(() => {
    if (savedDraft?.partyId && savedDraft.partyName) {
      return {
        id: savedDraft.partyId,
        name: savedDraft.partyName,
        phone: savedDraft.partyPhone ?? null,
      };
    }
    return null;
  });
  const [partyQuery, setPartyQuery] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const { data: filteredSuppliers, isLoading: suppliersLoading } = useParties(
    'supplier',
    partyQuery
  );
  const [issueDate, setIssueDate] = useState(() => savedDraft?.issueDate ?? formatLocalDate());
  const [currencyCode, setCurrencyCode] = useState<string>(() => savedDraft?.currencyCode ?? 'SAR');
  const [deliveryTerms, setDeliveryTerms] = useState(() => savedDraft?.deliveryTerms ?? '');
  const [paymentTerms, setPaymentTerms] = useState(() => savedDraft?.paymentTerms ?? '');
  const [notes, setNotes] = useState(() => savedDraft?.notes ?? '');
  const [items, setItems] = useState<ItemRow[]>(() => {
    if (savedDraft?.items && savedDraft.items.length > 0) return savedDraft.items;
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
              partNumber: (product as { part_number?: string }).part_number ?? '',
              size: product.size ?? '',
              unitPrice: product.purchase_price || product.cost_price || 0,
            }
          : item
      )
    );
    setProductModal(previous => ({ ...previous, isOpen: false }));
  };

  // ─── Auto-save draft on changes ───────────────────────────────────────────
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = useCallback(() => {
    if (!draftKey) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (!isPurchaseDraftDirty(items, selectedParty, notes, deliveryTerms, paymentTerms)) {
        draftStorage.clear(draftKey);
        return;
      }
      draftStorage.save(draftKey, {
        items,
        partyId: selectedParty?.id ?? null,
        partyName: selectedParty?.name ?? null,
        partyPhone: selectedParty?.phone ?? null,
        issueDate,
        currencyCode,
        deliveryTerms,
        paymentTerms,
        notes,
      });
    }, 800);
  }, [draftKey, items, selectedParty, issueDate, currencyCode, deliveryTerms, paymentTerms, notes]);

  useEffect(() => {
    scheduleSave();
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [scheduleSave]);

  const clearDraft = (): void => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    if (draftKey) draftStorage.clear(draftKey);
    setHasDraft(false);
    setSelectedParty(null);
    setPartyQuery('');
    setIssueDate(formatLocalDate());
    setCurrencyCode('SAR');
    setDeliveryTerms('');
    setPaymentTerms('');
    setNotes('');
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

  const handleSave = async (): Promise<void> => {
    if (savingRef.current) return;
    const validItems = items.filter(item => item.description.trim() !== '' && item.quantity > 0);
    if (validItems.length === 0) {
      showToast('يرجى إضافة صنف واحد على الأقل مع تحديد الكمية', 'warning');
      return;
    }
    if (user?.company_id === undefined) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await purchaseQuotationsApi.createQuotation(user.company_id, user.id, {
        partyId: selectedParty?.id ?? null,
        issueDate,
        currencyCode,
        items: validItems,
        notes: notes.trim() !== '' ? notes : undefined,
        deliveryTerms: deliveryTerms.trim() !== '' ? deliveryTerms : undefined,
        paymentTerms: paymentTerms.trim() !== '' ? paymentTerms : undefined,
        rfqGroupId,
      });
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (draftKey) draftStorage.clear(draftKey);
      setHasDraft(false);
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

  const hasValidItem = items.some(item => item.description.trim() !== '' && item.quantity > 0);
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
        {/* Draft restored banner */}
        {hasDraft && (
          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-700/50 dark:bg-amber-900/20">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <RotateCcw size={14} />
              <span className="text-xs font-bold">تم استعادة مسودة محفوظة سابقاً</span>
              <span className="text-[11px] opacity-70">— يمكنك الاستمرار من حيث توقفت</span>
            </div>
            <button
              type="button"
              onClick={clearDraft}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-amber-600 transition-colors hover:bg-amber-100 dark:hover:bg-amber-800/30"
            >
              <X size={12} /> تجاهل المسودة
            </button>
          </div>
        )}
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
          currencyCode={currencyCode}
          deliveryTerms={deliveryTerms}
          onIssueDateChange={setIssueDate}
          onCurrencyChange={setCurrencyCode}
          onDeliveryTermsChange={setDeliveryTerms}
        />
        <ItemTable
          items={items}
          currencyCode={currencyCode}
          productModal={productModal}
          onAdd={addItem}
          onRemove={removeItem}
          onUpdate={updateItem}
          onSearch={openProductSearch}
        />
        <Totals total={totals.total} currencyCode={currencyCode} />
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
