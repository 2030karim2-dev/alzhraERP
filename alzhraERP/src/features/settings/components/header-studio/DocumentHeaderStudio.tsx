/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/consistent-type-imports, @typescript-eslint/array-type, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
import React, { useState } from 'react';
import {
  Palette,
  Type,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Eye,
  Sliders,
  Upload,
} from 'lucide-react';
import { useSettingsStore, useDocumentHeaderSettings } from '../../settingsStore';
import {
  DocumentHeaderConfig,
  DocumentFontFamily,
  LogoPosition,
  LogoSize,
  DocumentHeaderLayout,
  DEFAULT_DOCUMENT_HEADER_CONFIG,
} from '@/core/types/documentHeader';
import { UniversalDocumentHeader } from '@/ui/common/UniversalDocumentHeader';
import { buildWhatsappHeader } from '@/core/utils/whatsappHeader';
import { useCompany } from '@/features/settings/hooks';

const AVAILABLE_FONTS: { id: DocumentFontFamily; name: string }[] = [
  { id: 'Cairo', name: 'خط كايرو (Cairo)' },
  { id: 'Almarai', name: 'خط المراعي (Almarai)' },
  { id: 'Tajawal', name: 'خط تجوال (Tajawal)' },
  { id: 'Alexandria', name: 'خط الإسكندرية (Alexandria)' },
  { id: 'IBM Plex Sans Arabic', name: 'خط IBM Plex عربي' },
  { id: 'Amiri', name: 'خط أميري تقليدي (Amiri)' },
  { id: 'Arial', name: 'أريال القياسي (Arial)' },
];

const PRESET_ACCENT_COLORS = [
  { name: 'أزرق كلاسيكي', color: '#2563eb' },
  { name: 'كحلي وقار', color: '#1e3a8a' },
  { name: 'زمردي راقي', color: '#059669' },
  { name: 'عنابي فاخر', color: '#991b1b' },
  { name: 'عنبري دافئ', color: '#d97706' },
  { name: 'بنفسجي ملكي', color: '#7c3aed' },
  { name: 'رمادي داكن', color: '#334155' },
];

type PreviewTab = 'sales_invoice' | 'purchase_invoice' | 'bond' | 'statement' | 'whatsapp';

