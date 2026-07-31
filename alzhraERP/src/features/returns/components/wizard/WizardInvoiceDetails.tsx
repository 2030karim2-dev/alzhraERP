import React from 'react';
import { Calendar, Building2, Package, Hash } from 'lucide-react';
import { Invoice } from '../../types';

interface Props {
    selectedInvoice: Invoice;
}

export const WizardInvoiceDetails: React.FC<Props> = ({ selectedInvoice }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 border-dashed">
            <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Hash size={12} />
                    رقم الفاتورة
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {selectedInvoice.invoice_number || 'N/A'}
                </p>
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 size={12} />
                    الطرف المؤسسي
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {selectedInvoice.party?.name || '-'}
                </p>
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar size={12} />
                    تاريخ الإصدار
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {selectedInvoice.issue_date?.split('T')[0] || '-'}
                </p>
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Package size={12} />
                    عدد الأصناف
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-md font-mono">
                        {selectedInvoice.invoice_items?.length || 0}
                    </span>
                </p>
            </div>
        </div>
    );
};
