import React, { useCallback, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Save, Printer, Wallet } from 'lucide-react';
import { usePurchaseStore } from '../store';
import { useCreatePurchase } from '../hooks';
import { useCompany } from '../../settings/hooks';
import { useSettingsStore } from '../../settings/settingsStore';
import { useFeedbackStore } from '../../feedback/store';
import InvoiceHeader from '../../sales/components/create/InvoiceHeader';
import PurchaseMeta from './create/PurchaseMeta';
import InteractivePurchaseTable from './create/InteractivePurchaseTable';
import { formatCurrency } from '../../../core/utils';
import Button from '../../../ui/base/Button';

interface Props { onSuccess: () => void; }
const hasText = (value: string): boolean => value !== '';

interface PurchaseValidationContext {
  supplier: { id: string; name: string } | null;
  issueDate: string;
  warehouseId: string;
  invoiceType: string;
  cashboxId: string;
  validItems: ReturnType<typeof usePurchaseStore.getState>['items'];
}
const validatePurchase = ({ supplier, issueDate, warehouseId, invoiceType, cashboxId, validItems }: PurchaseValidationContext): string | null => {
  if (supplier === null) return 'يرجى اختيار مورد أولاً';
  if (validItems.length === 0) return 'يرجى إضافة صنف واحد على الأقل بكمية وسعر صحيحين';
  if (!hasText(issueDate)) return 'يرجى تحديد تاريخ الفاتورة';
  if (!hasText(warehouseId)) return 'يرجى اختيار مستودع فعلي قبل اعتماد الفاتورة';
  if (validItems.some(item => item.discount < 0 || item.discount > item.quantity * item.costPrice)) return 'يوجد خصم غير صالح؛ يجب ألا يتجاوز الخصم إجمالي الصنف';
  if (invoiceType === 'cash' && !hasText(cashboxId)) return 'يرجى اختيار الصندوق / البنك للفاتورة النقدية';
  return null;
};

const Totals: React.FC<{ totals: ReturnType<typeof usePurchaseStore.getState>['totals'] }> = ({ totals }) => <div className="p-2 max-md:p-0.5 md:p-3 bg-white dark:bg-slate-900 border-t-2 max-md:border-t border-gray-200 dark:border-slate-800 print:break-inside-avoid"><div className="flex justify-end"><div className="w-full md:w-80 flex flex-col"><div className="grid grid-cols-2 border dark:border-slate-800"><div className="p-2 max-md:p-0.5 border-l border-b dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-right"><span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest block">المجموع قبل الخصم</span><span dir="ltr" className="text-[11px] font-bold font-mono text-gray-600 dark:text-slate-400">{formatCurrency(totals.subTotal)}</span></div><div className="p-2 max-md:p-0.5 border-b dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-right"><span className="text-[7px] font-bold text-rose-400 uppercase tracking-widest block">إجمالي الخصومات</span><span dir="ltr" className="text-[11px] font-bold font-mono text-rose-600 dark:text-rose-400">{formatCurrency(totals.totalDiscount)}</span></div></div><div className="bg-slate-950 text-white p-4 max-md:p-1.5 flex justify-between items-center relative overflow-hidden"><div className="relative z-10"><span className="text-[8px] font-bold text-blue-400 uppercase tracking-[0.2em] block">NET PURCHASE TOTAL</span><h2 dir="ltr" className="text-3xl max-md:text-xl font-bold font-mono tracking-tighter">{formatCurrency(totals.grandTotal)}</h2></div><div className="w-10 h-10 max-md:w-7 max-md:h-7 bg-rose-600 flex items-center justify-center shadow-lg"><Wallet size={20} className="max-md:w-4 max-md:h-4" /></div></div></div></div></div>;

const CreatePurchaseModal: React.FC<Props> = ({ onSuccess }) => {
  const { data: company } = useCompany();
  const { items, supplier, totals, resetCart, initializeItems, invoiceNumber, issueDate, invoiceType, cashboxId, warehouseId, notes, currency, exchangeRate, setMetadata } = usePurchaseStore();
  const { mutate: createPurchase, isPending } = useCreatePurchase();
  const { invoice: invoiceSettings } = useSettingsStore();
  const { showToast } = useFeedbackStore();
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: 'مسودة_فاتورة_مشتريات' });
  useEffect(() => { initializeItems(6); setMetadata('currency', invoiceSettings.default_currency); setMetadata('invoiceType', invoiceSettings.default_invoice_type); }, [initializeItems, invoiceSettings.default_currency, invoiceSettings.default_invoice_type, setMetadata]);

  const handleSave = useCallback((): void => {
    const validItems = items.filter(item => item.productId !== '' && item.quantity > 0 && item.costPrice > 0);
    const validationError = validatePurchase({ supplier, issueDate, warehouseId, invoiceType, cashboxId, validItems });
    if (validationError !== null) { showToast(validationError, invoiceType === 'cash' && !hasText(cashboxId) ? 'warning' : 'error'); return; }
    if (supplier === null) return;
    createPurchase({ supplierId: supplier.id, invoiceNumber: hasText(invoiceNumber) ? invoiceNumber : `PUR-${String(Date.now()).slice(-6)}`, issueDate, items: validItems.map(item => ({ productId: item.productId, name: item.name, sku: item.sku, partNumber: item.partNumber, brand: item.brand, quantity: item.quantity, costPrice: item.costPrice, discount: item.discount, warehouseId, total: Math.max(0, item.quantity * item.costPrice - item.discount) })), status: 'posted', notes: hasText(notes.trim()) ? notes.trim() : undefined, paymentMethod: invoiceType, cashAccountId: cashboxId, currency, exchangeRate }, { onSuccess: () => { resetCart(); onSuccess(); } });
  }, [cashboxId, createPurchase, currency, exchangeRate, invoiceNumber, invoiceType, issueDate, items, notes, onSuccess, resetCart, showToast, supplier, warehouseId]);

  return <div className="max-w-none mx-auto space-y-3 max-md:space-y-0.5 animate-in fade-in duration-500 pt-2 max-md:pt-0 pb-24 max-md:pb-12 px-1 md:px-2"><div ref={printRef} className="bg-white dark:bg-slate-900 border-2 max-md:border dark:border-gray-100 dark:border-slate-800 shadow-2xl rounded-none flex flex-col overflow-visible">{company && <InvoiceHeader company={company} />}<PurchaseMeta /><InteractivePurchaseTable /><Totals totals={totals} /></div><div className="flex justify-end gap-2 max-md:gap-0.5 print:hidden"><Button onClick={() => { handlePrint(); }} variant="outline" className="border-gray-200 text-gray-500 max-md:h-7 max-md:px-1.5 max-md:text-[9px]" leftIcon={<Printer size={14} />}>طباعة المستند</Button><Button onClick={handleSave} isLoading={isPending} className="min-w-[140px] max-md:min-w-0 max-md:h-7 max-md:px-2 max-md:text-[9px]" leftIcon={<Save size={14} />}>اعتماد التوريد</Button></div></div>;
};

export default CreatePurchaseModal;
