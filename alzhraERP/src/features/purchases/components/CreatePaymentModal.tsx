import React, { useState } from 'react';
import { X, Loader2, Search, Banknote, Calendar, ShieldCheck } from 'lucide-react';
import { useCreatePayment } from '../hooks';
import { useParties } from '../../parties/hooks';
import type { Party } from '../../parties/types';
import { formatCurrency } from '../../../core/utils';

interface CreatePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SupplierPickerProps {
    selectedSupplier: Party | null;
    supplierQuery: string;
    isDropdownOpen: boolean;
    suppliers: Party[];
    onQueryChange: (query: string) => void;
    onSelect: (supplier: Party) => void;
    onClear: () => void;
}

interface PaymentFieldsProps {
    amount: string;
    method: 'cash' | 'bank';
    date: string;
    onAmountChange: (value: string) => void;
    onMethodChange: (value: 'cash' | 'bank') => void;
    onDateChange: (value: string) => void;
}

const SupplierPicker: React.FC<SupplierPickerProps> = ({ selectedSupplier, supplierQuery, isDropdownOpen, suppliers, onQueryChange, onSelect, onClear }) => (
    <div className="space-y-2">
        <label htmlFor="purchase-payment-supplier" className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block">المورد المستفيد</label>
        {selectedSupplier === null ? (
            <div className="relative">
                <input id="purchase-payment-supplier" type="text" value={supplierQuery} onChange={event => { onQueryChange(event.target.value); }} placeholder="ابحث عن اسم المورد..." className="w-full pl-4 pr-11 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:text-slate-100 font-bold transition-all" dir="ltr" />
                <Search className="absolute right-4 top-3.5 text-gray-400 dark:text-slate-500" size={20} />
                {isDropdownOpen && supplierQuery.length > 1 && <div className="absolute w-full mt-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg shadow-2xl max-h-48 overflow-y-auto z-10 animate-in fade-in slide-in-from-top-2">
                    {suppliers.map(supplier => <button key={supplier.id} type="button" onClick={() => { onSelect(supplier); }} className="w-full p-4 hover:bg-purple-50 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-50 dark:border-slate-800/50 last:border-none flex justify-between items-center group transition-colors text-right">
                        <span className="font-extrabold text-gray-700 dark:text-slate-200 group-hover:text-purple-600 transition-colors">{supplier.name}</span>
                        <span dir="ltr" className={`text-xs px-2 py-1 rounded-md font-bold border ${(supplier.balance ?? 0) < 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'}`}>{formatCurrency(supplier.balance ?? 0)}</span>
                    </button>)}
                </div>}
            </div>
        ) : (
            <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-900/30 transition-colors">
                <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-md bg-purple-200 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold">{selectedSupplier.name.charAt(0)}</div><div><div className="font-extrabold text-gray-800 dark:text-slate-100">{selectedSupplier.name}</div><div dir="ltr" className="text-xs text-gray-500 dark:text-slate-500 font-bold mt-0.5">الرصيد: <span className={(selectedSupplier.balance ?? 0) < 0 ? 'text-red-500' : 'text-emerald-500'}>{formatCurrency(selectedSupplier.balance ?? 0)}</span></div></div></div>
                <button type="button" onClick={() => { onClear(); }} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 text-gray-400 hover:text-red-500 rounded-md transition-all shadow-sm"><X size={18} /></button>
            </div>
        )}
    </div>
);

