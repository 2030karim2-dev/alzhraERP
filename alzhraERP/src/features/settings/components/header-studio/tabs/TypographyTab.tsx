/* eslint-disable max-lines-per-function, @typescript-eslint/no-confusing-void-expression, jsx-a11y/label-has-associated-control */
import React from 'react';
import type { DocumentHeaderConfig, DocumentFontFamily } from '@/core/types/documentHeader';
import { AVAILABLE_FONTS } from '../constants';

interface TypographyTabProps {
  currentHeaderConfig: DocumentHeaderConfig;
  updateConfig: (updates: Partial<DocumentHeaderConfig>) => void;
}

export const TypographyTab: React.FC<TypographyTabProps> = ({
  currentHeaderConfig,
  updateConfig,
}) => {
  return (
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
  );
};
