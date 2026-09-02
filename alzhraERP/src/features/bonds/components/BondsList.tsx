import React from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Printer,
  Calendar,
  User,
  FileText,
  Wallet,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import type { Bond } from '../types';
import { cn, formatCurrency } from '../../../core/utils';
import { useDeleteBond } from '../hooks';
import { exportSingleBondToExcel } from '../../../core/utils/bondExcelExporter';
import { useCompany } from '../../settings/hooks';
import { useInvoiceSettings } from '../../settings/settingsStore';
import { logger } from '../../../core/utils/logger';

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

  const filteredBonds = bonds?.filter(
    b =>
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
        name_ar: invoiceSettings?.company_name_ar || settingsCompany?.name_ar || 'اسم الشركة',
        address: invoiceSettings?.company_address || settingsCompany?.address || '',
        phone: invoiceSettings?.company_phone || settingsCompany?.phone || '',
        tax_number: settingsCompany?.tax_number || '---',
      };
      const { generateSingleBondExcelBlob, exportSingleBondToExcel } =
        await import('../../../core/utils/bondExcelExporter');

      const blob = await generateSingleBondExcelBlob(company, bond);
      const bondTitle =
        bond.type === 'receipt' ? 'سند_قبض' : bond.type === 'payment' ? 'سند_صرف' : 'سند_تحويل';
      const file = new File([blob], `${bondTitle}_${bond.payment_number}.xlsx`, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${bondTitle.replace('_', ' ')} ${bond.payment_number}`,
          text: `مرفق ${bondTitle.replace('_', ' ')} رقم ${bond.payment_number}`,
        });
      } else {
        await exportSingleBondToExcel(company, bond);
        const text = encodeURIComponent(
          `مرفق ${bondTitle.replace('_', ' ')} رقم ${bond.payment_number}.`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      logger.error('BondsList', 'WhatsApp share failed', err);
    }
  };

  const handleExport = async (bond: Bond) => {
    const company = {
      name_ar: invoiceSettings?.company_name_ar || settingsCompany?.name_ar || 'اسم الشركة',
      address: invoiceSettings?.company_address || settingsCompany?.address || '',
      phone: invoiceSettings?.company_phone || settingsCompany?.phone || '',
      tax_number: settingsCompany?.tax_number || '---',
    };
    await exportSingleBondToExcel(company, bond);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
        <div className="animate-pulse text-[10px] font-bold uppercase tracking-widest text-gray-400">
          جاري تحميل السندات...
        </div>
      </div>
    );
  }

  if (filteredBonds?.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-20 text-center text-[10px] font-bold uppercase tracking-widest text-gray-300 dark:border-slate-800">
        <FileText size={48} strokeWidth={1} />
        لا توجد سندات تطابق بحثك في هذه الفئة
      </div>
    );
  }

  if (displayMode === 'table') {
    return (
      <div className="custom-scrollbar overflow-x-auto rounded-2xl border border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
        <table className="w-full min-w-[640px] border-collapse text-right">
          <thead>
            <tr className="border-b bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:border-slate-800 dark:bg-slate-800/50">
              <th className="px-4 py-3 font-bold">التاريخ</th>
              <th className="px-4 py-3 font-bold">رقم السند</th>
              <th className="px-4 py-3 font-bold">الحساب / الجهة</th>
              <th className="px-4 py-3 font-bold">البيان</th>
              <th className="px-4 py-3 font-bold">الطريقة</th>
              <th className="px-4 py-3 font-bold">المبلغ</th>
              <th className="px-4 py-3 text-center font-bold">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {filteredBonds.map(bond => (
              <tr
                key={bond.id}
                className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/5"
              >
                <td className="px-4 py-3 font-mono text-[11px] font-medium text-gray-500 dark:text-slate-400">
                  {bond.date}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'rounded-md p-1',
                        bond.type === 'receipt'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'
                      )}
                    >
                      {bond.type === 'receipt' ? (
                        <ArrowDownCircle size={12} />
                      ) : (
                        <ArrowUpCircle size={12} />
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-gray-900 dark:text-slate-100">
                      {bond.payment_number}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-gray-800 dark:text-slate-200">
                      {bond.party_name || bond.account_name}
                    </span>
                    {bond.party_name && bond.account_name !== bond.party_name && (
                      <span className="text-[10px] text-gray-400">{bond.account_name}</span>
                    )}
                  </div>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-[11px] text-gray-600 dark:text-slate-400">
                  {bond.description}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
                    {bond.payment_method === 'cash'
                      ? 'نقداً'
                      : bond.payment_method === 'bank'
                        ? 'بنك'
                        : bond.payment_method}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">
                  <div className="flex flex-col items-end">
                    <span
                      className={cn(
                        'text-[11px] font-bold',
                        bond.type === 'receipt' ? 'text-emerald-600' : 'text-rose-600'
                      )}
                    >
                      {bond.type === 'receipt' ? '+' : '-'}
                      {formatCurrency(bond.amount, bond.currency_code)}
                    </span>
                    {bond.currency_code !== 'SAR' && bond.base_amount !== undefined && (
                      <span className="text-[10px] font-medium text-blue-500">
                        {formatCurrency(bond.base_amount)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 opacity-0 transition-all group-hover:opacity-100 max-md:opacity-100">
                    <button
                      onClick={() => handleWhatsAppShare(bond)}
                      className="rounded-lg p-1.5 text-gray-300 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-900/20"
                      title="إرسال عبر واتساب"
                    >
                      <MessageCircle size={14} />
                    </button>
                    <button
                      onClick={() => handleExport(bond)}
                      className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20"
                      title="تصدير إكسل / طباعة"
                    >
                      <Printer size={14} />
                    </button>
                    <button
                      onClick={() => {
                        handleDelete(bond.id, bond.payment_number);
                      }}
                      className="rounded-lg p-1.5 text-gray-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                      title="حذف"
                    >
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
    <div className="animate-in fade-in slide-in-from-bottom-2 grid grid-cols-1 gap-4 duration-500 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredBonds?.map(bond => (
        <div
          key={bond.id}
          className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-[var(--app-surface)] p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:hover:border-blue-900/30"
        >
          {/* Style decoration */}
          <div
            className={cn(
              'absolute right-0 top-0 -mr-8 -mt-8 h-24 w-24 rounded-full opacity-10 blur-3xl transition-opacity group-hover:opacity-20',
              bond.type === 'receipt' ? 'bg-emerald-500' : 'bg-rose-500'
            )}
          ></div>

          <div className="relative mb-4 flex items-start justify-between">
            <div
              className={cn(
                'rounded-xl border p-2 transition-colors',
                bond.type === 'receipt'
                  ? 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-800/40 dark:bg-emerald-900/20'
                  : 'border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-800/40 dark:bg-rose-900/20'
              )}
            >
              {bond.type === 'receipt' ? (
                <ArrowDownCircle size={20} />
              ) : (
                <ArrowUpCircle size={20} />
              )}
            </div>
            <div className="text-left font-mono">
              <span className="mb-1 block text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500">
                المبلغ
              </span>
              <span
                className={cn(
                  'text-lg font-black tracking-tighter',
                  bond.type === 'receipt' ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {bond.type === 'receipt' ? '+' : '-'}
                {formatCurrency(bond.amount, bond.currency_code)}
              </span>
            </div>
          </div>

          <div className="relative space-y-3">
            <div>
              <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500">
                <FileText size={10} /> {bond.payment_number}
              </span>
              <h4 className="line-clamp-1 text-xs font-bold text-gray-800 dark:text-slate-100">
                {bond.description || 'بدون بيان'}
              </h4>
            </div>

            <div className="flex items-center gap-2 border-y border-gray-50 py-2 dark:border-slate-800/50">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <User size={12} />
              </div>
              <span className="truncate text-[11px] font-bold text-gray-600 dark:text-slate-400">
                {bond.party_name || bond.account_name}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-slate-500">
                  <Calendar size={10} />
                  {bond.date}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-500">
                  <Wallet size={10} />
                  {bond.payment_method === 'cash'
                    ? 'نقداً'
                    : bond.payment_method === 'bank'
                      ? 'بنك'
                      : bond.payment_method}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 transition-all group-hover:opacity-100 max-md:opacity-100">
                <button
                  onClick={() => handleWhatsAppShare(bond)}
                  className="rounded-lg p-1.5 text-gray-300 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-900/20"
                  title="واتساب"
                >
                  <MessageCircle size={14} />
                </button>
                <button
                  onClick={() => handleExport(bond)}
                  className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20"
                  title="تصدير إكسل / طباعة"
                >
                  <Printer size={14} />
                </button>
                <button
                  onClick={() => {
                    handleDelete(bond.id, bond.payment_number);
                  }}
                  className="rounded-lg p-1.5 text-gray-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                  title="حذف"
                >
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