const PaymentFields: React.FC<PaymentFieldsProps> = ({ amount, method, date, onAmountChange, onMethodChange, onDateChange }) => (
    <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2"><label htmlFor="purchase-payment-amount" className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block">المبلغ المدفوع</label><div className="relative"><input id="purchase-payment-amount" type="number" step="0.01" value={amount} onChange={event => { onAmountChange(event.target.value); }} className="w-full pl-4 pr-11 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono font-bold text-xl dark:text-slate-100 transition-all text-left" placeholder="0.00" required dir="ltr" /><div className="absolute right-3.5 top-4 text-gray-400 dark:text-slate-500 text-[10px] font-bold">SAR</div></div></div>
        <div className="space-y-2"><label htmlFor="purchase-payment-method" className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block">طريقة الدفع</label><select id="purchase-payment-method" value={method} onChange={event => { onMethodChange(event.target.value as 'cash' | 'bank'); }} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:text-slate-100 font-bold transition-all"><option value="cash">نقداً</option><option value="bank">تحويل بنكي</option></select></div>
        <div className="space-y-2"><label htmlFor="purchase-payment-date" className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block">تاريخ السند</label><div className="relative"><input id="purchase-payment-date" type="date" value={date} onChange={event => { onDateChange(event.target.value); }} className="w-full pl-4 pr-11 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:text-slate-100 font-bold transition-all" required dir="ltr" /><Calendar className="absolute right-3.5 top-3.5 text-gray-400 dark:text-slate-500" size={18} /></div></div>
    </div>
);

interface PaymentFooterProps { isPending: boolean; canSubmit: boolean; onClose: () => void; }
const PaymentFooter: React.FC<PaymentFooterProps> = ({ isPending, canSubmit, onClose }) => (
    <div className="pt-2 flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-3.5 text-gray-600 dark:text-slate-400 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-all shadow-sm">إلغاء</button><button type="submit" disabled={isPending || !canSubmit} className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-lg shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">{isPending ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}<span>حفظ وترحيل السند</span></button></div>
);

const CreatePaymentModal: React.FC<CreatePaymentModalProps> = ({ isOpen, onClose }) => {
    const { mutate: createPayment, isPending } = useCreatePayment();
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState<'cash' | 'bank'>('cash');
    const [notes, setNotes] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState<Party | null>(null);
    const [supplierQuery, setSupplierQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { data: suppliers } = useParties('supplier', supplierQuery);

    const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>): void => {
        event.preventDefault();
        if (selectedSupplier === null || amount === '') return;
        createPayment({ supplierId: selectedSupplier.id, amount: parseFloat(amount), date, method, notes }, { onSuccess: () => { onClose(); setAmount(''); setSelectedSupplier(null); setSupplierQuery(''); setNotes(''); setMethod('cash'); } });
    };
    const selectSupplier = (supplier: Party): void => { setSelectedSupplier(supplier); setSupplierQuery(''); setIsDropdownOpen(false); };
    if (!isOpen) return null;
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"><div className="bg-white dark:bg-slate-900 rounded-none shadow-2xl w-full max-w-lg my-auto animate-in fade-in zoom-in duration-200 border dark:border-slate-800"><div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 rounded-none"><div className="flex items-center gap-3"><div className="p-2 bg-purple-600/10 rounded-md text-purple-600"><Banknote size={24} /></div><div><h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">سند صرف جديد</h2><p className="text-xs text-gray-500 dark:text-slate-400 font-medium">تسجيل دفعة نقدية أو بنكية للمورد</p></div></div><button type="button" onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button></div><form onSubmit={handleSubmit} className="p-6 space-y-6"><SupplierPicker selectedSupplier={selectedSupplier} supplierQuery={supplierQuery} isDropdownOpen={isDropdownOpen} suppliers={suppliers} onQueryChange={query => { setSupplierQuery(query); setIsDropdownOpen(true); }} onSelect={selectSupplier} onClear={() => { setSelectedSupplier(null); }} /><PaymentFields amount={amount} method={method} date={date} onAmountChange={setAmount} onMethodChange={setMethod} onDateChange={setDate} /><div className="space-y-2"><label htmlFor="purchase-payment-notes" className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block">البيان / الوصف</label><textarea id="purchase-payment-notes" value={notes} onChange={event => { setNotes(event.target.value); }} className="w-full p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:text-slate-200 transition-all resize-none h-28" placeholder="مثال: دفعة من الحساب مقابل فاتورة رقم 102..." /></div><PaymentFooter isPending={isPending} canSubmit={selectedSupplier !== null && amount !== ''} onClose={onClose} /></form></div></div>;
};

export default CreatePaymentModal;
