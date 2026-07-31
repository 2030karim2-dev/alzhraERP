
import React from 'react';
import ExcelTable from '../../../ui/common/ExcelTable';
import MicroListItem from '../../../ui/common/MicroListItem';
import { formatCurrency } from '../../../core/utils';
import { Eye, Trash2, ArrowLeftRight, FileText, ShoppingCart, Printer, Edit } from 'lucide-react';

import { useDeletePurchase } from '../hooks';

interface PurchasesTableProps {
    data: any[];
    isLoading: boolean;
    onView: (id: string) => void;
}

const PurchasesTable: React.FC<PurchasesTableProps> = ({ data, isLoading, onView }) => {
    const { mutate: deletePurchase, isPending: isDeleting } = useDeletePurchase();

    if (isLoading) {
        return <div className="p-12 text-center text-gray-500 animate-pulse">جاري مزامنة سجلات التوريد...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Mobile View: Micro UI Cards */}
            <div className="grid grid-cols-1 md:hidden gap-2">
                {data.map(item => (
                    <MicroListItem
                        key={item.id}
                        icon={item.type === 'return_purchase' ? ArrowLeftRight : ShoppingCart}
                        iconColorClass={item.type === 'return_purchase' ? 'text-rose-500' : 'text-blue-500'}
                        title={item.party?.name || 'مورد عام'}
                        subtitle={`#${item.invoice_number} | ${item.issue_date}`}
                        onClick={() => onView(item.id)}
                        tags={[{ label: item.status, color: item.status === 'posted' ? 'emerald' : 'slate' }]}
                        actions={
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                    <button className="p-1 text-gray-500"><Printer size={16} /></button>
                                    <p dir="ltr" className="font-mono font-bold text-sm">{formatCurrency(item.total_amount, item.currency_code)}</p>
                                </div>
                                {item.currency_code && item.currency_code !== 'SAR' && (
                                    <p dir="ltr" className="text-xs font-bold text-blue-500">{formatCurrency((item.total_amount || 0) * (item.exchange_rate || 1))}</p>
                                )}
                            </div>
                        }
                    />
                ))}
            </div>

            {/* Desktop View: Full Excel Table */}
            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <ExcelTable
                    columns={[
                        {
                            header: 'رقم الفاتورة',
                            accessor: (row: any) => (
                                <div className="flex items-center gap-2">
                                    {row.type === 'return_purchase' && <ArrowLeftRight size={14} className="text-red-500" />}
                                    <span dir="ltr" className={`font-mono font-bold ${row.type === 'return_purchase' ? 'text-red-700' : 'text-blue-700'}`}>
                                        {row.invoice_number}
                                    </span>
                                </div>
                            ),
                            width: 'w-40'
                        },
                        { header: 'التاريخ', accessor: (row: any) => <span dir="ltr" className="text-gray-500 font-mono font-bold">{row.issue_date}</span>, width: 'w-32' },
                        { header: 'المورد المستلم', accessor: (row: any) => <span className="font-bold text-gray-800 dark:text-slate-200">{row.party?.name || 'مورد عام'}</span> },
                        {
                            header: 'طريقة الدفع',
                            accessor: (row: any) => (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.payment_method === 'cash'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    }`}>
                                    {row.payment_method === 'cash' ? 'نقدي' : 'أجل'}
                                </span>
                            ),
                            width: 'w-24',
                            className: 'text-center'
                        },
                        {
                            header: 'إجمالي (الأساسي)',
                            accessor: (row: any) => {
                                const baseAmount = row.currency_code === 'SAR' ? row.total_amount : (row.total_amount || 0) * (row.exchange_rate || 1);
                                return (
                                    <div className="flex flex-col items-end">
                                        <span dir="ltr" className={`font-bold font-mono leading-none ${row.type === 'return_purchase' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {formatCurrency(row.total_amount, row.currency_code)}
                                        </span>
                                        {(row.currency_code && row.currency_code !== 'SAR') && (
                                            <span dir="ltr" className="text-xs font-bold text-blue-500 mt-1">
                                                {formatCurrency(baseAmount)}
                                            </span>
                                        )}
                                    </div>
                                );
                            },
                            className: 'text-left'
                        },
                        {
                            header: 'إجراءات',
                            accessor: (row: any) => (
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button title="عرض التفاصيل" onClick={() => onView(row.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={18} /></button>
                                    <button title="طباعة الفاتورة" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"><Printer size={18} /></button>
                                    <button title="القيد المحاسبي" className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><FileText size={18} /></button>
                                    <button title="تعديل" className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Edit size={18} /></button>
                                    <button
                                        title="حذف"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إلغاء أثرها المالي والمخزني.')) {
                                                deletePurchase(row.id);
                                            }
                                        }}
                                        disabled={isDeleting}
                                        className="p-1.5 text-rose-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ),
                            width: 'w-48',
                            className: 'text-center group' // Added group class for hover effect if supported
                        }
                    ]}
                    data={data}
                    colorTheme="blue"
                />
            </div>
        </div>
    );
};

export default PurchasesTable;
