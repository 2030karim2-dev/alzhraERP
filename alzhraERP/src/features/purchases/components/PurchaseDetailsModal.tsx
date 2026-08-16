import React, { useRef, useState } from 'react';
import { X, FileText, Printer, Loader2, Building2, Maximize2, Minimize2, Expand, Shrink, Share2 } from 'lucide-react';
import { usePurchaseDetails } from '../hooks';
import { cn } from '../../../core/utils';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../../features/auth';
import { useFeedbackStore } from '../../../features/feedback/store';
import PurchaseInvoicePrintTemplate, { type PurchasePrintInvoice, type PurchasePrintItem } from './PurchaseInvoicePrintTemplate';

interface PurchaseDetailInvoice extends PurchasePrintInvoice {
    id: string;
    company_id: string;
    party_id: string | null;
    payment_method: string | null;
}

type ModalSize = 'lg' | 'xl' | '2xl' | '3xl' | 'full';
interface PurchaseDetailsModalProps { invoiceId: string | null; onClose: () => void; onReturn?: (invoiceId: string, items: PurchasePrintItem[]) => void; }
interface ModalHeaderProps { invoice: PurchaseDetailInvoice; size: ModalSize; onDecrease: () => void; onIncrease: () => void; onToggle: () => void; onShare: () => void; onPrint: () => void; onClose: () => void; }

const getAdjacentSize = (size: ModalSize, delta: number): ModalSize => {
    if (size === 'lg') return delta > 0 ? 'xl' : 'lg';
    if (size === 'xl') return delta > 0 ? '2xl' : 'lg';
    if (size === '2xl') return delta > 0 ? '3xl' : 'xl';
    if (size === '3xl') return delta > 0 ? 'full' : '2xl';
    return delta < 0 ? '3xl' : 'full';
};

const getSizeClass = (size: ModalSize): string => {
    if (size === 'lg') return 'max-w-lg';
    if (size === 'xl') return 'max-w-xl';
    if (size === '2xl') return 'max-w-2xl';
    if (size === 'full') return 'max-w-[98vw]';
    return 'max-w-5xl';
};

const ModalHeader = ({ invoice, size, onDecrease, onIncrease, onToggle, onShare, onPrint, onClose }: ModalHeaderProps): React.ReactElement => (
    <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-t-[2rem] sticky top-0 z-10">
        <div className="flex items-center gap-4"><div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30"><Building2 size={24} /></div><div><h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tight">تفاصيل فاتورة الشراء</h2><div className="flex items-center gap-2 mt-1"><span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">#{invoice.invoice_number ?? '---'}</span><span className="text-[10px] text-gray-400 dark:text-slate-500">{invoice.issue_date}</span></div></div></div>
        <div className="flex items-center gap-2">
            <button onClick={onDecrease} disabled={size === 'lg'} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg disabled:opacity-30" title="تصغير"><Minimize2 size={18} /></button>
            <button onClick={onIncrease} disabled={size === 'full'} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg disabled:opacity-30" title="تكبير"><Maximize2 size={18} /></button>
            <button onClick={onToggle} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title={size === 'full' ? 'خروج' : 'ملء الشاشة'}>{size === 'full' ? <Shrink size={18} /> : <Expand size={18} />}</button>
            <button onClick={onShare} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100" title="مشاركة إكسل عبر الواتساب"><Share2 size={18} /><span className="hidden sm:inline font-bold text-sm">مشاركة إكسل</span></button>
            <button onClick={onPrint} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-600" title="طباعة"><Printer size={20} /></button>
            <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 rounded-xl" title="إغلاق"><X size={24} /></button>
        </div>
    </div>
);

