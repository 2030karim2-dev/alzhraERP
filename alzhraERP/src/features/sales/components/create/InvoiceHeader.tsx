import React from 'react';
import { Building2, FileCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { useInvoiceSettings } from '../../../settings/settingsStore';

interface InvoiceHeaderProps {
  company: {
    name_ar?: string | null;
    name_en?: string | null;
    address?: string | null;
    tax_number?: string | null;
    [key: string]: unknown;
  } | null;
}

const InvoiceHeader: React.FC<InvoiceHeaderProps> = ({ company }) => {
  const settings = useInvoiceSettings();

  const nameAr = settings.company_name_ar || company?.name_ar || 'اسم المنشأة';
  const nameEn = settings.company_name_en || company?.name_en || 'Enterprise ERP';
  const address = settings.company_address || company?.address || 'المملكة العربية السعودية';
  const specialization = settings.company_specialization || '';
  const taxNumber = company?.tax_number || '';

  return (
    <div className="via-slate-850 relative border-b border-slate-700/80 bg-gradient-to-r from-slate-900 to-slate-900 px-4 py-3 text-white shadow-md">
      {/* Decorative top ambient bar */}
      <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-blue-500 via-emerald-400 to-indigo-500"></div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Right: Company Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-white">{nameAr}</h1>
              {specialization && (
                <span className="rounded-md border border-blue-400/30 bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  {specialization}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium text-slate-400">
              <span>{address}</span>
              {taxNumber && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="font-mono font-bold text-slate-300">
                    الرقم الضريبي: {taxNumber}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Transaction Type & ERP Badge */}
        <div className="hidden items-center gap-2.5 rounded-xl border border-slate-700/80 bg-slate-800/80 px-3 py-1.5 text-xs md:flex">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400">
            <FileCheck size={15} />
            <span>فاتورة مبيعات ضريبية</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-[11px] text-slate-300">
            <ShieldCheck size={13} className="text-blue-400" />
            <span>نظام إلكتروني معتمد</span>
          </div>
        </div>

        {/* Left: English Branding & Shortcuts hint */}
        <div className="flex items-center gap-3 text-left" dir="ltr">
          <div className="hidden sm:block">
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-slate-200">
              {nameEn}
            </p>
            <p className="font-mono text-[10px] tracking-tighter text-slate-400">
              {settings.invoice_header_text || 'TAX SALES INVOICE'}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-300">
            <Sparkles size={12} className="text-emerald-400" />
            <span>POS Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceHeader;
