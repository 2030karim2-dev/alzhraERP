import React from 'react';
import ExcelTable from '../../../ui/common/ExcelTable';
import MicroListItem from '../../../ui/common/MicroListItem';
import { formatCurrency } from '../../../core/utils';
import { Eye, Trash2, ArrowLeftRight, ShoppingCart, Printer } from 'lucide-react';
import { useDeletePurchase } from '../hooks';

export interface PurchaseTableRow {
    id: string;
    type: string;
    party: { name: string | null } | null;
    invoice_number: string | null;
    issue_date: string;
    status: string;
    payment_method: string | null;
    total_amount: number;
    currency_code: string | null;
    exchange_rate: number | null;
}
interface PurchasesTableProps { data: PurchaseTableRow[]; isLoading: boolean; onView: (id: string) => void; }
type DeletePurchase = (id: string) => void;

const getSupplierName = (row: PurchaseTableRow): string => row.party?.name ?? 'مورد عام';
const getBaseAmount = (row: PurchaseTableRow): number => row.currency_code === 'SAR' ? row.total_amount : row.total_amount * (row.exchange_rate ?? 1);
const hasForeignCurrency = (row: PurchaseTableRow): boolean => row.currency_code !== null && row.currency_code !== '' && row.currency_code !== 'SAR';

const MobilePurchaseList = ({ data, onView }: { data: PurchaseTableRow[]; onView: (id: string) => void }): React.ReactElement => (
    <div className="grid grid-cols-1 md:hidden gap-2">{data.map(item => <MicroListItem key={item.id} icon={item.type === 'return_purchase' ? ArrowLeftRight : ShoppingCart} iconColorClass={item.type === 'return_purchase' ? 'text-rose-500' : 'text-blue-500'} title={getSupplierName(item)} subtitle={`#${item.invoice_number ?? ''} | ${item.issue_date}`} onClick={() => { onView(item.id); }} tags={[{ label: item.status === 'paid' ? 'مدفوع' : item.status === 'posted' ? 'مرحّل' : 'مسودة', color: item.status === 'paid' ? 'emerald' : item.status === 'posted' ? 'blue' : 'slate' }]} actions={<div className="flex flex-col items-end gap-1"><div className="flex items-center gap-2"><button className="p-1 text-gray-500 hover:text-blue-600"><Printer size={16} /></button><p dir="ltr" className="font-mono font-bold text-sm">{formatCurrency(item.total_amount, item.currency_code ?? undefined)}</p></div>{hasForeignCurrency(item) && <p dir="ltr" className="text-xs font-bold text-blue-500">{formatCurrency(getBaseAmount(item))}</p>}</div>} />)}</div>
);

const invoiceColumn = { header: 'رقم الفاتورة', accessor: (row: PurchaseTableRow): React.ReactElement => <div className="flex items-center gap-2">{row.type === 'return_purchase' && <ArrowLeftRight size={14} className="text-red-500" />}<span dir="ltr" className={`font-mono font-bold ${row.type === 'return_purchase' ? 'text-red-700' : 'text-blue-700'}`}>{row.invoice_number ?? ''}</span></div>, width: 'w-40' };
const dateColumn = { header: 'التاريخ', accessor: (row: PurchaseTableRow): React.ReactElement => <span dir="ltr" className="text-gray-500 font-mono font-bold">{row.issue_date}</span>, width: 'w-32' };
const supplierColumn = { header: 'المورد', accessor: (row: PurchaseTableRow): React.ReactElement => <span className="font-bold text-gray-800 dark:text-slate-200">{getSupplierName(row)}</span> };
const paymentColumn = { header: 'طريقة الدفع', accessor: (row: PurchaseTableRow): React.ReactElement => <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.payment_method === 'cash' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{row.payment_method === 'cash' ? 'نقدي' : 'أجل'}</span>, width: 'w-24', className: 'text-center' };
const totalColumn = { header: 'إجمالي (الأساسي)', accessor: (row: PurchaseTableRow): React.ReactElement => <div className="flex flex-col items-end"><span dir="ltr" className={`font-bold font-mono leading-none ${row.type === 'return_purchase' ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(row.total_amount, row.currency_code ?? undefined)}</span>{hasForeignCurrency(row) && <span dir="ltr" className="text-xs font-bold text-blue-500 mt-1">{formatCurrency(getBaseAmount(row))}</span>}</div>, className: 'text-left' };
const statusColumn = { header: 'الحالة', accessor: (row: PurchaseTableRow): React.ReactElement => { const isPaid = row.status === 'paid'; const isPosted = row.status === 'posted'; return <span className={`px-2 py-1 rounded text-[10px] font-bold ${isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : isPosted ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'}`}>{isPaid ? 'مدفوع' : isPosted ? 'مرحّل' : 'مسودة'}</span>; }, width: 'w-24', className: 'text-center' };

const actionColumn = (onView: (id: string) => void, deletePurchase: DeletePurchase, isDeleting: boolean): { header: string; accessor: (row: PurchaseTableRow) => React.ReactElement; width: string; className: string } => ({ header: 'إجراءات', accessor: (row: PurchaseTableRow): React.ReactElement => { const isLocked = row.status === 'posted' || row.status === 'paid'; const handleDelete = (event: React.MouseEvent<HTMLButtonElement>): void => { event.stopPropagation(); if (isLocked) { alert('لا يمكن حذف فاتورة معتمدة أو مدفوعة. يرجى إنشاء فاتورة مرتجع بدلاً من ذلك.'); return; } if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إلغاء أثرها المالي والمخزني.')) deletePurchase(row.id); }; return <div className="flex items-center justify-center gap-2"><button title="عرض التفاصيل / طباعة" onClick={() => { onView(row.id); }} className="p-1.5 text-blue-600 rounded-lg transition-colors"><Eye size={18} /></button><button title={isLocked ? 'لا يمكن حذف فاتورة معتمدة أو مدفوعة' : 'حذف'} onClick={handleDelete} disabled={isDeleting || isLocked} className={`p-1.5 rounded-lg transition-colors ${isLocked ? 'text-gray-300 cursor-not-allowed' : 'text-rose-500'}`}><Trash2 size={18} /></button></div>; }, width: 'w-24', className: 'text-center' });

const DesktopPurchaseTable = ({ data, onView }: { data: PurchaseTableRow[]; onView: (id: string) => void }): React.ReactElement => {
    const { mutate: deletePurchase, isPending: isDeleting } = useDeletePurchase();
    const columns = [invoiceColumn, dateColumn, supplierColumn, paymentColumn, totalColumn, statusColumn, actionColumn(onView, deletePurchase, isDeleting)];
    return <div className="hidden md:block bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden"><ExcelTable columns={columns} data={data} colorTheme="blue" /></div>;
};

const PurchasesTable: React.FC<PurchasesTableProps> = ({ data, isLoading, onView }) => {
    if (isLoading) return <div className="p-12 text-center text-gray-500 animate-pulse">جاري مزامنة سجلات التوريد...</div>;
    return <div className="space-y-4"><MobilePurchaseList data={data} onView={onView} /><DesktopPurchaseTable data={data} onView={onView} /></div>;
};

export default PurchasesTable;
