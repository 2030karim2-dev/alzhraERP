/* eslint-disable max-lines-per-function, @typescript-eslint/array-type, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, jsx-a11y/label-has-associated-control */
import React from 'react';
import type { DocumentHeaderConfig } from '@/core/types/documentHeader';

interface DetailsTabProps {
  currentHeaderConfig: DocumentHeaderConfig;
  updateConfig: (updates: Partial<DocumentHeaderConfig>) => void;
}

export const DetailsTab: React.FC<DetailsTabProps> = ({ currentHeaderConfig, updateConfig }) => {
  const detailItems: { key: keyof typeof currentHeaderConfig.details; label: string }[] = [
    { key: 'showCompanyName', label: 'اسم المنشأة' },
    { key: 'showSlogan', label: 'الشعار اللفظي' },
    { key: 'showTaxNumber', label: 'الرقم الضريبي' },
    { key: 'showCommercialRegister', label: 'السجل التجاري' },
    { key: 'showPhone', label: 'رقم الهاتف' },
    { key: 'showEmail', label: 'البريد الإلكتروني' },
    { key: 'showAddress', label: 'العنوان الجغرافي' },
    { key: 'showCustomNote', label: 'ملاحظة مخصصة' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        {detailItems.map(item => (
          <label
            key={item.key}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {item.label}
            </span>
            <input
              type="checkbox"
              checked={Boolean(currentHeaderConfig.details[item.key] ?? true)}
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
  );
};
