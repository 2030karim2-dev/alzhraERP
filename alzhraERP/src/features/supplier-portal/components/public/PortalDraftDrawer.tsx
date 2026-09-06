import React from 'react';
import { ShoppingBag, X, Package, Trash2, Send, CheckCircle2 } from 'lucide-react';
import { formatCurrency, parseNumberFlexible } from '../../../../core/utils';
import { calculatePortalLineTotal } from '../../services/quotationCalculator';

export interface DraftItem {
  product_id?: string | null | undefined;
  description: string;
  oem_number?: string | null | undefined;
  brand?: string | null | undefined;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  notes?: string | null | undefined;
}

interface PortalDraftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  draftItems: DraftItem[];
  setDraftItems: React.Dispatch<React.SetStateAction<DraftItem[]>>;
  deliveryTerms: string;
  setDeliveryTerms: (v: string) => void;
  paymentTerms: string;
  setPaymentTerms: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  draftTotal: number;
  isSubmitting: boolean;
  onSubmit: () => Promise<void>;
  successResult: { number: string; total: number } | null;
  onSuccessDismiss: () => void;
}

interface RowInputsProps {
  quantity: number;
  unitPrice: number;
  lineCalc: number;
  onQtyChange: (val: number) => void;
  onPriceChange: (val: number) => void;
}

const RowInputsGrid: React.FC<RowInputsProps> = ({
  quantity,
  unitPrice,
  lineCalc,
  onQtyChange,
  onPriceChange,
}) => (
  <div className="grid grid-cols-3 gap-2">
    <div>
      <span className="block text-[10px] font-bold text-slate-400">الكمية المتاحة</span>
      <input
        type="number"
        step="any"
        min="0.001"
        value={quantity}
        onChange={e => {
          const parsed = parseNumberFlexible(e.target.value);
          onQtyChange(Number.isNaN(parsed) || parsed <= 0 ? 1 : parsed);
        }}
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white outline-none focus:border-emerald-500"
      />
    </div>

    <div>
      <span className="block text-[10px] font-bold text-slate-400">سعر الوحدة (ر.س)</span>
      <input
        type="number"
        step="any"
        min="0"
        value={unitPrice}
        onChange={e => {
          const parsed = parseNumberFlexible(e.target.value);
          onPriceChange(Number.isNaN(parsed) ? 0 : parsed);
        }}
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-emerald-400 outline-none focus:border-emerald-500"
      />
    </div>

    <div>
      <span className="block text-[10px] font-bold text-slate-400">الإجمالي</span>
      <div className="flex h-[30px] items-center rounded-xl border border-slate-800 bg-slate-950 px-2.5 font-mono text-xs font-black text-emerald-400">
        {formatCurrency(lineCalc, 'SAR')}
      </div>
    </div>
  </div>
);

interface DrawerItemRowProps {
  item: DraftItem;
  idx: number;
  onRemove: (idx: number) => void;
  onUpdateQty: (idx: number, qty: number) => void;
  onUpdatePrice: (idx: number, price: number) => void;
}

const DrawerItemRow: React.FC<DrawerItemRowProps> = ({
  item,
  idx,
  onRemove,
  onUpdateQty,
  onUpdatePrice,
}) => {
  const lineCalc = calculatePortalLineTotal(item.quantity, item.unit_price, item.discount_percent);
  const oem = item.oem_number;
  const hasOem = typeof oem === 'string' && oem.length > 0;

  return (
    <div className="space-y-2.5 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-black text-white">{item.description}</h4>
          {hasOem && <span className="font-mono text-[10px] text-slate-400">OEM: {oem}</span>}
        </div>
        <button
          type="button"
          onClick={() => {
            onRemove(idx);
          }}
          className="text-slate-500 hover:text-rose-400"
          title="حذف الصنف"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <RowInputsGrid
        quantity={item.quantity}
        unitPrice={item.unit_price}
        lineCalc={lineCalc}
        onQtyChange={val => {
          onUpdateQty(idx, val);
        }}
        onPriceChange={val => {
          onUpdatePrice(idx, val);
        }}
      />
    </div>
  );
};

