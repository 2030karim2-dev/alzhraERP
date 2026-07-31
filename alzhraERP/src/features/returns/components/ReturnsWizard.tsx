import React, { useRef } from 'react';
import { Package, Save, Receipt, Loader2, ListPlus } from 'lucide-react';
import { ReturnType, Invoice } from '../types';
import { formatCurrency } from '../../../core/utils';
import { useDraggableModal } from '../../../ui/hooks/useDraggableModal';
import { useReturnWizard } from '../hooks/useReturnWizard';

import { WizardDraggableHeader } from './wizard/WizardDraggableHeader';
import { WizardAlerts } from './wizard/WizardAlerts';
import { WizardInvoiceDetails } from './wizard/WizardInvoiceDetails';
import { WizardReturnReason } from './wizard/WizardReturnReason';
import { WizardReturnStatus } from './wizard/WizardReturnStatus';
import { WizardSummary } from './wizard/WizardSummary';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    returnType: ReturnType;
    invoices?: Invoice[];
    partyId?: string;
    onSubmit?: (data: any) => void;
    onSuccess?: () => void;
}

const ReturnsWizard: React.FC<Props> = ({ isOpen, onClose, returnType, invoices: propInvoices, partyId, onSubmit, onSuccess }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    const { handleMouseDown } = useDraggableModal(modalRef, isOpen);

    const {
        step,
        invoices,
        isLoadingInvoices,
        isCreating,
        selectedInvoice,
        returnQuantities,
        selectedItems,
        totalAmount,
        totalItemsCount,
        hasValidItems,
        validationErrors,
        register,
        handleSubmit,
        handleItemSelect,
        handleQuantityChange,
        handleInvoiceSelect,
        handleFormSubmit,
        handleClose
    } = useReturnWizard(returnType, propInvoices, partyId, onSubmit, onSuccess, onClose);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
            <div
                ref={modalRef}
                className="absolute bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/50 dark:border-slate-700/50 animate-in zoom-in-95 duration-200"
            >
                <WizardDraggableHeader returnType={returnType} handleMouseDown={handleMouseDown} onClose={handleClose} />

                {/* Body Content - Scrollable */}
                <div className="flex-1 overflow-y-auto no-drag relative pb-40">
                    {/* Visual Progress Steps */}
                    <div className="flex items-center justify-center gap-4 py-8 bg-slate-50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50">
                        <div className={`flex items-center gap-3 transition-colors ${step === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${step === 1 ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>1</div>
                            <span className="font-bold text-sm tracking-tight">اختيار الفاتورة</span>
                        </div>
                        <div className="w-16 h-px bg-slate-200 dark:bg-slate-700" />
                        <div className={`flex items-center gap-3 transition-colors ${step === 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${step === 2 ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>2</div>
                            <span className="font-bold text-sm tracking-tight">تفاصيل المرتجع</span>
                        </div>
                    </div>

                    <WizardAlerts validationErrors={validationErrors} />

                    {step === 1 && (
                        <div className="p-8 pb-32">
                            {/* Invoice selection layout */}
                            {isLoadingInvoices ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <Loader2 size={48} className="animate-spin mb-4" />
                                    <p className="font-bold tracking-widest uppercase text-xs">جاري تحميل الفواتير...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {invoices?.map((invoice: Invoice) => (
                                        <div
                                            key={invoice.id}
                                            onClick={() => handleInvoiceSelect(invoice.id)}
                                            className="group p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-all duration-300 relative overflow-hidden"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    <Receipt size={24} />
                                                </div>
                                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest font-mono group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {invoice.invoice_number}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 truncate">
                                                {invoice.party?.name || 'عميل نقدي'}
                                            </h4>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500">التاريخ</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                                                        {invoice.issue_date?.split('T')[0]}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-500">القيمة الإجمالية</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                                                        {formatCurrency(invoice.total_amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {invoices?.length === 0 && (
                                        <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">لا توجد فواتير متاحة للإرجاع</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && selectedInvoice && (
                        <div className="flex flex-col md:flex-row min-h-full">
                            {/* Left Content Area */}
                            <div className="flex-1 p-8 space-y-8 md:pr-80">
                                <WizardInvoiceDetails selectedInvoice={selectedInvoice} />

                                {/* Items Selection */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                                            <ListPlus size={20} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tighter">قائمة الأصناف</h3>
                                    </div>
                                    <div className="border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden">
                                        <table className="w-full text-right bg-white dark:bg-slate-900">
                                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
                                                <tr>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">تحديد</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">الصنف</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">الكمية المباعة</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-40">كمية الإرجاع</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">قيمة الإرجاع</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                                                {selectedInvoice.invoice_items?.map((item: any) => (
                                                    <tr key={item.id} className={`transition-colors duration-300 ${selectedItems[item.id] ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="relative flex items-center justify-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedItems[item.id] || false}
                                                                    onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                                                                    className="peer w-5 h-5 appearance-none rounded-lg border-2 border-slate-300 dark:border-slate-600 checked:bg-blue-500 checked:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
                                                                />
                                                                <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                                    <Package size={16} className="text-slate-500" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.description || item.product?.name}</p>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">الوحدة: {formatCurrency(item.unit_price)}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold font-mono text-slate-600 dark:text-slate-400 inline-block">
                                                                {item.quantity}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-center">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={item.quantity}
                                                                    value={returnQuantities[item.id] || ''}
                                                                    onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0, item.quantity)}
                                                                    className={`w-20 px-3 py-2 text-center text-sm font-bold font-mono rounded-xl border focus:outline-none focus:ring-4 transition-all
                                                                        ${returnQuantities[item.id] > 0
                                                                            ? 'border-blue-500 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-blue-500/20 shadow-inner'
                                                                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                                                                        }`}
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-left">
                                                            <span className={`font-black font-mono text-sm tracking-tighter ${returnQuantities[item.id] > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                                                                {formatCurrency((returnQuantities[item.id] || 0) * item.unit_price)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <WizardReturnReason register={register} />
                                <WizardReturnStatus register={register} />

                                <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                    <label className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">ملاحظات إضافية</label>
                                    <textarea
                                        {...register('notes')}
                                        rows={3}
                                        placeholder="اكتب أي ملاحظات أو تفاصيل إضافية حول المرتجع..."
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none shadow-inner"
                                    />
                                </div>
                            </div>
                            
                            {/* Right Sidebar - Summary overlay on desktop */}
                            <WizardSummary totalItemsCount={totalItemsCount} totalAmount={totalAmount} />
                        </div>
                    )}
                </div>

                {/* Fixed Footer */}
                <div className="absolute bottom-0 left-0 w-full p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 no-drag flex justify-between items-center z-20">
                    <button
                        onClick={handleClose}
                        className="px-8 py-4 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                    >
                        إلغاء المعالجة
                    </button>
                    {step === 2 && (
                        <button
                            onClick={handleSubmit(handleFormSubmit)}
                            disabled={!hasValidItems || isCreating}
                            className={`group flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-sm font-black transition-all duration-300 ${hasValidItems && !isCreating
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed hidden md:flex'
                                } w-full md:w-auto`}
                        >
                            {isCreating ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <Save size={20} className="group-hover:scale-110 transition-transform" />
                            )}
                            {isCreating ? 'جاري المعالجة...' : 'تأكيد وإصدار المرتجع'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReturnsWizard;