export const DocumentHeaderStudio: React.FC = () => {
  const currentHeaderConfig = useDocumentHeaderSettings();
  const { setDocumentHeader, applyHeaderTemplateToAll } = useSettingsStore();
  const { data: company } = useCompany();

  const [activeTab, setActiveTab] = useState<
    'design' | 'typography' | 'logo' | 'details' | 'whatsapp'
  >('design');
  const [previewTab, setPreviewTab] = useState<PreviewTab>('sales_invoice');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const updateConfig = (updates: Partial<DocumentHeaderConfig>) => {
    setDocumentHeader(updates);
  };

  const handleApplyToAll = () => {
    applyHeaderTemplateToAll();
    setSuccessToast('تم تعميم وتطبيق تصميم الترويسة بنجاح على كافة المستندات والرسائل!');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleReset = () => {
    if (window.confirm('هل أنت متأكد من استعادة التصميم الافتراضي للترويسة؟')) {
      setDocumentHeader(DEFAULT_DOCUMENT_HEADER_CONFIG);
      setSuccessToast('تمت استعادة الإعدادات الافتراضية بنجاح');
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  // Handle Logo Upload to Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('حجم الصورة يجب ألا يتجاوز 2 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          updateConfig({
            logo: {
              ...currentHeaderConfig.logo,
              logoUrl: reader.result,
              showLogo: true,
            },
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Banner Upload to Base64
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('حجم صورة البانر يجب ألا يتجاوز 3 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          updateConfig({
            banner: {
              ...currentHeaderConfig.banner,
              bannerUrl: reader.result,
              enabled: true,
            },
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const resolvedCompany = {
    name: company?.name_ar || 'مؤسسة الزهراء للتجارة والخدمات',
    logo_url: company?.logo_url ?? undefined,
    phone: company?.phone || '00966500000000',
    email: 'info@alzhra-erp.com',
    address: company?.address || 'صنعاء - الجمهورية اليمنية',
    tax_number: company?.tax_number || '300123456700003',
    commercial_register: '1010897654',
    slogan: currentHeaderConfig.details.sloganText || 'ريادة في خدمة العملاء وجودة المنتجات',
  };

  const whatsappPreviewText =
    buildWhatsappHeader(currentHeaderConfig.whatsapp, {
      name: currentHeaderConfig.details.companyNameOverride || resolvedCompany.name,
      slogan: resolvedCompany.slogan,
      phone: resolvedCompany.phone,
      taxNumber: resolvedCompany.tax_number,
    }) +
    `مرحباً بك عزيزنا العميل / شركة الأمل،\nنرفق لك تفاصيل المعاملة رقم #INV-2026-0042\nالمبلغ الإجمالي: 1,500.00 ر.س\nشكراً لتعاملكم معنا.`;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner & Actions Header */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-blue-600/30 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 p-5 text-white shadow-lg sm:flex-row sm:items-center">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <Sparkles className="h-6 w-6 animate-pulse text-amber-300" />
            <h1 className="text-xl font-bold tracking-wide">استوديو تصميم وترويسة المستندات</h1>
            <span className="rounded-full border border-blue-400/40 bg-blue-500/30 px-2.5 py-0.5 text-xs text-blue-100">
              Universal Document Header
            </span>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-blue-100/90">
            تحكم كامل في مظهر وهوية الترويسة لكافة المستندات (فواتير المبيعات، فواتير المشتريات،
            سندات القبض والصرف، كشوفات الحساب، ورسائل الواتساب) مع دعم التعميم الشامل بضغطة زر.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition-all hover:bg-white/20"
            title="استعادة الافتراضيات"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>استعادة</span>
          </button>

          <button
            type="button"
            onClick={handleApplyToAll}
            className="flex transform items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2.5 text-xs font-bold text-slate-900 shadow-md transition-all hover:from-amber-200 hover:to-yellow-300 active:scale-95"
          >
            <Check className="h-4 w-4 text-slate-900" />
            <span>تعميم التصميم على كافة المستندات</span>
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="animate-fade-in flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Grid: Left Controls (1/2 or 5/12) + Right Live Preview (1/2 or 7/12) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
          {/* Sub-Tabs Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-100 p-1 text-xs font-medium dark:border-slate-700/60 dark:bg-slate-800/60">
            <button
              type="button"
              onClick={() => setActiveTab('design')}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 transition-all ${
                activeTab === 'design'
                  ? 'bg-white font-bold text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              <span>التخطيط والمظهر</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('typography')}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 transition-all ${
                activeTab === 'typography'
                  ? 'bg-white font-bold text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Type className="h-3.5 w-3.5" />
              <span>الخطوط والنصوص</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logo')}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 transition-all ${
                activeTab === 'logo'
                  ? 'bg-white font-bold text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>الشعار والبانر</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 transition-all ${
                activeTab === 'details'
                  ? 'bg-white font-bold text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>بيانات الترويسة</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 transition-all ${
                activeTab === 'whatsapp'
                  ? 'bg-white font-bold text-emerald-600 shadow-sm dark:bg-slate-700 dark:text-emerald-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>الواتساب</span>
            </button>
          </div>

          {/* Tab 1: Layout & Design */}
          {activeTab === 'design' && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  نمط وتخطيط الترويسة (Layout Style)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'classic-split',
                      label: 'كلاسيكي متقابل',
                      desc: 'الشعار والبيانات في الجانبين',
                    },
                    {
                      id: 'modern-centered',
                      label: 'عصري متمركز',
                      desc: 'شعار وسط وبيانات متناسقة',
                    },
                    {
                      id: 'compact-minimal',
                      label: 'مدمج ومختصر',
                      desc: 'سطر واحد يوفر مساحة الطباعة',
                    },
                    {
                      id: 'full-banner',
                      label: 'بانر كامل مخصص',
                      desc: 'صورة هيدر علوية مصممة جاهزة',
                    },
                  ].map(layout => (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() =>
                        updateConfig({
                          style: {
                            ...currentHeaderConfig.style,
                            layout: layout.id as DocumentHeaderLayout,
                          },
                          banner: {
                            ...currentHeaderConfig.banner,
                            enabled: layout.id === 'full-banner',
                          },
                        })
                      }
                      className={`flex flex-col gap-1 rounded-xl border p-3 text-right transition-all ${
                        currentHeaderConfig.style.layout === layout.id
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20 dark:bg-blue-950/30 dark:text-blue-200'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-xs font-bold">{layout.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {layout.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color Palette */}
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  لون التمييز والشرائط (Accent Color)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_ACCENT_COLORS.map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() =>
                        updateConfig({
                          style: { ...currentHeaderConfig.style, accentColor: c.color },
                        })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: c.color,
                        borderColor:
                          currentHeaderConfig.style.accentColor === c.color
                            ? '#000000'
                            : 'transparent',
                      }}
                      title={c.name}
                    >
                      {currentHeaderConfig.style.accentColor === c.color && (
                        <Check className="h-4 w-4 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                  <div className="mr-2 flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500">مخصص:</span>
                    <input
                      type="color"
                      value={currentHeaderConfig.style.accentColor}
                      onChange={e =>
                        updateConfig({
                          style: { ...currentHeaderConfig.style, accentColor: e.target.value },
                        })
                      }
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Spacing & Borders */}
              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-2 dark:border-slate-800">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    الهامش الرأسي (Padding)
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="36"
                    value={currentHeaderConfig.style.paddingY}
                    onChange={e =>
                      updateConfig({
                        style: { ...currentHeaderConfig.style, paddingY: Number(e.target.value) },
                      })
                    }
                    className="h-1.5 w-full cursor-pointer rounded-lg bg-slate-200 accent-blue-600"
                  />
                  <div className="mt-0.5 text-left text-[10px] text-slate-500">
                    {currentHeaderConfig.style.paddingY}px
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    سمك الفاصل السفلي
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="4"
                    value={currentHeaderConfig.style.borderWidth}
                    onChange={e =>
                      updateConfig({
                        style: {
                          ...currentHeaderConfig.style,
                          borderWidth: Number(e.target.value),
                          showDivider: Number(e.target.value) > 0,
                        },
                      })
                    }
                    className="h-1.5 w-full cursor-pointer rounded-lg bg-slate-200 accent-blue-600"
                  />
                  <div className="mt-0.5 text-left text-[10px] text-slate-500">
                    {currentHeaderConfig.style.borderWidth}px
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Typography */}
          {activeTab === 'typography' && (
            <div className="space-y-4">
              {/* Title Font Settings */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    خط عنوان المنشأة (Company Title)
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-1 text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={currentHeaderConfig.typography.titleBold}
                        onChange={e =>
                          updateConfig({
                            typography: {
                              ...currentHeaderConfig.typography,
                              titleBold: e.target.checked,
                            },
                          })
                        }
                        className="rounded text-blue-600 focus:ring-0"
                      />
                      <span>عريض</span>
                    </label>
                    <input
                      type="color"
                      value={currentHeaderConfig.typography.titleColor}
                      onChange={e =>
                        updateConfig({
                          typography: {
                            ...currentHeaderConfig.typography,
                            titleColor: e.target.value,
                          },
                        })
                      }
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                      title="لون الخط"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-600 dark:text-slate-400">
                      نوع الخط (Font Family)
                    </label>
                    <select
                      value={currentHeaderConfig.typography.titleFont}
                      onChange={e =>
                        updateConfig({
                          typography: {
                            ...currentHeaderConfig.typography,
                            titleFont: e.target.value as DocumentFontFamily,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      {AVAILABLE_FONTS.map(f => (
                        <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-slate-600 dark:text-slate-400">
                      الحجم: {currentHeaderConfig.typography.titleSize}px
                    </label>
                    <input
                      type="range"
                      min="16"
                      max="34"
                      value={currentHeaderConfig.typography.titleSize}
                      onChange={e =>
                        updateConfig({
                          typography: {
                            ...currentHeaderConfig.typography,
                            titleSize: Number(e.target.value),
                          },
                        })
                      }
                      className="h-1.5 w-full cursor-pointer rounded-lg bg-slate-200 accent-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Details Font Settings */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    خط التفاصيل والبيانات (Details Font)
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-1 text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={currentHeaderConfig.typography.detailsBold}
                        onChange={e =>
                          updateConfig({
                            typography: {
                              ...currentHeaderConfig.typography,
                              detailsBold: e.target.checked,
                            },
                          })
                        }
                        className="rounded text-blue-600 focus:ring-0"
                      />
                      <span>شبه عريض</span>
                    </label>
                    <input
                      type="color"
                      value={currentHeaderConfig.typography.detailsColor}
                      onChange={e =>
                        updateConfig({
                          typography: {
                            ...currentHeaderConfig.typography,
                            detailsColor: e.target.value,
                          },
                        })
                      }
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                      title="لون خط التفاصيل"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-600 dark:text-slate-400">
                      نوع الخط
                    </label>
                    <select
                      value={currentHeaderConfig.typography.detailsFont}
                      onChange={e =>
                        updateConfig({
                          typography: {
                            ...currentHeaderConfig.typography,
                            detailsFont: e.target.value as DocumentFontFamily,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      {AVAILABLE_FONTS.map(f => (
                        <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-slate-600 dark:text-slate-400">
                      الحجم: {currentHeaderConfig.typography.detailsSize}px (الحد الأدنى 10px)
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="16"
                      value={currentHeaderConfig.typography.detailsSize}
                      onChange={e =>
                        updateConfig({
                          typography: {
                            ...currentHeaderConfig.typography,
                            detailsSize: Math.max(10, Number(e.target.value)),
                          },
                        })
                      }
                      className="h-1.5 w-full cursor-pointer rounded-lg bg-slate-200 accent-blue-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Logo & Banner */}
          {activeTab === 'logo' && (
            <div className="space-y-4">
              {/* Logo Controls */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    شعار المنشأة (Company Logo)
                  </span>
                  <label className="flex cursor-pointer items-center gap-1 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={currentHeaderConfig.logo.showLogo}
                      onChange={e =>
                        updateConfig({
                          logo: { ...currentHeaderConfig.logo, showLogo: e.target.checked },
                        })
                      }
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span>إظهار الشعار</span>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-all hover:bg-blue-100">
                    <Upload className="h-3.5 w-3.5" />
                    <span>رفع شعار جديد</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="text-[10px] text-slate-500">
                    يدعم PNG, JPG, WebP أو رابط مباشر
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-600 dark:text-slate-400">
                      موضع الشعار
                    </label>
                    <select
                      value={currentHeaderConfig.logo.position}
                      onChange={e =>
                        updateConfig({
                          logo: {
                            ...currentHeaderConfig.logo,
                            position: e.target.value as LogoPosition,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="right">يمين (الافتراضي)</option>
                      <option value="center">وسط</option>
                      <option value="left">يسار</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-slate-600 dark:text-slate-400">
                      حجم الشعار
                    </label>
                    <select
                      value={currentHeaderConfig.logo.size}
                      onChange={e =>
                        updateConfig({
                          logo: {
                            ...currentHeaderConfig.logo,
                            size: e.target.value as LogoSize,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="small">صغير (48px)</option>
                      <option value="medium">متوسط (64px)</option>
                      <option value="large">كبير (80px)</option>
                      <option value="xlarge">ضخم (96px)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Full Banner Controls */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    بانر الترويسة الكامل (Full Banner)
                  </span>
                  <label className="flex cursor-pointer items-center gap-1 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={currentHeaderConfig.banner.enabled}
                      onChange={e =>
                        updateConfig({
                          banner: { ...currentHeaderConfig.banner, enabled: e.target.checked },
                          style: {
                            ...currentHeaderConfig.style,
                            layout: e.target.checked ? 'full-banner' : 'classic-split',
                          },
                        })
                      }
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span>تفعيل البانر الكامل</span>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-100">
                    <Upload className="h-3.5 w-3.5" />
                    <span>رفع صورة البانر</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </label>
                  <div className="text-[10px] text-slate-500">
                    صورة أفقية عريضة تغطي أعلى كافة الصفحات
                  </div>
                </div>

                {currentHeaderConfig.banner.enabled && (
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-600 dark:text-slate-400">
                      ارتفاع البانر: {currentHeaderConfig.banner.height}px
                    </label>
                    <input
                      type="range"
                      min="80"
                      max="200"
                      value={currentHeaderConfig.banner.height}
                      onChange={e =>
                        updateConfig({
                          banner: {
                            ...currentHeaderConfig.banner,
                            height: Number(e.target.value),
                          },
                        })
                      }
                      className="h-1.5 w-full cursor-pointer rounded-lg bg-slate-200 accent-blue-600"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Header Details */}
          {activeTab === 'details' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { key: 'showCompanyName', label: 'اسم المنشأة' },
                  { key: 'showSlogan', label: 'الشعار اللفظي' },
                  { key: 'showTaxNumber', label: 'الرقم الضريبي' },
                  { key: 'showCommercialRegister', label: 'السجل التجاري' },
                  { key: 'showPhone', label: 'رقم الهاتف' },
                  { key: 'showEmail', label: 'البريد الإلكتروني' },
                  { key: 'showAddress', label: 'العنوان الجغرافي' },
                  { key: 'showCustomNote', label: 'ملاحظة مخصصة' },
                ].map(item => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {item.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={(currentHeaderConfig.details as any)[item.key] ?? true}
                      onChange={e =>
                        updateConfig({
                          details: {
                            ...currentHeaderConfig.details,
                            [item.key]: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-blue-600 focus:ring-0"
                    />
                  </label>
                ))}
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-slate-600 dark:text-slate-400">
                  الشعار اللفظي المخصص (Slogan)
                </label>
                <input
                  type="text"
                  value={currentHeaderConfig.details.sloganText || ''}
                  onChange={e =>
                    updateConfig({
                      details: { ...currentHeaderConfig.details, sloganText: e.target.value },
                    })
                  }
                  placeholder="مثال: ريادة وأمانة في المعاملات التجارية"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-slate-600 dark:text-slate-400">
                  اسم بديل للمنشأة في الترويسة (اختياري)
                </label>
                <input
                  type="text"
                  value={currentHeaderConfig.details.companyNameOverride || ''}
                  onChange={e =>
                    updateConfig({
                      details: {
                        ...currentHeaderConfig.details,
                        companyNameOverride: e.target.value,
                      },
                    })
                  }
                  placeholder="اتركه فارغاً لاستخدام الاسم الرسمي للمنشأة"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
          )}

          {/* Tab 5: WhatsApp Header */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                يتم تصدير هذه الترويسة تلقائياً في بداية كافة رسائل الواتساب وفواتير المشاركة وسندات
                القبض وإشعارات الديون.
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { key: 'includeCompanyName', label: 'تضمين اسم المنشأة' },
                  { key: 'includeSlogan', label: 'تضمين الشعار اللفظي' },
                  { key: 'includeContact', label: 'تضمين رقم الهاتف' },
                  { key: 'includeTaxNumber', label: 'تضمين الرقم الضريبي' },
                ].map(item => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {item.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={(currentHeaderConfig.whatsapp as any)[item.key] ?? true}
                      onChange={e =>
                        updateConfig({
                          whatsapp: {
                            ...currentHeaderConfig.whatsapp,
                            [item.key]: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-emerald-600 focus:ring-0"
                    />
                  </label>
                ))}
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-slate-600 dark:text-slate-400">
                  شكل الفاصل في رسالة الواتساب
                </label>
                <select
                  value={currentHeaderConfig.whatsapp.dividerStyle}
                  onChange={e =>
                    updateConfig({
                      whatsapp: {
                        ...currentHeaderConfig.whatsapp,
                        dividerStyle: e.target.value as any,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="stars">خط فخم متصل (━━━━)</option>
                  <option value="dashes">شرطات بسيطة (----)</option>
                  <option value="emojis">رموز تعبيرية زرقاء (🔹 🔹 🔹)</option>
                  <option value="none">بدون فاصل</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-slate-600 dark:text-slate-400">
                  عبارة الترحيب العلوية
                </label>
                <input
                  type="text"
                  value={currentHeaderConfig.whatsapp.customGreeting || ''}
                  onChange={e =>
                    updateConfig({
                      whatsapp: {
                        ...currentHeaderConfig.whatsapp,
                        customGreeting: e.target.value,
                      },
                    })
                  }
                  placeholder="مثال: مرحباً بكم في مؤسسة الزهراء"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Column */}
        <div className="space-y-3 lg:col-span-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Eye className="h-4 w-4 text-blue-600" />
              <span>المعاينة الحية المتزامنة (Live Preview)</span>
            </div>

            {/* Document Preview Tab Switcher */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-200/80 p-0.5 text-[11px] font-medium dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setPreviewTab('sales_invoice')}
                className={`rounded-md px-2 py-1 transition-all ${
                  previewTab === 'sales_invoice'
                    ? 'bg-white font-bold text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                فاتورة مبيعات
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('purchase_invoice')}
                className={`rounded-md px-2 py-1 transition-all ${
                  previewTab === 'purchase_invoice'
                    ? 'bg-white font-bold text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                فاتورة مشتريات
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('bond')}
                className={`rounded-md px-2 py-1 transition-all ${
                  previewTab === 'bond'
                    ? 'bg-white font-bold text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                سند
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('statement')}
                className={`rounded-md px-2 py-1 transition-all ${
                  previewTab === 'statement'
                    ? 'bg-white font-bold text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                كشف حساب
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('whatsapp')}
                className={`rounded-md px-2 py-1 transition-all ${
                  previewTab === 'whatsapp'
                    ? 'bg-emerald-600 font-bold text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                واتساب
              </button>
            </div>
          </div>

          {/* Paper / Simulation Container */}
          {previewTab !== 'whatsapp' ? (
            <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-md">
              {/* Universal Header in action */}
              <UniversalDocumentHeader
                config={currentHeaderConfig}
                company={resolvedCompany}
                documentTitle={
                  previewTab === 'sales_invoice'
                    ? 'فاتورة مبيعات ضريبية'
                    : previewTab === 'purchase_invoice'
                      ? 'فاتورة مشتريات'
                      : previewTab === 'bond'
                        ? 'سند قبض مالي'
                        : 'كشف حساب تفصيلي'
                }
                documentNumber={
                  previewTab === 'sales_invoice'
                    ? 'INV-2026-0042'
                    : previewTab === 'purchase_invoice'
                      ? 'PINV-2026-0019'
                      : previewTab === 'bond'
                        ? 'BND-2026-0105'
                        : 'STMT-9941'
                }
                documentDate="2026/09/21"
              />

              {/* Mock Body for Realism */}
              <div className="mt-2 flex-1 space-y-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between border-b pb-2 text-xs text-slate-500">
                  <span>الطرف: شركة المستقبل للتوريدات</span>
                  <span>الرقم الضريبي للعميل: 310998877600003</span>
                </div>

                <div className="space-y-1.5 py-4">
                  <div className="h-4 w-full rounded bg-slate-200/80"></div>
                  <div className="h-4 w-5/6 rounded bg-slate-200/50"></div>
                  <div className="h-4 w-4/6 rounded bg-slate-200/40"></div>
                </div>

                <div className="flex items-center justify-between border-t pt-3 text-xs font-bold text-slate-700">
                  <span>الإجمالي العام المستحق</span>
                  <span
                    className="font-mono text-sm"
                    style={{ color: currentHeaderConfig.style.accentColor }}
                  >
                    1,500.00 ر.س
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* WhatsApp Message Preview Simulation */
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-300 bg-[#e5ddd5] p-4 shadow-md dark:border-slate-800 dark:bg-slate-950">
              <div className="w-full max-w-sm whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 font-sans text-xs leading-relaxed text-slate-900 shadow-sm dark:border-slate-700/60 dark:bg-[#1f2c34] dark:text-slate-100">
                {whatsappPreviewText}
                <div className="mt-2 text-left text-[10px] text-slate-400">12:45 م ✓✓</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
