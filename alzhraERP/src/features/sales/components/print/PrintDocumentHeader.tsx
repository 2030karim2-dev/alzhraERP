import React, { useRef } from 'react';
import { Building2, Image as ImageIcon, Upload, X } from 'lucide-react';

export type HeaderLayoutMode = 'modern-centered' | 'classic-split' | 'full-banner';

export interface CompanyHeaderData {
  nameAr: string;
  nameEn?: string;
  specialization?: string;
  address?: string;
  phone?: string;
  taxNumber?: string;
  crNumber?: string; // Commercial Registration
  email?: string;
  logoUrl?: string;
  bannerUrl?: string;
}

export interface DocumentHeaderMeta {
  titleAr: string;
  titleEn?: string;
  documentNumber?: string;
  documentDate?: string;
  badge?: string;
}

interface PrintDocumentHeaderProps {
  company: CompanyHeaderData;
  document: DocumentHeaderMeta;
  layoutMode?: HeaderLayoutMode;
  onUpdateCompany?: (updated: Partial<CompanyHeaderData>) => void;
  accentColor?: string;
  allowEdit?: boolean;
}

export const PrintDocumentHeader: React.FC<PrintDocumentHeaderProps> = ({
  company,
  document,
  layoutMode = 'modern-centered',
  onUpdateCompany,
  accentColor = '#1F4E78',
  allowEdit = true,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'bannerUrl'
  ) => {
    const file = e.target.files?.[0];
    if (file && onUpdateCompany) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onUpdateCompany({ [field]: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Full Banner Image Mode
  if (layoutMode === 'full-banner') {
    return (
      <div className="mb-4 w-full">
        {company.bannerUrl ? (
          <div className="group relative w-full">
            <img
              src={company.bannerUrl}
              alt="ترويسة المستند"
              className="max-h-44 w-full rounded-sm object-contain"
            />
            {allowEdit && onUpdateCompany && (
              <div className="no-print absolute left-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-[11px] font-bold text-white hover:bg-black"
                >
                  <Upload size={12} />
                  <span>تغيير الترويسة</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateCompany({ bannerUrl: '' })}
                  className="flex items-center gap-1 rounded bg-rose-600/90 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-700"
                >
                  <X size={12} />
                  <span>إلغاء</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => bannerInputRef.current?.click()}
            className="no-print flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-gray-500 transition-colors hover:border-blue-400 hover:bg-blue-50/40"
          >
            <ImageIcon size={28} className="mb-1 text-gray-400" />
            <p className="text-xs font-bold text-gray-700">
              انقر هنا لرفع صورة ترويسة كاملة (Letterhead Banner)
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              الأبعاد المفضلة: عرض كامل 1200x250 بكسل
            </p>
          </div>
        )}

        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleImageUpload(e, 'bannerUrl')}
        />
      </div>
    );
  }

  // 2. Modern Centered or Classic Split Layouts
  return (
    <div
      className="print-header mb-4 border-b-2 pb-3"
      style={{ borderColor: accentColor }}
      dir="rtl"
    >
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleImageUpload(e, 'logoUrl')}
      />

      <div className="flex items-center justify-between gap-4">
        {/* Right Column: Arabic Company Identity */}
        <div className="flex-1 space-y-0.5 text-right">
          <h1
            className="text-xl font-black tracking-tight outline-none sm:text-2xl"
            style={{ color: accentColor }}
            contentEditable={allowEdit}
            suppressContentEditableWarning
            onBlur={e => {
              onUpdateCompany?.({ nameAr: e.currentTarget.textContent || '' });
            }}
          >
            {company.nameAr || 'اسم المنشأة التجارية'}
          </h1>

          {company.specialization && (
            <p
              className="text-xs font-bold text-slate-600 outline-none"
              contentEditable={allowEdit}
              suppressContentEditableWarning
              onBlur={e => {
                onUpdateCompany?.({ specialization: e.currentTarget.textContent || '' });
              }}
            >
              {company.specialization}
            </p>
          )}

          {company.address && (
            <p
              className="text-[11px] text-slate-500 outline-none"
              contentEditable={allowEdit}
              suppressContentEditableWarning
              onBlur={e => {
                onUpdateCompany?.({ address: e.currentTarget.textContent || '' });
              }}
            >
              {company.address}
            </p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5 text-[11px] font-semibold text-slate-700">
            {company.taxNumber && (
              <span
                className="outline-none"
                contentEditable={allowEdit}
                suppressContentEditableWarning
                onBlur={e => {
                  onUpdateCompany?.({
                    taxNumber:
                      e.currentTarget.textContent?.replace('الرقم الضريبي:', '').trim() || '',
                  });
                }}
              >
                الرقم الضريبي: {company.taxNumber}
              </span>
            )}
            {company.crNumber && <span className="outline-none">س.ت: {company.crNumber}</span>}
            {company.phone && (
              <span
                dir="ltr"
                className="outline-none"
                contentEditable={allowEdit}
                suppressContentEditableWarning
                onBlur={e => {
                  onUpdateCompany?.({
                    phone: e.currentTarget.textContent?.replace('هاتف:', '').trim() || '',
                  });
                }}
              >
                هاتف: {company.phone}
              </span>
            )}
          </div>
        </div>

        {/* Center Column: Logo or Emblem */}
        <div className="flex shrink-0 flex-col items-center justify-center px-2">
          {company.logoUrl ? (
            <div className="group relative">
              <img
                src={company.logoUrl}
                alt="شعار المنشأة"
                className="h-16 w-auto max-w-[120px] object-contain"
              />
              {allowEdit && onUpdateCompany && (
                <div className="no-print absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white hover:bg-black"
                    title="تغيير الشعار"
                  >
                    تغيير
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateCompany({ logoUrl: '' })}
                    className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] text-white hover:bg-rose-700"
                    title="حذف الشعار"
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => allowEdit && logoInputRef.current?.click()}
              className={`flex h-16 w-28 flex-col items-center justify-center rounded border-2 border-dashed border-slate-300 bg-slate-50/60 p-1 text-center ${
                allowEdit ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-50/50' : ''
              }`}
              title="انقر لرفع شعار المنشأة"
            >
              <Building2 size={20} className="text-slate-400" />
              <span className="no-print mt-0.5 text-[10px] font-bold text-slate-500">
                إضافة شعار
              </span>
            </div>
          )}
        </div>

        {/* Left Column: English or Document Metadata */}
        <div className="flex-1 space-y-1 text-left" dir="ltr">
          {layoutMode === 'classic-split' && company.nameEn ? (
            <div>
              <h2
                className="text-lg font-bold tracking-tight outline-none sm:text-xl"
                style={{ color: accentColor }}
                contentEditable={allowEdit}
                suppressContentEditableWarning
                onBlur={e => {
                  onUpdateCompany?.({ nameEn: e.currentTarget.textContent || '' });
                }}
              >
                {company.nameEn}
              </h2>
              {document.titleEn && (
                <p className="text-xs font-bold text-slate-600">{document.titleEn}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end text-right" dir="rtl">
              <div className="flex items-center gap-2">
                <span
                  className="shadow-2xs rounded-md px-2.5 py-1 text-xs font-black text-white sm:text-sm"
                  style={{ backgroundColor: accentColor }}
                >
                  {document.titleAr}
                </span>
                {document.badge && (
                  <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    {document.badge}
                  </span>
                )}
              </div>

              {document.documentNumber && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-semibold">الرقم:</span>
                  <span className="font-mono font-bold text-slate-900" dir="ltr">
                    {document.documentNumber}
                  </span>
                </div>
              )}

              {document.documentDate && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-semibold">التاريخ:</span>
                  <span className="font-mono" dir="ltr">
                    {document.documentDate}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
