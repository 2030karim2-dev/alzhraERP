import React from 'react';
import { DollarSign, Loader2, RotateCcw, Save, X } from 'lucide-react';
import { formatCurrency } from '../../../../../core/utils';
import { FIELD_INPUT_CLASS, PLAIN_FIELD_LABEL_CLASS } from './fieldStyles';
import { QuotationItemsTable } from './QuotationItemsTable';
import { SupplierSection } from './SupplierSection';
import type { usePurchaseQuotationForm } from './usePurchaseQuotationForm';

/** حقول شروط الدفع والملاحظات. */
export const QuotationTermsSection = ({
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
      <label htmlFor="quotation-payment-terms" className={PLAIN_FIELD_LABEL_CLASS}>
        شروط الدفع
      </label>
      <input
        id="quotation-payment-terms"
        type="text"
        value={paymentTerms}
        onChange={event => {
          onPaymentTermsChange(event.target.value);
        }}
        className={FIELD_INPUT_CLASS}
      />
    </div>
    <div className="space-y-1.5">
      <label htmlFor="quotation-notes" className={PLAIN_FIELD_LABEL_CLASS}>
        ملاحظات
      </label>
      <input
        id="quotation-notes"
        type="text"
        value={notes}
        onChange={event => {
          onNotesChange(event.target.value);
        }}
        className={FIELD_INPUT_CLASS}
      />
    </div>
  </div>
);

/** شريط إجمالي عرض المورد. */
export const QuotationTotalsBar = ({
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

/** تنبيه استعادة مسودة محفوظة سابقاً، مع زر التخلي عنها. */
export const DraftRestoredBanner = ({
  onDiscard,
}: {
  onDiscard: () => void;
}): React.ReactElement => (
  <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-700/50 dark:bg-amber-900/20">
    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
      <RotateCcw size={14} />
      <span className="text-xs font-bold">تم استعادة مسودة محفوظة سابقاً</span>
      <span className="text-[11px] opacity-70">— يمكنك الاستمرار من حيث توقفت</span>
    </div>
    <button
      type="button"
      onClick={onDiscard}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-amber-600 transition-colors hover:bg-amber-100 dark:hover:bg-amber-800/30"
    >
      <X size={12} /> تجاهل المسودة
    </button>
  </div>
);

/** جميع حقول نموذج عرض السعر باستثناء نافذة اختيار المنتج. */
export const QuotationFormFields = ({
  form,
}: {
  form: ReturnType<typeof usePurchaseQuotationForm>;
}): React.ReactElement => (
  <div className="space-y-6">
    {form.hasDraft && <DraftRestoredBanner onDiscard={form.discardDraft} />}
    <SupplierSection
      selectedParty={form.party.selectedParty}
      partyQuery={form.party.partyQuery}
      isOpen={form.party.isPartyDropdownOpen}
      suppliers={form.suppliers}
      loading={form.suppliersLoading}
      onQueryChange={form.party.setPartyQuery}
      onOpenChange={form.party.setPartyDropdownOpen}
      onSelect={form.party.setSelectedParty}
      onClear={() => {
        form.party.setSelectedParty(null);
      }}
      issueDate={form.terms.issueDate}
      currencyCode={form.terms.currencyCode}
      deliveryTerms={form.terms.deliveryTerms}
      onIssueDateChange={form.terms.setIssueDate}
      onCurrencyChange={form.terms.setCurrencyCode}
      onDeliveryTermsChange={form.terms.setDeliveryTerms}
    />
    <QuotationItemsTable
      items={form.items.items}
      currencyCode={form.terms.currencyCode}
      onAdd={form.items.addItem}
      onRemove={form.items.removeItem}
      onUpdate={form.items.updateItem}
      onSearch={form.items.openProductSearch}
    />
    <QuotationTotalsBar total={form.total} currencyCode={form.terms.currencyCode} />
    <QuotationTermsSection
      paymentTerms={form.terms.paymentTerms}
      notes={form.terms.notes}
      onPaymentTermsChange={form.terms.setPaymentTerms}
      onNotesChange={form.terms.setNotes}
    />
  </div>
);

/** أزرار نافذة عرض السعر (إلغاء / حفظ). */
export const QuotationModalFooter = ({
  saving,
  canSave,
  onClose,
  onSave,
}: {
  saving: boolean;
  canSave: boolean;
  onClose: () => void;
  onSave: () => void;
}): React.ReactElement => (
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
      onClick={onSave}
      disabled={saving || !canSave}
      className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-50"
    >
      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} حفظ عرض المورد
    </button>
  </>
);
