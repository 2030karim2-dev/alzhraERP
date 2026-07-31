
import React, { useRef, useState } from 'react';
import { X, FileText, Printer, Loader2, Building2, Maximize2, Minimize2, Expand, Shrink, Share2 } from 'lucide-react';
import { usePurchaseDetails } from '../hooks';
import { cn } from '../../../core/utils';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../../features/auth';
import { useFeedbackStore } from '../../../features/feedback/store';
import PurchaseInvoicePrintTemplate from './PurchaseInvoicePrintTemplate';

interface PurchaseDetailsModalProps {
    invoiceId: string | null;
    onClose: () => void;
    onReturn?: (invoiceId: string, items: any[]) => void;
}

const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({ invoiceId, onClose }) => {
    const { data: _invoice, isLoading } = usePurchaseDetails(invoiceId);
    const invoice = _invoice as any;
    const { user } = useAuth();
    const { showToast } = useFeedbackStore();
    const printRef = useRef<HTMLDivElement>(null);
    const [_isResizable, _setIsResizable] = useState(true);
    const [modalSize, setModalSize] = useState<'lg' | 'xl' | '2xl' | '3xl' | 'full'>('3xl');


    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: ` فاتورة مشتريات #${invoice?.invoice_number}`,
        onAfterPrint: () => console.info('Print success'),
    });

    // Size controls
    const sizeOrder: Array<'lg' | 'xl' | '2xl' | '3xl' | 'full'> = ['lg', 'xl', '2xl', '3xl', 'full'];
    const sizeClasses: Record<string, string> = {
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-5xl',
        full: 'max-w-[98vw]'
    };

    const handleIncreaseSize = () => {
        const currentIndex = sizeOrder.indexOf(modalSize);
        if (currentIndex < sizeOrder.length - 1) setModalSize(sizeOrder[currentIndex + 1]);
    };

    const handleDecreaseSize = () => {
        const currentIndex = sizeOrder.indexOf(modalSize);
        if (currentIndex > 0) setModalSize(sizeOrder[currentIndex - 1]);
    };

    const toggleFullscreen = () => setModalSize(prev => prev === 'full' ? '3xl' : 'full');



    const handleShareWhatsApp = async () => {
        if (!invoice) return;
        try {
            const { generateInvoiceExcelBlob, exportInvoiceToExcel } = await import('../../../core/utils/invoiceExcelExporter');
            
            const data = {
                companyName: 'الزهراء لقطع الغيار', // Ideally from context
                companyAddress: '',
                taxNumber: '',
                invoiceNumber: invoice.invoice_number,
                issueDate: invoice.issue_date,
                customerName: invoice.parties?.name || '---',
                issuedBy: 'النظام',
                items: (invoice.invoice_items || []).map((it: any) => ({
                    name: it.product?.name_ar || it.description || '---',
                    quantity: it.quantity,
                    unitPrice: it.unit_price,
                    total: it.total,
                })),
                subtotal: invoice.total_amount,
                totalAmount: invoice.total_amount,
            };

            const blob = generateInvoiceExcelBlob(data);
            const file = new File([blob], `فاتورة_شراء_${invoice.invoice_number}.xlsx`, {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `فاتورة شراء ${invoice.invoice_number}`,
                    text: `مرفق فاتورة شراء رقم ${invoice.invoice_number}`
                });
            } else {
                // Fallback
                exportInvoiceToExcel(data);
                const text = encodeURIComponent(`مرفق فاتورة شراء رقم ${invoice.invoice_number}.`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
            }
        } catch (err) {
            console.error('Share via WhatsApp failed', err);
        }
    };

    if (!invoiceId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className={cn(
                "bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full my-auto flex flex-col max-h-[90vh] border border-gray-100 dark:border-slate-800 transition-all duration-300",
                sizeClasses[modalSize],
                modalSize === 'full' && 'max-h-[98vh]'
            )}>

                {/* Header Actions - No Print */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-t-[2rem] sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tight">تفاصيل فاتورة الشراء</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    #{invoice?.invoice_number || '---'}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-slate-500">{invoice?.issue_date}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Resize Controls */}
                        <button onClick={handleDecreaseSize} disabled={modalSize === 'lg'} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-30" title="تصغير">
                            <Minimize2 size={18} />
                        </button>
                        <button onClick={handleIncreaseSize} disabled={modalSize === 'full'} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-30" title="تكبير">
                            <Maximize2 size={18} />
                        </button>
                        <button onClick={toggleFullscreen} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title={modalSize === 'full' ? 'خروج' : 'ملء الشاشة'}>
                            {modalSize === 'full' ? <Shrink size={18} /> : <Expand size={18} />}
                        </button>
                        <button
                            onClick={handleShareWhatsApp}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl transition-colors border border-emerald-100 dark:border-emerald-800/20 shadow-sm"
                            title="مشاركة إكسل عبر الواتساب"
                        >
                            <Share2 size={18} />
                            <span className="hidden sm:inline font-bold text-sm">مشاركة إكسل</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            className="p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all shadow-sm"
                            title="طباعة"
                        >
                            <Printer size={20} />
                        </button>
                        <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-slate-900">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <Loader2 className="animate-spin text-blue-600" size={40} />
                            <p className="text-sm font-bold text-gray-500">جاري تحميل بيانات الفاتورة...</p>
                        </div>
                    ) : invoice ? (
                        <PurchaseInvoicePrintTemplate ref={printRef} invoice={invoice} />
                    ) : (
                        <div className="text-center py-20 text-gray-400 dark:text-slate-600">
                            <FileText size={64} className="mx-auto mb-4 opacity-10" />
                            <p className="text-xl font-bold">لا يمكن العثور على بيانات الفاتورة</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 rounded-b-[2rem] flex justify-end gap-3 transition-colors">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-bold rounded-xl border border-gray-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                    >
                        <Printer size={18} />
                        <span>طباعة</span>
                    </button>

                    <button
                        onClick={async () => {
                            if (!user) {
                                showToast('Please login first to use debug features', 'warning');
                                return;
                            }
                            try {
                                console.info('Debugging Accounting for Invoice:', invoice.invoice_number);
                                const { purchaseAccountingService } = await import('../services/purchaseAccounting');
                                await purchaseAccountingService.handleNewPurchase(
                                    invoice.id,
                                    {
                                        supplierId: invoice.party_id,
                                        invoiceNumber: invoice.invoice_number,
                                        items: [],
                                        issueDate: invoice.issue_date,
                                        status: 'posted',
                                        paymentMethod: invoice.payment_method,
                                        cashAccountId: undefined
                                    },
                                    invoice.company_id,
                                    user.id,
                                    invoice.total_amount
                                );
                                showToast('Accounting Run Successfully! Check Ledger.', 'success');
                            } catch (err: unknown) {
                                const e = err as Error;
                                showToast(`Error: ${e.message}`, 'error');
                                console.error(err);
                            }
                        }}
                        className="px-6 py-2.5 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all"
                    >
                        Debug Accounting
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-900 dark:bg-slate-700 text-white font-bold hover:bg-black dark:hover:bg-slate-600 rounded-xl transition-all shadow-lg shadow-gray-900/10"
                    >
                        إغلاق
                    </button>

                </div>
            </div>
        </div>
    );
};

export default PurchaseDetailsModal;
