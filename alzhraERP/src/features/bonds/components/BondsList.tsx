import React from 'react';
import { ArrowDownCircle, ArrowUpCircle, Printer, Calendar, User, FileText, Wallet, Trash2, MessageCircle } from 'lucide-react';
import { Bond } from '../types';
import { cn, formatCurrency } from '../../../core/utils';
import { useDeleteBond } from '../hooks';
import { exportSingleBondToExcel } from '../../../core/utils/bondExcelExporter';
import { useCompany } from '../../settings/hooks';
import { useInvoiceSettings } from '../../settings/settingsStore';

interface Props {
    bonds: Bond[];
    isLoading: boolean;
    searchTerm: string;
    displayMode?: 'table' | 'cards';
}

const BondsList: React.FC<Props> = ({ bonds, isLoading, searchTerm, displayMode = 'cards' }) => {
    const { mutate: deleteBond } = useDeleteBond();
    const { data: settingsCompany } = useCompany();
    const invoiceSettings = useInvoiceSettings();

    const filteredBonds = bonds?.filter(b =>
        b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.party_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.payment_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = (id: string, number: string) => {
        if (window.confirm(`هل أنت متأكد من حذف السند رقم (${number})؟`)) {
            deleteBond(id);
        }
    };

    const handleWhatsAppShare = async (bond: Bond) => {
        try {
            const company = {
                name_ar: invoiceSettings?.company_name_ar || settingsCompany?.name || 'اسم الشركة',
                address: invoiceSettings?.company_address || settingsCompany?.address || '',
                phone: invoiceSettings?.company_phone || settingsCompany?.phone || '',
                tax_number: settingsCompany?.tax_number || '---',
            };
            const { generateSingleBondExcelBlob, exportSingleBondToExcel } = await import('../../../core/utils/bondExcelExporter');
            
            const blob = generateSingleBondExcelBlob(company, bond);
            const bondTitle = bond.type === 'receipt' ? 'سند_قبض' : bond.type === 'payment' ? 'سند_صرف' : 'سند_تحويل';
            const file = new File([blob], `${bondTitle}_${bond.payment_number}.xlsx`, {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `${bondTitle.replace('_', ' ')} ${bond.payment_number}`,
                    text: `مرفق ${bondTitle.replace('_', ' ')} رقم ${bond.payment_number}`
                });
            } else {
                exportSingleBondToExcel(company, bond);
                const text = encodeURIComponent(`مرفق ${bondTitle.replace('_', ' ')} رقم ${bond.payment_number}.`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
            }
        } catch (err) {
            console.error('WhatsApp share failed', err);
        }
    };

    const handleExport = (bond: Bond) => {
        const company = {
            name_ar: invoiceSettings?.company_name_ar || settingsCompany?.name || 'اسم الشركة',
            address: invoiceSettings?.company_address || settingsCompany?.address || '',
            phone: invoiceSettings?.company_phone || settingsCompany?.phone || '',
            tax_number: settingsCompany?.tax_number || '---',
        };
        exportSingleBondToExcel(company, bond);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="font-bold text-[10px] text-gray-400 uppercase tracking-widest animate-pulse">
                    جاري تحميل السندات...
                </div>
            </div>
        );
    }

    if (filteredBonds?.length === 0) {
        return (
            <div className="p-20 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest border-2 border-dashed dark:border-slate-800 rounded-2xl flex flex-col items-center gap-3">
                <FileText size={48} strokeWidth={1} />
                لا توجد سندات تطابق بحثك في هذه الفئة
            </div>
        );
    }

    if (displayMode === 'table') {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full text-right border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-800 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                            <th className="px-4 py-3 font-bold">التاريخ</th>
                            <th className="px-4 py-3 font-bold">رقم السند</th>
                            <th className="px-4 py-3 font-bold">الحساب / الجهة</th>
                            <th className="px-4 py-3 font-bold">البيان</th>
                            <th className="px-4 py-3 font-bold">الطريقة</th>
                            <th className="px-4 py-3 font-bold">المبلغ</th>
                            <th className="px-4 py-3 font-bold text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                        {filteredBonds.map((bond) => (
                            <tr key={bond.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors group">
                                <td className="px-4 py-3 text-[11px] font-medium text-gray-500 dark:text-slate-400 font-mono">
                                    {bond.date}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("p-1 rounded-md", bond.type === 'receipt' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" : "bg-rose-50 text-rose-600 dark:bg-rose-900/20")}>
                                            {bond.type === 'receipt' ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
                                        </div>
                                        <span className="text-[11px] font-bold text-gray-900 dark:text-slate-100">
                                            {bond.payment_number}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-gray-800 dark:text-slate-200">{bond.party_name || bond.account_name}</span>
                                        {bond.party_name && bond.account_name !== bond.party_name && (
                                            <span className="text-[9px] text-gray-400">{bond.account_name}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-[11px] text-gray-600 dark:text-slate-400 truncate max-w-[200px]">
                                    {bond.description}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                        {bond.payment_method === 'cash' ? 'نقداً' : bond.payment_method === 'bank' ? 'بنك' : bond.payment_method}
                                    </span>
                                </td>
                                <td className="px-4 py-3 font-mono">
                                    <div className="flex flex-col items-end">
                                        <span className={cn("text-[11px] font-bold", bond.type === 'receipt' ? "text-emerald-600" : "text-rose-600")}>
                                            {bond.type === 'receipt' ? '+' : '-'}{formatCurrency(bond.amount, bond.currency_code)}
                                        </span>
                                        {bond.currency_code !== 'SAR' && bond.base_amount !== undefined && (
                                            <span className="text-[9px] font-medium text-blue-500">
                                                {formatCurrency(bond.base_amount)}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => handleWhatsAppShare(bond)} className="p-1.5 rounded-lg text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" title="إرسال عبر واتساب">
                                            <MessageCircle size={14} />
                                        </button>
                                        <button onClick={() => handleExport(bond)} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="تصدير إكسل / طباعة">
                                            <Printer size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(bond.id, bond.payment_number)} className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" title="حذف">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {filteredBonds?.map((bond) => (
                <div key={bond.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/30 transition-all group relative overflow-hidden">
                    {/* Style decoration */}
                    <div className={cn("absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20", bond.type === 'receipt' ? "bg-emerald-500" : "bg-rose-500")}></div>

                    <div className="flex justify-between items-start mb-4 relative">
                        <div className={cn("p-2 rounded-xl border transition-colors", bond.type === 'receipt' ? "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800/40" : "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800/40")}>
                            {bond.type === 'receipt' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                        </div>
                        <div className="text-left font-mono">
                            <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 block uppercase mb-1">المبلغ</span>
                            <span className={cn("text-lg font-black tracking-tighter", bond.type === 'receipt' ? "text-emerald-600" : "text-rose-600")}>
                                {bond.type === 'receipt' ? '+' : '-'}{formatCurrency(bond.amount, bond.currency_code)}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3 relative">
                        <div>
                            <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase flex items-center gap-1 mb-1">
                                <FileText size={10} /> {bond.payment_number}
                            </span>
                            <h4 className="font-bold text-gray-800 dark:text-slate-100 text-xs line-clamp-1">{bond.description || 'بدون بيان'}</h4>
                        </div>

                        <div className="flex items-center gap-2 py-2 border-y border-gray-50 dark:border-slate-800/50">
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                <User size={12} />
                            </div>
                            <span className="text-[11px] font-bold text-gray-600 dark:text-slate-400 truncate">
                                {bond.party_name || bond.account_name}
                            </span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-slate-500 font-bold">
                                    <Calendar size={10} />
                                    {bond.date}
                                </div>
                                <div className="flex items-center gap-1 text-[9px] text-blue-500 font-bold uppercase">
                                    <Wallet size={10} />
                                    {bond.payment_method === 'cash' ? 'نقداً' : bond.payment_method === 'bank' ? 'بنك' : bond.payment_method}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => handleWhatsAppShare(bond)} className="p-1.5 rounded-lg text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" title="واتساب">
                                    <MessageCircle size={14} />
                                </button>
                                <button onClick={() => handleExport(bond)} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="تصدير إكسل / طباعة">
                                    <Printer size={14} />
                                </button>
                                <button onClick={() => handleDelete(bond.id, bond.payment_number)} className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" title="حذف">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BondsList;
