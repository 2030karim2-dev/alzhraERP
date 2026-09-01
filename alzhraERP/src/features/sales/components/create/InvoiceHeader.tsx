import React, { useState } from 'react';
import { Building2, FileCheck, ShieldCheck, Sparkles, CheckCircle2, QrCode } from 'lucide-react';
import { useInvoiceSettings } from '../../../settings/settingsStore';

interface InvoiceHeaderProps {
  company: {
    name_ar?: string | null;
    name_en?: string | null;
    address?: string | null;
    tax_number?: string | null;
    logo_url?: string | null;
    phone?: string | null;
    [key: string]: unknown;
  } | null;
  documentTypeTitle?: string;
}

const InvoiceHeader: React.FC<InvoiceHeaderProps> = ({ company, documentTypeTitle }) => {
  const settings = useInvoiceSettings();
  const [logoError, setLogoError] = useState(false);

  const nameAr = settings.company_name_ar || company?.name_ar || 'اسم المنشأة';
  const nameEn = settings.company_name_en || company?.name_en || '';
  const address = settings.company_address || company?.address || '';
  const specialization = settings.company_specialization || '';
  const taxNumber = company?.tax_number || '';
  const companyPhone = company?.phone || '';
  const logoSrc = !logoError ? company?.logo_url || null : null;

  return (
    <div className="relative overflow-hidden border-b border-slate-700/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-3.5 text-white shadow-lg">
      {/* Decorative top ambient bar */}
      <div className="absolute left-0 right-0 top-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-emerald-400 to-indigo-500 shadow-sm shadow-emerald-500/50"></div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Right: Company Logo & Identity */}
        <div className="flex items-center gap-3.5">
          {logoSrc ? (
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700/80 bg-white p-1 shadow-md shadow-black/30">
              <img
                src={logoSrc}
                alt={nameAr}
                onError={() => setLogoError(true)}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/40 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-500/25">
              <Building2 size={24} />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="flex items-center gap-1.5 text-base font-black tracking-tight text-white">
                <span>{nameAr}</span>
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              </h1>
              {specialization && (
                <span className="rounded-lg border border-blue-400/30 bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  {specialization}
                </span>
              )}
            </div>

            {(address || companyPhone || taxNumber) && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-400">
                {address && <span>{address}</span>}
                {companyPhone && (
                  <>
                    {address && <span className="text-slate-600">•</span>}
                    <span dir="ltr" className="font-mono text-slate-300">
                      {companyPhone}
                    </span>
                  </>
                )}
                {taxNumber && (
                  <>
                    {(address || companyPhone) && <span className="text-slate-600">•</span>}
                    <div className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono font-bold text-slate-300">
                      <QrCode size={11} className="text-emerald-400" />
                      <span>الرقم الضريبي: {taxNumber}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Transaction Type & ERP Trust Badges */}
        <div className="bg-slate-850/90 hidden items-center gap-2.5 rounded-2xl border border-slate-700/80 px-3.5 py-1.5 text-xs shadow-inner md:flex">
          <div className="flex items-center gap-1.5 font-black text-emerald-400">
            <FileCheck size={16} />
            <span>{documentTypeTitle || 'فاتورة مبيعات ضريبية'}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
            <ShieldCheck size={14} className="text-blue-400" />
            <span>متوافق مع هيئة الزكاة والضريبة</span>
          </div>
        </div>

        {/* Left: English Identity & Realtime Indicator */}
        <div className="flex items-center gap-3 text-left" dir="ltr">
          <div className="hidden sm:block">
            <p className="font-mono text-xs font-black uppercase tracking-wider text-slate-200">
              {nameEn}
            </p>
            <p className="font-mono text-[10px] font-bold tracking-tight text-slate-400">
              {settings.invoice_header_text || 'ELECTRONIC TAX INVOICE'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-[11px] font-bold text-emerald-300 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <Sparkles size={12} className="ml-0.5 text-emerald-400" />
            <span>POS Live</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceHeader;
