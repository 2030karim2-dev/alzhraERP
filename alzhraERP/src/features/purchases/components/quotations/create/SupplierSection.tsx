import React from 'react';
import { Building2, Calendar, Check, DollarSign, Search, Truck, X } from 'lucide-react';
import type { SupplierOption } from './types';
import { FIELD_INPUT_CLASS, FIELD_LABEL_CLASS } from './fieldStyles';

/** شريحة المورد المختار مع زر الإزالة. */
const SelectedSupplierChip = ({
  party,
  onClear,
}: {
  party: SupplierOption;
  onClear: () => void;
}): React.ReactElement => (
  <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 p-2.5 dark:border-violet-800 dark:bg-violet-900/20">
    <div className="flex items-center gap-2 overflow-hidden">
      <Building2 size={14} className="text-violet-600" />
      <span className="truncate text-sm font-bold text-gray-800 dark:text-slate-100">
        {party.name}
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
);

interface SupplierSearchInputProps {
  partyQuery: string;
  onQueryChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
}

/** حقل البحث عن مورد مع أيقونة البحث. */
const SupplierSearchInput = ({
  partyQuery,
  onQueryChange,
  onOpenChange,
}: SupplierSearchInputProps): React.ReactElement => (
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
        setTimeout(() => {
          onOpenChange(false);
        }, 150);
      }}
      placeholder="بحث عن مورد..."
      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800"
    />
    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
  </>
);

interface SupplierOptionListProps {
  suppliers: SupplierOption[];
  loading: boolean;
  partyQuery: string;
  onQueryChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (supplier: SupplierOption) => void;
}

/** القائمة المنسدلة لنتائج البحث عن الموردين. */
const SupplierOptionList = ({
  suppliers,
  loading,
  partyQuery,
  onQueryChange,
  onOpenChange,
  onSelect,
}: SupplierOptionListProps): React.ReactElement => (
  <div
    onMouseDown={event => {
      event.preventDefault();
    }}
    className="custom-scrollbar absolute z-50 mt-1 max-h-52 w-full overflow-hidden overflow-y-auto rounded-xl border border-violet-500 bg-[var(--app-surface)] shadow-2xl"
  >
    {loading ? (
      <div className="animate-pulse p-3 text-center text-xs text-gray-400">جاري التحميل...</div>
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
                <Check size={12} className="opacity-0 group-hover:opacity-100 max-md:opacity-100" />
              </button>
            </li>
          ))}
        </ul>
      </>
    ) : (
      <div className="p-3 text-center text-xs text-gray-400">لا توجد نتائج</div>
    )}
  </div>
);

interface SupplierPickerProps {
  selectedParty: SupplierOption | null;
  partyQuery: string;
  isOpen: boolean;
  suppliers: SupplierOption[];
  loading: boolean;
  onQueryChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (supplier: SupplierOption) => void;
  onClear: () => void;
}

/** حقل اختيار المورد: إما شريحة المورد المختار أو حقل بحث بقائمة منسدلة. */
const SupplierPicker = ({
  selectedParty,
  partyQuery,
  isOpen,
  suppliers,
  loading,
  onQueryChange,
  onOpenChange,
  onSelect,
  onClear,
}: SupplierPickerProps): React.ReactElement => (
  <div className="space-y-1.5">
    <label htmlFor="quotation-supplier" className={FIELD_LABEL_CLASS}>
      <Building2 size={12} /> المورد
    </label>
    <div className="relative">
      {selectedParty !== null ? (
        <SelectedSupplierChip party={selectedParty} onClear={onClear} />
      ) : (
        <>
          <SupplierSearchInput
            partyQuery={partyQuery}
            onQueryChange={onQueryChange}
            onOpenChange={onOpenChange}
          />
          {isOpen && (
            <SupplierOptionList
              suppliers={suppliers}
              loading={loading}
              partyQuery={partyQuery}
              onQueryChange={onQueryChange}
              onOpenChange={onOpenChange}
              onSelect={onSelect}
            />
          )}
        </>
      )}
    </div>
  </div>
);

/** حقل تاريخ العرض. */
const IssueDateField = ({
  issueDate,
  onChange,
}: {
  issueDate: string;
  onChange: (value: string) => void;
}): React.ReactElement => (
  <div className="space-y-1.5">
    <label htmlFor="quotation-issue-date" className={FIELD_LABEL_CLASS}>
      <Calendar size={12} /> تاريخ العرض
    </label>
    <input
      id="quotation-issue-date"
      type="date"
      value={issueDate}
      onChange={event => {
        onChange(event.target.value);
      }}
      className={FIELD_INPUT_CLASS}
    />
  </div>
);

/** حقل عملة العرض. */
const CurrencyField = ({
  currencyCode,
  onChange,
}: {
  currencyCode: string;
  onChange: (value: string) => void;
}): React.ReactElement => (
  <div className="space-y-1.5">
    <label htmlFor="quotation-currency" className={FIELD_LABEL_CLASS}>
      <DollarSign size={12} /> العملة
    </label>
    <select
      id="quotation-currency"
      value={currencyCode}
      onChange={event => {
        onChange(event.target.value);
      }}
      className={`${FIELD_INPUT_CLASS} font-semibold`}
    >
      <option value="SAR">ريال سعودي (SAR)</option>
      <option value="YER">ريال يمني (YER)</option>
      <option value="USD">دولار أمريكي (USD)</option>
      <option value="CNY">يوان صيني (CNY)</option>
      <option value="OMR">ريال عماني (OMR)</option>
    </select>
  </div>
);

/** حقل شروط التسليم. */
const DeliveryTermsField = ({
  deliveryTerms,
  onChange,
}: {
  deliveryTerms: string;
  onChange: (value: string) => void;
}): React.ReactElement => (
  <div className="space-y-1.5">
    <label htmlFor="quotation-delivery-terms" className={FIELD_LABEL_CLASS}>
      <Truck size={12} /> شروط التسليم
    </label>
    <input
      id="quotation-delivery-terms"
      type="text"
      value={deliveryTerms}
      onChange={event => {
        onChange(event.target.value);
      }}
      className={FIELD_INPUT_CLASS}
    />
  </div>
);

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

/** رأس النموذج: المورد + تاريخ العرض + العملة + شروط التسليم. */
export const SupplierSection = (props: SupplierSectionProps): React.ReactElement => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <SupplierPicker
      selectedParty={props.selectedParty}
      partyQuery={props.partyQuery}
      isOpen={props.isOpen}
      suppliers={props.suppliers}
      loading={props.loading}
      onQueryChange={props.onQueryChange}
      onOpenChange={props.onOpenChange}
      onSelect={props.onSelect}
      onClear={props.onClear}
    />
    <IssueDateField issueDate={props.issueDate} onChange={props.onIssueDateChange} />
    <CurrencyField currencyCode={props.currencyCode} onChange={props.onCurrencyChange} />
    <DeliveryTermsField
      deliveryTerms={props.deliveryTerms}
      onChange={props.onDeliveryTermsChange}
    />
  </div>
);
