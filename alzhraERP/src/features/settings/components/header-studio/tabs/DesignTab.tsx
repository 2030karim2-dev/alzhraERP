/* eslint-disable max-lines-per-function, @typescript-eslint/no-confusing-void-expression, jsx-a11y/label-has-associated-control */
import React from 'react';
import { Check } from 'lucide-react';
import type { DocumentHeaderConfig, DocumentHeaderLayout } from '@/core/types/documentHeader';
import { PRESET_ACCENT_COLORS } from '../constants';

interface DesignTabProps {
  currentHeaderConfig: DocumentHeaderConfig;
  updateConfig: (updates: Partial<DocumentHeaderConfig>) => void;
}

export const DesignTab: React.FC<DesignTabProps> = ({ currentHeaderConfig, updateConfig }) => {
  return (
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
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{layout.desc}</span>
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
                  currentHeaderConfig.style.accentColor === c.color ? '#000000' : 'transparent',
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
  );
};