const shareInvoice = async (invoice: PurchaseDetailInvoice, companyName: string, showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void): Promise<void> => {
    try {
        const { generateInvoiceExcelBlob, exportInvoiceToExcel } = await import('../../../core/utils/invoiceExcelExporter');
        const invoiceNumber = invoice.invoice_number ?? '';
        const data = { companyName, companyAddress: '', taxNumber: '', invoiceNumber, issueDate: invoice.issue_date, customerName: invoice.party?.name ?? '---', issuedBy: 'النظام', items: (invoice.invoice_items ?? []).map(item => ({ name: item.product?.name_ar ?? item.description ?? '---', quantity: item.quantity, unitPrice: item.unit_price, total: item.total })), subtotal: invoice.total_amount, totalAmount: invoice.total_amount };
        const blob = await generateInvoiceExcelBlob(data);
        const file = new File([blob], `فاتورة_شراء_${invoiceNumber}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) { void navigator.share({ files: [file], title: `فاتورة شراء ${invoiceNumber}`, text: `مرفق فاتورة شراء رقم ${invoiceNumber}` }); }
        else { await exportInvoiceToExcel(data); alert('تم تنزيل الفاتورة بنجاح. يمكنك الآن إرسالها للجهة المطلوبة.'); }
    } catch (error) { console.error('Share invoice failed', error); showToast('فشل في مشاركة الفاتورة', 'error'); }
};

const getPaymentMethod = (method: string | null): 'credit' | 'cash' => method === 'credit' ? 'credit' : 'cash';

const DebugAccounting = ({ invoice, user, showToast }: { invoice: PurchaseDetailInvoice; user: NonNullable<ReturnType<typeof useAuth>['user']>; showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void }): React.ReactElement => {
    const run = async (): Promise<void> => {
        try {
            const { purchaseAccountingService } = await import('../services/purchaseAccounting');
            purchaseAccountingService.handleNewPurchase(invoice.id, { supplierId: invoice.party_id, invoiceNumber: invoice.invoice_number ?? '', items: [], issueDate: invoice.issue_date, status: 'posted', paymentMethod: getPaymentMethod(invoice.payment_method), cashAccountId: undefined }, invoice.company_id, user.id, invoice.total_amount);
            showToast('Accounting Run Successfully! Check Ledger.', 'success');
        } catch (error: unknown) { showToast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error'); console.error(error); }
    };
    return <button onClick={() => { void run(); }} className="px-6 py-2.5 text-rose-600 font-bold hover:bg-rose-50 rounded-xl">Debug Accounting</button>;
};

const toggleSize = (current: ModalSize): ModalSize => current === 'full' ? '3xl' : 'full';

const ModalFooter = ({ invoice, user, onClose, showToast }: { invoice: PurchaseDetailInvoice | null; user: NonNullable<ReturnType<typeof useAuth>['user']> | null; onClose: () => void; showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void }): React.ReactElement => (
    <div className="flex items-center justify-end gap-3 px-8 py-4 border-t border-gray-100 bg-gray-50/50">{import.meta.env.DEV && user !== null && invoice !== null && <DebugAccounting invoice={invoice} user={user} showToast={showToast} />}<button onClick={onClose} className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg">إغلاق</button></div>
);

const ModalBody = ({ invoice, isLoading, printRef }: { invoice: PurchaseDetailInvoice | null; isLoading: boolean; printRef: React.RefObject<HTMLDivElement | null> }): React.ReactElement => <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-slate-900">{isLoading ? <div className="flex flex-col items-center justify-center h-64 gap-4"><Loader2 className="animate-spin text-blue-600" size={40} /><p className="text-sm font-bold text-gray-500">جاري تحميل بيانات الفاتورة...</p></div> : invoice ? <PurchaseInvoicePrintTemplate ref={printRef} invoice={invoice} /> : <div className="text-center py-20 text-gray-400"><FileText size={64} className="mx-auto mb-4 opacity-10" /><p className="text-xl font-bold">لا يمكن العثور على بيانات الفاتورة</p></div>}</div>;

const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({ invoiceId, onClose }) => {
    const { data, isLoading } = usePurchaseDetails(invoiceId);
    // Fix: `useQuery` returns `data === undefined` during the first load (or on error).
    // The `invoice !== null` guard below would then let `undefined` through and crash
    // on `invoice.invoice_number` (TypeError: Cannot read properties of undefined).
    // Normalize `undefined` -> `null` so the guard behaves correctly.
    const invoice = (data ?? null) as PurchaseDetailInvoice | null;
    const { user } = useAuth();
    const { showToast } = useFeedbackStore();
    const printRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<ModalSize>('3xl');
    const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: ` فاتورة مشتريات #${invoice?.invoice_number ?? ''}` });
    if (invoiceId === null) return null;
    const changeSize = (delta: number): void => { setSize(current => getAdjacentSize(current, delta)); };
    const companyName = user?.company_name ?? 'شركتي';
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200"><div className={cn('bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full my-auto flex flex-col max-h-[90vh] border border-gray-100 transition-all duration-300', getSizeClass(size), size === 'full' ? 'max-h-[98vh]' : '')}>
        {invoice !== null && <ModalHeader invoice={invoice} size={size} onDecrease={() => { changeSize(-1); }} onIncrease={() => { changeSize(1); }} onToggle={() => { setSize(toggleSize); }} onShare={() => { void shareInvoice(invoice, companyName, showToast); }} onPrint={() => { handlePrint(); }} onClose={onClose} />}
        <ModalBody invoice={invoice} isLoading={isLoading} printRef={printRef} />
        <ModalFooter invoice={invoice} user={user} onClose={onClose} showToast={showToast} />
    </div></div>;
};

export default PurchaseDetailsModal;
