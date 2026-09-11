import React from 'react';
import {
  FileText,
  Save,
  Loader2,
  Calendar,
  User,
  Search,
  Check,
  X,
  RotateCcw,
  DollarSign,
} from 'lucide-react';
import Modal from '@/ui/base/Modal';
import { useAuthStore } from '@/features/auth/store';
import { useParties } from '@/features/parties/hooks';
import ProductSelectionModal from '../create/ProductSelectionModal';
import { useQuotationForm } from '../../hooks/useQuotationForm';
import QuotationItemsTable from './QuotationItemsTable';
import QuotationTotals from './QuotationTotals';
import { useFeedbackStore } from '@/features/feedback/store';
import { parseError } from '@/core/utils/errorUtils';
import type { Party } from '@/features/parties/types';

import type { ItemRow } from '../../hooks/useQuotationForm';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialItems?: ItemRow[];
  initialNotes?: string;
}

const CreateQuotationModal: React.FC<Props> = ({
  onClose,
  onSuccess,
  initialItems,
  initialNotes,
}) => {
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const {
    saving,
    selectedParty,
    setSelectedParty,
    partyQuery,
    setPartyQuery,
    isPartyDropdownOpen,
    setIsPartyDropdownOpen,
    issueDate,
    setIssueDate,
    currencyCode,
    setCurrencyCode,
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
  } = useQuotationForm(user?.company_id, user?.id, onSuccess, {
    items: initialItems,
    notes: initialNotes,
  });

  const { data: filteredCustomers, isLoading: customersLoading } = useParties(
    'customer',
    partyQuery
  );

  const onSubmit = async () => {
    try {
      await handleSave();
    } catch (err) {
      const parsed = parseError(err);
      showToast(parsed.message, 'error', parsed);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      icon={FileText}
      title="عرض سعر جديد"
      description="إنشاء عرض أسعار مبيعات للعميل"
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
              void onSubmit();
            }}
            disabled={saving || items.every(i => !i.description.trim() || !(i.quantity > 0))}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ عرض السعر
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
        {/* Customer & Date Section */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
              <User size={12} /> العميل
            </label>
            <div className="relative">
              {selectedParty ? (
                <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 p-2.5 dark:border-indigo-800 dark:bg-indigo-900/20">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <User size={14} className="text-indigo-600" />
                    <span className="truncate text-sm font-bold text-gray-800 dark:text-slate-100">
                      {selectedParty.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedParty(null);
                    }}
                    className="rounded p-1 text-gray-400 transition-all hover:bg-white hover:text-rose-500 dark:hover:bg-slate-800"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={partyQuery}
                    onChange={e => {
                      setPartyQuery(e.target.value);
                      setIsPartyDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setIsPartyDropdownOpen(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setIsPartyDropdownOpen(false), 150);
                    }}
                    placeholder="بحث عن عميل..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <Search
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />

                  {isPartyDropdownOpen && (
                    <div
                      onMouseDown={e => {
                        e.preventDefault();
                      }}
                      className="custom-scrollbar absolute z-50 mt-1 max-h-52 w-full overflow-hidden overflow-y-auto rounded-xl border border-indigo-500 bg-[var(--app-surface)] shadow-2xl"
                    >
                      {customersLoading ? (
                        <div className="animate-pulse p-3 text-center text-xs text-gray-400">
                          جاري التحميل...
                        </div>
                      ) : filteredCustomers && filteredCustomers.length > 0 ? (
                        <>
                          {partyQuery.length === 0 && (
                            <div className="border-b border-gray-100 bg-indigo-50/60 px-3 py-1.5 text-[11px] text-indigo-500 dark:border-slate-700 dark:bg-indigo-900/20">
                              اكتب للتصفية أو اختر من القائمة
                            </div>
                          )}
                          <ul className="divide-y dark:divide-slate-800">
                            {filteredCustomers.slice(0, 50).map((c: Party) => (
                              <li
                                key={c.id}
                                onClick={() => {
                                  setSelectedParty({
                                    id: c.id,
                                    name: c.name,
                                    ...(c.phone != null ? { phone: c.phone } : {}),
                                  });
                                  setIsPartyDropdownOpen(false);
                                  setPartyQuery('');
                                }}
                                className="group flex cursor-pointer items-center justify-between px-3 py-2 transition-colors hover:bg-indigo-600 hover:text-white"
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold">{c.name}</span>
                                  <span className="text-[10px] opacity-60">{c.phone}</span>
                                </div>
                                <Check
                                  size={12}
                                  className="opacity-0 group-hover:opacity-100 max-md:opacity-100"
                                />
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
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
              <Calendar size={12} /> تاريخ الإصدار
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={e => {
                setIssueDate(e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
              <DollarSign size={12} /> العملة
            </label>
            <select
              value={currencyCode}
              onChange={e => {
                setCurrencyCode(e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="YER">ريال يمني (YER)</option>
              <option value="USD">دولار أمريكي (USD)</option>
              <option value="CNY">يوان صيني (CNY)</option>
              <option value="OMR">ريال عماني (OMR)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
              <Calendar size={12} /> صالح لمدة
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={validDays}
                onChange={e => {
                  setValidDays(Number(e.target.value) || 7);
                }}
                className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-xs text-gray-500">
                يوم (حتى {new Date(validUntil).toLocaleDateString('ar-SA-u-nu-latn')})
              </span>
            </div>
          </div>
        </div>

        {/* Items Table Section */}
        <QuotationItemsTable
          items={items}
          currencyCode={currencyCode}
          addItem={addItem}
          removeItem={removeItem}
          updateItem={updateItem}
          handleOpenProductSearch={handleOpenProductSearch}
        />

        {/* Totals Section */}
        <QuotationTotals total={totals.total} currencyCode={currencyCode} />

        {/* Terms & Notes */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">شروط الدفع</label>
            <input
              type="text"
              value={paymentTerms}
              onChange={e => {
                setPaymentTerms(e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">ملاحظات</label>
            <input
              type="text"
              value={notes}
              onChange={e => {
                setNotes(e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-600 dark:text-gray-400">
            الشروط والأحكام
          </label>
          <textarea
            value={terms}
            onChange={e => {
              setTerms(e.target.value);
            }}
            rows={2}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      </div>

      <ProductSelectionModal
        isOpen={productModal.isOpen}
        onClose={() => {
          setProductModal(prev => ({ ...prev, isOpen: false }));
        }}
        onSelect={handleProductSelect}
        initialQuery={productModal.query}
        mode="quotation"
      />
    </Modal>
  );
};

export default CreateQuotationModal;
