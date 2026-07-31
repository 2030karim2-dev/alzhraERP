import React from 'react';
import { ReceiptText, Phone, Printer, X } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';

interface PaymentHeaderProps {
    itemCount: number;
    total: number;
    currency: string;
    validItems: Array<{ name: string; quantity: number; price: number; productId: string }>;
    onClose: () => void;
}

export const PaymentHeader: React.FC<PaymentHeaderProps> = ({
    itemCount, total, currency, validItems, onClose
}) => {
    const handleWhatsApp = () => {
        const lines = validItems.map(i => `• ${i.name} ×${i.quantity} = ${formatCurrency(i.price * i.quantity)}`);
        const msg = `🧾 *فاتورة نقطة المبيعات*\n━━━━━━━━━━━━━━\n${lines.join('\n')}\n━━━━━━━━━━━━━━\n💰 *الإجمالي:* ${formatCurrency(total)} ${currency}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 shrink-0">
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                    <ReceiptText size={15} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">إتمام عملية الدفع</h3>
                    <p className="text-[10px] text-slate-400 font-bold">{itemCount} أصناف</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleWhatsApp}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 hover:bg-emerald-100 transition-all active:scale-95 border border-emerald-100 dark:border-emerald-900/30"
                    title="إرسال بواتساب"
                >
                    <Phone size={14} />
                </button>
                <button
                    onClick={handlePrint}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
                    title="طباعة الفاتورة"
                >
                    <Printer size={14} />
                </button>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                    <X size={15} />
                </button>
            </div>
        </div>
    );
};

export default PaymentHeader;