interface TermsProps {
  deliveryTerms: string;
  setDeliveryTerms: (v: string) => void;
  paymentTerms: string;
  setPaymentTerms: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
}

const DrawerTermsSection: React.FC<TermsProps> = ({
  deliveryTerms,
  setDeliveryTerms,
  paymentTerms,
  setPaymentTerms,
  notes,
  setNotes,
}) => (
  <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
    <div>
      <label htmlFor="portal-delivery-terms" className="text-[10px] font-bold text-slate-400">
        شروط التسليم / مدة التوصيل
      </label>
      <input
        id="portal-delivery-terms"
        type="text"
        value={deliveryTerms}
        onChange={e => {
          setDeliveryTerms(e.target.value);
        }}
        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
      />
    </div>

    <div>
      <label htmlFor="portal-payment-terms" className="text-[10px] font-bold text-slate-400">
        شروط السداد
      </label>
      <input
        id="portal-payment-terms"
        type="text"
        value={paymentTerms}
        onChange={e => {
          setPaymentTerms(e.target.value);
        }}
        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
      />
    </div>

    <div>
      <label htmlFor="portal-notes" className="text-[10px] font-bold text-slate-400">
        ملاحظات إضافية للمشتريات
      </label>
      <textarea
        id="portal-notes"
        value={notes}
        onChange={e => {
          setNotes(e.target.value);
        }}
        rows={2}
        placeholder="أي ملاحظات حول الضمان، المنشأ، أو جودة القطع..."
        className="mt-1 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-white outline-none focus:border-emerald-500"
      />
    </div>
  </div>
);

interface DrawerFooterProps {
  draftTotal: number;
  draftCount: number;
  isSubmitting: boolean;
  onSubmit: () => void;
}

const DrawerFooter: React.FC<DrawerFooterProps> = ({
  draftTotal,
  draftCount,
  isSubmitting,
  onSubmit,
}) => (
  <div className="space-y-3 border-t border-slate-800 pt-3">
    <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3">
      <span className="text-xs font-bold text-slate-400">إجمالي قيمة عرض السعر:</span>
      <span className="font-mono text-base font-black text-emerald-400">
        {formatCurrency(draftTotal, 'SAR')}
      </span>
    </div>

    <button
      type="button"
      disabled={draftCount === 0 || isSubmitting}
      onClick={onSubmit}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition-all hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
    >
      {isSubmitting ? (
        <span>جاري إرسال العرض...</span>
      ) : (
        <>
          <Send size={16} />
          <span>إرسال عرض السعر مباشرة لإدارة المشتريات</span>
        </>
      )}
    </button>
  </div>
);

interface SuccessModalProps {
  successResult: { number: string; total: number } | null;
  onDismiss: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ successResult, onDismiss }) => {
  if (!successResult) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-emerald-500/40 bg-slate-900 p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
          <CheckCircle2 size={36} />
        </div>
        <h3 className="text-base font-black text-white">تم استلام عرض السعر بنجاح!</h3>
        <p className="text-xs text-slate-400">
          تم توثيق عرض السعر في نظام المشتريات وسيتم مراجعته والتواصل معكم قريباً.
        </p>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300">
          رقم العرض: <strong className="text-emerald-400">{successResult.number}</strong>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
        >
          تم
        </button>
      </div>
    </div>
  );
};

const DrawerHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
    <div className="flex items-center gap-2 text-emerald-400">
      <ShoppingBag size={18} />
      <h2 className="text-sm font-black text-white">إعداد وإرسال عرض السعر</h2>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
    >
      <X size={18} />
    </button>
  </div>
);

