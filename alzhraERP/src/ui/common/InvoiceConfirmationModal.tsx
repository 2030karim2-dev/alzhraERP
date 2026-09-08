import React, { useEffect } from 'react';
import {
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
  Coins,
  Wallet,
  Package,
  User,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency, formatNumberDisplay } from '../../core/utils';
import { getDefaultExchangeOperator } from '../../core/utils/currencyUtils';
import Spinner from '../base/Spinner';

export interface ConfirmationItem {
  name: string;
  sku?: string | undefined;
  partNumber?: string | undefined;
  brand?: string | undefined;
  quantity: number;
  price: number;
  discount?: number | undefined;
  total: number;
}

export interface InvoiceConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean | undefined;
  mode: 'sale' | 'purchase';
  invoiceNumber?: string | undefined;
  partyName: string;
  invoiceType: 'cash' | 'credit';
  currency: string;
  exchangeRate: number;
  exchangeOperator?: ('multiply' | 'divide') | undefined;
  cashboxName?: string | undefined;
  warehouseName?: string | undefined;
  items: ConfirmationItem[];
  subtotal: number;
  discount?: number | undefined;
  tax?: number | undefined;
  total: number;
  paidAmount?: number | undefined;
  notes?: string | undefined;
}

export const InvoiceConfirmationModal: React.FC<InvoiceConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  mode,
  invoiceNumber,
  partyName,
  invoiceType,
  currency,
  exchangeRate,
  exchangeOperator,
  cashboxName,
  warehouseName,
  items,
  subtotal,
  discount = 0,
  tax = 0,
  total,
  paidAmount = 0,
  notes,
}) => {
  // إغلاق بمفتاح Escape إذا لم تكن الفاتورة قيد الحفظ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const isSale = mode === 'sale';
  const isCredit = invoiceType === 'credit';
  const isForeign = currency !== 'SAR';
  const hasPartialPayment = isCredit && paidAmount > 0;
  const remainingCredit = Math.max(0, total - paidAmount);

  // إجمالي عدد القطع
  const totalPieces = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  // حساب المعامل الفعلي وسعر الصرف والمعادل بالريال السعودي
  const effectiveOperator = exchangeOperator ?? getDefaultExchangeOperator(currency);
  const effectiveRate =
    effectiveOperator === 'divide' && exchangeRate < 1 ? 1 / exchangeRate : exchangeRate;
  const baseTotal = isForeign
    ? effectiveOperator === 'divide'
      ? total / effectiveRate
      : total * effectiveRate
    : total;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* الخلفية المظلمة الشفافة */}
      <div
        className="backdrop-blur-xs animate-in fade-in fixed inset-0 bg-slate-950/70 transition-opacity"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      {/* نافذة التأكيد */}
      <div className="animate-in zoom-in-95 relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl transition-all duration-200 dark:border-slate-800 dark:bg-slate-900">
        {/* شريط العنوان العلوي */}
        <div
          className={`flex items-center justify-between border-b px-5 py-3.5 ${
            isSale
              ? 'border-emerald-100 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
              : 'border-blue-100 bg-blue-50/70 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`rounded-xl p-2 ${
                isSale ? 'bg-emerald-500 text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs'
              }`}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-base font-black leading-tight">
                <span>
                  {isSale ? 'تأكيد اعتماد فاتورة المبيعات' : 'تأكيد اعتماد فاتورة المشتريات'}
                </span>
                {invoiceNumber && (
                  <span className="rounded-md border border-slate-200/60 bg-white/60 px-2 py-0.5 font-mono text-xs dark:border-slate-800 dark:bg-slate-800/60">
                    #{invoiceNumber}
                  </span>
                )}
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                يرجى مراجعة البنود والمبالغ قبل التأكيد النهائي والترحيل
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="إلغاء وإغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* محتوى النافذة القابل للتمرير */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* بطاقات البيانات الأساسية */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {/* العميل / المورد */}
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                <User size={12} className="text-blue-500" />
                <span className="text-[10px] font-bold">{isSale ? 'العميل' : 'المورد'}</span>
              </div>
              <p className="truncate text-xs font-black text-slate-800 dark:text-slate-100">
                {partyName || (isSale ? 'عميل نقدي' : 'مورد عام')}
              </p>
            </div>

            {/* طريقة السداد */}
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                {isCredit ? (
                  <CreditCard size={12} className="text-amber-500" />
                ) : (
                  <Banknote size={12} className="text-emerald-500" />
                )}
                <span className="text-[10px] font-bold">نوع السداد</span>
              </div>
              <span
                className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-black ${
                  isCredit
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}
              >
                {isCredit ? 'آجل (ذمم)' : 'نقداً'}
              </span>
            </div>

            {/* العملة وسعر الصرف */}
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                <Coins size={12} className="text-indigo-500" />
                <span className="text-[10px] font-bold">العملة والصرف</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                  {currency}
                </span>
                {isForeign && (
                  <span className="font-mono text-[10px] font-bold text-slate-500">
                    ({effectiveOperator === 'divide' ? '÷' : '×'} {effectiveRate})
                  </span>
                )}
              </div>
            </div>

            {/* الصندوق / البنك أو المستودع */}
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="mb-1 flex items-center gap-1.5 text-slate-400">
                <Wallet size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold">
                  {!isCredit || hasPartialPayment ? 'الصندوق / البنك' : 'المستودع'}
                </span>
              </div>
              <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                {!isCredit || hasPartialPayment
                  ? cashboxName || 'غير محدد'
                  : warehouseName || 'المستودع الرئيسي'}
              </p>
            </div>
          </div>

          {/* تنبيه إذا كانت الفاتورة تتضمن دفعة مقدمة */}
          {hasPartialPayment && (
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertCircle size={16} className="shrink-0 text-amber-600" />
              <div className="flex-1">
                <span className="font-bold">فاتورة آجلة مع دفعة مقدمة:</span> سيتم إيداع{' '}
                <span className="font-mono font-black">{formatCurrency(paidAmount, currency)}</span>{' '}
                في <span className="font-bold">{cashboxName || 'الصندوق'}</span>، وترحيل المتبقي{' '}
                <span className="font-mono font-black">
                  {formatCurrency(remainingCredit, currency)}
                </span>{' '}
                لحساب الذمم.
              </div>
            </div>
          )}

          {/* جدول الأصناف والقطع */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Package size={14} className="text-slate-500" />
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">
                  تفاصيل القطع والبنود
                </h4>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                <span>
                  عدد الأصناف:{' '}
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {items.length}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  إجمالي القطع:{' '}
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {formatNumberDisplay(totalPieces)}
                  </strong>
                </span>
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/40">
              <table className="w-full text-right text-xs">
                <thead className="backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200 bg-slate-100/90 text-[10px] font-black uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/90 dark:text-slate-400">
                  <tr>
                    <th className="w-8 p-2 text-center">#</th>
                    <th className="p-2">الصنف / الوصف</th>
                    <th className="w-16 p-2 text-center">الكمية</th>
                    <th className="w-24 p-2 text-left">السعر</th>
                    <th className="w-28 p-2 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 font-medium dark:divide-slate-800/60">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30">
                      <td className="p-2 text-center font-mono text-[11px] text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-2">
                        <div className="max-w-xs truncate font-bold text-slate-800 dark:text-slate-200">
                          {item.name}
                        </div>
                        {(item.partNumber || item.sku) && (
                          <span className="font-mono text-[10px] text-slate-400">
                            {item.partNumber || item.sku}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {item.quantity}
                      </td>
                      <td className="p-2 text-left font-mono font-semibold text-slate-600 dark:text-slate-400">
                        {formatCurrency(item.price, currency)}
                      </td>
                      <td className="p-2 text-left font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(item.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ملخص المبالغ والضرائب والخصومات */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>المجموع الفرعي:</span>
                <span className="font-mono font-bold">{formatCurrency(subtotal, currency)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>الخصم الممنوح:</span>
                  <span className="font-mono font-bold">-{formatCurrency(discount, currency)}</span>
                </div>
              )}

              {tax > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>ضريبة القيمة المضافة:</span>
                  <span className="font-mono font-bold">+{formatCurrency(tax, currency)}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    المبلغ الإجمالي المطلوب:
                  </span>
                  <div className="flex flex-col items-end">
                    <span
                      className={`font-mono text-lg font-black ${
                        isSale
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {formatCurrency(total, currency)}
                    </span>
                    {isForeign && (
                      <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        ≈ {formatCurrency(baseTotal, 'SAR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* إذا كان آجل ومعه دفعة مقدمة */}
              {isCredit && (
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-dashed border-slate-200 pt-2 dark:border-slate-700">
                  <div className="rounded-lg bg-emerald-50/60 p-2 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <div className="text-[10px] font-bold">المدفوع مقدماً:</div>
                    <div className="font-mono font-black">
                      {formatCurrency(paidAmount, currency)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-50/60 p-2 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    <div className="text-[10px] font-bold">المتبقي الآجل:</div>
                    <div className="font-mono font-black">
                      {formatCurrency(remainingCredit, currency)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ملاحظات الفاتورة إن وُجدت */}
          {notes && notes.trim() && (
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              <span className="font-bold text-slate-800 dark:text-slate-200">ملاحظات: </span>
              <span>{notes.trim()}</span>
            </div>
          )}
        </div>

        {/* أزرار الإجراءات السفلية */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-200/80 bg-slate-100/60 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/40">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            تعديل الفاتورة
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className={`active:scale-98 flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-black text-white shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
              isSale
                ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700'
                : 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" />
                <span>جاري الترحيل والحفظ...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>تأكيد وحفظ الفاتورة</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceConfirmationModal;
