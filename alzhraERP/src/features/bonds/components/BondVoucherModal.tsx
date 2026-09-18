import React, { useRef, useState } from 'react';
import {
  FileText,
  Printer,
  MessageCircle,
  Download,
  X,
  Maximize2,
  Minimize2,
  Calendar,
  Building2,
  CreditCard,
  User,
  ShieldCheck,
} from 'lucide-react';
import type { Bond } from '../types';
import { formatCurrency, formatLocalDate, cn } from '../../../core/utils';
import { tafqeet } from '../../../core/utils/tafqeet';
import { exportSingleBondToExcel } from '../../../core/utils/bondExcelExporter';
import { useCompany } from '../../settings/hooks';
import { useInvoiceSettings } from '../../settings/settingsStore';
import { logger } from '../../../core/utils/logger';

interface BondVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  bond: Bond | null;
}

export const BondVoucherModal: React.FC<BondVoucherModalProps> = ({ isOpen, onClose, bond }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { data: settingsCompany } = useCompany();
  const invoiceSettings = useInvoiceSettings();

  if (!isOpen || !bond) return null;

  const company = {
    name_ar: invoiceSettings?.company_name_ar || settingsCompany?.name_ar || 'اسم المنشأة التجارية',
    address: invoiceSettings?.company_address || settingsCompany?.address || '',
    phone: invoiceSettings?.company_phone || settingsCompany?.phone || '',
    tax_number: settingsCompany?.tax_number || '---',
    logo_url: settingsCompany?.logo_url || '',
  };

  const isReceipt = bond.type === 'receipt';
  const isPayment = bond.type === 'payment';

  const voucherTitle = isReceipt ? 'سند قبض' : isPayment ? 'سند صرف' : 'سند تحويل مالي';
  const personLabel = isReceipt
    ? 'استلمنا من السيد / السادة:'
    : isPayment
      ? 'صرفنا إلى السيد / السادة:'
      : 'تحويل لصالح:';
  const forWhatLabel = isReceipt ? 'وذلك مقابل:' : isPayment ? 'وذلك عن:' : 'الغرض من التحويل:';

  const currencySymbol =
    bond.currency_code === 'SAR'
      ? 'ريال سعودي'
      : bond.currency_code === 'YER'
        ? 'ريال يمني'
        : bond.currency_code;
  const tafqeetText = tafqeet(bond.amount, currencySymbol);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    try {
      await exportSingleBondToExcel(company, bond);
    } catch (err) {
      logger.error('BondVoucherModal', 'Excel export failed', err);
    }
  };

  const handleWhatsApp = async () => {
    try {
      const { generateSingleBondExcelBlob } = await import('../../../core/utils/bondExcelExporter');
      const blob = await generateSingleBondExcelBlob(company, bond);
      const file = new File(
        [blob],
        `${voucherTitle.replace(/\s/g, '_')}_${bond.payment_number}.xlsx`,
        {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
      );

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${voucherTitle} ${bond.payment_number}`,
          text: `مرفق ${voucherTitle} رقم ${bond.payment_number}`,
        });
      } else {
        await exportSingleBondToExcel(company, bond);
        const text = encodeURIComponent(`مرفق ${voucherTitle} رقم ${bond.payment_number}`);
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      logger.error('BondVoucherModal', 'WhatsApp share failed', err);
    }
  };

  return (
    <div
      className={cn(
        'font-cairo fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm transition-all duration-300 sm:p-4',
        isFullscreen && 'p-0'
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          'flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl',
          isFullscreen ? 'h-full w-full rounded-none' : 'max-h-[92vh] w-full max-w-4xl'
        )}
        onClick={e => {
          e.stopPropagation();
        }}
      >
        {/* Header toolbar */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl font-black shadow-sm',
                isReceipt
                  ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : isPayment
                    ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                    : 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
              )}
            >
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  معاينة السند الرسمي ({bond.payment_number})
                </h3>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-black',
                    isReceipt
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : isPayment
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  )}
                >
                  {voucherTitle}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                شاشة معاينة وطباعة السندات الرسمية المعتمدة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              title="طباعة السند"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">طباعة</span>
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400"
              title="مشاركة عبر واتساب"
            >
              <MessageCircle size={14} />
              <span className="hidden sm:inline">واتساب</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="تصدير إكسل"
            >
              <Download size={14} />
              <span className="hidden sm:inline">إكسل</span>
            </button>
            <button
              onClick={() => {
                setIsFullscreen(!isFullscreen);
              }}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              title={isFullscreen ? 'تصغير النافذة' : 'ملء الشاشة'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Voucher Paper Area */}
        <div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 dark:bg-slate-950 sm:p-8">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #bond-printable-voucher, #bond-printable-voucher * {
                visibility: visible !important;
              }
              #bond-printable-voucher {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 24px !important;
                background: white !important;
                color: black !important;
                box-shadow: none !important;
                border: 1px solid #cbd5e1 !important;
                z-index: 99999 !important;
              }
            }
          `}</style>
          <div
            ref={printRef}
            id="bond-printable-voucher"
            className="mx-auto max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-10"
          >
            {/* Header: Company and Voucher Meta */}
            <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 size={22} className="text-blue-600 dark:text-blue-400" />
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {company.name_ar}
                  </h2>
                </div>
                {company.tax_number && (
                  <p className="font-mono text-xs text-slate-500">
                    الرقم الضريبي: {company.tax_number}
                  </p>
                )}
                {company.phone && <p className="text-xs text-slate-500">الهاتف: {company.phone}</p>}
                {company.address && (
                  <p className="text-xs text-slate-500">العنوان: {company.address}</p>
                )}
              </div>

              {company.logo_url && (
                <div className="flex items-center justify-center">
                  <img
                    src={company.logo_url}
                    alt="شعار المنشأة"
                    className="h-16 w-auto max-w-[120px] object-contain"
                  />
                </div>
              )}

              <div className="flex flex-col items-start space-y-2 sm:items-end">
                <div
                  className={cn(
                    'rounded-xl px-5 py-2 text-center shadow-sm',
                    isReceipt
                      ? 'bg-emerald-600 text-white'
                      : isPayment
                        ? 'bg-rose-600 text-white'
                        : 'bg-blue-600 text-white'
                  )}
                >
                  <span className="text-sm font-black tracking-wide">{voucherTitle}</span>
                </div>
                <div className="space-y-1 text-left font-mono text-xs sm:text-right">
                  <div className="text-slate-600 dark:text-slate-400">
                    رقم السند:{' '}
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {bond.payment_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <Calendar size={12} />
                    <span>التاريخ: {bond.date}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount Banner */}
            <div className="my-6 flex flex-col items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/40 sm:flex-row">
              <div>
                <span className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                  المبلغ المالي بالأرقام
                </span>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      'font-mono text-3xl font-black tracking-tight',
                      isReceipt ? 'text-emerald-600' : 'text-rose-600'
                    )}
                  >
                    {formatCurrency(bond.amount, bond.currency_code)}
                  </span>
                  {bond.currency_code !== 'SAR' && bond.base_amount !== undefined && (
                    <span className="font-mono text-xs font-bold text-slate-500">
                      (يعادل {formatCurrency(bond.base_amount, 'SAR')})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <CreditCard size={16} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  طريقة الدفع: {bond.payment_method === 'bank' ? 'حوالة بنكية' : 'نقداً'}
                </span>
              </div>
            </div>

            {/* Voucher Body Details */}
            <div className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="flex flex-col gap-2 border-b border-slate-100 py-3 dark:border-slate-800 sm:flex-row sm:items-center">
                <span className="flex w-40 shrink-0 items-center gap-1.5 text-slate-400">
                  <User size={14} />
                  {personLabel}
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {bond.party_name || bond.account_name}
                </span>
              </div>

              <div className="flex flex-col gap-2 border-b border-slate-100 py-3 dark:border-slate-800 sm:flex-row sm:items-center">
                <span className="w-40 shrink-0 text-slate-400">المبلغ كتابة (تفقيط):</span>
                <span className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-600 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-400">
                  {tafqeetText}
                </span>
              </div>

              <div className="flex flex-col gap-2 border-b border-slate-100 py-3 dark:border-slate-800 sm:flex-row sm:items-center">
                <span className="w-40 shrink-0 text-slate-400">الحساب المالي (الصندوق/البنك):</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {bond.account_name}
                </span>
              </div>

              <div className="flex flex-col gap-2 border-b border-slate-100 py-3 dark:border-slate-800 sm:flex-row sm:items-start">
                <span className="w-40 shrink-0 pt-0.5 text-slate-400">{forWhatLabel}</span>
                <span className="flex-1 font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                  {bond.description || 'سداد حساب مالي'}
                </span>
              </div>
            </div>

            {/* Signatures Row */}
            <div className="mt-12 border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-6">
                  <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
                    توقيع المستلم / المودع
                  </span>
                  <div className="h-10 border-b-2 border-dotted border-slate-300 dark:border-slate-700"></div>
                </div>

                <div className="space-y-6">
                  <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
                    أمين الصندوق
                  </span>
                  <div className="h-10 border-b-2 border-dotted border-slate-300 dark:border-slate-700"></div>
                </div>

                <div className="space-y-6">
                  <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
                    المحاسب المسؤول
                  </span>
                  <div className="h-10 border-b-2 border-dotted border-slate-300 dark:border-slate-700"></div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400 dark:border-slate-800/80">
                <span className="flex items-center gap-1 font-mono">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  مستند محاسبي معتمد بنظام الزهراء الذكي ERP
                </span>
                <span className="font-mono">طُبع في: {formatLocalDate()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BondVoucherModal;