interface DrawerItemsListProps {
  draftItems: DraftItem[];
  onRemoveItem: (idx: number) => void;
  onUpdateQty: (idx: number, qty: number) => void;
  onUpdatePrice: (idx: number, price: number) => void;
}

const DrawerItemsList: React.FC<DrawerItemsListProps> = ({
  draftItems,
  onRemoveItem,
  onUpdateQty,
  onUpdatePrice,
}) => {
  if (draftItems.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center text-center text-slate-500">
        <Package size={32} className="mb-2 opacity-40" />
        <p className="text-xs">عربة التسعير فارغة حالياً</p>
        <span className="mt-1 text-[10px] text-slate-600">
          أضف أصنافاً من تبويب المنتجات أو طلبات التسعير
        </span>
      </div>
    );
  }

  return (
    <>
      {draftItems.map((item, idx) => (
        <DrawerItemRow
          key={idx}
          item={item}
          idx={idx}
          onRemove={onRemoveItem}
          onUpdateQty={onUpdateQty}
          onUpdatePrice={onUpdatePrice}
        />
      ))}
    </>
  );
};

interface DrawerBodyProps {
  draftItems: DraftItem[];
  setDraftItems: React.Dispatch<React.SetStateAction<DraftItem[]>>;
  deliveryTerms: string;
  setDeliveryTerms: (v: string) => void;
  paymentTerms: string;
  setPaymentTerms: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
}

const DrawerBody: React.FC<DrawerBodyProps> = ({
  draftItems,
  setDraftItems,
  deliveryTerms,
  setDeliveryTerms,
  paymentTerms,
  setPaymentTerms,
  notes,
  setNotes,
}) => (
  <div className="custom-scrollbar my-3 flex-1 space-y-3 overflow-y-auto">
    <DrawerItemsList
      draftItems={draftItems}
      onRemoveItem={idx => {
        setDraftItems(prev => prev.filter((_, i) => i !== idx));
      }}
      onUpdateQty={(idx, qty) => {
        setDraftItems(prev => prev.map((it, i) => (i === idx ? { ...it, quantity: qty } : it)));
      }}
      onUpdatePrice={(idx, price) => {
        setDraftItems(prev => prev.map((it, i) => (i === idx ? { ...it, unit_price: price } : it)));
      }}
    />

    {draftItems.length > 0 && (
      <DrawerTermsSection
        deliveryTerms={deliveryTerms}
        setDeliveryTerms={setDeliveryTerms}
        paymentTerms={paymentTerms}
        setPaymentTerms={setPaymentTerms}
        notes={notes}
        setNotes={setNotes}
      />
    )}
  </div>
);

export const PortalDraftDrawer: React.FC<PortalDraftDrawerProps> = ({
  isOpen,
  onClose,
  draftItems,
  setDraftItems,
  deliveryTerms,
  setDeliveryTerms,
  paymentTerms,
  setPaymentTerms,
  notes,
  setNotes,
  draftTotal,
  isSubmitting,
  onSubmit,
  successResult,
  onSuccessDismiss,
}) => {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
          <div className="animate-in slide-in-from-left flex h-full w-full max-w-xl flex-col border-r border-slate-800 bg-slate-900 p-4 shadow-2xl duration-300">
            <DrawerHeader onClose={onClose} />
            <DrawerBody
              draftItems={draftItems}
              setDraftItems={setDraftItems}
              deliveryTerms={deliveryTerms}
              setDeliveryTerms={setDeliveryTerms}
              paymentTerms={paymentTerms}
              setPaymentTerms={setPaymentTerms}
              notes={notes}
              setNotes={setNotes}
            />
            <DrawerFooter
              draftTotal={draftTotal}
              draftCount={draftItems.length}
              isSubmitting={isSubmitting}
              onSubmit={() => {
                void onSubmit();
              }}
            />
          </div>
        </div>
      )}

      <SuccessModal successResult={successResult} onDismiss={onSuccessDismiss} />
    </>
  );
};
