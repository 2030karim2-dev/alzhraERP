/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/no-confusing-void-expression */
import React from 'react';
import { Eye } from 'lucide-react';
import { UniversalDocumentHeader } from '@/ui/common/UniversalDocumentHeader';
import type { DocumentHeaderConfig } from '@/core/types/documentHeader';
import type { PreviewTab } from '../constants';

interface StudioLivePreviewProps {
  currentHeaderConfig: DocumentHeaderConfig;
  resolvedCompany: {
    name: string;
    logo_url?: string | undefined;
    phone: string;
    email: string;
    address: string;
    tax_number: string;
    commercial_register: string;
    slogan: string;
  };
  previewTab: PreviewTab;
  setPreviewTab: (tab: PreviewTab) => void;
  whatsappPreviewText: string;
}

export const StudioLivePreview: React.FC<StudioLivePreviewProps> = ({
  currentHeaderConfig,
  resolvedCompany,
  previewTab,
  setPreviewTab,
  whatsappPreviewText,
}) => {
  return (
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
  );
};
