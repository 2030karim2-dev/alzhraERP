/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import React, { useState } from 'react';
import { Check, RotateCcw, Sparkles } from 'lucide-react';
import { useSettingsStore, useDocumentHeaderSettings } from '../../settingsStore';
import {
  DEFAULT_DOCUMENT_HEADER_CONFIG,
  type DocumentHeaderConfig,
} from '@/core/types/documentHeader';
import { buildWhatsappHeader } from '@/core/utils/whatsappHeader';
import { useCompany } from '@/features/settings/hooks';

import { HeaderStudioTabs } from './HeaderStudioTabs';
import { StudioLivePreview } from './preview/StudioLivePreview';
import { DesignTab } from './tabs/DesignTab';
import { TypographyTab } from './tabs/TypographyTab';
import { LogoTab } from './tabs/LogoTab';
import { DetailsTab } from './tabs/DetailsTab';
import { WhatsappTab } from './tabs/WhatsappTab';
import type { PreviewTab, StudioActiveTab } from './constants';

export const DocumentHeaderStudio: React.FC = () => {
  const currentHeaderConfig = useDocumentHeaderSettings();
  const { setDocumentHeader, applyHeaderTemplateToAll } = useSettingsStore();
  const { data: company } = useCompany();

  const [activeTab, setActiveTab] = useState<StudioActiveTab>('design');
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
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-amber-300" />
            </span>
            <h2 className="text-lg font-black tracking-tight">ستوديو ترويسة ومطبوعات المستندات</h2>
          </div>
          <p className="text-xs text-blue-100/90">
            صمم ترويسة واحدة مركزية فاخرة تُطبّق وتنعكس فوراً على فواتير المبيعات، فواتير المشتريات،
            سندات القبض والصرف، كشوف الحسابات، ورسائل الواتساب.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>استعادة الافتراضي</span>
          </button>
          <button
            type="button"
            onClick={handleApplyToAll}
            className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-900 shadow-md transition-all hover:bg-amber-300 active:scale-95"
          >
            <Check className="h-4 w-4" />
            <span>تعميم الترويسة على كافة المعاملات</span>
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-700 transition-all dark:text-emerald-400">
          <Check className="h-4 w-4 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Studio Grid: Controls Panel (Left/Center) + Live Preview (Right/Fixed) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Settings Form Column */}
        <div className="space-y-4 lg:col-span-6">
          <HeaderStudioTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {activeTab === 'design' && (
              <DesignTab currentHeaderConfig={currentHeaderConfig} updateConfig={updateConfig} />
            )}

            {activeTab === 'typography' && (
              <TypographyTab
                currentHeaderConfig={currentHeaderConfig}
                updateConfig={updateConfig}
              />
            )}

            {activeTab === 'logo' && (
              <LogoTab
                currentHeaderConfig={currentHeaderConfig}
                updateConfig={updateConfig}
                handleLogoUpload={handleLogoUpload}
                handleBannerUpload={handleBannerUpload}
              />
            )}

            {activeTab === 'details' && (
              <DetailsTab currentHeaderConfig={currentHeaderConfig} updateConfig={updateConfig} />
            )}

            {activeTab === 'whatsapp' && (
              <WhatsappTab currentHeaderConfig={currentHeaderConfig} updateConfig={updateConfig} />
            )}
          </div>
        </div>

        {/* Live Preview Column */}
        <StudioLivePreview
          currentHeaderConfig={currentHeaderConfig}
          resolvedCompany={resolvedCompany}
          previewTab={previewTab}
          setPreviewTab={setPreviewTab}
          whatsappPreviewText={whatsappPreviewText}
        />
      </div>
    </div>
  );
};
