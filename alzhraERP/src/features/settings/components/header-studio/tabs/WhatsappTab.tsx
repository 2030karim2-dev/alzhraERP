/* eslint-disable max-lines-per-function, @typescript-eslint/array-type, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
import React from 'react';
import type { DocumentHeaderConfig } from '@/core/types/documentHeader';

interface WhatsappTabProps {
  currentHeaderConfig: DocumentHeaderConfig;
  updateConfig: (updates: Partial<DocumentHeaderConfig>) => void;
}

export const WhatsappTab: React.FC<WhatsappTabProps> = ({ currentHeaderConfig, updateConfig }) => {
  const whatsappItems: { key: keyof typeof currentHeaderConfig.whatsapp; label: string }[] = [
    { key: 'includeCompanyName', label: 'تضمين اسم المنشأة' },
    { key: 'includeSlogan', label: 'تضمين الشعار اللفظي' },
    { key: 'includeContact', label: 'تضمين رقم الهاتف' },
    { key: 'includeTaxNumber', label: 'تضمين الرقم الضريبي' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
        يتم تصدير هذه الترويسة تلقائياً في بداية كافة رسائل الواتساب وفواتير المشاركة وسندات القبض
        وإشعارات الديون.
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {whatsappItems.map(item => (
          <label
            key={item.key}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {item.label}
            </span>
            <input
              type="checkbox"
              checked={Boolean(currentHeaderConfig.whatsapp[item.key] ?? true)}
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
  );
};
