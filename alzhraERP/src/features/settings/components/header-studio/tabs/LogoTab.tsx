/* eslint-disable max-lines-per-function, @typescript-eslint/no-confusing-void-expression, jsx-a11y/label-has-associated-control */
import React from 'react';
import { Upload } from 'lucide-react';
import type { DocumentHeaderConfig, LogoPosition, LogoSize } from '@/core/types/documentHeader';

interface LogoTabProps {
  currentHeaderConfig: DocumentHeaderConfig;
  updateConfig: (updates: Partial<DocumentHeaderConfig>) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const LogoTab: React.FC<LogoTabProps> = ({
  currentHeaderConfig,
  updateConfig,
  handleLogoUpload,
  handleBannerUpload,
}) => {
  return (
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
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </label>

          <div className="text-[10px] text-slate-500">يدعم PNG, JPG, WebP أو رابط مباشر</div>
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
            <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
          </label>
          <div className="text-[10px] text-slate-500">صورة أفقية عريضة تغطي أعلى كافة الصفحات</div>
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
  );
};
